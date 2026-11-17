import type { ClothingItem, Outfit } from '../types';

const TASTE_STORAGE_KEY = 'garderoba.tasteMemory.v1';
export const TASTE_CHANGE_EVENT = 'garderoba:taste-change';

export interface TasteMemoryState {
  /** Wagi konkretnych par ubrań (idA|idB -> [-1.0 .. +1.5]) */
  itemPairs: Record<string, number>;
  /** Wagi połączeń kolorystycznych (KolorA|KolorB -> [-0.8 .. +1.0]) */
  colorPairs: Record<string, number>;
  /** Wagi pojedynczych ubrań (id -> [-0.6 .. +0.8]) */
  itemScores: Record<string, number>;
  acceptedCount: number;
  skippedCount: number;
}

const DEFAULT_TASTE: TasteMemoryState = {
  itemPairs: {},
  colorPairs: {},
  itemScores: {},
  acceptedCount: 0,
  skippedCount: 0,
};

function pairKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

export function loadTasteMemory(): TasteMemoryState {
  try {
    const raw = localStorage.getItem(TASTE_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_TASTE, itemPairs: {}, colorPairs: {}, itemScores: {} };
    const parsed = JSON.parse(raw) as Partial<TasteMemoryState>;
    return {
      itemPairs: parsed.itemPairs ?? {},
      colorPairs: parsed.colorPairs ?? {},
      itemScores: parsed.itemScores ?? {},
      acceptedCount: parsed.acceptedCount ?? 0,
      skippedCount: parsed.skippedCount ?? 0,
    };
  } catch {
    return { ...DEFAULT_TASTE, itemPairs: {}, colorPairs: {}, itemScores: {} };
  }
}

function saveTasteMemory(state: TasteMemoryState): void {
  try {
    localStorage.setItem(TASTE_STORAGE_KEY, JSON.stringify(state));
    window.dispatchEvent(new CustomEvent(TASTE_CHANGE_EVENT, { detail: state }));
  } catch {
    // ignore storage quota errors
  }
}

export function resetTasteMemory(): void {
  saveTasteMemory({
    itemPairs: {},
    colorPairs: {},
    itemScores: {},
    acceptedCount: 0,
    skippedCount: 0,
  });
}

function extractMainItems(outfit: Outfit): ClothingItem[] {
  return [
    outfit.onepiece,
    outfit.top,
    outfit.midLayer,
    outfit.bottom,
    outfit.outerwear,
    outfit.shoes,
    outfit.bag,
  ].filter((x): x is ClothingItem => Boolean(x));
}

/**
 * Uczy algorytm, że użytkownik polubił lub zaakceptował dany zestaw
 * (+waga dla par ubrań oraz +waga dla połączeń kolorów).
 */
export function recordPositiveOutfitTaste(outfit: Outfit, isFavorite = false): void {
  const state = loadTasteMemory();
  const main = extractMainItems(outfit);
  const pairDelta = isFavorite ? 0.35 : 0.22;
  const colorDelta = isFavorite ? 0.18 : 0.11;
  const itemDelta = isFavorite ? 0.16 : 0.09;

  for (const item of main) {
    state.itemScores[item.id] = clamp((state.itemScores[item.id] ?? 0) + itemDelta, -0.7, 1.0);
  }

  for (let i = 0; i < main.length; i++) {
    for (let j = i + 1; j < main.length; j++) {
      const a = main[i];
      const b = main[j];
      const pk = pairKey(a.id, b.id);
      state.itemPairs[pk] = clamp((state.itemPairs[pk] ?? 0) + pairDelta, -1.0, 1.5);

      if (a.dominantColor !== b.dominantColor) {
        const ck = pairKey(a.dominantColor, b.dominantColor);
        state.colorPairs[ck] = clamp((state.colorPairs[ck] ?? 0) + colorDelta, -0.8, 1.0);
      }
    }
  }

  state.acceptedCount += 1;
  saveTasteMemory(state);
}

/**
 * Uczy algorytm, że użytkownik pominął/odrzucił dany zestaw
 * (-waga dla pary góra+dół i ich połączenia kolorystycznego).
 */
export function recordSkippedOutfitTaste(outfit: Outfit, strongDislike = false): void {
  const state = loadTasteMemory();
  const pairPenalty = strongDislike ? -0.45 : -0.16;
  const colorPenalty = strongDislike ? -0.22 : -0.07;

  const core: ClothingItem[] = [
    outfit.onepiece,
    outfit.top,
    outfit.bottom,
    outfit.outerwear,
  ].filter((x): x is ClothingItem => Boolean(x));

  for (let i = 0; i < core.length; i++) {
    for (let j = i + 1; j < core.length; j++) {
      const a = core[i];
      const b = core[j];
      const pk = pairKey(a.id, b.id);
      state.itemPairs[pk] = clamp((state.itemPairs[pk] ?? 0) + pairPenalty, -1.0, 1.5);

      if (a.dominantColor !== b.dominantColor) {
        const ck = pairKey(a.dominantColor, b.dominantColor);
        state.colorPairs[ck] = clamp((state.colorPairs[ck] ?? 0) + colorPenalty, -0.8, 1.0);
      }
    }
  }

  state.skippedCount += 1;
  saveTasteMemory(state);
}

/**
 * Zwraca mnożnik preferencji (0.35 .. 1.65) dla pary ubrań na podstawie wyuczonego gustu użytkownika.
 */
export function getTastePairMultiplier(
  a: ClothingItem,
  b: ClothingItem,
  memory?: TasteMemoryState
): { multiplier: number; scoreDelta: number; isLikedPair: boolean } {
  const state = memory ?? loadTasteMemory();
  const pk = pairKey(a.id, b.id);
  const ck = pairKey(a.dominantColor, b.dominantColor);

  const pairScore = state.itemPairs[pk] ?? 0;
  const colorScore = state.colorPairs[ck] ?? 0;
  const itemScore = ((state.itemScores[a.id] ?? 0) + (state.itemScores[b.id] ?? 0)) * 0.5;

  const combined = pairScore * 0.65 + colorScore * 0.25 + itemScore * 0.25;
  const multiplier = clamp(1.0 + combined, 0.35, 1.65);
  const scoreDelta = Math.round(combined * 8);

  return {
    multiplier,
    scoreDelta,
    isLikedPair: combined >= 0.22,
  };
}

export interface TasteSummary {
  totalSignals: number;
  acceptedCount: number;
  skippedCount: number;
  favoriteColorPairs: { pair: string; score: number }[];
  avoidedColorPairs: { pair: string; score: number }[];
}

export function getTasteSummary(): TasteSummary {
  const state = loadTasteMemory();
  const entries = Object.entries(state.colorPairs).map(([pair, score]) => ({
    pair: pair.replace('|', ' + '),
    score,
  }));

  const favoriteColorPairs = entries
    .filter((e) => e.score > 0.08)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4);

  const avoidedColorPairs = entries
    .filter((e) => e.score < -0.08)
    .sort((a, b) => a.score - b.score)
    .slice(0, 4);

  return {
    totalSignals: state.acceptedCount + state.skippedCount,
    acceptedCount: state.acceptedCount,
    skippedCount: state.skippedCount,
    favoriteColorPairs,
    avoidedColorPairs,
  };
}
