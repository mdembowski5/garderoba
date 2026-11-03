import type { BrightnessType } from '../types';

export interface PaletteColor {
  name: string;
  hex: string;
  family: 'neutral' | 'chromatic';
}

/** Predefiniowana paleta podstawowa. */
export const PALETTE: PaletteColor[] = [
  { name: 'Biel', hex: '#ffffff', family: 'neutral' },
  { name: 'Czerń', hex: '#141414', family: 'neutral' },
  { name: 'Szarość', hex: '#8a8a8a', family: 'neutral' },
  { name: 'Beż', hex: '#d9c7a7', family: 'neutral' },
  { name: 'Granat', hex: '#1e2a4a', family: 'neutral' },
  { name: 'Błękit', hex: '#6fa8dc', family: 'chromatic' },
  { name: 'Zieleń', hex: '#4f8f55', family: 'chromatic' },
  { name: 'Czerwień', hex: '#c4372b', family: 'chromatic' },
  { name: 'Brąz', hex: '#6b4a2f', family: 'neutral' },
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

// ---- Dopasowanie do najbliższego koloru palety (odległość w przestrzeni CIE Lab) ----

function srgbToLab(r: number, g: number, b: number): [number, number, number] {
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

const PALETTE_LAB = PALETTE.map((p) => ({ p, lab: srgbToLab(...hexToRgb(p.hex)) }));

export function nearestPaletteColor(r: number, g: number, b: number): PaletteColor {
  const lab = srgbToLab(r, g, b);
  let best = PALETTE_LAB[0];
  let bestD = Infinity;
  for (const entry of PALETTE_LAB) {
    const d =
      (entry.lab[0] - lab[0]) ** 2 + (entry.lab[1] - lab[1]) ** 2 + (entry.lab[2] - lab[2]) ** 2;
    if (d < bestD) {
      bestD = d;
      best = entry;
    }
  }
  return best.p;
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

/** Ręcznie dobrane wyjątki od reguł ogólnych (0–1). */
const HARMONY_OVERRIDES: Record<string, number> = {
  [key('Czerń', 'Brąz')]: 0.35,
  [key('Brąz', 'Granat')]: 0.5,
  [key('Brąz', 'Szarość')]: 0.55,
  [key('Czerń', 'Granat')]: 0.55,
  [key('Czerwień', 'Zieleń')]: 0.1,
  [key('Czerwień', 'Błękit')]: 0.3,
  [key('Błękit', 'Zieleń')]: 0.45,
  [key('Brąz', 'Czerwień')]: 0.35,
  [key('Czerwień', 'Granat')]: 0.7,
  [key('Brąz', 'Zieleń')]: 0.8,
  [key('Beż', 'Brąz')]: 0.95,
  [key('Beż', 'Granat')]: 1,
  [key('Błękit', 'Granat')]: 0.8,
  [key('Biel', 'Czerń')]: 1,
};

/** Harmonia dwóch kolorów z palety w skali 0–1. */
export function colorHarmony(a: string, b: string): number {
  const pa = paletteByName(a);
  const pb = paletteByName(b);
  if (!pa || !pb) return 0.6;
  if (a === b) return pa.family === 'chromatic' ? 0.7 : 0.9; // monochromatyczne
  const override = HARMONY_OVERRIDES[key(a, b)];
  if (override !== undefined) return override;
  if (pa.family === 'neutral' && pb.family === 'neutral') return 0.9;
  if (pa.family === 'neutral' || pb.family === 'neutral') return 0.85;
  return 0.35; // dwa różne kolory chromatyczne
}
