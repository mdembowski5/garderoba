import type { BrightnessType } from '../types';
import { loadImage } from './image';
import { classifyBrightness, luminance, nearestPaletteColor, rgbToHex } from './palette';

export interface ColorAnalysis {
  r: number;
  g: number;
  b: number;
  hex: string;
  luminance: number;
  brightness: BrightnessType;
  paletteName: string;
  paletteHex: string;
}

const SIZE = 50;

/**
 * Analiza koloru po stronie klienta (bez ML):
 *  1. skalowanie do 50×50 px,
 *  2. odrzucenie jasnego/szarego tła (tylko jeśli ramka zdjęcia faktycznie jest „tłem”),
 *  3. kwantyzacja do 8×8×8 kubełków, ważona bliskością środka kadru,
 *  4. dominujący kubełek → średni RGB → luminancja L = 0.2126R + 0.7152G + 0.0722B,
 *  5. najbliższy kolor palety (Lab).
 */
export async function analyzeImage(blob: Blob): Promise<ColorAnalysis> {
  const img = await loadImage(blob);
  const canvas = document.createElement('canvas');
  canvas.width = SIZE;
  canvas.height = SIZE;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, SIZE, SIZE);
  const { data } = ctx.getImageData(0, 0, SIZE, SIZE);
  return analyzePixels(data);
}

function isBackgroundLike(r: number, g: number, b: number, a: number): boolean {
  if (a < 128) return true;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return min >= 205 && max - min <= 22; // białe / jasnoszare
}

export function analyzePixels(data: Uint8ClampedArray | number[]): ColorAnalysis {
  const total = SIZE * SIZE;

  // Czy obramowanie kadru to tło (jasne/szare)? Jeśli nie, niczego nie odrzucamy (np. biała koszulka na ciemnym tle).
  let border = 0;
  let borderBg = 0;
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      if (x > 1 && x < SIZE - 2 && y > 1 && y < SIZE - 2) continue;
      const i = (y * SIZE + x) * 4;
      border++;
      if (isBackgroundLike(data[i], data[i + 1], data[i + 2], data[i + 3])) borderBg++;
    }
  }
  const rejectBackground = borderBg / border >= 0.6;

  const buckets = new Map<number, { w: number; r: number; g: number; b: number }>();
  let accepted = 0;
  const fill = (skipBg: boolean) => {
    buckets.clear();
    accepted = 0;
    for (let y = 0; y < SIZE; y++) {
      for (let x = 0; x < SIZE; x++) {
        const i = (y * SIZE + x) * 4;
        const r = data[i];
        const g = data[i + 1];
        const b = data[i + 2];
        const a = data[i + 3];
        if (a < 128) continue;
        if (skipBg && isBackgroundLike(r, g, b, a)) continue;
        const dx = (x + 0.5) / SIZE - 0.5;
        const dy = (y + 0.5) / SIZE - 0.5;
        const w = 0.35 + 0.65 * (1 - Math.min(1, Math.hypot(dx, dy) / 0.707)); // środek ważniejszy
        const k = ((r >> 5) << 6) | ((g >> 5) << 3) | (b >> 5);
        const e = buckets.get(k);
        if (e) {
          e.w += w;
          e.r += r * w;
          e.g += g * w;
          e.b += b * w;
        } else {
          buckets.set(k, { w, r: r * w, g: g * w, b: b * w });
        }
        accepted++;
      }
    }
  };

  fill(rejectBackground);
  // Prawie wszystko uznane za tło → to prawdopodobnie biała/jasna odzież; użyj wszystkich pikseli.
  if (accepted < total * 0.06) fill(false);

  let top: { w: number; r: number; g: number; b: number } | undefined;
  for (const e of buckets.values()) if (!top || e.w > top.w) top = e;

  const r = top ? top.r / top.w : 128;
  const g = top ? top.g / top.w : 128;
  const b = top ? top.b / top.w : 128;
  const L = luminance(r, g, b);
  const palette = nearestPaletteColor(r, g, b);

  return {
    r: Math.round(r),
    g: Math.round(g),
    b: Math.round(b),
    hex: rgbToHex(r, g, b),
    luminance: L,
    brightness: classifyBrightness(L),
    paletteName: palette.name,
    paletteHex: palette.hex,
  };
}
