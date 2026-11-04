export type Category =
  | 'top'
  | 'bottom'
  | 'onepiece'
  | 'outerwear'
  | 'shoes'
  | 'bag'
  | 'accessory';

export type TempRange = 'hot' | 'mild' | 'cool' | 'cold';
export type BrightnessType = 'light' | 'dark' | 'neutral';
export type DayPreference = 'light' | 'dark' | 'any';
/** Okazja / przeznaczenie ubrania. */
export type Occasion = 'casual' | 'work' | 'party' | 'formal' | 'sport';

export interface ClothingItem {
  id: string; // UUID
  imageBlob?: Blob; // opcjonalny Blob (dla kompatybilności wstecznej)
  imageDataUrl?: string; // niezawodny DataURL (eliminuje błędy Blob w iOS Safari IndexedDB)
  category: Category;
  subCategory: string;
  tempRange: TempRange;
  isRainproof: boolean;
  dominantColor: string; // nazwa z palety, np. "Brąz", "Karmel / Camel", "Granat"
  colorHex: string; // np. "#6b442a"
  brightnessType: BrightnessType;
  occasions: Occasion[]; // do jakich okazji pasuje (może być kilka)
  createdAt: number;
  lastWornAt?: number; // ostatnie zaakceptowanie w stylizacji (do rotacji ubrań)
  wearCount?: number; // ile razy założono ubranie
  inLaundry?: boolean; // czy ubranie jest obecnie w praniu (wykluczone z losowania)
  isFavorite?: boolean; // ulubione ubranie (lekki priorytet przy doborze)
}

export type SkinToneId =
  | 'fair-cool'
  | 'fair-warm'
  | 'light-neutral'
  | 'medium-warm'
  | 'medium-cool'
  | 'deep-warm'
  | 'deep-cool';

export type HairColorId =
  | 'platinum-blonde'
  | 'golden-blonde'
  | 'ash-brown'
  | 'warm-brown-red'
  | 'dark-brown'
  | 'black'
  | 'grey-silver';

export type EyeColorId =
  | 'blue'
  | 'green'
  | 'hazel'
  | 'amber-brown'
  | 'dark-brown'
  | 'grey';

export type ColorSeasonId = 'spring' | 'summer' | 'autumn' | 'winter';

export interface PersonalColorProfile {
  enabled: boolean;
  skinTone: SkinToneId;
  hairColor: HairColorId;
  eyeColor: EyeColorId;
}

export type NewClothingItem = Omit<ClothingItem, 'id' | 'createdAt' | 'lastWornAt'>;

export interface SavedOutfit {
  id: string;
  itemIds: string[];
  acceptedAt: number;
  apparentTemperature: number;
  occasion?: Occasion;
  score?: number;
  isFavorite?: boolean;
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
  /** Góra (gdy strój dwuczęściowy) */
  top?: ClothingItem;
  /** Dół (gdy strój dwuczęściowy) */
  bottom?: ClothingItem;
  /** Sukienka / kombinezon / garnitur (gdy strój jednoczęściowy) */
  onepiece?: ClothingItem;
  shoes?: ClothingItem;
  outerwear?: ClothingItem;
  bag?: ClothingItem;
  accessories: ClothingItem[];
  notes: string[]; // wskazówki, np. brak kurtki przeciwdeszczowej
  score: number; // 0-100, harmonia barw
  signature: string; // do wykluczania powtórek przy "Losuj inny zestaw"
}

export type RecommendResult =
  | { ok: true; outfit: Outfit }
  | { ok: false; missing: Category[]; message: string };
