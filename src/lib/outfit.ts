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

function onepieceLevel(pref: DayPreference, item: ClothingItem): 0 | 1 | 2 {
  const b = item.brightnessType;
  if (pref === 'light') {
    if (b === 'light') return 2;
    if (b === 'neutral') return 1;
    return 0;
  }
  if (pref === 'dark') {
    if (b === 'dark') return isVivid(item.colorHex) ? 1 : 2;
    if (b === 'neutral' && !isVivid(item.colorHex)) return 1;
    return 0;
  }
  return 2;
}

/** Miękka korekta wagi pojedynczego elementu (buty, okrycie, torebka) względem preferencji dnia. */
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
  const onepieces = byCat('onepiece');

  const canPair = tops.length > 0 && bottoms.length > 0;
  const canOnepiece = onepieces.length > 0;

  if (!canPair && !canOnepiece) {
    const missing: Category[] = [];
    if (tops.length === 0) missing.push('top');
    if (bottoms.length === 0) missing.push('bottom');
    return {
      ok: false,
      missing,
      message: `Dodaj do szafy sukienkę/kombinezon albo przynajmniej: ${missing
        .map((m) => (m === 'top' ? 'górę' : 'dół'))
        .join(' i ')}.`,
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

type BaseCandidate =
  | {
      kind: 'pair';
      top: ClothingItem;
      bottom: ClothingItem;
      h: number;
      level: 0 | 1 | 2;
      w: number;
    }
  | {
      kind: 'onepiece';
      onepiece: ClothingItem;
      h: number;
      level: 0 | 1 | 2;
      w: number;
    };

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

  // ----- Baza stylizacji: (Góra + Dół) lub (Sukienka / Jednoczęściowe) -----
  const allTops = byCat('top');
  const allBottoms = byCat('bottom');
  const allOnepieces = byCat('onepiece');

  const bases: BaseCandidate[] = [];

  if (allTops.length > 0 && allBottoms.length > 0) {
    const topPool = tempPool(occasionPool(allTops, occasion, notes, 'góry'), target, notes, 'góry');
    const bottomPool = tempPool(
      occasionPool(allBottoms, occasion, notes, 'dołu'),
      target,
      notes,
      'dołu'
    );
    for (const top of topPool) {
      for (const bottom of bottomPool) {
        const h = colorHarmony(top.dominantColor, bottom.dominantColor);
        const occMatch =
          (occasionsOf(top).includes(occasion) ? 1 : 0.45) *
          (occasionsOf(bottom).includes(occasion) ? 1 : 0.45);
        const w =
          ((tempFit(top, target) + tempFit(bottom, target)) / 2) *
          occMatch *
          wornFactor(top, now) *
          wornFactor(bottom, now);
        bases.push({ kind: 'pair', top, bottom, h, level: pairLevel(pref, top, bottom), w });
      }
    }
  }

  if (allOnepieces.length > 0) {
    const onePool = tempPool(
      occasionPool(allOnepieces, occasion, bases.length === 0 ? notes : undefined, 'sukienek'),
      target,
      bases.length === 0 ? notes : [],
      'sukienek'
    );
    for (const op of onePool) {
      const occMatch = occasionsOf(op).includes(occasion) ? 1.15 : 0.35;
      const w = tempFit(op, target) * occMatch * wornFactor(op, now);
      bases.push({
        kind: 'onepiece',
        onepiece: op,
        h: 0.92,
        level: onepieceLevel(pref, op),
        w,
      });
    }
  }

  const tiers: ((b: BaseCandidate) => boolean)[] = [
    (b) => b.level === 2 && b.h >= 0.5,
    (b) => b.level === 2,
    (b) => b.level >= 1 && b.h >= 0.5,
    (b) => b.level >= 1,
    (b) => b.h >= 0.5,
    () => true,
  ];
  let candidates: BaseCandidate[] = [];
  let tierIndex = 0;
  for (; tierIndex < tiers.length; tierIndex++) {
    candidates = bases.filter(tiers[tierIndex]);
    if (candidates.length) break;
  }
  if (tierIndex >= 1 && pref !== 'any') {
    notes.push('Za mało ubrań pasujących idealnie do wybranej preferencji – złagodzono kryteria.');
  } else if (tierIndex >= 1) {
    notes.push('Za mało ubrań dających kontrast – złagodzono kryteria.');
  }

  const base = pickWeighted(candidates, (b) => b.h * b.h * b.w, rng)!;
  const top = base.kind === 'pair' ? base.top : undefined;
  const bottom = base.kind === 'pair' ? base.bottom : undefined;
  const onepiece = base.kind === 'onepiece' ? base.onepiece : undefined;

  const primaryColor = onepiece ? onepiece.dominantColor : top!.dominantColor;
  const secondaryColor = onepiece ? onepiece.dominantColor : bottom!.dominantColor;

  // ----- Okrycie wierzchnie -----
  const allOuter = byCat('outerwear');
  const outerAll = occasionPool(allOuter, occasion);
  let outerwear: ClothingItem | undefined;
  const needOuter = wet || target === 'cool' || target === 'cold';
  const optionalOuter = target === 'mild' && rng() < 0.3;
  if (outerAll.length && (needOuter || optionalOuter)) {
    let pool = outerAll;
    if (wet) {
      const rainproof = outerAll.some((i) => i.isRainproof)
        ? outerAll.filter((i) => i.isRainproof)
        : allOuter.filter((i) => i.isRainproof);
      if (rainproof.length) {
        pool = rainproof;
      } else if (target === 'hot' || target === 'mild') {
        pool = [];
        notes.push('Brak kurtki przeciwdeszczowej – weź parasol.');
      } else {
        notes.push('Brak kurtki przeciwdeszczowej – weź parasol.');
      }
    }
    if (pool.length) {
      const fitted =
        wet && pool.every((i) => i.isRainproof) ? pool : tempPool(pool, target, notes, 'okryć');
      outerwear = pickWeighted(
        fitted,
        (o) =>
          Math.max(0.15, tempFit(o, target)) *
          ((colorHarmony(o.dominantColor, primaryColor) +
            colorHarmony(o.dominantColor, secondaryColor)) /
            2) *
          prefFactor(pref, o) *
          wornFactor(o, now),
        rng
      );
    }
  } else if (needOuter && allOuter.length === 0) {
    notes.push(
      wet ? 'Dodaj kurtkę przeciwdeszczową do szafy.' : 'Dodaj kurtkę lub płaszcz do szafy.'
    );
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
        (0.5 * colorHarmony(s.dominantColor, secondaryColor) +
          0.3 * colorHarmony(s.dominantColor, primaryColor) +
          0.2) *
        tempFit(s, target) *
        prefFactor(pref, s) *
        wornFactor(s, now),
      rng
    );
  } else {
    notes.push('Dodaj buty do szafy, aby uzupełnić stylizację.');
  }

  // ----- Torebka / Plecak (opcjonalnie, jeśli jest w szafie) -----
  const bagsAll = byCat('bag');
  let bag: ClothingItem | undefined;
  if (bagsAll.length) {
    const bagPool = occasionPool(bagsAll, occasion);
    bag = pickWeighted(
      bagPool,
      (b) =>
        (0.45 * colorHarmony(b.dominantColor, primaryColor) +
          0.35 * (shoes ? colorHarmony(b.dominantColor, shoes.dominantColor) : 0.85) +
          0.2) *
        prefFactor(pref, b) *
        wornFactor(b, now),
      rng
    );
  }

  // ----- Dodatki (1–2) -----
  const accessories = pickAccessories(byCat('accessory'), weather, target, occasion, rng, now);

  // ----- Ocena harmonii -----
  const harmonies: number[] = [];
  if (top && bottom) harmonies.push(colorHarmony(top.dominantColor, bottom.dominantColor));
  else harmonies.push(0.92);
  if (shoes) harmonies.push(colorHarmony(shoes.dominantColor, secondaryColor));
  if (outerwear) harmonies.push(colorHarmony(outerwear.dominantColor, primaryColor));
  if (bag) harmonies.push(colorHarmony(bag.dominantColor, primaryColor));
  const score = Math.round((harmonies.reduce((s, h) => s + h, 0) / harmonies.length) * 100);

  const ids = [top, bottom, onepiece, shoes, outerwear, bag, ...accessories]
    .filter(Boolean)
    .map((i) => i!.id);
  return {
    top,
    bottom,
    onepiece,
    shoes,
    outerwear,
    bag,
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
    return !m || chosen.every((c) => !metalOf(c) || metalOf(c) === m);
  };
  const weight = (a: ClothingItem) => {
    let w = wornFactor(a, now);
    if (accessoryKind(a) === 'other' && (target === 'cold' || target === 'cool')) w *= 2.5;
    return w;
  };

  if (isSunny(weather)) {
    const glasses = pool.filter((a) => accessoryKind(a) === 'sunglasses');
    const g = pickWeighted(glasses, weight, rng);
    if (g) chosen.push(g);
  }

  if (chosen.length === 0) {
    const core = pool.filter((a) => ['watch', 'jewelry'].includes(accessoryKind(a)));
    const first = pickWeighted(core.length ? core : pool, weight, rng);
    if (first) chosen.push(first);
  }

  if (chosen.length < 2 && rng() < 0.7) {
    const second = pickWeighted(pool.filter((a) => allowed(a) && !chosen.includes(a)), weight, rng);
    if (second) chosen.push(second);
  }
  return chosen;
}
