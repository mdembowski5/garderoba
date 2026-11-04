import type { BrightnessType, ClothingItem, PatternType } from '../types';

export interface PaletteColor {
  name: string;
  hex: string;
  family: 'neutral' | 'chromatic';
  group: 'achromatic' | 'warm-neutral' | 'blue' | 'green' | 'warm' | 'red-pink' | 'purple';
}

/** Rozbudowana, 20-kolorowa paleta garderoby. */
export const PALETTE: PaletteColor[] = [
  { name: 'Biel', hex: '#ffffff', family: 'neutral', group: 'achromatic' },
  { name: 'Kremowy / Écru', hex: '#f3ead8', family: 'neutral', group: 'warm-neutral' },
  { name: 'Beż', hex: '#d8c3a5', family: 'neutral', group: 'warm-neutral' },
  { name: 'Karmel / Camel', hex: '#c1874b', family: 'neutral', group: 'warm-neutral' },
  { name: 'Brąz', hex: '#6b442a', family: 'neutral', group: 'warm-neutral' },
  { name: 'Szarość', hex: '#8e9299', family: 'neutral', group: 'achromatic' },
  { name: 'Grafit', hex: '#3d4148', family: 'neutral', group: 'achromatic' },
  { name: 'Czerń', hex: '#141416', family: 'neutral', group: 'achromatic' },
  { name: 'Granat', hex: '#1d2d50', family: 'neutral', group: 'blue' },
  { name: 'Niebieski', hex: '#2f66b3', family: 'chromatic', group: 'blue' },
  { name: 'Błękit', hex: '#7bb2e0', family: 'chromatic', group: 'blue' },
  { name: 'Zieleń', hex: '#3d8c52', family: 'chromatic', group: 'green' },
  { name: 'Khaki / Oliwkowy', hex: '#6b7346', family: 'neutral', group: 'green' },
  { name: 'Zieleń butelkowa', hex: '#1b4332', family: 'chromatic', group: 'green' },
  { name: 'Żółty / Musztardowy', hex: '#deb035', family: 'chromatic', group: 'warm' },
  { name: 'Pomarańczowy / Koral', hex: '#e06d3b', family: 'chromatic', group: 'warm' },
  { name: 'Czerwień', hex: '#c9332b', family: 'chromatic', group: 'red-pink' },
  { name: 'Bordowy / Burgund', hex: '#6b1d2f', family: 'chromatic', group: 'red-pink' },
  { name: 'Róż / Pudrowy', hex: '#e39ab2', family: 'chromatic', group: 'red-pink' },
  { name: 'Fiolet / Liliowy', hex: '#7c5295', family: 'chromatic', group: 'purple' },
];

export function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgbToHex(r: number, g: number, b: number): string {
  const to = (v: number) => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0');
  return `#${to(r)}${to(g)}${to(b)}`;
}

/** L = 0.2126·R + 0.7152·G + 0.0722·B  (skala 0–255) */
export function luminance(r: number, g: number, b: number): number {
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function classifyBrightness(L: number): BrightnessType {
  if (L >= 150) return 'light';
  if (L <= 75) return 'dark';
  return 'neutral';
}

export function brightnessOfHex(hex: string): BrightnessType {
  const [r, g, b] = hexToRgb(hex);
  return classifyBrightness(luminance(r, g, b));
}

export function paletteByName(name: string): PaletteColor | undefined {
  return PALETTE.find((p) => p.name === name);
}

// ---- Konwersja sRGB → HSV oraz sRGB → CIE Lab ----

export function rgbToHsv(r: number, g: number, b: number): { h: number; s: number; v: number } {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  const v = max / 255;
  const s = max === 0 ? 0 : d / max;
  let h = 0;
  if (d !== 0) {
    if (max === r) h = 60 * (((g - b) / d) % 6);
    else if (max === g) h = 60 * ((b - r) / d + 2);
    else h = 60 * ((r - g) / d + 4);
    if (h < 0) h += 360;
  }
  return { h, s, v };
}

export function srgbToLab(r: number, g: number, b: number): [number, number, number] {
  const lin = (c: number) => {
    const v = c / 255;
    return v <= 0.04045 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4);
  };
  const R = lin(r);
  const G = lin(g);
  const B = lin(b);
  const x = (R * 0.4124 + G * 0.3576 + B * 0.1805) / 0.95047;
  const y = R * 0.2126 + G * 0.7152 + B * 0.0722;
  const z = (R * 0.0193 + G * 0.1192 + B * 0.9505) / 1.08883;
  const f = (t: number) => (t > 0.008856 ? Math.cbrt(t) : 7.787 * t + 16 / 116);
  const fx = f(x);
  const fy = f(y);
  const fz = f(z);
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

/**
 * Hybrydowy klasyfikator barw ubrań (HSV + CIE Lab):
 * Wykorzystuje nasycenie względne HSV `s = (max - min) / max`, które jest niezmiennicze
 * względem słabego oświetlenia (dzięki czemu ciemny brąz, granat, bordo czy butelkowa zieleń
 * nigdy nie są mylone z czernią).
 */
export function nearestPaletteColor(r: number, g: number, b: number): PaletteColor {
  const { h, s } = rgbToHsv(r, g, b);
  const [L, aLab, bLab] = srgbToLab(r, g, b);
  const chroma = Math.hypot(aLab, bLab);
  const lum = luminance(r, g, b);
  const max = Math.max(r, g, b);
  const get = (name: string) => paletteByName(name)!;

  // 1. Głęboka czerń (bardzo ciemne i brak wyraźnej dominanty barwnej)
  if (max <= 22 || (lum <= 44 && s < 0.23 && chroma < 8.5)) {
    return get('Czerń');
  }

  // 2. Barwy achromatyczne (Czerń, Grafit, Szarość, Kremowy, Biel)
  if (s < 0.15 || (s < 0.21 && chroma < 7.0)) {
    if (lum <= 44) return get('Czerń');
    if (lum <= 95) return get('Grafit');
    if (lum <= 184) return get('Szarość');
    if (bLab > 6.0 && s >= 0.07) return get('Kremowy / Écru');
    return get('Biel');
  }

  // 3. Stonowane ciepłe neutrale (taupe, chłodny brąz, piaskowy beż, écru)
  if (h >= 10 && h <= 54 && s >= 0.15 && s < 0.36) {
    if (lum >= 198) return get('Kremowy / Écru');
    if (lum >= 132) return get('Beż');
    if (lum >= 96 && s >= 0.26) return get('Karmel / Camel');
    return get('Brąz');
  }

  // 4. Rodzina brązów, karmelu, beżu i pomarańczu (Hue 10°–46°)
  if (h >= 10 && h < 46) {
    if (lum < 100) {
      return get('Brąz');
    }
    if (lum < 156) {
      if (s >= 0.62 && h <= 27 && r >= 185) return get('Pomarańczowy / Koral');
      if (lum < 112 && s < 0.48) return get('Brąz');
      return get('Karmel / Camel');
    }
    if (s < 0.36) return lum >= 202 ? get('Kremowy / Écru') : get('Beż');
    if (h <= 30 && s >= 0.54) return get('Pomarańczowy / Koral');
    return get('Karmel / Camel');
  }

  // 5. Żółty / Musztardowy vs Khaki / Oliwkowy (Hue 46°–95°)
  if (h >= 46 && h < 95) {
    if (h < 68 && s >= 0.42 && lum >= 115) return get('Żółty / Musztardowy');
    if (lum >= 185 && s < 0.36) return get('Beż');
    return get('Khaki / Oliwkowy');
  }

  // 6. Zielenie (Hue 95°–172°)
  if (h >= 95 && h < 172) {
    if (lum < 72) return get('Zieleń butelkowa');
    if (h <= 112 && s < 0.44) return get('Khaki / Oliwkowy');
    return get('Zieleń');
  }

  // 7. Błękit, Niebieski, Granat (Hue 172°–258°)
  if (h >= 172 && h < 258) {
    if (lum < 70 || (lum < 88 && h >= 208 && b < 140)) return get('Granat');
    if (lum >= 145 || (s < 0.42 && lum >= 118)) return get('Błękit');
    return get('Niebieski');
  }

  // 8. Fiolet / Liliowy (Hue 258°–312°)
  if (h >= 258 && h < 312) {
    if (lum < 55 && h >= 290) return get('Bordowy / Burgund');
    return get('Fiolet / Liliowy');
  }

  // 9. Róż, Czerwień, Bordowy / Burgund (Hue 312°–360° oraz 0°–10°)
  if (lum < 82 || (r < 140 && s >= 0.32 && g < 55)) {
    // Rozróżnienie ciemnego kasztanowego brązu od bordo przy Hue 6°–10°
    if (h >= 6 && h < 10 && g > b * 1.25) return get('Brąz');
    return get('Bordowy / Burgund');
  }
  if (h >= 312 && h < 346 && (lum >= 120 || s < 0.58)) {
    return get('Róż / Pudrowy');
  }
  if (lum >= 150 && s < 0.52) {
    return get('Róż / Pudrowy');
  }
  return get('Czerwień');
}

// ---- Harmonia barw ----

/** "Jaskrawy" kolor: wysokie nasycenie przy średniej jasności (HSL). */
export function isVivid(hex: string): boolean {
  const [r8, g8, b8] = hexToRgb(hex);
  const r = r8 / 255;
  const g = g8 / 255;
  const b = b8 / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const l = (max + min) / 2;
  if (max === min) return false;
  const s = (max - min) / (1 - Math.abs(2 * l - 1));
  return s > 0.55 && l > 0.3 && l < 0.62;
}

const key = (a: string, b: string) => [a, b].sort().join('|');

/** Dopasowanie wybranych par kolorów (0–1). */
const HARMONY_OVERRIDES: Record<string, number> = {
  [key('Biel', 'Czerń')]: 1,
  [key('Biel', 'Granat')]: 1,
  [key('Biel', 'Niebieski')]: 0.95,
  [key('Biel', 'Beż')]: 0.95,
  [key('Biel', 'Karmel / Camel')]: 0.95,
  [key('Kremowy / Écru', 'Brąz')]: 1,
  [key('Kremowy / Écru', 'Karmel / Camel')]: 0.95,
  [key('Kremowy / Écru', 'Granat')]: 0.95,
  [key('Kremowy / Écru', 'Zieleń butelkowa')]: 0.95,
  [key('Kremowy / Écru', 'Bordowy / Burgund')]: 0.95,
  [key('Beż', 'Brąz')]: 0.98,
  [key('Beż', 'Karmel / Camel')]: 0.95,
  [key('Beż', 'Granat')]: 1,
  [key('Beż', 'Błękit')]: 0.92,
  [key('Beż', 'Khaki / Oliwkowy')]: 0.92,
  [key('Beż', 'Zieleń butelkowa')]: 0.92,
  [key('Beż', 'Bordowy / Burgund')]: 0.9,
  [key('Beż', 'Czerń')]: 0.9,
  [key('Karmel / Camel', 'Brąz')]: 0.92,
  [key('Karmel / Camel', 'Granat')]: 0.95,
  [key('Karmel / Camel', 'Niebieski')]: 0.9,
  [key('Karmel / Camel', 'Czerń')]: 0.88,
  [key('Brąz', 'Zieleń')]: 0.82,
  [key('Brąz', 'Khaki / Oliwkowy')]: 0.88,
  [key('Brąz', 'Zieleń butelkowa')]: 0.85,
  [key('Brąz', 'Niebieski')]: 0.85,
  [key('Brąz', 'Błękit')]: 0.88,
  [key('Brąz', 'Czerń')]: 0.45,
  [key('Brąz', 'Granat')]: 0.55,
  [key('Brąz', 'Szarość')]: 0.55,
  [key('Czerń', 'Granat')]: 0.55,
  [key('Czerń', 'Grafit')]: 0.88,
  [key('Czerń', 'Szarość')]: 0.95,
  [key('Czerń', 'Czerwień')]: 0.9,
  [key('Czerń', 'Bordowy / Burgund')]: 0.9,
  [key('Czerń', 'Róż / Pudrowy')]: 0.88,
  [key('Granat', 'Błękit')]: 0.9,
  [key('Granat', 'Niebieski')]: 0.85,
  [key('Granat', 'Bordowy / Burgund')]: 0.88,
  [key('Granat', 'Czerwień')]: 0.82,
  [key('Granat', 'Żółty / Musztardowy')]: 0.88,
  [key('Granat', 'Szarość')]: 0.9,
  [key('Szarość', 'Róż / Pudrowy')]: 0.92,
  [key('Szarość', 'Błękit')]: 0.9,
  [key('Szarość', 'Bordowy / Burgund')]: 0.88,
  [key('Czerwień', 'Zieleń')]: 0.15,
  [key('Czerwień', 'Pomarańczowy / Koral')]: 0.3,
  [key('Czerwień', 'Róż / Pudrowy')]: 0.4,
  [key('Czerwień', 'Fiolet / Liliowy')]: 0.3,
};

/** Harmonia dwóch kolorów z palety w skali 0–1. */
export function colorHarmony(a: string, b: string): number {
  const pa = paletteByName(a);
  const pb = paletteByName(b);
  if (!pa || !pb) return 0.65;
  if (a === b) return pa.family === 'chromatic' ? 0.78 : 0.9; // stylizacja monochromatyczna
  const override = HARMONY_OVERRIDES[key(a, b)];
  if (override !== undefined) return override;
  if (pa.group === pb.group) return 0.86; // ta sama rodzina barw (np. ton w ton)
  if (pa.family === 'neutral' && pb.family === 'neutral') return 0.9;
  if (pa.family === 'neutral' || pb.family === 'neutral') return 0.85;
  return 0.42; // dwa różne kolory chromatyczne spoza par komplementarnych
}

export type GarmentHarmonyInput = Pick<
  ClothingItem,
  'dominantColor' | 'secondaryColors' | 'pattern'
>;

/** Zwraca wszystkie kolory ubrania (kolor dominujący + kolory dodatkowe). */
export function getAllItemColors(item: GarmentHarmonyInput): string[] {
  const sec = item.secondaryColors ?? [];
  return Array.from(new Set([item.dominantColor, ...sec].filter(Boolean)));
}

export interface GarmentHarmonyResult {
  /** Wynik łączny 0..1 uwzględniający wielokolorowość oraz zasady łączenia wzorów */
  score: number;
  /** Czy wystąpił tzw. "most kolorystyczny" (nawiązanie gładkiego ubrania do koloru dodatkowego wzoru/nadruku) */
  hasColorBridge: boolean;
  /** Komentarz stylizacyjny (np. powód bonusu lub ostrzeżenie o gryzących się wzorach) */
  stylistNote?: string;
}

/**
 * Zaawansowana harmonia dwóch ubrań uwzględniająca:
 * 1. Wielokolorowość i tzw. "Color Bridging" (gdy jedno ubranie nawiązuje do koloru dodatkowego/wzoru drugiego).
 * 2. Powszechnie przyjmowane zasady łączenia wzorów i nadruków (Pattern Mixing Rules):
 *    - Wzór/nadruk + gładka baza (szczególnie w kolorze ze wzoru) = najwyższa harmonia.
 *    - Dwa identyczne wzory (np. paski + paski, kratka + kratka, nadruk + nadruk) = błąd stylizacyjny.
 *    - Nadruk graficzny + mocny wzór (kratka/kwiaty) = konflikt wizualny.
 *    - Dwa różne wzory o różnej skali (np. paski + drobny wzór/kwiaty/kratka) są dozwolone wyłącznie, gdy łączy je wspólny kolor.
 */
export function garmentHarmony(
  a: GarmentHarmonyInput,
  b: GarmentHarmonyInput
): GarmentHarmonyResult {
  const baseH = colorHarmony(a.dominantColor, b.dominantColor);
  const secA = a.secondaryColors ?? [];
  const secB = b.secondaryColors ?? [];
  const allA = getAllItemColors(a);
  const allB = getAllItemColors(b);

  // Sprawdzamy "Color Bridge" – czy kolor główny jednego ubrania powtarza kolor dodatkowy (np. pasek/nadruk/wzór) drugiego
  const bridgeAtoB = secA.includes(b.dominantColor);
  const bridgeBtoA = secB.includes(a.dominantColor);
  const hasColorBridge = bridgeAtoB || bridgeBtoA;

  // Średnia kompatybilność barw dodatkowych
  let multiColorScore = baseH;
  if (hasColorBridge) {
    // Powtórzenie koloru ze wzoru/nadruku na drugim elemencie to wzorcowy zabieg stylizacyjny
    multiColorScore = Math.max(baseH, 0.96);
  } else if (secA.length > 0 || secB.length > 0) {
    let sum = baseH * 2.2;
    let weights = 2.2;
    for (const ca of secA) {
      sum += colorHarmony(ca, b.dominantColor) * 0.65;
      weights += 0.65;
    }
    for (const cb of secB) {
      sum += colorHarmony(a.dominantColor, cb) * 0.65;
      weights += 0.65;
    }
    multiColorScore = sum / weights;
  }

  const patA: PatternType = a.pattern ?? 'solid';
  const patB: PatternType = b.pattern ?? 'solid';

  // Przypadek 1: Oba elementy są gładkie
  if (patA === 'solid' && patB === 'solid') {
    return {
      score: Math.min(1, multiColorScore),
      hasColorBridge,
      stylistNote: hasColorBridge
        ? 'Kolor jednego elementu nawiązuje do barwy dodatkowej drugiego ubrania.'
        : undefined,
    };
  }

  // Przypadek 2: Jeden element ma wzór/nadruk, a drugi jest gładki (Złota zasada stylizacji!)
  if (patA === 'solid' || patB === 'solid') {
    const patterned = patA !== 'solid' ? a : b;
    const patType = patterned.pattern ?? 'solid';
    const boost = hasColorBridge ? 0.06 : 0.03;
    const score = Math.min(1, multiColorScore + boost);
    return {
      score,
      hasColorBridge,
      stylistNote: hasColorBridge
        ? `Wzorcowe połączenie: gładki element powtarza kolor z ${
            patType === 'print' ? 'nadruku' : 'wzoru'
          } (tzw. most kolorystyczny).`
        : 'Dobry balans: wyrazisty wzór/nadruk zrównoważony gładką bazą.',
    };
  }

  // Przypadek 3: Oba elementy mają wzór lub nadruk (Pattern Mixing)
  const sharedColor = allA.some((c) => allB.includes(c));

  // 3a. Dwa takie same wzory/nadruki (np. paski + paski, kratka + kratka, nadruk + nadruk) -> Zgrzyt!
  if (patA === patB) {
    return {
      score: Math.max(0.18, multiColorScore * 0.42),
      hasColorBridge: false,
      stylistNote:
        'Unikaj łączenia dwóch takich samych wzorów lub dwóch nadruków graficznych obok siebie.',
    };
  }

  // 3b. Nadruk graficzny + wzór (kratka/kwiaty/paski) lub kratka + kwiaty bez wspólnej bazy
  const pairSet = new Set<PatternType>([patA, patB]);
  if (pairSet.has('print')) {
    return {
      score: Math.max(0.25, multiColorScore * 0.52),
      hasColorBridge: false,
      stylistNote:
        'Ubranie z nadrukiem graficznym najlepiej łączyć z gładkimi spodniami/spódnicą zamiast z kolejnym wzorem.',
    };
  }

  // 3c. Dwa różne wzory (np. paski + drobne groszki, paski + kratka, paski + kwiaty)
  // Dozwolone w stylizacji, jeśli różnią się geometrią/skalą i mają wspólny kolor spajający!
  if (sharedColor) {
    return {
      score: Math.min(0.86, multiColorScore * 0.9),
      hasColorBridge: true,
      stylistNote:
        'Odważne, ale poprawne łączenie dwóch różnych wzorów spiętych wspólnym kolorem.',
    };
  }

  return {
    score: Math.max(0.22, multiColorScore * 0.48),
    hasColorBridge: false,
    stylistNote:
      'Dwa różne wzory bez wspólnego koloru wprowadzają wizualny chaos – wymień jeden element na gładki.',
  };
}
