import type { ClothingItem, Occasion, Outfit, WeatherData } from '../types';
import { CATEGORY_LABELS, OCCASION_LABELS, PATTERN_LABELS } from './constants';
import { renderFallbackIllustrationForItem } from './demoWardrobe';
import { weatherLabel } from './weather';

function loadImgElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Image load error'));
    img.src = src;
  });
}

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/**
 * Generuje estetyczny kolaż (moodboard 1080×1350 PNG) dla wybranej stylizacji
 * i pobiera go na urządzenie (lub otwiera arkusz udostępniania w iOS).
 */
export async function exportOutfitCollage(
  outfit: Outfit,
  weather?: WeatherData | null,
  occasion: Occasion = 'casual'
): Promise<void> {
  const W = 1080;
  const H = 1350;
  const canvas = document.createElement('canvas');
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;

  // 1. Tło studyjne
  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#0f1322');
  bg.addColorStop(0.5, '#171d33');
  bg.addColorStop(1, '#0d101d');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  // Nagłówek
  ctx.fillStyle = '#a78bfa';
  ctx.font = 'bold 26px system-ui, -apple-system, sans-serif';
  ctx.fillText('GARDEROBA · KARTA STYLIZACJI', 60, 78);

  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 46px system-ui, -apple-system, sans-serif';
  const dateStr = new Date().toLocaleDateString('pl-PL', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });
  ctx.fillText(dateStr.charAt(0).toUpperCase() + dateStr.slice(1), 60, 136);

  const subText = [
    `Okazja: ${OCCASION_LABELS[occasion]}`,
    weather
      ? `${Math.round(weather.apparentTemperature)}°C · ${weatherLabel(
          weather.weatherCode,
          weather.isDay
        )}`
      : null,
  ]
    .filter(Boolean)
    .join('   •   ');
  ctx.fillStyle = '#9ca3af';
  ctx.font = '500 26px system-ui, -apple-system, sans-serif';
  ctx.fillText(subText, 60, 180);

  // Odznaka wyniku harmonii
  drawRoundedRect(ctx, W - 280, 65, 220, 96, 28);
  ctx.fillStyle = 'rgba(16, 185, 129, 0.18)';
  ctx.fill();
  ctx.strokeStyle = 'rgba(52, 211, 153, 0.5)';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = '#6ee7b7';
  ctx.font = 'bold 42px system-ui, -apple-system, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`${outfit.score}%`, W - 170, 122);
  ctx.font = '600 18px system-ui, -apple-system, sans-serif';
  ctx.fillText('HARMONIA BARW', W - 170, 146);
  ctx.textAlign = 'left';

  // Zbieramy elementy do siatki (maks. 6 kart)
  const pieces: { item: ClothingItem; role: string }[] = [];
  if (outfit.onepiece) {
    pieces.push({ item: outfit.onepiece, role: 'Sukienka / 1-cz.' });
  } else {
    if (outfit.top) pieces.push({ item: outfit.top, role: CATEGORY_LABELS.top });
    if (outfit.midLayer)
      pieces.push({ item: outfit.midLayer, role: '2. warstwa (na cebulkę)' });
    if (outfit.bottom) pieces.push({ item: outfit.bottom, role: CATEGORY_LABELS.bottom });
  }
  if (outfit.outerwear) pieces.push({ item: outfit.outerwear, role: 'Okrycie wierzchnie' });
  if (outfit.shoes) pieces.push({ item: outfit.shoes, role: CATEGORY_LABELS.shoes });
  if (outfit.bag) pieces.push({ item: outfit.bag, role: 'Torebka / Plecak' });
  for (const acc of outfit.accessories) {
    if (pieces.length < 6) {
      pieces.push({ item: acc, role: 'Dodatek' });
    }
  }

  const shown = pieces.slice(0, 6);
  const cols = shown.length <= 4 ? 2 : 3;
  const rows = Math.ceil(shown.length / cols);
  const gridLeft = 60;
  const gridTop = 225;
  const gridW = W - 120;
  const gap = 26;
  const cardW = Math.floor((gridW - gap * (cols - 1)) / cols);
  const cardH = rows === 1 ? 520 : 415;

  for (let i = 0; i < shown.length; i++) {
    const { item, role } = shown[i];
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = gridLeft + col * (cardW + gap);
    const y = gridTop + row * (cardH + gap);

    drawRoundedRect(ctx, x, y, cardW, cardH, 28);
    ctx.fillStyle = '#1e2640';
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 2;
    ctx.stroke();

    // Zdjęcie ubrania
    const imgH = cardH - 96;
    ctx.save();
    drawRoundedRect(ctx, x + 12, y + 12, cardW - 24, imgH - 12, 20);
    ctx.clip();
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x + 12, y + 12, cardW - 24, imgH - 12);

    const src = item.imageDataUrl || renderFallbackIllustrationForItem(item);
    try {
      const img = await loadImgElement(src);
      ctx.drawImage(img, x + 12, y + 12, cardW - 24, imgH - 12);
    } catch {
      ctx.fillStyle = item.colorHex;
      ctx.fillRect(x + 12, y + 12, cardW - 24, imgH - 12);
    }
    ctx.restore();

    // Podpis pod zdjęciem
    ctx.fillStyle = '#a78bfa';
    ctx.font = 'bold 18px system-ui, -apple-system, sans-serif';
    ctx.fillText(role.toUpperCase(), x + 20, y + imgH + 28);

    // Kropka koloru + nazwa podkategorii
    ctx.beginPath();
    ctx.arc(x + 28, y + imgH + 58, 9, 0, Math.PI * 2);
    ctx.fillStyle = item.colorHex;
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.4)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 22px system-ui, -apple-system, sans-serif';
    const patternSuffix =
      item.pattern && item.pattern !== 'solid' ? ` · ${PATTERN_LABELS[item.pattern]}` : '';
    const title = `${item.subCategory}${patternSuffix}`;
    ctx.fillText(title.slice(0, 24), x + 46, y + imgH + 65);
  }

  // Dolny pasek palety barw i wskazówek stylisty
  const footerY = H - 210;
  drawRoundedRect(ctx, 60, footerY, W - 120, 155, 28);
  ctx.fillStyle = '#181f36';
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.08)';
  ctx.stroke();

  ctx.fillStyle = '#d1d5db';
  ctx.font = 'bold 22px system-ui, -apple-system, sans-serif';
  ctx.fillText('Paleta barw stylizacji i wskazówki stylisty:', 90, footerY + 42);

  // Kółka palety barw wszystkich elementów
  let dotX = 95;
  for (const { item } of shown) {
    const hexes = [item.colorHex, ...(item.secondaryColorHexes ?? [])];
    for (const h of hexes) {
      ctx.beginPath();
      ctx.arc(dotX, footerY + 82, 16, 0, Math.PI * 2);
      ctx.fillStyle = h;
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();
      dotX += 40;
    }
  }

  const mainNote =
    outfit.notes[0] ??
    '✨ Spójna harmonia barw, fasonów i warstw dopasowana do pogody i Twojej urody.';
  ctx.fillStyle = '#fde68a';
  ctx.font = '500 21px system-ui, -apple-system, sans-serif';
  ctx.fillText(mainNote.slice(0, 78), 90, footerY + 128);

  const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = `stylizacja-${new Date().toISOString().slice(0, 10)}.jpg`;
  a.click();
}
