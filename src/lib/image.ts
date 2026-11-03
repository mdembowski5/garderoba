/** Kompresja zdjęć w locie oraz automatyczne wycinanie tła (<canvas>): maks. 600×600 px, ≤ 80 KB. */

import { segmentGarment, shadowAwareLabDist, type Point2D } from './colorAnalysis';
import { srgbToLab } from './palette';

export const MAX_DIMENSION = 600;
export const MAX_BYTES = 80 * 1024;
const QUALITIES = [0.65, 0.55, 0.45, 0.36];

export interface CompressedImage {
  blob: Blob;
  width: number;
  height: number;
  mime: string;
}

export function loadImage(source: Blob): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(source);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Nie udało się wczytać zdjęcia.'));
    };
    img.src = url;
  });
}

let webpSupport: boolean | undefined;
/** Safari nie potrafi kodować WebP w canvasie (zwraca PNG) – wykrywamy to jednorazowo. */
function canEncodeWebp(): boolean {
  if (webpSupport === undefined) {
    const c = document.createElement('canvas');
    c.width = c.height = 1;
    webpSupport = c.toDataURL('image/webp').startsWith('data:image/webp');
  }
  return webpSupport;
}

function toBlob(canvas: HTMLCanvasElement, type: string, quality: number): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('Kompresja zdjęcia nie powiodła się.'))),
      type,
      quality
    );
  });
}

/** Skalowanie wieloetapowe (co najwyżej 2× na krok) – lepsza jakość niż jeden duży skok na Safari. */
function drawScaled(img: HTMLImageElement, width: number, height: number): HTMLCanvasElement {
  let cw = img.naturalWidth;
  let ch = img.naturalHeight;
  let source: CanvasImageSource = img;
  while (cw / 2 > width) {
    const step = document.createElement('canvas');
    step.width = Math.round(cw / 2);
    step.height = Math.round(ch / 2);
    const sctx = step.getContext('2d')!;
    sctx.imageSmoothingQuality = 'high';
    sctx.drawImage(source, 0, 0, step.width, step.height);
    source = step;
    cw = step.width;
    ch = step.height;
  }
  const out = document.createElement('canvas'); // niewidoczny – nigdy nie trafia do DOM
  out.width = width;
  out.height = height;
  const ctx = out.getContext('2d')!;
  ctx.fillStyle = '#ffffff'; // JPEG nie ma przezroczystości
  ctx.fillRect(0, 0, width, height);
  ctx.imageSmoothingQuality = 'high';
  ctx.drawImage(source, 0, 0, width, height);
  return out;
}

async function encodeCanvasToBudget(canvas: HTMLCanvasElement): Promise<CompressedImage> {
  const type = canEncodeWebp() ? 'image/webp' : 'image/jpeg';
  let current = canvas;
  let best: CompressedImage | undefined;

  for (let round = 0; round < 4; round++) {
    for (const q of QUALITIES) {
      const blob = await toBlob(current, type, q);
      best = { blob, width: current.width, height: current.height, mime: blob.type || type };
      if (blob.size <= MAX_BYTES) return best;
    }
    const nextW = Math.max(1, Math.round(current.width * 0.85));
    const nextH = Math.max(1, Math.round(current.height * 0.85));
    const scaled = document.createElement('canvas');
    scaled.width = nextW;
    scaled.height = nextH;
    const sctx = scaled.getContext('2d')!;
    sctx.imageSmoothingQuality = 'high';
    sctx.drawImage(current, 0, 0, nextW, nextH);
    current = scaled;
  }
  return best!;
}

export async function compressImage(file: Blob): Promise<CompressedImage> {
  const img = await loadImage(file);
  const ratio = Math.min(1, MAX_DIMENSION / Math.max(img.naturalWidth, img.naturalHeight));
  const width = Math.max(1, Math.round(img.naturalWidth * ratio));
  const height = Math.max(1, Math.round(img.naturalHeight * ratio));
  const canvas = drawScaled(img, width, height);
  return encodeCanvasToBudget(canvas);
}

/**
 * Automatyczne wycinanie tła ze zdjęcia ubrania (Client-Side Edge-Guided Cutout).
 * Zastępuje wykryte tło czystym studyjnym tłem dopasowanym do kart aplikacji.
 */
export async function removeBackgroundImage(
  source: Blob,
  focusPoint?: Point2D
): Promise<CompressedImage> {
  const img = await loadImage(source);
  const width = img.naturalWidth;
  const height = img.naturalHeight;

  // 1. Szybka segmentacja na siatce maks. 110×110 px
  const segRatio = Math.min(1, 110 / Math.max(width, height));
  const segW = Math.max(16, Math.round(width * segRatio));
  const segH = Math.max(16, Math.round(height * segRatio));

  const segCanvas = document.createElement('canvas');
  segCanvas.width = segW;
  segCanvas.height = segH;
  const segCtx = segCanvas.getContext('2d', { willReadFrequently: true })!;
  segCtx.imageSmoothingQuality = 'high';
  segCtx.drawImage(img, 0, 0, segW, segH);
  const segData = segCtx.getImageData(0, 0, segW, segH).data;
  const { mask, bgLabs, fgLab } = segmentGarment(segData, segW, segH, focusPoint);

  // 2. Nałożenie maski w pełnej rozdzielczości ze wspomaganiem krawędziowym (Guided Feathering)
  const outCanvas = document.createElement('canvas');
  outCanvas.width = width;
  outCanvas.height = height;
  const ctx = outCanvas.getContext('2d', { willReadFrequently: true })!;
  ctx.drawImage(img, 0, 0, width, height);
  const imgData = ctx.getImageData(0, 0, width, height);
  const px = imgData.data;

  const scaleX = (segW - 1) / Math.max(1, width - 1);
  const scaleY = (segH - 1) / Math.max(1, height - 1);

  for (let y = 0; y < height; y++) {
    const sy = y * scaleY;
    const y0 = Math.floor(sy);
    const y1 = Math.min(segH - 1, y0 + 1);
    const fy = sy - y0;
    const dyNorm = y / height - 0.5;

    for (let x = 0; x < width; x++) {
      const sx = x * scaleX;
      const x0 = Math.floor(sx);
      const x1 = Math.min(segW - 1, x0 + 1);
      const fx = sx - x0;

      // Interpolacja dwuliniowa maski
      const m00 = mask[y0 * segW + x0];
      const m10 = mask[y0 * segW + x1];
      const m01 = mask[y1 * segW + x0];
      const m11 = mask[y1 * segW + x1];
      let alpha =
        m00 * (1 - fx) * (1 - fy) +
        m10 * fx * (1 - fy) +
        m01 * (1 - fx) * fy +
        m11 * fx * fy;

      const idx = (y * width + x) * 4;
      const r = px[idx];
      const g = px[idx + 1];
      const b = px[idx + 2];

      // Wyostrzanie krawędzi na pełnej rozdzielczości w strefie przejściowej
      if (alpha > 0.05 && alpha < 0.95 && bgLabs.length > 0) {
        const [l, aLab, bLab] = srgbToLab(r, g, b);
        let dBg = Infinity;
        for (const bg of bgLabs) {
          const d = shadowAwareLabDist(l, aLab, bLab, bg[0], bg[1], bg[2]);
          if (d < dBg) dBg = d;
        }
        const dFg = shadowAwareLabDist(l, aLab, bLab, fgLab[0], fgLab[1], fgLab[2]);
        const colorAffinity = dBg / (dBg + dFg + 0.001);
        alpha = Math.max(0, Math.min(1, alpha * 0.55 + colorAffinity * 0.45));
        // Kontrastowe przejście na samym brzegu ubrania
        alpha = Math.max(0, Math.min(1, (alpha - 0.25) / 0.55));
      }

      if (alpha < 0.999) {
        // Studyjne ciemne tło z delikatnym rozświetleniem w centrum
        const dxNorm = x / width - 0.5;
        const vignette = Math.max(0, 1 - Math.hypot(dxNorm, dyNorm) * 1.25);
        const bgR = Math.round(22 + vignette * 16);
        const bgG = Math.round(29 + vignette * 20);
        const bgB = Math.round(45 + vignette * 28);

        px[idx] = Math.round(r * alpha + bgR * (1 - alpha));
        px[idx + 1] = Math.round(g * alpha + bgG * (1 - alpha));
        px[idx + 2] = Math.round(b * alpha + bgB * (1 - alpha));
      }
    }
  }

  ctx.putImageData(imgData, 0, 0);
  return encodeCanvasToBudget(outCanvas);
}
