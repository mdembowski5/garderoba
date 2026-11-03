import type { BrightnessType, Category, DayPreference, Occasion, TempRange } from '../types';

export const CATEGORY_LABELS: Record<Category, string> = {
  top: 'Góra',
  bottom: 'Dół',
  shoes: 'Buty',
  outerwear: 'Wierzchnie',
  accessory: 'Dodatki',
};

export const CATEGORY_ORDER: Category[] = ['top', 'bottom', 'shoes', 'outerwear', 'accessory'];

export const BRIGHTNESS_LABELS: Record<BrightnessType, string> = {
  light: 'Jasne',
  neutral: 'Neutralne',
  dark: 'Ciemne',
};

export const PREFERENCE_LABELS: Record<DayPreference, string> = {
  light: 'Jasny dzień',
  dark: 'Ciemny dzień',
  any: 'Dowolny',
};

export const OCCASIONS: { id: Occasion; label: string; emoji: string }[] = [
  { id: 'casual', label: 'Zwykły dzień', emoji: '👕' },
  { id: 'work', label: 'Praca / biuro', emoji: '💼' },
  { id: 'party', label: 'Impreza', emoji: '🎉' },
  { id: 'formal', label: 'Elegancko', emoji: '🥂' },
  { id: 'sport', label: 'Sport', emoji: '🏃' },
];

export const OCCASION_LABELS = Object.fromEntries(OCCASIONS.map((o) => [o.id, o.label])) as Record<
  Occasion,
  string
>;

/** Kolejność od najzimniejszego – używana m.in. przez suwak temperatury. */
export const TEMP_RANGES: { id: TempRange; label: string; hint: string }[] = [
  { id: 'cold', label: 'Zimno', hint: '< 8°C' },
  { id: 'cool', label: 'Chłodno', hint: '8–15°C' },
  { id: 'mild', label: 'Ciepło', hint: '15–22°C' },
  { id: 'hot', label: 'Gorąco', hint: '> 22°C' },
];

export interface SubCategoryPreset {
  label: string;
  temp: TempRange;
  occasions: Occasion[];
  rainproof?: boolean;
}

const ALL: Occasion[] = ['casual', 'work', 'party', 'formal', 'sport'];
const p = (
  label: string,
  temp: TempRange,
  occasions: Occasion[],
  rainproof = false
): SubCategoryPreset => ({ label, temp, occasions, rainproof });

/** Podkategorie z domyślnymi ustawieniami (temperatura, deszcz, okazje) – użytkownik może je zmienić. */
export const SUBCATEGORIES: Record<Category, SubCategoryPreset[]> = {
  top: [
    p('t-shirt', 'hot', ['casual', 'sport']),
    p('polo', 'hot', ['casual', 'work']),
    p('top na ramiączkach', 'hot', ['casual', 'party']),
    p('koszulka sportowa', 'hot', ['sport']),
    p('koszula', 'mild', ['work', 'formal', 'casual']),
    p('bluzka elegancka', 'mild', ['party', 'formal', 'work']),
    p('longsleeve', 'mild', ['casual', 'sport']),
    p('bluza', 'cool', ['casual', 'sport']),
    p('sweter', 'cold', ['casual', 'work']),
    p('golf', 'cold', ['casual', 'work', 'formal']),
  ],
  bottom: [
    p('szorty', 'hot', ['casual', 'sport']),
    p('spódnica', 'hot', ['casual', 'party', 'formal']),
    p('jeansy', 'mild', ['casual', 'party']),
    p('spodnie materiałowe', 'mild', ['work', 'formal', 'casual']),
    p('spodnie eleganckie', 'mild', ['formal', 'work', 'party']),
    p('chinosy', 'mild', ['casual', 'work']),
    p('legginsy sportowe', 'mild', ['sport']),
    p('dresy', 'cool', ['sport', 'casual']),
    p('spodnie ocieplane', 'cold', ['casual', 'sport']),
  ],
  shoes: [
    p('sandały', 'hot', ['casual']),
    p('trampki', 'hot', ['casual']),
    p('sneakersy', 'mild', ['casual', 'party', 'sport']),
    p('buty sportowe', 'mild', ['sport']),
    p('półbuty', 'mild', ['work', 'formal', 'party']),
    p('szpilki', 'mild', ['party', 'formal']),
    p('botki', 'cool', ['casual', 'party', 'work']),
    p('kalosze', 'cool', ['casual'], true),
    p('traperki', 'cool', ['casual'], true),
    p('kozaki zimowe', 'cold', ['casual', 'work'], true),
  ],
  outerwear: [
    p('kurtka przeciwdeszczowa', 'mild', ['casual', 'sport', 'work'], true),
    p('kurtka jeansowa', 'mild', ['casual', 'party']),
    p('marynarka', 'mild', ['work', 'formal', 'party']),
    p('bomberka', 'cool', ['casual', 'party']),
    p('polar', 'cool', ['casual', 'sport']),
    p('softshell', 'cool', ['casual', 'sport'], true),
    p('płaszcz', 'cool', ['work', 'formal', 'casual', 'party']),
    p('kurtka zimowa', 'cold', ['casual', 'sport', 'work'], true),
  ],
  accessory: [
    p('zegarek', 'mild', ALL),
    p('okulary przeciwsłoneczne', 'hot', ['casual', 'sport', 'party']),
    p('naszyjnik srebrny', 'mild', ['casual', 'work', 'party', 'formal']),
    p('naszyjnik złoty', 'mild', ['casual', 'work', 'party', 'formal']),
    p('bransoletka srebrna', 'mild', ['casual', 'work', 'party', 'formal']),
    p('bransoletka złota', 'mild', ['casual', 'work', 'party', 'formal']),
    p('kolczyki srebrne', 'mild', ['casual', 'work', 'party', 'formal']),
    p('kolczyki złote', 'mild', ['casual', 'work', 'party', 'formal']),
    p('pierścionek srebrny', 'mild', ['casual', 'party', 'formal']),
    p('pierścionek złoty', 'mild', ['casual', 'party', 'formal']),
    p('pasek', 'mild', ['casual', 'work', 'formal']),
    p('czapka z daszkiem', 'hot', ['casual', 'sport']),
    p('czapka zimowa', 'cold', ['casual', 'sport', 'work']),
    p('szalik', 'cold', ['casual', 'work', 'formal']),
    p('rękawiczki', 'cold', ['casual', 'sport', 'work', 'formal']),
  ],
};

/** Domyślne okazje dla znanej podkategorii (używane m.in. przy migracji starszych danych). */
export function defaultOccasions(category: Category, subCategory: string): Occasion[] {
  const preset = SUBCATEGORIES[category]?.find((x) => x.label === subCategory);
  return preset ? [...preset.occasions] : ['casual'];
}
