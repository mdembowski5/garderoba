export type Category = 'top' | 'bottom' | 'shoes' | 'outerwear' | 'accessory';
export type TempRange = 'hot' | 'mild' | 'cool' | 'cold';
export type BrightnessType = 'light' | 'dark' | 'neutral';
export type DayPreference = 'light' | 'dark' | 'any';
/** Okazja / przeznaczenie ubrania. */
export type Occasion = 'casual' | 'work' | 'party' | 'formal' | 'sport';

export interface ClothingItem {
  id: string; // UUID
  imageBlob: Blob; // skompresowane zdjęcie (WebP / JPEG, ≤ 80 KB)
  category: Category;
  subCategory: string;
  tempRange: TempRange;
  isRainproof: boolean;
  dominantColor: string; // nazwa z palety, np. "Granat"
  colorHex: string; // np. "#1e2a4a"
  brightnessType: BrightnessType;
  occasions: Occasion[]; // do jakich okazji pasuje (może być kilka)
  createdAt: number;
  lastWornAt?: number; // ostatnie zaakceptowanie w stylizacji (do rotacji ubrań)
}

export type NewClothingItem = Omit<ClothingItem, 'id' | 'createdAt' | 'lastWornAt'>;

export interface SavedOutfit {
  id: string;
  itemIds: string[];
  acceptedAt: number;
  apparentTemperature: number;
}

export type WeatherKind =
  | 'clear'
  | 'partly'
  | 'cloudy'
  | 'fog'
  | 'drizzle'
  | 'rain'
  | 'snow'
  | 'storm';

export interface WeatherData {
  temperature: number;
  apparentTemperature: number;
  precipitation: number;
  weatherCode: number;
  isDay: boolean;
  fetchedAt: number;
}

export interface Place {
  name: string;
  latitude: number;
  longitude: number;
  source: 'gps' | 'manual' | 'default';
}

export interface Outfit {
  top: ClothingItem;
  bottom: ClothingItem;
  shoes?: ClothingItem;
  outerwear?: ClothingItem;
  accessories: ClothingItem[];
  notes: string[]; // wskazówki, np. brak kurtki przeciwdeszczowej
  score: number; // 0-100, harmonia barw
  signature: string; // do wykluczania powtórek przy "Losuj inny zestaw"
}

export type RecommendResult =
  | { ok: true; outfit: Outfit }
  | { ok: false; missing: Category[]; message: string };
