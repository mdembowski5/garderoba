import type { BrightnessType } from '../types';
import { loadImage } from './image';
import { classifyBrightness, luminance, nearestPaletteColor, rgbToHex, srgbToLab } from './palette';

export interface Point2D {
  /** Współrzędne znormalizowane 0..1 */
  x: number;
  y: number;
}

export interface ColorAnalysis {
  r: number;
  g: number;
  b: number;
  hex: string;
  luminance: number;
  brightness: BrightnessType;
  paletteName: string;
  paletteHex: string;
  /** Odsetek pikseli zaklasyfikowanych jako ubranie (0..1) */
  foregroundRatio: number;
}

export interface SegmentationResult {
  /** Maska 0..1 (1 = ubranie, 0 = tło) o wymiarach width × height */
  mask: Float32Array;
  width: number;
  height: number;
  bgLabs: [number, number, number][];
  fgLab: [number, number, number];
}

const ANALYSIS_SIZE = 80;

/**
 * Odległość w przestrzeni CIE Lab odporna na cienie:
 * cień na ścianie/podłodze/pościeli obniża jasność L, ale prawie nie zmienia barwy (a, b).
 */
export function shadowAwareLabDist(
  L1: number,
  a1: number,
  b1: number,
  L2: number,
  a2: number,
  b2: number
): number {
  const dL = L1 - L2;
  const wL = dL < 0 ? 0.36 : 0.52;
  return Math.hypot(wL * dL, a1 - a2, b1 - b2);
}

/**
 * Segmentacja ubrania od tła:
 * 1. Próbkuje 4 krawędzie kadru i grupuje kolory tła w przestrzeni CIE Lab.
 * 2. Chroni ubranie dotykające pojedynczej krawędzi (np. dół kadru), porównując z centrum.
 * 3. Wykonuje zalewanie (Flood-Fill) od brzegów z barierą gradientową (Sobel/krawędzie),
 *    aby wyciąć tło wraz z cieniami i zatrzymać się na konturze ubrania.
 * 4. Jeśli użytkownik wskazał punkt `focusPoint` na zdjęciu, segmentuje wokół wybranego miejsca.
 */
export function segmentGarment(
  data: Uint8ClampedArray | number[],
  width: number,
  height: number,
  focusPoint?: Point2D
): SegmentationResult {
  const total = width * height;
  const L = new Float32Array(total);
  const A = new Float32Array(total);
  const B = new Float32Array(total);

  for (let i = 0; i < total; i++) {
    const idx = i * 4;
    const [l, a, b] = srgbToLab(data[idx], data[idx + 1], data[idx + 2]);
    L[i] = l;
    A[i] = a;
    B[i] = b;
  }

  // Tryb ręcznego wskazania punktu na ubraniu (kroplomierz / dotknięcie zdjęcia)
  if (focusPoint) {
    const fx = Math.max(0, Math.min(width - 1, Math.round(focusPoint.x * width)));
    const fy = Math.max(0, Math.min(height - 1, Math.round(focusPoint.y * height)));
    const rad = Math.max(2, Math.round(Math.min(width, height) * 0.05));
    let sumL = 0;
    let sumA = 0;
    let sumB = 0;
    let count = 0;
    for (let y = Math.max(0, fy - rad); y <= Math.min(height - 1, fy + rad); y++) {
      for (let x = Math.max(0, fx - rad); x <= Math.min(width - 1, fx + rad); x++) {
        const i = y * width + x;
        sumL += L[i];
        sumA += A[i];
        sumB += B[i];
        count++;
      }
    }
    const fgLab: [number, number, number] = [sumL / count, sumA / count, sumB / count];
    const mask = new Float32Array(total);
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const i = y * width + x;
        const d = shadowAwareLabDist(L[i], A[i], B[i], fgLab[0], fgLab[1], fgLab[2]);
        const spatial = Math.hypot((x - fx) / width, (y - fy) / height);
        if (d < 22 && spatial < 0.65) {
          mask[i] = d < 14 ? 1 : Math.max(0.15, 1 - (d - 14) / 10);
        }
      }
    }
    return { mask, width, height, bgLabs: [], fgLab };
  }

  // 1. Średni kolor ścisłego centrum kadru (rdzeń ubrania)
  let cL = 0;
  let cA = 0;
  let cB = 0;
  let cCount = 0;
  const x0 = Math.floor(width * 0.35);
  const x1 = Math.ceil(width * 0.65);
  const y0 = Math.floor(height * 0.35);
  const y1 = Math.ceil(height * 0.65);
  for (let y = y0; y < y1; y++) {
    for (let x = x0; x < x1; x++) {
      const i = y * width + x;
      cL += L[i];
      cA += A[i];
      cB += B[i];
      cCount++;
    }
  }
  const coreLab: [number, number, number] = [
    cCount ? cL / cCount : 50,
    cCount ? cA / cCount : 0,
    cCount ? cB / cCount : 0,
  ];

  // 2. Klasteryzacja pikseli brzegowych (ramka 6% szerokości/wysokości)
  const bw = Math.max(2, Math.round(width * 0.06));
  const bh = Math.max(2, Math.round(height * 0.06));

  interface BorderCluster {
    L: number;
    a: number;
    b: number;
    count: number;
    edgesMask: number; // 1=góra, 2=dół, 4=lewo, 8=prawo
    cornerCount: number;
  }
  const clusters: BorderCluster[] = [];
  let borderTotal = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const onTop = y < bh;
      const onBottom = y >= height - bh;
      const onLeft = x < bw;
      const onRight = x >= width - bw;
      if (!onTop && !onBottom && !onLeft && !onRight) continue;

      const i = y * width + x;
      if (data[i * 4 + 3] < 128) continue;

      borderTotal++;
      const edgeBit = (onTop ? 1 : 0) | (onBottom ? 2 : 0) | (onLeft ? 4 : 0) | (onRight ? 8 : 0);
      const isCorner = (onTop || onBottom) && (onLeft || onRight);

      let found: BorderCluster | undefined;
      for (const c of clusters) {
        if (shadowAwareLabDist(L[i], A[i], B[i], c.L, c.a, c.b) < 14) {
          found = c;
          break;
        }
      }
      if (found) {
        const n = found.count + 1;
        found.L = (found.L * found.count + L[i]) / n;
        found.a = (found.a * found.count + A[i]) / n;
        found.b = (found.b * found.count + B[i]) / n;
        found.count = n;
        found.edgesMask |= edgeBit;
        if (isCorner) found.cornerCount++;
      } else {
        clusters.push({
          L: L[i],
          a: A[i],
          b: B[i],
          count: 1,
          edgesMask: edgeBit,
          cornerCount: isCorner ? 1 : 0,
        });
      }
    }
  }

  clusters.sort((a, b) => b.count - a.count);

  const countBits = (m: number) => ((m & 1) !== 0 ? 1 : 0) + ((m & 2) !== 0 ? 1 : 0) + ((m & 4) !== 0 ? 1 : 0) + ((m & 8) !== 0 ? 1 : 0);

  // Wybór klastrów tła: odrzucamy klaster, który występuje tylko na 1 krawędzi, nie ma narożników
  // i jednocześnie pokrywa się z kolorem centrum (np. koszulka wychodząca dołem poza kadr).
  const bgClusters = clusters.filter((c, idx) => {
    if (c.count < borderTotal * 0.05 && idx > 0) return false;
    const edges = countBits(c.edgesMask);
    const distToCore = shadowAwareLabDist(c.L, c.a, c.b, coreLab[0], coreLab[1], coreLab[2]);
    if (edges === 1 && c.cornerCount === 0 && distToCore < 13 && clusters.length > 1) {
      return false;
    }
    return true;
  });

  if (bgClusters.length === 0 && clusters.length > 0) {
    bgClusters.push(clusters[0]);
  }

  const bgLabs: [number, number, number][] = bgClusters.slice(0, 4).map((c) => [c.L, c.a, c.b]);

  const minBgDist = new Float32Array(total);
  for (let i = 0; i < total; i++) {
    let best = Infinity;
    for (const bg of bgLabs) {
      const d = shadowAwareLabDist(L[i], A[i], B[i], bg[0], bg[1], bg[2]);
      if (d < best) best = d;
    }
    minBgDist[i] = best;
  }

  // 3. Zalewanie (Flood-Fill) od krawędzi z barierą krawędziową
  const runFloodFill = (globalThresh: number, stepThresh: number): Uint8Array => {
    const bgVisited = new Uint8Array(total);
    const queue = new Int32Array(total);
    let head = 0;
    let tail = 0;

    const trySeed = (x: number, y: number) => {
      const i = y * width + x;
      if (bgVisited[i]) return;
      if (data[i * 4 + 3] < 128 || minBgDist[i] < globalThresh) {
        bgVisited[i] = 1;
        queue[tail++] = i;
      }
    };

    for (let x = 0; x < width; x++) {
      trySeed(x, 0);
      trySeed(x, height - 1);
    }
    for (let y = 0; y < height; y++) {
      trySeed(0, y);
      trySeed(width - 1, y);
    }

    const dirs = [-1, 0, 1, 0, 0, -1, 0, 1, -1, -1, 1, -1, -1, 1, 1, 1];
    while (head < tail) {
      const curr = queue[head++];
      const cx = curr % width;
      const cy = (curr - cx) / width;

      for (let d = 0; d < 16; d += 2) {
        const nx = cx + dirs[d];
        const ny = cy + dirs[d + 1];
        if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
        const next = ny * width + nx;
        if (bgVisited[next]) continue;

        const stepDist = Math.hypot(
          0.55 * (L[curr] - L[next]),
          A[curr] - A[next],
          B[curr] - B[next]
        );
        if (minBgDist[next] < globalThresh && stepDist < stepThresh) {
          bgVisited[next] = 1;
          queue[tail++] = next;
        }
      }
    }
    return bgVisited;
  };

  let bgVisited = runFloodFill(18.5, 7.2);

  // Odcięcie "oczek" tła wewnątrz konturu (np. przestrzeń między rękawami a tułowiem)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      if (bgVisited[i]) continue;
      const dx = (x + 0.5) / width - 0.5;
      const dy = (y + 0.5) / height - 0.5;
      const inTightCore = Math.hypot(dx, dy) < 0.18;
      if (!inTightCore && minBgDist[i] < 10.0) {
        bgVisited[i] = 1;
      }
    }
  }

  // 4. Sprawdzenie, czy ubranie nie miało identycznego koloru co tło (np. biała koszulka na białej ścianie)
  let centerFg = 0;
  let centerTotal = 0;
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const dx = ((x + 0.5) / width - 0.5) / 0.27;
      const dy = ((y + 0.5) / height - 0.5) / 0.31;
      if (dx * dx + dy * dy <= 1) {
        centerTotal++;
        if (!bgVisited[y * width + x]) centerFg++;
      }
    }
  }

  // Jeśli flood-fill zjadł >86% środka, próbujemy rygorystycznego progu, a w ostateczności elipsy centralnej
  if (centerFg < centerTotal * 0.14) {
    bgVisited = runFloodFill(10.0, 3.2);
    centerFg = 0;
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const dx = ((x + 0.5) / width - 0.5) / 0.27;
        const dy = ((y + 0.5) / height - 0.5) / 0.31;
        if (dx * dx + dy * dy <= 1 && !bgVisited[y * width + x]) centerFg++;
      }
    }
    if (centerFg < centerTotal * 0.14) {
      for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
          const dx = ((x + 0.5) / width - 0.5) / 0.28;
          const dy = ((y + 0.5) / height - 0.5) / 0.33;
          bgVisited[y * width + x] = dx * dx + dy * dy <= 1 ? 0 : 1;
        }
      }
    }
  }

  // 5. Filtr większościowy 3×3 (usuwa pojedyncze ziarenka szumu) + wygładzenie krawędzi maski
  const cleanFg = new Uint8Array(total);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let fgNeighbors = 0;
      let cnt = 0;
      for (let dy = -1; dy <= 1; dy++) {
        const ny = y + dy;
        if (ny < 0 || ny >= height) continue;
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx;
          if (nx < 0 || nx >= width) continue;
          cnt++;
          if (!bgVisited[ny * width + nx]) fgNeighbors++;
        }
      }
      cleanFg[y * width + x] = fgNeighbors * 2 >= cnt ? 1 : 0;
    }
  }

  const mask = new Float32Array(total);
  let fgSumL = 0;
  let fgSumA = 0;
  let fgSumB = 0;
  let fgWeightSum = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let sum = 0;
      let cnt = 0;
      for (let dy = -1; dy <= 1; dy++) {
        const ny = y + dy;
        if (ny < 0 || ny >= height) continue;
        for (let dx = -1; dx <= 1; dx++) {
          const nx = x + dx;
          if (nx < 0 || nx >= width) continue;
          cnt++;
          sum += cleanFg[ny * width + nx];
        }
      }
      const i = y * width + x;
      const m = sum / cnt;
      mask[i] = m;
      if (m > 0.5) {
        fgSumL += L[i] * m;
        fgSumA += A[i] * m;
        fgSumB += B[i] * m;
        fgWeightSum += m;
      }
    }
  }

  const fgLab: [number, number, number] = fgWeightSum
    ? [fgSumL / fgWeightSum, fgSumA / fgWeightSum, fgSumB / fgWeightSum]
    : coreLab;

  return { mask, width, height, bgLabs, fgLab };
}

/**
 * Analiza koloru ubrania po stronie klienta:
 *  1. Segmentuje ubranie i odrzuca tło (ściana, podłoga, pościel, cienie).
 *  2. Waży piksele pierwszego planu gaussowsko wokół centrum (lub wskazanego punktu).
 *  3. Wyznacza dominujące skupisko barwy w przestrzeni CIE Lab z wygładzaniem sąsiedztwa
 *     (brak sztucznego dzielenia koloru na granicach kubełków RGB).
 *  4. Oblicza luminancję L = 0.2126R + 0.7152G + 0.0722B oraz najbliższy kolor palety.
 */
export async function analyzeImage(blob: Blob, focusPoint?: Point2D): Promise<ColorAnalysis> {
  const img = await loadImage(blob);
  const canvas = document.createElement('canvas');
  canvas.width = ANALYSIS_SIZE;
  canvas.height = ANALYSIS_SIZE;
  const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(img, 0, 0, ANALYSIS_SIZE, ANALYSIS_SIZE);
  const { data } = ctx.getImageData(0, 0, ANALYSIS_SIZE, ANALYSIS_SIZE);
  return analyzePixels(data, ANALYSIS_SIZE, ANALYSIS_SIZE, focusPoint);
}

export function analyzePixels(
  data: Uint8ClampedArray | number[],
  width = 50,
  height = 50,
  focusPoint?: Point2D
): ColorAnalysis {
  const total = width * height;
  const seg = segmentGarment(data, width, height, focusPoint);
  const { mask, bgLabs } = seg;

  const cx = focusPoint ? focusPoint.x : 0.5;
  const cy = focusPoint ? focusPoint.y : 0.5;
  const sigma = focusPoint ? 0.14 : 0.22;

  interface LabBin {
    lBin: number;
    aBin: number;
    bBin: number;
    w: number;
    sumL: number;
    sumA: number;
    sumB: number;
    sumR: number;
    sumG: number;
    sumB_rgb: number;
  }

  const bins = new Map<number, LabBin>();
  let fgPixelCount = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      const fg = mask[i];
      if (fg < 0.25) continue;
      const idx = i * 4;
      if (data[idx + 3] < 128) continue;

      fgPixelCount++;
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      const [lLab, aLab, bLab] = srgbToLab(r, g, b);

      const dx = (x + 0.5) / width - cx;
      const dy = (y + 0.5) / height - cy;
      const spatialW = Math.exp(-(dx * dx + dy * dy) / (2 * sigma * sigma));

      // Dodatkowe wzmocnienie dla pikseli wyraźnie różniących się od tła
      let minBg = Infinity;
      for (const bg of bgLabs) {
        const d = shadowAwareLabDist(lLab, aLab, bLab, bg[0], bg[1], bg[2]);
        if (d < minBg) minBg = d;
      }
      const contrastW = bgLabs.length ? Math.min(1.8, Math.max(0.25, (minBg - 8) / 14)) : 1;

      const w = fg * fg * spatialW * contrastW;
      if (w <= 1e-5) continue;

      // Kubełki w CIE Lab co ~6 jednostek
      const lBin = Math.max(0, Math.min(16, Math.round(lLab / 6)));
      const aBin = Math.max(0, Math.min(42, Math.round((aLab + 128) / 6)));
      const bBin = Math.max(0, Math.min(42, Math.round((bLab + 128) / 6)));
      const key = (lBin << 12) | (aBin << 6) | bBin;

      const existing = bins.get(key);
      if (existing) {
        existing.w += w;
        existing.sumL += lLab * w;
        existing.sumA += aLab * w;
        existing.sumB += bLab * w;
        existing.sumR += r * w;
        existing.sumG += g * w;
        existing.sumB_rgb += b * w;
      } else {
        bins.set(key, {
          lBin,
          aBin,
          bBin,
          w,
          sumL: lLab * w,
          sumA: aLab * w,
          sumB: bLab * w,
          sumR: r * w,
          sumG: g * w,
          sumB_rgb: b * w,
        });
      }
    }
  }

  const binList = Array.from(bins.values());
  let bestCluster: { L: number; a: number; b: number; density: number } | undefined;

  // Wygładzanie gęstości sąsiedztwa w Lab – zapobiega rozbijaniu koloru na granicy kubełków
  for (const b1 of binList) {
    let density = 0;
    for (const b2 of binList) {
      const dl = Math.abs(b1.lBin - b2.lBin);
      const da = Math.abs(b1.aBin - b2.aBin);
      const db = Math.abs(b1.bBin - b2.bBin);
      if (dl <= 2 && da <= 2 && db <= 2) {
        const dist2 = dl * dl * 0.5 + da * da + db * db;
        if (dist2 <= 5) {
          density += b2.w / (1 + 0.25 * dist2);
        }
      }
    }
    const meanL = b1.sumL / b1.w;
    const meanA = b1.sumA / b1.w;
    const meanB = b1.sumB / b1.w;
    // Lekka preferencja dla nasyconego koloru ubrania względem szarych cieni
    const chroma = Math.hypot(meanA, meanB);
    const chromaBoost = chroma > 14 ? 1.15 : 1.0;
    const score = density * chromaBoost;

    if (!bestCluster || score > bestCluster.density) {
      bestCluster = { L: meanL, a: meanA, b: meanB, density: score };
    }
  }

  let r = 128;
  let g = 128;
  let b = 128;

  if (bestCluster) {
    let sumR = 0;
    let sumG = 0;
    let sumB = 0;
    let sumW = 0;
    for (const bin of binList) {
      const bL = bin.sumL / bin.w;
      const bA = bin.sumA / bin.w;
      const bB = bin.sumB / bin.w;
      const d = shadowAwareLabDist(bL, bA, bB, bestCluster.L, bestCluster.a, bestCluster.b);
      if (d <= 15) {
        sumR += bin.sumR;
        sumG += bin.sumG;
        sumB += bin.sumB_rgb;
        sumW += bin.w;
      }
    }
    if (sumW > 0) {
      r = sumR / sumW;
      g = sumG / sumW;
      b = sumB / sumW;
    }
  }

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
    foregroundRatio: fgPixelCount / total,
  };
}
