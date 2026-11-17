import type {
  BrightnessType,
  Category,
  ClothingItem,
  FitType,
  Occasion,
  PatternType,
  TempRange,
} from '../types';
import {
  defaultFitForSubCategory,
  defaultMaxWearsForSubCategory,
} from './constants';
import { db, newId } from './db';
import { blobToDataUrl } from './image';
import { hexToRgb, rgbToHex } from './palette';

export type DemoWardrobeGender = 'women' | 'men';

const DEMO_GENDER_KEY = 'garderoba.demo.gender';
const DEMO_VERSION_KEY = 'garderoba.demo.photoVersion';
const CURRENT_DEMO_VERSION = 'v3-real-internet-photos';

export function getSavedDemoGender(): DemoWardrobeGender {
  try {
    const v = localStorage.getItem(DEMO_GENDER_KEY);
    return v === 'men' ? 'men' : 'women';
  } catch {
    return 'women';
  }
}

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
  photoId: string;
  gender: DemoWardrobeGender;
  category: Category;
  subCategory: string;
  dominantColor: string;
  colorHex: string;
  secondaryColors?: string[];
  secondaryColorHexes?: string[];
  pattern?: PatternType;
  brightnessType: BrightnessType;
  tempRange: TempRange;
  occasions: Occasion[];
  isRainproof?: boolean;
  silhouette: SilhouetteKind;
}

/**
 * SZAFA TESTOWA – DAMSKA (29 ubrań ze zdjęciami pobranymi z Internetu)
 * Nie miesza ubrań męskich – zawiera wyłącznie damskie fasony, sukienki, spódnice, szpilki, torebki i okrycia.
 */
export const WOMEN_DEMO_ITEMS: DemoSpec[] = [
  // ---- GÓRA (8) ----
  {
    photoId: 'w-tshirt-white',
    gender: 'women',
    category: 'top',
    subCategory: 't-shirt',
    dominantColor: 'Biel',
    colorHex: '#f5f5f3',
    pattern: 'solid',
    brightnessType: 'light',
    tempRange: 'hot',
    occasions: ['casual', 'sport', 'work'],
    silhouette: 'tshirt',
  },
  {
    photoId: 'w-top-black',
    gender: 'women',
    category: 'top',
    subCategory: 'top na ramiączkach',
    dominantColor: 'Czerń',
    colorHex: '#18181c',
    pattern: 'solid',
    brightnessType: 'dark',
    tempRange: 'hot',
    occasions: ['casual', 'party', 'sport'],
    silhouette: 'blouse',
  },
  {
    photoId: 'w-breton-stripes',
    gender: 'women',
    category: 'top',
    subCategory: 'bluzka w paski (bretonka)',
    dominantColor: 'Granat',
    colorHex: '#1d2d50',
    secondaryColors: ['Biel'],
    secondaryColorHexes: ['#f5f5f3'],
    pattern: 'stripes',
    brightnessType: 'dark',
    tempRange: 'mild',
    occasions: ['casual', 'work'],
    silhouette: 'tshirt',
  },
  {
    photoId: 'w-blouse-pink',
    gender: 'women',
    category: 'top',
    subCategory: 'bluzka satynowa',
    dominantColor: 'Róż / Pudrowy',
    colorHex: '#e39ab2',
    pattern: 'solid',
    brightnessType: 'light',
    tempRange: 'mild',
    occasions: ['casual', 'work', 'party', 'formal'],
    silhouette: 'blouse',
  },
  {
    photoId: 'w-shirt-blue',
    gender: 'women',
    category: 'top',
    subCategory: 'koszula',
    dominantColor: 'Błękit',
    colorHex: '#7bb2e0',
    pattern: 'solid',
    brightnessType: 'light',
    tempRange: 'mild',
    occasions: ['work', 'formal', 'casual'],
    silhouette: 'shirt',
  },
  {
    photoId: 'w-sweater-cream',
    gender: 'women',
    category: 'top',
    subCategory: 'sweter pleciony',
    dominantColor: 'Kremowy / Écru',
    colorHex: '#f3ead8',
    pattern: 'solid',
    brightnessType: 'light',
    tempRange: 'cool',
    occasions: ['casual', 'work'],
    silhouette: 'sweater',
  },
  {
    photoId: 'w-turtleneck-black',
    gender: 'women',
    category: 'top',
    subCategory: 'golf',
    dominantColor: 'Czerń',
    colorHex: '#18181c',
    pattern: 'solid',
    brightnessType: 'dark',
    tempRange: 'cold',
    occasions: ['work', 'formal', 'casual', 'party'],
    silhouette: 'turtleneck',
  },
  {
    photoId: 'w-tshirt-print',
    gender: 'women',
    category: 'top',
    subCategory: 't-shirt z nadrukiem',
    dominantColor: 'Biel',
    colorHex: '#f5f5f3',
    secondaryColors: ['Czerń', 'Czerwień'],
    secondaryColorHexes: ['#18181c', '#c9332b'],
    pattern: 'print',
    brightnessType: 'light',
    tempRange: 'hot',
    occasions: ['casual', 'party', 'sport'],
    silhouette: 'tshirt',
  },

  // ---- DÓŁ (6) ----
  {
    photoId: 'w-jeans-blue',
    gender: 'women',
    category: 'bottom',
    subCategory: 'jeansy',
    dominantColor: 'Niebieski / Denim',
    colorHex: '#3b6998',
    pattern: 'solid',
    brightnessType: 'neutral',
    tempRange: 'mild',
    occasions: ['casual', 'work', 'party'],
    silhouette: 'jeans',
  },
  {
    photoId: 'w-trousers-beige',
    gender: 'women',
    category: 'bottom',
    subCategory: 'spodnie materiałowe',
    dominantColor: 'Beż',
    colorHex: '#d8c3a5',
    pattern: 'solid',
    brightnessType: 'light',
    tempRange: 'mild',
    occasions: ['work', 'formal', 'casual'],
    silhouette: 'trousers',
  },
  {
    photoId: 'w-skirt-black',
    gender: 'women',
    category: 'bottom',
    subCategory: 'spódnica plisowana midi',
    dominantColor: 'Czerń',
    colorHex: '#18181c',
    pattern: 'solid',
    brightnessType: 'dark',
    tempRange: 'mild',
    occasions: ['work', 'party', 'formal', 'casual'],
    silhouette: 'skirt',
  },
  {
    photoId: 'w-skirt-dots',
    gender: 'women',
    category: 'bottom',
    subCategory: 'spódnica w groszki',
    dominantColor: 'Biel',
    colorHex: '#f5f5f3',
    secondaryColors: ['Czerń'],
    secondaryColorHexes: ['#18181c'],
    pattern: 'dots',
    brightnessType: 'light',
    tempRange: 'hot',
    occasions: ['casual', 'party', 'work'],
    silhouette: 'skirt',
  },
  {
    photoId: 'w-trousers-plaid',
    gender: 'women',
    category: 'bottom',
    subCategory: 'spodnie w kratę',
    dominantColor: 'Szarość',
    colorHex: '#8e9299',
    secondaryColors: ['Grafit', 'Biel'],
    secondaryColorHexes: ['#3d4148', '#f5f5f3'],
    pattern: 'plaid',
    brightnessType: 'neutral',
    tempRange: 'mild',
    occasions: ['work', 'formal', 'casual'],
    silhouette: 'trousers',
  },
  {
    photoId: 'w-shorts-denim',
    gender: 'women',
    category: 'bottom',
    subCategory: 'szorty jeansowe',
    dominantColor: 'Niebieski / Denim',
    colorHex: '#4b79a8',
    pattern: 'solid',
    brightnessType: 'neutral',
    tempRange: 'hot',
    occasions: ['casual', 'sport'],
    silhouette: 'shorts',
  },

  // ---- SUKIENKI (3) ----
  {
    photoId: 'w-dress-black',
    gender: 'women',
    category: 'onepiece',
    subCategory: 'sukienka wieczorowa',
    dominantColor: 'Czerń',
    colorHex: '#18181c',
    pattern: 'solid',
    brightnessType: 'dark',
    tempRange: 'mild',
    occasions: ['party', 'formal'],
    silhouette: 'dress',
  },
  {
    photoId: 'w-dress-floral',
    gender: 'women',
    category: 'onepiece',
    subCategory: 'sukienka w kwiaty',
    dominantColor: 'Biel',
    colorHex: '#f5f5f3',
    secondaryColors: ['Błękit', 'Granat'],
    secondaryColorHexes: ['#7bb2e0', '#1d2d50'],
    pattern: 'floral',
    brightnessType: 'light',
    tempRange: 'hot',
    occasions: ['casual', 'party', 'formal'],
    silhouette: 'dress',
  },
  {
    photoId: 'w-dress-burgundy',
    gender: 'women',
    category: 'onepiece',
    subCategory: 'sukienka midi',
    dominantColor: 'Burgund / Bordowy',
    colorHex: '#6e1e2a',
    pattern: 'solid',
    brightnessType: 'dark',
    tempRange: 'mild',
    occasions: ['party', 'formal', 'work'],
    silhouette: 'dress',
  },

  // ---- OKRYCIA WIERZCHNIE (4) ----
  {
    photoId: 'w-trench-beige',
    gender: 'women',
    category: 'outerwear',
    subCategory: 'trencz',
    dominantColor: 'Beż',
    colorHex: '#d8c3a5',
    pattern: 'solid',
    brightnessType: 'light',
    tempRange: 'cool',
    isRainproof: true,
    occasions: ['work', 'formal', 'casual'],
    silhouette: 'trench',
  },
  {
    photoId: 'w-blazer-black',
    gender: 'women',
    category: 'outerwear',
    subCategory: 'marynarka',
    dominantColor: 'Czerń',
    colorHex: '#18181c',
    pattern: 'solid',
    brightnessType: 'dark',
    tempRange: 'mild',
    occasions: ['work', 'formal', 'party'],
    silhouette: 'blazer',
  },
  {
    photoId: 'w-blazer-plaid',
    gender: 'women',
    category: 'outerwear',
    subCategory: 'marynarka w kratę',
    dominantColor: 'Brąz',
    colorHex: '#6b442a',
    secondaryColors: ['Beż', 'Czerń'],
    secondaryColorHexes: ['#d8c3a5', '#18181c'],
    pattern: 'plaid',
    brightnessType: 'neutral',
    tempRange: 'cool',
    occasions: ['work', 'formal', 'casual'],
    silhouette: 'blazer',
  },
  {
    photoId: 'w-puffer-olive',
    gender: 'women',
    category: 'outerwear',
    subCategory: 'kurtka puchowa',
    dominantColor: 'Oliwkowy / Khaki',
    colorHex: '#5c6644',
    pattern: 'solid',
    brightnessType: 'dark',
    tempRange: 'cold',
    isRainproof: true,
    occasions: ['casual', 'sport', 'work'],
    silhouette: 'puffer',
  },

  // ---- BUTY (3) ----
  {
    photoId: 'w-sneakers-white',
    gender: 'women',
    category: 'shoes',
    subCategory: 'sneakersy',
    dominantColor: 'Biel',
    colorHex: '#f5f5f3',
    pattern: 'solid',
    brightnessType: 'light',
    tempRange: 'mild',
    occasions: ['casual', 'sport', 'work'],
    silhouette: 'sneakers',
  },
  {
    photoId: 'w-boots-black',
    gender: 'women',
    category: 'shoes',
    subCategory: 'botki skórzane',
    dominantColor: 'Czerń',
    colorHex: '#18181c',
    pattern: 'solid',
    brightnessType: 'dark',
    tempRange: 'cold',
    isRainproof: true,
    occasions: ['casual', 'work', 'party', 'formal'],
    silhouette: 'boots',
  },
  {
    photoId: 'w-heels-beige',
    gender: 'women',
    category: 'shoes',
    subCategory: 'szpilki',
    dominantColor: 'Beż',
    colorHex: '#d8c3a5',
    pattern: 'solid',
    brightnessType: 'light',
    tempRange: 'mild',
    occasions: ['party', 'formal', 'work'],
    silhouette: 'heels',
  },

  // ---- TOREBKI (2) ----
  {
    photoId: 'w-bag-black',
    gender: 'women',
    category: 'bag',
    subCategory: 'torebka listonoszka',
    dominantColor: 'Czerń',
    colorHex: '#18181c',
    pattern: 'solid',
    brightnessType: 'dark',
    tempRange: 'mild',
    occasions: ['casual', 'work', 'party', 'formal'],
    silhouette: 'bag',
  },
  {
    photoId: 'w-bag-camel',
    gender: 'women',
    category: 'bag',
    subCategory: 'torebka shopper',
    dominantColor: 'Karmel / Camel',
    colorHex: '#c1874b',
    pattern: 'solid',
    brightnessType: 'neutral',
    tempRange: 'mild',
    occasions: ['work', 'casual'],
    silhouette: 'bag',
  },

  // ---- DODATKI (3) ----
  {
    photoId: 'w-watch-gold',
    gender: 'women',
    category: 'accessory',
    subCategory: 'zegarek',
    dominantColor: 'Karmel / Camel',
    colorHex: '#c1874b',
    secondaryColors: ['Biel'],
    secondaryColorHexes: ['#f5f5f3'],
    pattern: 'solid',
    brightnessType: 'light',
    tempRange: 'mild',
    occasions: ['work', 'formal', 'casual', 'party'],
    silhouette: 'watch',
  },
  {
    photoId: 'w-sunglasses-black',
    gender: 'women',
    category: 'accessory',
    subCategory: 'okulary przeciwsłoneczne',
    dominantColor: 'Czerń',
    colorHex: '#18181c',
    pattern: 'solid',
    brightnessType: 'dark',
    tempRange: 'hot',
    occasions: ['casual', 'party', 'sport'],
    silhouette: 'sunglasses',
  },
  {
    photoId: 'w-scarf-floral',
    gender: 'women',
    category: 'accessory',
    subCategory: 'apaszka jedwabna we wzory',
    dominantColor: 'Kremowy / Écru',
    colorHex: '#f3ead8',
    secondaryColors: ['Pomarańczowy / Koral', 'Róż / Pudrowy'],
    secondaryColorHexes: ['#e06d3b', '#e39ab2'],
    pattern: 'floral',
    brightnessType: 'light',
    tempRange: 'mild',
    occasions: ['casual', 'work', 'formal'],
    silhouette: 'scarf',
  },
];

/**
 * SZAFA TESTOWA – MĘSKA (31 ubrań ze zdjęciami pobranymi z Internetu)
 * Nie miesza ubrań damskich – zawiera wyłącznie męskie koszule, t-shirty, bluzy, spodnie, marynarki, płaszcze, buty i dodatki.
 */
export const MEN_DEMO_ITEMS: DemoSpec[] = [
  // ---- GÓRA (10) ----
  {
    photoId: 'm-tshirt-white',
    gender: 'men',
    category: 'top',
    subCategory: 't-shirt',
    dominantColor: 'Biel',
    colorHex: '#f5f5f3',
    pattern: 'solid',
    brightnessType: 'light',
    tempRange: 'hot',
    occasions: ['casual', 'sport'],
    silhouette: 'tshirt',
  },
  {
    photoId: 'm-tshirt-print',
    gender: 'men',
    category: 'top',
    subCategory: 't-shirt z nadrukiem',
    dominantColor: 'Czerń',
    colorHex: '#18181c',
    secondaryColors: ['Biel'],
    secondaryColorHexes: ['#f5f5f3'],
    pattern: 'print',
    brightnessType: 'dark',
    tempRange: 'hot',
    occasions: ['casual', 'party', 'sport'],
    silhouette: 'tshirt',
  },
  {
    photoId: 'm-polo-navy',
    gender: 'men',
    category: 'top',
    subCategory: 'koszulka polo',
    dominantColor: 'Granat',
    colorHex: '#1d2d50',
    pattern: 'solid',
    brightnessType: 'dark',
    tempRange: 'hot',
    occasions: ['casual', 'work', 'sport'],
    silhouette: 'tshirt',
  },
  {
    photoId: 'm-shirt-blue',
    gender: 'men',
    category: 'top',
    subCategory: 'koszula oxford',
    dominantColor: 'Błękit',
    colorHex: '#7bb2e0',
    pattern: 'solid',
    brightnessType: 'light',
    tempRange: 'mild',
    occasions: ['work', 'formal', 'casual'],
    silhouette: 'shirt',
  },
  {
    photoId: 'm-shirt-white',
    gender: 'men',
    category: 'top',
    subCategory: 'koszula wizytowa',
    dominantColor: 'Biel',
    colorHex: '#f5f5f3',
    pattern: 'solid',
    brightnessType: 'light',
    tempRange: 'mild',
    occasions: ['formal', 'work', 'party'],
    silhouette: 'shirt',
  },
  {
    photoId: 'm-shirt-plaid',
    gender: 'men',
    category: 'top',
    subCategory: 'koszula w kratę',
    dominantColor: 'Granat',
    colorHex: '#1d2d50',
    secondaryColors: ['Czerwień', 'Biel'],
    secondaryColorHexes: ['#c9332b', '#f5f5f3'],
    pattern: 'plaid',
    brightnessType: 'dark',
    tempRange: 'cool',
    occasions: ['casual', 'work'],
    silhouette: 'shirt',
  },
  {
    photoId: 'm-shirt-stripes',
    gender: 'men',
    category: 'top',
    subCategory: 'koszula w prążki',
    dominantColor: 'Niebieski / Denim',
    colorHex: '#3b6998',
    secondaryColors: ['Biel'],
    secondaryColorHexes: ['#f5f5f3'],
    pattern: 'stripes',
    brightnessType: 'neutral',
    tempRange: 'mild',
    occasions: ['work', 'formal', 'casual'],
    silhouette: 'shirt',
  },
  {
    photoId: 'm-hoodie-grey',
    gender: 'men',
    category: 'top',
    subCategory: 'bluza z kapturem',
    dominantColor: 'Szarość',
    colorHex: '#8e9299',
    pattern: 'solid',
    brightnessType: 'neutral',
    tempRange: 'cool',
    occasions: ['casual', 'sport'],
    silhouette: 'hoodie',
  },
  {
    photoId: 'm-sweater-navy',
    gender: 'men',
    category: 'top',
    subCategory: 'sweter',
    dominantColor: 'Granat',
    colorHex: '#1d2d50',
    pattern: 'solid',
    brightnessType: 'dark',
    tempRange: 'cool',
    occasions: ['work', 'casual', 'formal'],
    silhouette: 'sweater',
  },
  {
    photoId: 'm-turtleneck-charcoal',
    gender: 'men',
    category: 'top',
    subCategory: 'golf',
    dominantColor: 'Grafit',
    colorHex: '#3d4148',
    pattern: 'solid',
    brightnessType: 'dark',
    tempRange: 'cold',
    occasions: ['work', 'formal', 'party', 'casual'],
    silhouette: 'turtleneck',
  },

  // ---- DÓŁ (7) ----
  {
    photoId: 'm-jeans-blue',
    gender: 'men',
    category: 'bottom',
    subCategory: 'jeansy',
    dominantColor: 'Niebieski / Denim',
    colorHex: '#3b6998',
    pattern: 'solid',
    brightnessType: 'neutral',
    tempRange: 'mild',
    occasions: ['casual', 'work', 'party'],
    silhouette: 'jeans',
  },
  {
    photoId: 'm-jeans-black',
    gender: 'men',
    category: 'bottom',
    subCategory: 'jeansy czarne',
    dominantColor: 'Czerń',
    colorHex: '#18181c',
    pattern: 'solid',
    brightnessType: 'dark',
    tempRange: 'mild',
    occasions: ['casual', 'party', 'work'],
    silhouette: 'jeans',
  },
  {
    photoId: 'm-chinos-beige',
    gender: 'men',
    category: 'bottom',
    subCategory: 'chinosy',
    dominantColor: 'Karmel / Camel',
    colorHex: '#c1874b',
    pattern: 'solid',
    brightnessType: 'neutral',
    tempRange: 'mild',
    occasions: ['work', 'casual', 'formal'],
    silhouette: 'trousers',
  },
  {
    photoId: 'm-trousers-navy',
    gender: 'men',
    category: 'bottom',
    subCategory: 'spodnie garniturowe',
    dominantColor: 'Granat',
    colorHex: '#1d2d50',
    pattern: 'solid',
    brightnessType: 'dark',
    tempRange: 'mild',
    occasions: ['formal', 'work', 'party'],
    silhouette: 'trousers',
  },
  {
    photoId: 'm-trousers-plaid',
    gender: 'men',
    category: 'bottom',
    subCategory: 'spodnie w kratę',
    dominantColor: 'Szarość',
    colorHex: '#8e9299',
    secondaryColors: ['Grafit', 'Brąz'],
    secondaryColorHexes: ['#3d4148', '#6b442a'],
    pattern: 'plaid',
    brightnessType: 'neutral',
    tempRange: 'mild',
    occasions: ['work', 'formal', 'casual'],
    silhouette: 'trousers',
  },
  {
    photoId: 'm-shorts-olive',
    gender: 'men',
    category: 'bottom',
    subCategory: 'szorty',
    dominantColor: 'Oliwkowy / Khaki',
    colorHex: '#5c6644',
    pattern: 'solid',
    brightnessType: 'neutral',
    tempRange: 'hot',
    occasions: ['casual', 'sport'],
    silhouette: 'shorts',
  },
  {
    photoId: 'm-joggers-black',
    gender: 'men',
    category: 'bottom',
    subCategory: 'spodnie dresowe',
    dominantColor: 'Czerń',
    colorHex: '#18181c',
    pattern: 'solid',
    brightnessType: 'dark',
    tempRange: 'mild',
    occasions: ['sport', 'casual'],
    silhouette: 'trousers',
  },

  // ---- OKRYCIA WIERZCHNIE (5) ----
  {
    photoId: 'm-blazer-navy',
    gender: 'men',
    category: 'outerwear',
    subCategory: 'marynarka',
    dominantColor: 'Granat',
    colorHex: '#1d2d50',
    pattern: 'solid',
    brightnessType: 'dark',
    tempRange: 'mild',
    occasions: ['formal', 'work', 'party'],
    silhouette: 'blazer',
  },
  {
    photoId: 'm-blazer-plaid',
    gender: 'men',
    category: 'outerwear',
    subCategory: 'marynarka w kratę',
    dominantColor: 'Grafit',
    colorHex: '#3d4148',
    secondaryColors: ['Brąz', 'Granat'],
    secondaryColorHexes: ['#6b442a', '#1d2d50'],
    pattern: 'plaid',
    brightnessType: 'dark',
    tempRange: 'cool',
    occasions: ['work', 'formal', 'party'],
    silhouette: 'blazer',
  },
  {
    photoId: 'm-coat-camel',
    gender: 'men',
    category: 'outerwear',
    subCategory: 'płaszcz wełniany',
    dominantColor: 'Karmel / Camel',
    colorHex: '#c1874b',
    pattern: 'solid',
    brightnessType: 'neutral',
    tempRange: 'cold',
    isRainproof: true,
    occasions: ['formal', 'work', 'casual'],
    silhouette: 'trench',
  },
  {
    photoId: 'm-jacket-leather',
    gender: 'men',
    category: 'outerwear',
    subCategory: 'kurtka skórzana',
    dominantColor: 'Czerń',
    colorHex: '#18181c',
    pattern: 'solid',
    brightnessType: 'dark',
    tempRange: 'cool',
    isRainproof: true,
    occasions: ['casual', 'party'],
    silhouette: 'puffer',
  },
  {
    photoId: 'm-puffer-navy',
    gender: 'men',
    category: 'outerwear',
    subCategory: 'kurtka puchowa',
    dominantColor: 'Granat',
    colorHex: '#1d2d50',
    pattern: 'solid',
    brightnessType: 'dark',
    tempRange: 'cold',
    isRainproof: true,
    occasions: ['casual', 'sport', 'work'],
    silhouette: 'puffer',
  },

  // ---- BUTY (4) ----
  {
    photoId: 'm-sneakers-white',
    gender: 'men',
    category: 'shoes',
    subCategory: 'sneakersy',
    dominantColor: 'Biel',
    colorHex: '#f5f5f3',
    pattern: 'solid',
    brightnessType: 'light',
    tempRange: 'mild',
    occasions: ['casual', 'sport', 'work'],
    silhouette: 'sneakers',
  },
  {
    photoId: 'm-sneakers-retro',
    gender: 'men',
    category: 'shoes',
    subCategory: 'sneakersy retro (wielokolorowe)',
    dominantColor: 'Granat',
    colorHex: '#1d2d50',
    secondaryColors: ['Biel', 'Czerwień'],
    secondaryColorHexes: ['#f5f5f3', '#c9332b'],
    pattern: 'solid',
    brightnessType: 'dark',
    tempRange: 'mild',
    occasions: ['casual', 'sport', 'party'],
    silhouette: 'sneakers',
  },
  {
    photoId: 'm-boots-brown',
    gender: 'men',
    category: 'shoes',
    subCategory: 'sztyblety skórzane',
    dominantColor: 'Brąz',
    colorHex: '#6b442a',
    pattern: 'solid',
    brightnessType: 'dark',
    tempRange: 'cold',
    isRainproof: true,
    occasions: ['work', 'casual', 'formal', 'party'],
    silhouette: 'boots',
  },
  {
    photoId: 'm-loafers-black',
    gender: 'men',
    category: 'shoes',
    subCategory: 'półbuty skórzane',
    dominantColor: 'Czerń',
    colorHex: '#18181c',
    pattern: 'solid',
    brightnessType: 'dark',
    tempRange: 'mild',
    occasions: ['formal', 'work', 'party'],
    silhouette: 'boots',
  },

  // ---- TORBY I PLECAKI (2) ----
  {
    photoId: 'm-backpack-black',
    gender: 'men',
    category: 'bag',
    subCategory: 'plecak miejski',
    dominantColor: 'Czerń',
    colorHex: '#18181c',
    pattern: 'solid',
    brightnessType: 'dark',
    tempRange: 'mild',
    occasions: ['casual', 'work', 'sport'],
    silhouette: 'bag',
  },
  {
    photoId: 'm-bag-brown',
    gender: 'men',
    category: 'bag',
    subCategory: 'torba skórzana na laptopa',
    dominantColor: 'Brąz',
    colorHex: '#6b442a',
    pattern: 'solid',
    brightnessType: 'dark',
    tempRange: 'mild',
    occasions: ['work', 'formal', 'casual'],
    silhouette: 'bag',
  },

  // ---- DODATKI (3) ----
  {
    photoId: 'm-watch-silver',
    gender: 'men',
    category: 'accessory',
    subCategory: 'zegarek klasyczny',
    dominantColor: 'Szarość',
    colorHex: '#8e9299',
    secondaryColors: ['Biel'],
    secondaryColorHexes: ['#f5f5f3'],
    pattern: 'solid',
    brightnessType: 'neutral',
    tempRange: 'mild',
    occasions: ['work', 'formal', 'casual', 'party'],
    silhouette: 'watch',
  },
  {
    photoId: 'm-sunglasses-black',
    gender: 'men',
    category: 'accessory',
    subCategory: 'okulary przeciwsłoneczne',
    dominantColor: 'Czerń',
    colorHex: '#18181c',
    pattern: 'solid',
    brightnessType: 'dark',
    tempRange: 'hot',
    occasions: ['casual', 'party', 'sport'],
    silhouette: 'sunglasses',
  },
  {
    photoId: 'm-scarf-grey',
    gender: 'men',
    category: 'accessory',
    subCategory: 'szalik wełniany',
    dominantColor: 'Szarość',
    colorHex: '#8e9299',
    pattern: 'solid',
    brightnessType: 'neutral',
    tempRange: 'cold',
    occasions: ['casual', 'work', 'formal'],
    silhouette: 'scarf',
  },
];

export const DEMO_WOMEN_COUNT = WOMEN_DEMO_ITEMS.length;
export const DEMO_MEN_COUNT = MEN_DEMO_ITEMS.length;

function shadeHex(hex: string, delta: number): string {
  const [r, g, b] = hexToRgb(hex);
  return rgbToHex(r + delta, g + delta, b + delta);
}

/** Rysuje zapasową ilustrację ubrania wyłącznie jako awaryjny fallback, gdy brak zdjęcia. */
function renderGarmentIllustration(
  spec: Pick<
    DemoSpec,
    'colorHex' | 'secondaryColorHexes' | 'pattern' | 'brightnessType' | 'silhouette'
  >
): string {
  const S = 360;
  const canvas = document.createElement('canvas');
  canvas.width = S;
  canvas.height = S;
  const ctx = canvas.getContext('2d')!;

  const bgGrad = ctx.createRadialGradient(S * 0.5, S * 0.48, 20, S * 0.5, S * 0.5, S * 0.7);
  bgGrad.addColorStop(0, '#26314d');
  bgGrad.addColorStop(1, '#161c2d');
  ctx.fillStyle = bgGrad;
  ctx.fillRect(0, 0, S, S);

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
  ctx.restore();

  return canvas.toDataURL('image/jpeg', 0.82);
}

function inferSilhouette(category: Category, subCategory: string): SilhouetteKind {
  const s = subCategory.toLowerCase();
  if (category === 'top') {
    if (s.includes('koszul')) return 'shirt';
    if (s.includes('golf')) return 'turtleneck';
    if (s.includes('sweter') || s.includes('kardigan')) return 'sweater';
    if (s.includes('bluz') && s.includes('kaptur')) return 'hoodie';
    if (s.includes('bluzk') || s.includes('top')) return 'blouse';
    return 'tshirt';
  }
  if (category === 'bottom') {
    if (s.includes('spódnic')) return 'skirt';
    if (s.includes('szort') || s.includes('spodenk')) return 'shorts';
    if (s.includes('jeans')) return 'jeans';
    return 'trousers';
  }
  if (category === 'onepiece') return 'dress';
  if (category === 'outerwear') {
    if (s.includes('trencz') || s.includes('płaszcz')) return 'trench';
    if (s.includes('marynark') || s.includes('żakiet')) return 'blazer';
    return 'puffer';
  }
  if (category === 'shoes') {
    if (s.includes('szpilk') || s.includes('czółenk')) return 'heels';
    if (s.includes('botk') || s.includes('sztyblet') || s.includes('traper')) return 'boots';
    return 'sneakers';
  }
  if (category === 'bag') return 'bag';
  if (s.includes('okular')) return 'sunglasses';
  if (s.includes('naszyjnik') || s.includes('łańcuszek')) return 'necklace';
  if (s.includes('szalik') || s.includes('apaszka')) return 'scarf';
  return 'watch';
}

export function renderFallbackIllustrationForItem(
  item: Pick<
    ClothingItem,
    'category' | 'subCategory' | 'colorHex' | 'secondaryColors' | 'secondaryColorHexes' | 'pattern'
  >
): string {
  const allDemo = [...WOMEN_DEMO_ITEMS, ...MEN_DEMO_ITEMS];
  const matchedDemo = allDemo.find(
    (d) => d.category === item.category && d.subCategory === item.subCategory
  );
  if (matchedDemo) {
    const base = import.meta.env.BASE_URL || '/';
    return `${base}demo/${matchedDemo.gender}/${matchedDemo.photoId}.jpg`;
  }
  return renderGarmentIllustration({
    colorHex: item.colorHex || '#7bb2e0',
    secondaryColorHexes: item.secondaryColorHexes,
    pattern: item.pattern ?? 'solid',
    brightnessType: 'neutral',
    silhouette: inferSilhouette(item.category, item.subCategory),
  });
}

async function fetchDemoPhotoAsDataUrl(spec: DemoSpec): Promise<string> {
  const base = import.meta.env.BASE_URL || '/';
  const url = `${base}demo/${spec.gender}/${spec.photoId}.jpg`;
  try {
    const res = await fetch(url);
    if (res.ok) {
      const blob = await res.blob();
      if (blob.size > 500) {
        return await blobToDataUrl(blob);
      }
    }
  } catch {
    // fallback do ścieżki statycznej
  }
  return url;
}

function defaultDemoPriceAndBrand(
  category: Category,
  subCategory: string
): { price: number; brand: string; fit: FitType; maxWearsBeforeLaundry: number } {
  const s = subCategory.toLowerCase();
  const fit = defaultFitForSubCategory(category, subCategory);
  const maxWearsBeforeLaundry = defaultMaxWearsForSubCategory(category, subCategory);
  if (category === 'top') {
    if (s.includes('sweter') || s.includes('golf')) return { price: 199, brand: 'Massimo Dutti', fit, maxWearsBeforeLaundry };
    if (s.includes('koszula')) return { price: 169, brand: 'COS', fit, maxWearsBeforeLaundry };
    if (s.includes('bluza')) return { price: 179, brand: 'Uniqlo', fit, maxWearsBeforeLaundry };
    if (s.includes('satyn') || s.includes('paski')) return { price: 139, brand: 'Arket', fit, maxWearsBeforeLaundry };
    return { price: 79, brand: 'Uniqlo', fit, maxWearsBeforeLaundry };
  }
  if (category === 'bottom') {
    if (s.includes('jeans')) return { price: 249, brand: "Levi's", fit, maxWearsBeforeLaundry };
    if (s.includes('krat') || s.includes('garnitur') || s.includes('materiał')) return { price: 229, brand: 'COS', fit, maxWearsBeforeLaundry };
    if (s.includes('spódnic')) return { price: 189, brand: 'Zara', fit, maxWearsBeforeLaundry };
    return { price: 149, brand: 'H&M', fit, maxWearsBeforeLaundry };
  }
  if (category === 'onepiece') {
    if (s.includes('wieczorow')) return { price: 349, brand: 'Massimo Dutti', fit, maxWearsBeforeLaundry };
    return { price: 259, brand: '& Other Stories', fit, maxWearsBeforeLaundry };
  }
  if (category === 'outerwear') {
    if (s.includes('trencz') || s.includes('płaszcz')) return { price: 549, brand: 'Massimo Dutti', fit, maxWearsBeforeLaundry };
    if (s.includes('skórzan')) return { price: 649, brand: 'AllSaints', fit, maxWearsBeforeLaundry };
    if (s.includes('puchow')) return { price: 429, brand: 'Uniqlo', fit, maxWearsBeforeLaundry };
    return { price: 389, brand: 'COS', fit, maxWearsBeforeLaundry };
  }
  if (category === 'shoes') {
    if (s.includes('botk') || s.includes('sztyblet') || s.includes('półbut')) return { price: 449, brand: 'Vagabond', fit, maxWearsBeforeLaundry };
    if (s.includes('szpilk')) return { price: 369, brand: 'Kazar', fit, maxWearsBeforeLaundry };
    return { price: 329, brand: 'New Balance', fit, maxWearsBeforeLaundry };
  }
  if (category === 'bag') {
    return { price: 349, brand: 'Wittchen', fit, maxWearsBeforeLaundry };
  }
  if (s.includes('zegar')) return { price: 499, brand: 'Tissot', fit, maxWearsBeforeLaundry };
  if (s.includes('okular')) return { price: 299, brand: 'Ray-Ban', fit, maxWearsBeforeLaundry };
  return { price: 129, brand: 'COS', fit, maxWearsBeforeLaundry };
}

/**
 * Ładuje wybraną szafę testową ('women' – Damską lub 'men' – Męską) ze zdjęciami pobranymi z Internetu.
 * Przed załadowaniem czyści poprzednią zawartość szafy, aby nie mieszać ubrań damskich i męskich.
 */
export async function seedDemoWardrobe(
  gender: DemoWardrobeGender = getSavedDemoGender()
): Promise<number> {
  try {
    localStorage.setItem(DEMO_GENDER_KEY, gender);
    localStorage.setItem(DEMO_VERSION_KEY, CURRENT_DEMO_VERSION);
  } catch {
    // ignore storage errors
  }

  const specs = gender === 'men' ? MEN_DEMO_ITEMS : WOMEN_DEMO_ITEMS;
  const now = Date.now();

  const dataUrls = await Promise.all(specs.map((spec) => fetchDemoPhotoAsDataUrl(spec)));

  const created: ClothingItem[] = specs.map((spec, i) => {
    const meta = defaultDemoPriceAndBrand(spec.category, spec.subCategory);
    return {
      id: newId(),
      imageDataUrl: dataUrls[i],
      category: spec.category,
      subCategory: spec.subCategory,
      tempRange: spec.tempRange,
      isRainproof: Boolean(spec.isRainproof),
      dominantColor: spec.dominantColor,
      colorHex: spec.colorHex,
      secondaryColors: spec.secondaryColors ? [...spec.secondaryColors] : [],
      secondaryColorHexes: spec.secondaryColorHexes ? [...spec.secondaryColorHexes] : [],
      pattern: spec.pattern ?? 'solid',
      fit: meta.fit,
      price: meta.price,
      brand: meta.brand,
      brightnessType: spec.brightnessType,
      occasions: [...spec.occasions],
      createdAt: now - (specs.length - i) * 60000,
      wearCount: 0,
      wearsSinceWash: 0,
      maxWearsBeforeLaundry: meta.maxWearsBeforeLaundry,
      inLaundry: false,
      isFavorite: false,
    };
  });

  await db.transaction('rw', db.items, db.outfits, async () => {
    await db.items.clear();
    await db.outfits.clear();
    await db.items.bulkAdd(created);
  });

  return created.length;
}

/**
 * Naprawia istniejące rekordy w IndexedDB oraz automatycznie podmienia starą,
 * generowaną szafę testową na nową szafę ze zdjęciami z Internetu.
 */
export async function repairWardrobeDatabase(): Promise<void> {
  try {
    const [allItems, outfitsCount] = await Promise.all([
      db.items.toArray(),
      db.outfits.count(),
    ]);
    if (allItems.length === 0) return;

    // Jeśli w bazie znajduje się poprzednia, generowana na canvasie szafa testowa,
    // automatycznie podmieniamy ją na nową szafę testową ze zdjęciami ubrań z Internetu.
    const savedVersion = localStorage.getItem(DEMO_VERSION_KEY);
    if (allItems.length >= 20 && savedVersion !== CURRENT_DEMO_VERSION) {
      await seedDemoWardrobe(getSavedDemoGender());
      return;
    }

    const toPut: ClothingItem[] = [];
    for (const item of allItems) {
      let needsSave = false;
      let imageDataUrl = item.imageDataUrl;

      const hasValidSrc =
        imageDataUrl &&
        (imageDataUrl.startsWith('data:image/') ||
          imageDataUrl.startsWith('/') ||
          imageDataUrl.startsWith('http'));

      if (!hasValidSrc) {
        if (item.imageBlob && item.imageBlob.size > 0) {
          try {
            imageDataUrl = await blobToDataUrl(item.imageBlob);
          } catch {
            imageDataUrl = renderFallbackIllustrationForItem(item);
          }
        } else {
          imageDataUrl = renderFallbackIllustrationForItem(item);
        }
        needsSave = true;
      }

      const hasRawBlob = 'imageBlob' in item && item.imageBlob !== undefined;
      if (hasRawBlob) {
        needsSave = true;
      }

      let wearCount = item.wearCount ?? 0;
      if (outfitsCount === 0 && wearCount > 0) {
        wearCount = 0;
        needsSave = true;
      }

      const meta = defaultDemoPriceAndBrand(item.category, item.subCategory);
      if (!item.fit || item.price === undefined || item.maxWearsBeforeLaundry === undefined) {
        needsSave = true;
      }

      if (needsSave) {
        const cleaned: ClothingItem = {
          id: item.id,
          imageDataUrl,
          category: item.category,
          subCategory: item.subCategory,
          tempRange: item.tempRange,
          isRainproof: Boolean(item.isRainproof),
          dominantColor: item.dominantColor,
          colorHex: item.colorHex,
          secondaryColors: item.secondaryColors ?? [],
          secondaryColorHexes: item.secondaryColorHexes ?? [],
          pattern: item.pattern ?? 'solid',
          fit: item.fit ?? meta.fit,
          price: item.price ?? meta.price,
          brand: item.brand ?? meta.brand,
          brightnessType: item.brightnessType,
          occasions:
            Array.isArray(item.occasions) && item.occasions.length > 0
              ? item.occasions
              : ['casual'],
          createdAt: item.createdAt ?? Date.now(),
          lastWornAt: outfitsCount === 0 ? undefined : item.lastWornAt,
          wearCount,
          wearsSinceWash: item.wearsSinceWash ?? 0,
          maxWearsBeforeLaundry: item.maxWearsBeforeLaundry ?? meta.maxWearsBeforeLaundry,
          inLaundry: Boolean(item.inLaundry),
          isFavorite: Boolean(item.isFavorite),
        };
        toPut.push(cleaned);
      }
    }

    if (toPut.length > 0) {
      await db.items.bulkPut(toPut);
    }
  } catch {
    // Ignoruj ewentualne błędy migracji
  }
}

export async function clearAllWardrobe(): Promise<void> {
  await db.transaction('rw', db.items, db.outfits, async () => {
    await db.items.clear();
    await db.outfits.clear();
  });
}
