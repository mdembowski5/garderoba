/** Kompresja zdjęć w locie (niewidoczny <canvas>): maks. 600×600 px, WebP lub JPEG, cel ≤ 80 KB. */

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

export async function compressImage(file: Blob): Promise<CompressedImage> {
  const img = await loadImage(file);
  const ratio = Math.min(1, MAX_DIMENSION / Math.max(img.naturalWidth, img.naturalHeight));
  let width = Math.max(1, Math.round(img.naturalWidth * ratio));
  let height = Math.max(1, Math.round(img.naturalHeight * ratio));
  const type = canEncodeWebp() ? 'image/webp' : 'image/jpeg';

  let best: CompressedImage | undefined;
  for (let round = 0; round < 4; round++) {
    const canvas = drawScaled(img, width, height);
    for (const q of QUALITIES) {
      const blob = await toBlob(canvas, type, q);
      best = { blob, width, height, mime: blob.type || type };
      if (blob.size <= MAX_BYTES) return best;
    }
    // Wciąż za duże – zmniejsz wymiary o 15% i spróbuj ponownie.
    width = Math.max(1, Math.round(width * 0.85));
    height = Math.max(1, Math.round(height * 0.85));
  }
  return best!;
}
