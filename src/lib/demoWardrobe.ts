import type { BrightnessType, Category, ClothingItem, Occasion, TempRange } from '../types';
import { db, newId } from './db';
import { canEncodeWebp, toBlob } from './image';
import { hexToRgb, rgbToHex } from './palette';

type SilhouetteKind =
  | 'tshirt'
  | 'shirt'
  | 'turtleneck'
  | 'sweater'
  | 'hoodie'
  | 'blouse'
  | 'jeans'
  | 'trousers'
  | 'shorts'
  | 'skirt'
  | 'dress'
  | 'trench'
  | 'blazer'
  | 'puffer'
  | 'sneakers'
  | 'boots'
  | 'heels'
  | 'bag'
  | 'watch'
  | 'sunglasses'
  | 'necklace'
  | 'scarf';

interface DemoSpec {
  category: Category;
  subCategory: string;
  dominantColor: string;
  colorHex: string;
  brightnessType: BrightnessType;
  tempRange: TempRange;
  occasions: Occasion[];
  isRainproof?: boolean;
  isFavorite?: boolean;
  wearCount?: number;
  silhouette: SilhouetteKind;
}

const DEMO_ITEMS: DemoSpec[] = [
  // ---- GÓRA (6) ----
  {
    category: 'top',
    subCategory: 't-shirt',
    dominantColor: 'Biel',
    colorHex: '#f4f4f2',
    brightnessType: 'light',
    tempRange: 'hot',
    occasions: ['casual', 'sport'],
    isFavorite: true,
    wearCount: 5,
    silhouette: 'tshirt',
  },
  {
    category: 'top',
    subCategory: 'koszula',
    dominantColor: 'Błękit',
    colorHex: '#7bb2e0',
    brightnessType: 'light',
    tempRange: 'mild',
    occasions: ['work', 'formal', 'casual'],
    isFavorite: true,
    wearCount: 4,
    silhouette: 'shirt',
  },
  {
    category: 'top',
    subCategory: 'golf',
    dominantColor: 'Czerń',
    colorHex: '#1b1d22',
    brightnessType: 'dark',
    tempRange: 'cold',
    occasions: ['casual', 'work', 'formal'],
    wearCount: 3,
    silhouette: 'turtleneck',
  },
  {
    category: 'top',
    subCategory: 'sweter',
    dominantColor: 'Kremowy / Écru',
    colorHex: '#f1e6d2',
    brightnessType: 'light',
    tempRange: 'cold',
    occasions: ['casual', 'work'],
    wearCount: 2,
    silhouette: 'sweater',
  },
  {
    category: 'top',
    subCategory: 'bluza z kapturem',
    dominantColor: 'Szarość',
    colorHex: '#8e9299',
    brightnessType: 'neutral',
    tempRange: 'cool',
    occasions: ['casual', 'sport'],
    wearCount: 4,
    silhouette: 'hoodie',
  },
  {
    category: 'top',
    subCategory: 'bluzka elegancka',
    dominantColor: 'Bordowy / Burgund',
    colorHex: '#6b1d2f',
    brightnessType: 'dark',
    tempRange: 'mild',
    occasions: ['party', 'formal', 'work'],
    wearCount: 1,
    silhouette: 'blouse',
  },

  // ---- DÓŁ (6) ----
  {
    category: 'bottom',
    subCategory: 'jeansy',
    dominantColor: 'Niebieski',
    colorHex: '#2f66b3',
    brightnessType: 'neutral',
    tempRange: 'mild',
    occasions: ['casual', 'party'],
    isFavorite: true,
    wearCount: 6,
    silhouette: 'jeans',
  },
  {
    category: 'bottom',
    subCategory: 'chinosy',
    dominantColor: 'Beż',
    colorHex: '#d8c3a5',
    brightnessType: 'light',
    tempRange: 'mild',
    occasions: ['casual', 'work'],
    wearCount: 3,
    silhouette: 'trousers',
  },
  {
    category: 'bottom',
    subCategory: 'spodnie eleganckie',
    dominantColor: 'Grafit',
    colorHex: '#3d4148',
    brightnessType: 'dark',
    tempRange: 'mild',
    occasions: ['work', 'formal', 'party'],
    wearCount: 2,
    silhouette: 'trousers',
  },
  {
    category: 'bottom',
    subCategory: 'spódnica midi',
    dominantColor: 'Czerń',
    colorHex: '#18191e',
    brightnessType: 'dark',
    tempRange: 'mild',
    occasions: ['casual', 'work', 'party', 'formal'],
    wearCount: 2,
    silhouette: 'skirt',
  },
  {
    category: 'bottom',
    subCategory: 'szorty',
    dominantColor: 'Khaki / Oliwkowy',
    colorHex: '#6b7346',
    brightnessType: 'neutral',
    tempRange: 'hot',
    occasions: ['casual', 'sport'],
    wearCount: 1,
    silhouette: 'shorts',
  },
  {
    category: 'bottom',
    subCategory: 'dresy',
    dominantColor: 'Szarość',
    colorHex: '#7d828a',
    brightnessType: 'neutral',
    tempRange: 'cool',
    occasions: ['sport', 'casual'],
    wearCount: 2,
    silhouette: 'trousers',
  },

  // ---- SUKIENKI / 1-CZĘŚĆ. (3) ----
  {
    category: 'onepiece',
    subCategory: 'sukienka midi',
    dominantColor: 'Brąz',
    colorHex: '#6b442a',
    brightnessType: 'dark',
    tempRange: 'mild',
    occasions: ['casual', 'work', 'party'],
    isFavorite: true,
    wearCount: 3,
    silhouette: 'dress',
  },
  {
    category: 'onepiece',
    subCategory: 'sukienka koktajlowa',
    dominantColor: 'Zieleń butelkowa',
    colorHex: '#1b4332',
    brightnessType: 'dark',
    tempRange: 'mild',
    occasions: ['party', 'formal'],
    wearCount: 1,
    silhouette: 'dress',
  },
  {
    category: 'onepiece',
    subCategory: 'sukienka letnia',
    dominantColor: 'Róż / Pudrowy',
    colorHex: '#e39ab2',
    brightnessType: 'light',
    tempRange: 'hot',
    occasions: ['casual', 'party'],
    wearCount: 0,
    silhouette: 'dress',
  },

  // ---- WIERZCHNIE (3) ----
  {
    category: 'outerwear',
    subCategory: 'trencz',
    dominantColor: 'Karmel / Camel',
    colorHex: '#c1874b',
    brightnessType: 'neutral',
    tempRange: 'cool',
    occasions: ['work', 'formal', 'casual', 'party'],
    isRainproof: true,
    isFavorite: true,
    wearCount: 4,
    silhouette: 'trench',
  },
  {
    category: 'outerwear',
    subCategory: 'marynarka / żakiet',
    dominantColor: 'Granat',
    colorHex: '#1d2d50',
    brightnessType: 'dark',
    tempRange: 'mild',
    occasions: ['work', 'formal', 'party'],
    wearCount: 2,
    silhouette: 'blazer',
  },
  {
    category: 'outerwear',
    subCategory: 'kurtka puchowa',
    dominantColor: 'Czerń',
    colorHex: '#181a20',
    brightnessType: 'dark',
    tempRange: 'cold',
    occasions: ['casual', 'work', 'sport'],
    isRainproof: true,
    wearCount: 3,
    silhouette: 'puffer',
  },

  // ---- BUTY (3) ----
  {
    category: 'shoes',
    subCategory: 'sneakersy',
    dominantColor: 'Biel',
    colorHex: '#f3f4f6',
    brightnessType: 'light',
    tempRange: 'mild',
    occasions: ['casual', 'party', 'sport'],
    isFavorite: true,
    wearCount: 7,
    silhouette: 'sneakers',
  },
  {
    category: 'shoes',
    subCategory: 'botki',
    dominantColor: 'Brąz',
    colorHex: '#6b442a',
    brightnessType: 'dark',
    tempRange: 'cool',
    occasions: ['casual', 'work', 'party'],
    isRainproof: true,
    wearCount: 4,
    silhouette: 'boots',
  },
  {
    category: 'shoes',
    subCategory: 'szpilki',
    dominantColor: 'Czerń',
    colorHex: '#17181c',
    brightnessType: 'dark',
    tempRange: 'mild',
    occasions: ['party', 'formal', 'work'],
    wearCount: 2,
    silhouette: 'heels',
  },

  // ---- TOREBKI / PLECAKI (2) ----
  {
    category: 'bag',
    subCategory: 'torebka listonoszka',
    dominantColor: 'Karmel / Camel',
    colorHex: '#c1874b',
    brightnessType: 'neutral',
    tempRange: 'mild',
    occasions: ['casual', 'work', 'party'],
    wearCount: 4,
    silhouette: 'bag',
  },
  {
    category: 'bag',
    subCategory: 'torebka kopertówka',
    dominantColor: 'Czerń',
    colorHex: '#17181c',
    brightnessType: 'dark',
    tempRange: 'mild',
    occasions: ['party', 'formal'],
    wearCount: 1,
    silhouette: 'bag',
  },

  // ---- DODATKI (4) ----
  {
    category: 'accessory',
    subCategory: 'zegarek',
    dominantColor: 'Szarość',
    colorHex: '#9ca3af',
    brightnessType: 'neutral',
    tempRange: 'mild',
    occasions: ['casual', 'work', 'party', 'formal', 'sport'],
    wearCount: 6,
    silhouette: 'watch',
  },
  {
    category: 'accessory',
    subCategory: 'okulary przeciwsłoneczne',
    dominantColor: 'Czerń',
    colorHex: '#1c1e24',
    brightnessType: 'dark',
    tempRange: 'hot',
    occasions: ['casual', 'sport', 'party'],
    wearCount: 3,
    silhouette: 'sunglasses',
  },
  {
    category: 'accessory',
    subCategory: 'naszyjnik złoty',
    dominantColor: 'Żółty / Musztardowy',
    colorHex: '#deb035',
    brightnessType: 'light',
    tempRange: 'mild',
    occasions: ['casual', 'work', 'party', 'formal'],
    wearCount: 3,
    silhouette: 'necklace',
  },
  {
    category: 'accessory',
    subCategory: 'szalik',
    dominantColor: 'Beż',
    colorHex: '#d8c3a5',
    brightnessType: 'light',
    tempRange: 'cold',
    occasions: ['casual', 'work', 'formal'],
    wearCount: 2,
    silhouette: 'scarf',
  },
];

function shadeHex(hex: string, delta: number): string {
  const [r, g, b] = hexToRgb(hex);
  return rgbToHex(r + delta, g + delta, b + delta);
}

/** Rysuje estetyczną ilustrację ubrania na studyjnym tle i zwraca skompresowany Blob. */
async function renderGarmentIllustration(spec: DemoSpec): Promise<Blob> {
  const S = 360;
  const canvas = document.createElement('canvas');
  canvas.width = S;
  canvas.height = S;
  const ctx = canvas.getContext('2d')!;

  // Studyjne tło dopasowane do kart aplikacji
  const bgGrad = ctx.createRadialGradient(S * 0.5, S * 0.48, 20, S * 0.5, S * 0.5, S * 0.7);
  bgGrad.addColorStop(0, '#26314d');
  bgGrad.addColorStop(1, '#161c2d');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, S, S);

  // Cień pod ubraniem
  ctx.save();
  ctx.shadowColor = 'rgba(0, 0, 0, 0.45)';
  ctx.shadowBlur = 24;
  ctx.shadowOffsetY = 10;

  const mainGrad = ctx.createLinearGradient(0, 50, 0, 310);
  mainGrad.addColorStop(0, shadeHex(spec.colorHex, 18));
  mainGrad.addColorStop(0.55, spec.colorHex);
  mainGrad.addColorStop(1, shadeHex(spec.colorHex, -22));

  ctx.fillStyle = mainGrad;
  ctx.strokeStyle = shadeHex(spec.colorHex, spec.brightnessType === 'dark' ? 35 : -38);
  ctx.lineWidth = 3;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';

  const drawPath = (pts: [number, number][], close = true) => {
    ctx.beginPath();
    ctx.moveTo(pts[0][0], pts[0][1]);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i][0], pts[i][1]);
    if (close) ctx.closePath();
    ctx.fill();
    ctx.stroke();
  };

  switch (spec.silhouette) {
    case 'tshirt':
    case 'blouse': {
      drawPath([
        [135, 70],
        [180, 88],
        [225, 70],
        [295, 115],
        [270, 160],
        [235, 140],
        [238, 290],
        [122, 290],
        [125, 140],
        [90, 160],
        [65, 115],
      ]);
      break;
    }
    case 'shirt':
    case 'sweater':
    case 'turtleneck':
    case 'hoodie': {
      drawPath([
        [135, 68],
        [180, 82],
        [225, 68],
        [292, 112],
        [278, 265],
        [244, 265],
        [236, 148],
        [236, 288],
        [124, 288],
        [124, 148],
        [116, 265],
        [82, 265],
        [68, 112],
      ]);
      if (spec.silhouette === 'turtleneck') {
        drawPath([
          [148, 48],
          [212, 48],
          [216, 76],
          [144, 76],
        ]);
      } else if (spec.silhouette === 'shirt') {
        ctx.beginPath();
        ctx.moveTo(180, 82);
        ctx.lineTo(180, 288);
        ctx.stroke();
      }
      break;
    }
    case 'jeans':
    case 'trousers': {
      drawPath([
        [118, 60],
        [242, 60],
        [256, 298],
        [202, 298],
        [180, 155],
        [158, 298],
        [104, 298],
      ]);
      ctx.beginPath();
      ctx.moveTo(118, 84);
      ctx.lineTo(242, 84);
      ctx.stroke();
      break;
    }
    case 'shorts': {
      drawPath([
        [112, 95],
        [248, 95],
        [262, 235],
        [194, 235],
        [180, 185],
        [166, 235],
        [98, 235],
      ]);
      break;
    }
    case 'skirt': {
      drawPath([
        [132, 75],
        [228, 75],
        [268, 285],
        [92, 285],
      ]);
      break;
    }
    case 'dress': {
      drawPath([
        [142, 56],
        [180, 74],
        [218, 56],
        [248, 88],
        [225, 132],
        [214, 155],
        [276, 298],
        [84, 298],
        [146, 155],
        [135, 132],
        [112, 88],
      ]);
      // Pasek w talii
      ctx.beginPath();
      ctx.moveTo(146, 155);
      ctx.lineTo(214, 155);
      ctx.stroke();
      break;
    }
    case 'trench':
    case 'blazer':
    case 'puffer': {
      drawPath([
        [130, 58],
        [180, 82],
        [230, 58],
        [296, 108],
        [280, 272],
        [244, 272],
        [238, 145],
        [246, 295],
        [114, 295],
        [122, 145],
        [116, 272],
        [80, 272],
        [64, 108],
      ]);
      ctx.beginPath();
      ctx.moveTo(180, 82);
      ctx.lineTo(180, 295);
      ctx.stroke();
      break;
    }
    case 'sneakers':
    case 'boots':
    case 'heels': {
      if (spec.silhouette === 'boots') {
        drawPath([
          [115, 105],
          [185, 105],
          [195, 195],
          [268, 222],
          [268, 258],
          [102, 258],
          [102, 210],
        ]);
      } else if (spec.silhouette === 'heels') {
        drawPath([
          [105, 140],
          [165, 215],
          [262, 225],
          [258, 252],
          [148, 252],
          [125, 200],
          [122, 255],
          [105, 255],
        ]);
      } else {
        drawPath([
          [92, 165],
          [175, 165],
          [215, 195],
          [275, 208],
          [275, 248],
          [85, 248],
        ]);
      }
      break;
    }
    case 'bag': {
      ctx.beginPath();
      ctx.arc(180, 130, 46, Math.PI, 0);
      ctx.lineWidth = 8;
      ctx.stroke();
      ctx.lineWidth = 3;
      drawPath([
        [105, 130],
        [255, 130],
        [270, 268],
        [90, 268],
      ]);
      break;
    }
    case 'watch': {
      drawPath([
        [156, 65],
        [204, 65],
        [204, 295],
        [156, 295],
      ]);
      ctx.beginPath();
      ctx.arc(180, 180, 52, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      break;
    }
    case 'sunglasses': {
      drawPath([
        [68, 150],
        [165, 150],
        [155, 212],
        [82, 212],
      ]);
      drawPath([
        [195, 150],
        [292, 150],
        [278, 212],
        [205, 212],
      ]);
      ctx.beginPath();
      ctx.moveTo(165, 162);
      ctx.lineTo(195, 162);
      ctx.lineWidth = 6;
      ctx.stroke();
      break;
    }
    case 'necklace': {
      ctx.beginPath();
      ctx.ellipse(180, 165, 68, 82, 0, 0.15 * Math.PI, 0.85 * Math.PI);
      ctx.lineWidth = 8;
      ctx.strokeStyle = spec.colorHex;
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(180, 258, 16, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'scarf': {
      drawPath([
        [95, 105],
        [265, 105],
        [265, 165],
        [225, 165],
        [235, 285],
        [178, 285],
        [175, 165],
        [95, 165],
      ]);
      break;
    }
  }
  ctx.restore();

  const type = canEncodeWebp() ? 'image/webp' : 'image/jpeg';
  return toBlob(canvas, type, 0.78);
}

/** Generuje i zapisuje 27 różnorodnych ubrań testowych w bazie IndexedDB. */
export async function seedDemoWardrobe(): Promise<number> {
  const now = Date.now();
  const created: ClothingItem[] = [];

  for (let i = 0; i < DEMO_ITEMS.length; i++) {
    const spec = DEMO_ITEMS[i];
    const imageBlob = await renderGarmentIllustration(spec);
    created.push({
      id: newId(),
      imageBlob,
      category: spec.category,
      subCategory: spec.subCategory,
      tempRange: spec.tempRange,
      isRainproof: Boolean(spec.isRainproof),
      dominantColor: spec.dominantColor,
      colorHex: spec.colorHex,
      brightnessType: spec.brightnessType,
      occasions: spec.occasions,
      createdAt: now - (DEMO_ITEMS.length - i) * 60000,
      wearCount: spec.wearCount ?? 0,
      inLaundry: false,
      isFavorite: Boolean(spec.isFavorite),
    });
  }

  await db.items.bulkAdd(created);
  return created.length;
}

export async function clearAllWardrobe(): Promise<void> {
  await db.transaction('rw', db.items, db.outfits, async () => {
    await db.items.clear();
    await db.outfits.clear();
  });
}
