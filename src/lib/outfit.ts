import type {
  Category,
  ClothingItem,
  DayPreference,
  Occasion,
  Outfit,
  RecommendResult,
  TempRange,
  WeatherData,
} from '../types';
import { OCCASION_LABELS } from './constants';
import { colorHarmony, isVivid } from './palette';
import { isSunny, isWet, tempRangeFor } from './weather';

export interface RecommendOptions {
  preference: DayPreference;
  /** Okazja (domyślnie „Zwykły dzień”). */
  occasion?: Occasion;
  /** Ziarno generatora losowego – ten sam seed i dane wejściowe dają ten sam strój. */
  seed?: number;
  /** Sygnatury już pokazanych zestawów (przycisk „Losuj inny zestaw”). */
  exclude?: ReadonlySet<string>;
  now?: number;
}

// ---------- narzędzia ----------

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pickWeighted<T>(list: T[], weight: (t: T) => number, rng: () => number): T | undefined {
  if (list.length === 0) return undefined;
  const weights = list.map((x) => Math.max(0.0001, weight(x)));
  let r = rng() * weights.reduce((s, w) => s + w, 0);
  for (let i = 0; i < list.length; i++) {
    r -= weights[i];
    if (r <= 0) return list[i];
  }
  return list[list.length - 1];
}

const TEMP_ORDER: TempRange[] = ['hot', 'mild', 'cool', 'cold'];
const tempDistance = (a: TempRange, b: TempRange) =>
  Math.abs(TEMP_ORDER.indexOf(a) - TEMP_ORDER.indexOf(b));
const tempFit = (item: ClothingItem, target: TempRange) =>
  [1, 0.55, 0.1, 0.02][tempDistance(item.tempRange, target)];

const DAY = 24 * 3600 * 1000;
const wornFactor = (item: ClothingItem, now: number) =>
  item.lastWornAt && now - item.lastWornAt < 2 * DAY ? 0.4 : 1;

type AccessoryKind = 'sunglasses' | 'watch' | 'jewelry' | 'other';
export function accessoryKind(item: ClothingItem): AccessoryKind {
  const s = item.subCategory.toLowerCase();
  if (/okular/.test(s)) return 'sunglasses';
  if (/zegar/.test(s)) return 'watch';
  if (/naszyj|bransolet|kolczyk|pier[sś]cion|łańcusz|lancusz/.test(s)) return 'jewelry';
  return 'other';
}

function metalOf(item: ClothingItem): 'silver' | 'gold' | undefined {
  const s = item.subCategory.toLowerCase();
  if (/srebr/.test(s)) return 'silver';
  if (/złot|zlot/.test(s)) return 'gold';
  return undefined;
}

const TEMP_NEUTRAL_KINDS: AccessoryKind[] = ['sunglasses', 'watch', 'jewelry'];

/** Najbliższe dopasowanie do temperatury: elementy w odległości ≤ 1 przedziału, a w razie braku – najbliższe. */
function tempPool(list: ClothingItem[], target: TempRange, notes: string[], label: string): ClothingItem[] {
  if (list.length === 0) return list;
  const min = Math.min(...list.map((i) => tempDistance(i.tempRange, target)));
  if (min <= 1) return list.filter((i) => tempDistance(i.tempRange, target) <= 1);
  notes.push(`Brak ${label} dopasowanych do temperatury – użyto najbliższych.`);
  return list.filter((i) => tempDistance(i.tempRange, target) === min);
}

const rank = (i: ClothingItem) => ({ dark: 0, neutral: 1, light: 2 })[i.brightnessType];

/** Ubrania bez przypisanych okazji (stare dane) traktujemy jako „zwykły dzień”. */
const occasionsOf = (i: ClothingItem): Occasion[] =>
  Array.isArray(i.occasions) && i.occasions.length ? i.occasions : ['casual'];

/** Zawęża listę do ubrań na daną okazję; gdy żadne nie pasuje – zwraca całość (z opcjonalną uwagą). */
function occasionPool(
  list: ClothingItem[],
  occasion: Occasion,
  notes?: string[],
  label?: string
): ClothingItem[] {
  const match = list.filter((i) => occasionsOf(i).includes(occasion));
  if (match.length > 0 || list.length === 0) return match.length ? match : list;
  if (notes && label) {
    notes.push(`Brak ${label} oznaczonych na okazję „${OCCASION_LABELS[occasion]}” – użyto innych.`);
  }
  return list;
}

/** 2 = idealne, 1 = akceptowalne, 0 = niezgodne z preferencją dnia. */
function pairLevel(pref: DayPreference, top: ClothingItem, bottom: ClothingItem): 0 | 1 | 2 {
  const t = top.brightnessType;
  const b = bottom.brightnessType;
  if (pref === 'light') {
    const bothBright = t !== 'dark' && b !== 'dark';
    if (!bothBright) return 0;
    return t === 'light' || b === 'light' ? 2 : 1; // jasny akcent
  }
  if (pref === 'dark') {
    if (t !== 'dark' && b !== 'dark') return 0;
    return isVivid(top.colorHex) || isVivid(bottom.colorHex) ? 1 : 2; // brak jaskrawych dominant
  }
  // any – kontrast walorowy lub monochromat
  const diff = Math.abs(rank(top) - rank(bottom));
  if (diff === 2 || top.dominantColor === bottom.dominantColor) return 2;
  return diff === 1 ? 1 : 0;
}

/** Miękka korekta wagi pojedynczego elementu (buty, okrycie) względem preferencji dnia. */
function prefFactor(pref: DayPreference, item: ClothingItem): number {
  if (pref === 'dark') return isVivid(item.colorHex) ? 0.25 : 1;
  if (pref === 'light') return item.brightnessType === 'dark' ? 0.7 : 1;
  return 1;
}

// ---------- główny silnik ----------

export function recommendOutfit(
  items: ClothingItem[],
  weather: WeatherData,
  options: RecommendOptions
): RecommendResult {
  const pref = options.preference;
  const occasion = options.occasion ?? 'casual';
  const now = options.now ?? Date.now();
  const rng = mulberry32(options.seed ?? Date.now());
  const byCat = (c: Category) => items.filter((i) => i.category === c);

  const tops = byCat('top');
  const bottoms = byCat('bottom');
  const missing: Category[] = [];
  if (tops.length === 0) missing.push('top');
  if (bottoms.length === 0) missing.push('bottom');
  if (missing.length) {
    return {
      ok: false,
      missing,
      message: `Dodaj do szafy przynajmniej: ${missing.map((m) => (m === 'top' ? 'górę' : 'dół')).join(' i ')}.`,
    };
  }

  // Do 15 prób, aby ominąć już pokazane zestawy.
  let last: Outfit | undefined;
  for (let attempt = 0; attempt < 15; attempt++) {
    const outfit = buildOutfit(items, weather, pref, occasion, rng, now);
    last = outfit;
    if (!options.exclude || !options.exclude.has(outfit.signature)) break;
  }
  return { ok: true, outfit: last! };
}

function buildOutfit(
  items: ClothingItem[],
  weather: WeatherData,
  pref: DayPreference,
  occasion: Occasion,
  rng: () => number,
  now: number
): Outfit {
  const notes: string[] = [];
  const target = tempRangeFor(weather.apparentTemperature);
  const wet = isWet(weather);
  const byCat = (c: Category) => items.filter((i) => i.category === c);

  // ----- Góra + dół -----
  const topPool = tempPool(occasionPool(byCat('top'), occasion, notes, 'góry'), target, notes, 'góry');
  const bottomPool = tempPool(occasionPool(byCat('bottom'), occasion, notes, 'dołu'), target, notes, 'dołu');

  interface Pair {
    top: ClothingItem;
    bottom: ClothingItem;
    h: number;
    level: 0 | 1 | 2;
    w: number;
  }
  const pairs: Pair[] = [];
  for (const top of topPool) {
    for (const bottom of bottomPool) {
      const h = colorHarmony(top.dominantColor, bottom.dominantColor);
      const w =
        ((tempFit(top, target) + tempFit(bottom, target)) / 2) *
        wornFactor(top, now) *
        wornFactor(bottom, now);
      pairs.push({ top, bottom, h, level: pairLevel(pref, top, bottom), w });
    }
  }
  const tiers: ((p: Pair) => boolean)[] = [
    (p) => p.level === 2 && p.h >= 0.5,
    (p) => p.level === 2,
    (p) => p.level >= 1 && p.h >= 0.5,
    (p) => p.level >= 1,
    (p) => p.h >= 0.5,
    () => true,
  ];
  let candidates: Pair[] = [];
  let tierIndex = 0;
  for (; tierIndex < tiers.length; tierIndex++) {
    candidates = pairs.filter(tiers[tierIndex]);
    if (candidates.length) break;
  }
  if (tierIndex >= 1 && pref !== 'any') {
    notes.push('Za mało ubrań pasujących idealnie do wybranej preferencji – złagodzono kryteria.');
  } else if (tierIndex >= 1) {
    notes.push('Za mało ubrań dających kontrast – złagodzono kryteria.');
  }
  const pair = pickWeighted(candidates, (p) => p.h * p.h * p.w, rng)!;
  const { top, bottom } = pair;

  // ----- Okrycie wierzchnie -----
  const allOuter = byCat('outerwear');
  const outerAll = occasionPool(allOuter, occasion);
  let outerwear: ClothingItem | undefined;
  const needOuter = wet || target === 'cool' || target === 'cold';
  const optionalOuter = target === 'mild' && rng() < 0.3;
  if (outerAll.length && (needOuter || optionalOuter)) {
    let pool = outerAll;
    if (wet) {
      // Pogoda ma pierwszeństwo przed okazją: najpierw przeciwdeszczowe z pasujących, potem z całej szafy.
      const rainproof = outerAll.some((i) => i.isRainproof)
        ? outerAll.filter((i) => i.isRainproof)
        : allOuter.filter((i) => i.isRainproof);
      if (rainproof.length) {
        pool = rainproof; // priorytet dla isRainproof
      } else if (target === 'hot' || target === 'mild') {
        pool = [];
        notes.push('Brak kurtki przeciwdeszczowej – weź parasol.');
      } else {
        notes.push('Brak kurtki przeciwdeszczowej – weź parasol.');
      }
    }
    if (pool.length) {
      const fitted = wet && pool.every((i) => i.isRainproof) ? pool : tempPool(pool, target, notes, 'okryć');
      outerwear = pickWeighted(
        fitted,
        (o) =>
          Math.max(0.15, tempFit(o, target)) *
          ((colorHarmony(o.dominantColor, top.dominantColor) +
            colorHarmony(o.dominantColor, bottom.dominantColor)) /
            2) *
          prefFactor(pref, o) *
          wornFactor(o, now),
        rng
      );
    }
  } else if (needOuter && allOuter.length === 0) {
    notes.push(wet ? 'Dodaj kurtkę przeciwdeszczową do szafy.' : 'Dodaj kurtkę lub płaszcz do szafy.');
  }

  // ----- Buty -----
  const shoesAll = byCat('shoes');
  let shoes: ClothingItem | undefined;
  if (shoesAll.length) {
    let pool = tempPool(occasionPool(shoesAll, occasion, notes, 'butów'), target, notes, 'butów');
    if (wet) {
      const rainproof = pool.filter((i) => i.isRainproof);
      if (rainproof.length) pool = rainproof;
      else if (!outerwear?.isRainproof) notes.push('Brak butów odpornych na deszcz.');
    }
    shoes = pickWeighted(
      pool,
      (s) =>
        (0.5 * colorHarmony(s.dominantColor, bottom.dominantColor) +
          0.3 * colorHarmony(s.dominantColor, top.dominantColor) +
          0.2) *
        tempFit(s, target) *
        prefFactor(pref, s) *
        wornFactor(s, now),
      rng
    );
  } else {
    notes.push('Dodaj buty do szafy, aby uzupełnić stylizację.');
  }

  // ----- Dodatki (1–2) -----
  const accessories = pickAccessories(byCat('accessory'), weather, target, occasion, rng, now);

  // ----- Ocena harmonii -----
  const harmonies = [colorHarmony(top.dominantColor, bottom.dominantColor)];
  if (shoes) harmonies.push(colorHarmony(shoes.dominantColor, bottom.dominantColor));
  if (outerwear) harmonies.push(colorHarmony(outerwear.dominantColor, top.dominantColor));
  const score = Math.round((harmonies.reduce((s, h) => s + h, 0) / harmonies.length) * 100);

  const ids = [top, bottom, shoes, outerwear, ...accessories].filter(Boolean).map((i) => i!.id);
  return {
    top,
    bottom,
    shoes,
    outerwear,
    accessories,
    notes: Array.from(new Set(notes)),
    score,
    signature: ids.slice().sort().join('+'),
  };
}

function pickAccessories(
  all: ClothingItem[],
  weather: WeatherData,
  target: TempRange,
  occasion: Occasion,
  rng: () => number,
  now: number
): ClothingItem[] {
  const pool = all.filter(
    (a) =>
      occasionsOf(a).includes(occasion) &&
      (TEMP_NEUTRAL_KINDS.includes(accessoryKind(a)) || tempDistance(a.tempRange, target) <= 1)
  );
  if (pool.length === 0) return [];

  const chosen: ClothingItem[] = [];
  const slot = (a: ClothingItem) => {
    const k = accessoryKind(a);
    return k === 'other' ? `other:${a.subCategory}` : k;
  };
  const allowed = (a: ClothingItem) => {
    if (chosen.some((c) => slot(c) === slot(a))) return false;
    const m = metalOf(a);
    // nie łącz złota ze srebrem
    return !m || chosen.every((c) => !metalOf(c) || metalOf(c) === m);
  };
  const weight = (a: ClothingItem) => {
    let w = wornFactor(a, now);
    if (accessoryKind(a) === 'other' && (target === 'cold' || target === 'cool')) w *= 2.5; // czapka/szalik w chłodzie
    return w;
  };

  // Okulary przy bezchmurnej pogodzie mają pierwszeństwo.
  if (isSunny(weather)) {
    const glasses = pool.filter((a) => accessoryKind(a) === 'sunglasses');
    const g = pickWeighted(glasses, weight, rng);
    if (g) chosen.push(g);
  }

  // Pierwszy dodatek: zegarek lub biżuteria, w razie braku cokolwiek.
  if (chosen.length === 0) {
    const core = pool.filter((a) => ['watch', 'jewelry'].includes(accessoryKind(a)));
    const first = pickWeighted(core.length ? core : pool, weight, rng);
    if (first) chosen.push(first);
  }

  // Drugi dodatek (≈70% szans) – inny rodzaj, spójny kolorystycznie (metal).
  if (chosen.length < 2 && rng() < 0.7) {
    const second = pickWeighted(pool.filter((a) => allowed(a) && !chosen.includes(a)), weight, rng);
    if (second) chosen.push(second);
  }
  return chosen;
}
