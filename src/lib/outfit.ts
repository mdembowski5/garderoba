import type {
  BrightnessType,
  Category,
  ClothingItem,
  DayPreference,
  Occasion,
  Outfit,
  PersonalColorProfile,
  RecommendResult,
  TempRange,
  WeatherData,
} from '../types';
import { CATEGORY_LABELS, OCCASION_LABELS } from './constants';
import { colorHarmony, isVivid } from './palette';
import {
  evaluateColorForPerson,
  loadPersonalProfile,
  type PersonalColorEvaluation,
} from './personalColor';
import { isSunny, isWet, tempRangeFor } from './weather';

export interface RecommendOptions {
  preference: DayPreference;
  /** Okazja (domyślnie „Zwykły dzień”). */
  occasion?: Occasion;
  /** Profil urody (skóra, włosy, oczy). Domyślnie odczytywany z pamięci. */
  personalProfile?: PersonalColorProfile;
  /** Przypięte (zablokowane) elementy, które mają pozostać w zestawie przy losowaniu. */
  locked?: Partial<Record<Category, ClothingItem>>;
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
  (item.lastWornAt && now - item.lastWornAt < 2 * DAY ? 0.4 : 1) * (item.isFavorite ? 1.25 : 1);

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

/** Odrzuca ubrania będące w praniu (z awaryjnym fallbackiem, jeśli wszystko w danej kategorii jest w praniu). */
function cleanPool(list: ClothingItem[], notes?: string[], label?: string): ClothingItem[] {
  const clean = list.filter((i) => !i.inLaundry);
  if (clean.length > 0 || list.length === 0) return clean;
  if (notes && label) {
    notes.push(`Wszystkie ${label} są w praniu – użyto ubrania z kosza na pranie.`);
  }
  return list;
}

/** Najbliższe dopasowanie do temperatury: elementy w odległości ≤ 1 przedziału, a w razie braku – najbliższe. */
function tempPool(
  list: ClothingItem[],
  target: TempRange,
  notes: string[],
  label: string
): ClothingItem[] {
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
    return t === 'light' || b === 'light' ? 2 : 1;
  }
  if (pref === 'dark') {
    if (t !== 'dark' && b !== 'dark') return 0;
    return isVivid(top.colorHex) || isVivid(bottom.colorHex) ? 1 : 2;
  }
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

function prefFactor(pref: DayPreference, item: ClothingItem): number {
  if (pref === 'dark') return isVivid(item.colorHex) ? 0.25 : 1;
  if (pref === 'light') return item.brightnessType === 'dark' ? 0.7 : 1;
  return 1;
}

function personalFactor(
  item: ClothingItem,
  profile: PersonalColorProfile | undefined
): number {
  if (!profile || !profile.enabled) return 1;
  const ev = evaluateColorForPerson(item.dominantColor, item.colorHex, item.category, profile);
  if (ev.tier === 'power') return 1.5;
  if (ev.tier === 'good') return 1.18;
  if (ev.tier === 'caution') return 0.45;
  return 1.0;
}

export function computeOutfitScore(
  outfit: {
    top?: ClothingItem;
    bottom?: ClothingItem;
    onepiece?: ClothingItem;
    shoes?: ClothingItem;
    outerwear?: ClothingItem;
    bag?: ClothingItem;
  },
  profile?: PersonalColorProfile
): number {
  const primaryColor = outfit.onepiece
    ? outfit.onepiece.dominantColor
    : outfit.top?.dominantColor ?? 'Czerń';
  const secondaryColor = outfit.onepiece
    ? outfit.onepiece.dominantColor
    : outfit.bottom?.dominantColor ?? primaryColor;

  const harmonies: number[] = [];
  if (outfit.top && outfit.bottom) {
    harmonies.push(colorHarmony(outfit.top.dominantColor, outfit.bottom.dominantColor));
  } else {
    harmonies.push(0.92);
  }
  if (outfit.shoes) harmonies.push(colorHarmony(outfit.shoes.dominantColor, secondaryColor));
  if (outfit.outerwear) harmonies.push(colorHarmony(outfit.outerwear.dominantColor, primaryColor));
  if (outfit.bag) harmonies.push(colorHarmony(outfit.bag.dominantColor, primaryColor));
  const baseScore = (harmonies.reduce((s, h) => s + h, 0) / harmonies.length) * 100;

  const activeProfile = profile ?? loadPersonalProfile();
  if (!activeProfile.enabled) return Math.round(baseScore);

  const faceItem = outfit.onepiece ?? outfit.top;
  if (!faceItem) return Math.round(baseScore);
  const ev = evaluateColorForPerson(
    faceItem.dominantColor,
    faceItem.colorHex,
    faceItem.category,
    activeProfile
  );
  return Math.max(35, Math.min(100, Math.round(baseScore * 0.85 + ev.matchPercent * 0.15)));
}

export function computeSignature(outfit: {
  top?: ClothingItem;
  bottom?: ClothingItem;
  onepiece?: ClothingItem;
  shoes?: ClothingItem;
  outerwear?: ClothingItem;
  bag?: ClothingItem;
  accessories: ClothingItem[];
}): string {
  return [
    outfit.top,
    outfit.bottom,
    outfit.onepiece,
    outfit.shoes,
    outfit.outerwear,
    outfit.bag,
    ...outfit.accessories,
  ]
    .filter(Boolean)
    .map((i) => i!.id)
    .sort()
    .join('+');
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

  const personalProfile = options.personalProfile ?? loadPersonalProfile();

  let last: Outfit | undefined;
  for (let attempt = 0; attempt < 15; attempt++) {
    const outfit = buildOutfit(
      items,
      weather,
      pref,
      occasion,
      personalProfile,
      options.locked,
      rng,
      now
    );
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
  personalProfile: PersonalColorProfile,
  locked: Partial<Record<Category, ClothingItem>> | undefined,
  rng: () => number,
  now: number
): Outfit {
  const notes: string[] = [];
  const target = tempRangeFor(weather.apparentTemperature);
  const wet = isWet(weather);
  const byCat = (c: Category, label?: string) =>
    cleanPool(
      items.filter((i) => i.category === c),
      notes,
      label
    );

  const allTops = byCat('top', 'góry');
  const allBottoms = byCat('bottom', 'doły');
  const allOnepieces = byCat('onepiece', 'sukienki');

  const lockedTop = locked?.top;
  const lockedBottom = locked?.bottom;
  const lockedOnepiece = locked?.onepiece;

  const bases: BaseCandidate[] = [];

  if (!lockedOnepiece && allTops.length > 0 && allBottoms.length > 0) {
    const topPool = lockedTop
      ? [lockedTop]
      : tempPool(occasionPool(allTops, occasion, notes, 'góry'), target, notes, 'góry');
    const bottomPool = lockedBottom
      ? [lockedBottom]
      : tempPool(occasionPool(allBottoms, occasion, notes, 'dołu'), target, notes, 'dołu');

    for (const top of topPool) {
      for (const bottom of bottomPool) {
        const h = colorHarmony(top.dominantColor, bottom.dominantColor);
        const occMatch =
          (occasionsOf(top).includes(occasion) ? 1 : 0.45) *
          (occasionsOf(bottom).includes(occasion) ? 1 : 0.45);
        const w =
          ((tempFit(top, target) + tempFit(bottom, target)) / 2) *
          occMatch *
          personalFactor(top, personalProfile) *
          personalFactor(bottom, personalProfile) *
          wornFactor(top, now) *
          wornFactor(bottom, now);
        bases.push({ kind: 'pair', top, bottom, h, level: pairLevel(pref, top, bottom), w });
      }
    }
  }

  if (!lockedTop && !lockedBottom && allOnepieces.length > 0) {
    const onePool = lockedOnepiece
      ? [lockedOnepiece]
      : tempPool(
          occasionPool(
            allOnepieces,
            occasion,
            bases.length === 0 ? notes : undefined,
            'sukienek'
          ),
          target,
          bases.length === 0 ? notes : [],
          'sukienek'
        );
    for (const op of onePool) {
      const occMatch = occasionsOf(op).includes(occasion) ? 1.15 : 0.35;
      const w =
        tempFit(op, target) *
        occMatch *
        personalFactor(op, personalProfile) *
        wornFactor(op, now);
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
  if (tierIndex >= 1 && pref !== 'any' && !lockedTop && !lockedBottom && !lockedOnepiece) {
    notes.push('Za mało ubrań pasujących idealnie do wybranej preferencji – złagodzono kryteria.');
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
  let outerwear: ClothingItem | undefined = locked?.outerwear;
  const needOuter = wet || target === 'cool' || target === 'cold';
  const optionalOuter = target === 'mild' && rng() < 0.3;
  if (!outerwear && outerAll.length && (needOuter || optionalOuter)) {
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
          personalFactor(o, personalProfile) *
          wornFactor(o, now),
        rng
      );
    }
  } else if (!outerwear && needOuter && allOuter.length === 0) {
    notes.push(
      wet ? 'Dodaj kurtkę przeciwdeszczową do szafy.' : 'Dodaj kurtkę lub płaszcz do szafy.'
    );
  }

  // ----- Buty -----
  const shoesAll = byCat('shoes', 'butów');
  let shoes: ClothingItem | undefined = locked?.shoes;
  if (!shoes && shoesAll.length) {
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
  } else if (!shoes) {
    notes.push('Dodaj buty do szafy, aby uzupełnić stylizację.');
  }

  // ----- Torebka / Plecak -----
  const bagsAll = byCat('bag');
  let bag: ClothingItem | undefined = locked?.bag;
  if (!bag && bagsAll.length) {
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

  const partial = { top, bottom, onepiece, shoes, outerwear, bag, accessories };
  return {
    ...partial,
    notes: Array.from(new Set(notes)),
    score: computeOutfitScore(partial, personalProfile),
    signature: computeSignature(partial),
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

/** Wymienia tylko jeden wybrany element stylizacji na kolejny najlepiej pasujący z szafy. */
export function swapOutfitPiece(
  current: Outfit,
  category: Category,
  items: ClothingItem[],
  weather: WeatherData,
  occasion: Occasion
): Outfit | null {
  const target = tempRangeFor(weather.apparentTemperature);
  const currentItem =
    category === 'top'
      ? current.top
      : category === 'bottom'
      ? current.bottom
      : category === 'onepiece'
      ? current.onepiece
      : category === 'shoes'
      ? current.shoes
      : category === 'outerwear'
      ? current.outerwear
      : category === 'bag'
      ? current.bag
      : undefined;

  const candidates = cleanPool(items.filter((i) => i.category === category && i.id !== currentItem?.id));
  if (candidates.length === 0) return null;

  const anchorColor =
    category === 'top'
      ? current.bottom?.dominantColor ?? 'Czerń'
      : current.onepiece?.dominantColor ?? current.top?.dominantColor ?? 'Czerń';

  const rng = mulberry32(Date.now());
  const picked = pickWeighted(
    candidates,
    (item) => {
      const h = colorHarmony(item.dominantColor, anchorColor);
      const occ = occasionsOf(item).includes(occasion) ? 1.2 : 0.5;
      return h * h * tempFit(item, target) * occ;
    },
    rng
  );
  if (!picked) return null;

  const next: Outfit = {
    ...current,
    top: category === 'top' ? picked : current.top,
    bottom: category === 'bottom' ? picked : current.bottom,
    onepiece: category === 'onepiece' ? picked : current.onepiece,
    shoes: category === 'shoes' ? picked : current.shoes,
    outerwear: category === 'outerwear' ? picked : current.outerwear,
    bag: category === 'bag' ? picked : current.bag,
  };
  next.score = computeOutfitScore(next);
  next.signature = computeSignature(next);
  return next;
}

// ---------- Asystent pakowania walizki (Travel Capsule Generator) ----------

export interface PackingListEntry {
  item: ClothingItem;
  role: string;
}

export interface PackingPlan {
  entries: PackingListEntry[];
  combinationsCount: number;
}

export function generatePackingList(
  items: ClothingItem[],
  days: number,
  targetTemp: TempRange,
  expectRain: boolean,
  occasion: Occasion
): PackingPlan {
  const clean = items.filter((i) => !i.inLaundry);
  const pool = clean.length > 0 ? clean : items;

  const scoreItem = (item: ClothingItem, anchorColors: string[]) => {
    const tFit = tempFit(item, targetTemp);
    const oFit = occasionsOf(item).includes(occasion) ? 1.3 : 0.6;
    const rainBoost = expectRain && item.isRainproof ? 1.6 : 1.0;
    const favBoost = item.isFavorite ? 1.2 : 1.0;
    const hAvg =
      anchorColors.length > 0
        ? anchorColors.reduce((s, c) => s + colorHarmony(item.dominantColor, c), 0) /
          anchorColors.length
        : 0.9;
    return tFit * oFit * rainBoost * favBoost * (0.4 + 0.6 * hAvg);
  };

  const pickTopN = (cat: Category, count: number, anchors: string[]): ClothingItem[] => {
    const list = pool.filter((i) => i.category === cat);
    return [...list]
      .sort((a, b) => scoreItem(b, anchors) - scoreItem(a, anchors))
      .slice(0, count);
  };

  const bottomsCount = Math.min(4, Math.max(1, Math.ceil(days / 2.5)));
  const topsCount = Math.min(7, Math.max(2, Math.ceil(days * 0.75)));
  const onepieceCount = days >= 3 ? Math.min(2, Math.floor(days / 3)) : 1;
  const shoesCount = days >= 4 ? 2 : 1;
  const outerCount = expectRain || targetTemp === 'cool' || targetTemp === 'cold' ? (days >= 5 ? 2 : 1) : 1;

  const chosenBottoms = pickTopN('bottom', bottomsCount, []);
  const anchorColors = chosenBottoms.map((b) => b.dominantColor);

  const chosenTops = pickTopN('top', topsCount, anchorColors);
  const allAnchors = [...anchorColors, ...chosenTops.map((t) => t.dominantColor)];

  const chosenOnepieces = pickTopN('onepiece', onepieceCount, allAnchors);
  const chosenShoes = pickTopN('shoes', shoesCount, allAnchors);
  const chosenOuter = pickTopN('outerwear', outerCount, allAnchors);
  const chosenBags = pickTopN('bag', 1, allAnchors);
  const chosenAcc = pickTopN('accessory', Math.min(3, Math.max(1, Math.ceil(days / 3))), allAnchors);

  const entries: PackingListEntry[] = [
    ...chosenTops.map((item) => ({ item, role: 'Góra bazowa' })),
    ...chosenBottoms.map((item) => ({ item, role: 'Dół do łączenia' })),
    ...chosenOnepieces.map((item) => ({ item, role: 'Gotowy strój 1-część.' })),
    ...chosenOuter.map((item) => ({ item, role: item.isRainproof ? 'Ochrona przed deszczem' : 'Warstwa wierzchnia' })),
    ...chosenShoes.map((item) => ({ item, role: 'Obuwie wyjazdowe' })),
    ...chosenBags.map((item) => ({ item, role: 'Torebka / Bagaż podręczny' })),
    ...chosenAcc.map((item) => ({ item, role: 'Dodatek' })),
  ];

  const pairCombos = chosenTops.length * chosenBottoms.length;
  const combinationsCount =
    (pairCombos + chosenOnepieces.length) * Math.max(1, chosenShoes.length);

  return { entries, combinationsCount };
}

// ---------- Doradca zakupowy / Przymierzalnia do szafy ----------

export interface PurchaseCandidateInput {
  category: Category;
  subCategory: string;
  dominantColor: string;
  colorHex: string;
  brightnessType: BrightnessType;
  occasions: Occasion[];
}

export interface MatchedWardrobeItem {
  item: ClothingItem;
  harmonyPercent: number;
  occasionOverlap: boolean;
}

export interface ComplementaryGroupAnalysis {
  category: Category;
  title: string;
  requiredForOutfit: boolean;
  totalInWardrobe: number;
  matchingItems: MatchedWardrobeItem[];
  missingWarning?: string;
}

export interface PurchaseAnalysisResult {
  personalEval: PersonalColorEvaluation;
  groups: ComplementaryGroupAnalysis[];
  similarItems: ClothingItem[];
  newOutfitsCount: number;
  wardrobeMatchPercent: number;
  overallScore: number;
  verdictTitle: string;
  verdictTone: 'great' | 'good' | 'caution';
  pros: string[];
  warnings: string[];
}

export function analyzePurchaseCandidate(
  candidate: PurchaseCandidateInput,
  wardrobeItems: ClothingItem[],
  personalProfile: PersonalColorProfile
): PurchaseAnalysisResult {
  const personalEval = evaluateColorForPerson(
    candidate.dominantColor,
    candidate.colorHex,
    candidate.category,
    personalProfile
  );

  // Określamy jakie kategorie w szafie są kluczowe do sparowania z tym ubraniem
  const targetCategories: { category: Category; title: string; required: boolean }[] = (() => {
    switch (candidate.category) {
      case 'top':
        return [
          { category: 'bottom', title: 'Spodnie i spódnice (Dół)', required: true },
          { category: 'shoes', title: 'Buty', required: true },
          { category: 'outerwear', title: 'Okrycia wierzchnie (Kurtki / Marynarki)', required: false },
          { category: 'bag', title: 'Torebki i plecaki', required: false },
        ];
      case 'bottom':
        return [
          { category: 'top', title: 'Bluzki, koszule, t-shirty i swetry (Góra)', required: true },
          { category: 'shoes', title: 'Buty', required: true },
          { category: 'outerwear', title: 'Okrycia wierzchnie', required: false },
          { category: 'bag', title: 'Torebki i plecaki', required: false },
        ];
      case 'onepiece':
        return [
          { category: 'shoes', title: 'Buty do sukienki / kombinezonu', required: true },
          { category: 'outerwear', title: 'Okrycia wierzchnie (Marynarki / Płaszcze)', required: false },
          { category: 'bag', title: 'Torebki', required: false },
          { category: 'accessory', title: 'Biżuteria i dodatki', required: false },
        ];
      case 'outerwear':
        return [
          { category: 'top', title: 'Góra (Bluzki / Koszule / Swetry)', required: true },
          { category: 'bottom', title: 'Dół (Spodnie / Spódnice)', required: true },
          { category: 'onepiece', title: 'Sukienki i kombinezony', required: false },
          { category: 'shoes', title: 'Buty', required: false },
        ];
      case 'shoes':
        return [
          { category: 'bottom', title: 'Spodnie i spódnice (Dół)', required: true },
          { category: 'onepiece', title: 'Sukienki i kombinezony', required: false },
          { category: 'top', title: 'Góra', required: false },
          { category: 'bag', title: 'Torebki i plecaki', required: false },
        ];
      case 'bag':
      case 'accessory':
        return [
          { category: 'top', title: 'Góra', required: true },
          { category: 'bottom', title: 'Dół', required: true },
          { category: 'onepiece', title: 'Sukienki i kombinezony', required: false },
          { category: 'shoes', title: 'Buty', required: false },
        ];
    }
  })();

  const groups: ComplementaryGroupAnalysis[] = targetCategories.map(
    ({ category, title, required }) => {
      const inCat = wardrobeItems.filter((i) => i.category === category);
      const scored: MatchedWardrobeItem[] = inCat
        .map((item) => {
          const h = colorHarmony(candidate.dominantColor, item.dominantColor);
          const itemOcc = occasionsOf(item);
          const occasionOverlap = candidate.occasions.some((o) => itemOcc.includes(o));
          const effectiveHarmony = Math.round((h * (occasionOverlap ? 1 : 0.88)) * 100);
          return {
            item,
            harmonyPercent: Math.min(100, effectiveHarmony),
            occasionOverlap,
          };
        })
        .filter((m) => m.harmonyPercent >= 68)
        .sort((a, b) => b.harmonyPercent - a.harmonyPercent);

      let missingWarning: string | undefined;
      if (inCat.length === 0) {
        missingWarning = `Nie masz jeszcze w szafie żadnych ubrań w kategorii „${CATEGORY_LABELS[category]}”.`;
      } else if (scored.length === 0) {
        missingWarning = `Masz w szafie ${inCat.length} szt. w kategorii „${CATEGORY_LABELS[category]}”, ale żadna nie tworzy spójnej harmonii kolorystycznej z odcieniem „${candidate.dominantColor}”.`;
      }

      return {
        category,
        title,
        requiredForOutfit: required,
        totalInWardrobe: inCat.length,
        matchingItems: scored,
        missingWarning,
      };
    }
  );

  // Obliczamy liczbę nowych pełnych zestawów, które można złożyć z tym ubraniem
  const matchingTops =
    groups.find((g) => g.category === 'top')?.matchingItems.length ??
    wardrobeItems.filter((i) => i.category === 'top').length;
  const matchingBottoms =
    groups.find((g) => g.category === 'bottom')?.matchingItems.length ??
    wardrobeItems.filter((i) => i.category === 'bottom').length;
  const matchingShoes = Math.max(
    1,
    groups.find((g) => g.category === 'shoes')?.matchingItems.length ?? 0
  );

  let newOutfitsCount = 0;
  if (candidate.category === 'top') {
    const bCount = groups.find((g) => g.category === 'bottom')?.matchingItems.length ?? 0;
    const sCount = groups.find((g) => g.category === 'shoes')?.matchingItems.length ?? 0;
    newOutfitsCount = bCount * Math.max(1, sCount);
  } else if (candidate.category === 'bottom') {
    const tCount = groups.find((g) => g.category === 'top')?.matchingItems.length ?? 0;
    const sCount = groups.find((g) => g.category === 'shoes')?.matchingItems.length ?? 0;
    newOutfitsCount = tCount * Math.max(1, sCount);
  } else if (candidate.category === 'onepiece') {
    const sCount = groups.find((g) => g.category === 'shoes')?.matchingItems.length ?? 0;
    const oCount = groups.find((g) => g.category === 'outerwear')?.matchingItems.length ?? 0;
    newOutfitsCount = sCount * Math.max(1, oCount + 1);
  } else {
    newOutfitsCount = Math.max(matchingTops, 1) * Math.max(matchingBottoms, 1) * Math.min(2, matchingShoes);
  }

  // Sprawdzamy duplikaty w szafie
  const similarItems = wardrobeItems.filter(
    (i) => i.category === candidate.category && i.dominantColor === candidate.dominantColor
  );

  // Ocena dopasowania do szafy (0..100)
  const requiredGroups = groups.filter((g) => g.requiredForOutfit);
  let wardrobeMatchPercent = 0;
  if (wardrobeItems.length === 0) {
    wardrobeMatchPercent = 50;
  } else if (requiredGroups.some((g) => g.matchingItems.length === 0)) {
    // Brak kluczowego elementu (np. brak jakichkolwiek pasujących spodni do bluzki!)
    const partialMatches = requiredGroups.filter((g) => g.matchingItems.length > 0).length;
    wardrobeMatchPercent = Math.round((partialMatches / Math.max(1, requiredGroups.length)) * 45);
  } else {
    const avgBest =
      requiredGroups.reduce((sum, g) => {
        const top3 = g.matchingItems.slice(0, 3);
        const avg = top3.reduce((s, m) => s + m.harmonyPercent, 0) / top3.length;
        const countBonus = Math.min(12, (g.matchingItems.length - 1) * 4);
        return sum + Math.min(100, avg + countBonus);
      }, 0) / requiredGroups.length;
    wardrobeMatchPercent = Math.round(avgBest);
  }

  const duplicatePenalty = similarItems.length >= 2 ? 12 : similarItems.length === 1 ? 5 : 0;
  const overallScore = Math.max(
    15,
    Math.min(
      100,
      Math.round(personalEval.matchPercent * 0.45 + wardrobeMatchPercent * 0.55 - duplicatePenalty)
    )
  );

  const pros: string[] = [];
  const warnings: string[] = [];

  if (personalEval.tier === 'power') {
    pros.push(
      `Kolor „${candidate.dominantColor}” należy do Twoich najlepszych barw (${personalEval.season.emoji} ${personalEval.season.name}).`
    );
  } else if (personalEval.tier === 'good') {
    pros.push(
      `Kolor „${candidate.dominantColor}” dobrze współgra z Twoim typem urody (${personalEval.season.name}).`
    );
  } else if (personalEval.tier === 'caution') {
    warnings.push(
      `Kolor „${candidate.dominantColor}” blisko twarzy nie jest optymalny dla Twojego typu urody (${personalEval.season.name}).`
    );
  }

  for (const g of requiredGroups) {
    if (g.matchingItems.length > 0) {
      const examples = g.matchingItems
        .slice(0, 3)
        .map((m) => `${m.item.subCategory} (${m.item.dominantColor.toLowerCase()})`)
        .join(', ');
      pros.push(
        `Pasuje do ${g.matchingItems.length} szt. w kategorii „${g.title}”: m.in. ${examples}.`
      );
    } else if (g.missingWarning) {
      warnings.push(g.missingWarning);
    }
  }

  if (newOutfitsCount > 0) {
    pros.push(`Pozwoli od razu stworzyć ok. ${newOutfitsCount} spójnych stylizacji z obecną szafą.`);
  } else if (wardrobeItems.length > 0) {
    warnings.push(
      'Z obecną zawartością szafy nie stworzysz jeszcze pełnego zestawu – konieczny będzie zakup brakującego elementu do pary.'
    );
  }

  if (similarItems.length > 0) {
    warnings.push(
      `W szafie masz już ${similarItems.length} szt. w tej kategorii i kolorze (${similarItems
        .map((s) => s.subCategory)
        .join(', ')}).`
    );
  } else {
    pros.push(`Brak duplikatu w szafie – nowy odcień w kategorii „${CATEGORY_LABELS[candidate.category]}”.`);
  }

  const verdictTone: 'great' | 'good' | 'caution' =
    overallScore >= 78 ? 'great' : overallScore >= 58 ? 'good' : 'caution';
  const verdictTitle =
    verdictTone === 'great'
      ? 'Świetny zakup – bardzo dobrze pasuje!'
      : verdictTone === 'good'
      ? 'Dobry zakup – warto rozważyć'
      : 'Przemyśl zakup – niska kompatybilność';

  return {
    personalEval,
    groups,
    similarItems,
    newOutfitsCount,
    wardrobeMatchPercent,
    overallScore,
    verdictTitle,
    verdictTone,
    pros,
    warnings,
  };
}

