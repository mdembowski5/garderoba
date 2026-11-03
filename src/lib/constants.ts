import type { BrightnessType, Category, DayPreference, Occasion, TempRange } from '../types';

export const CATEGORY_LABELS: Record<Category, string> = {
  top: 'Góra',
  bottom: 'Dół',
  onepiece: 'Sukienki / 1-część.',
  outerwear: 'Wierzchnie',
  shoes: 'Buty',
  bag: 'Torebki / Plecaki',
  accessory: 'Dodatki',
};

export const CATEGORY_EMOJIS: Record<Category, string> = {
  top: '👕',
  bottom: '👖',
  onepiece: '👗',
  outerwear: '🧥',
  shoes: '👟',
  bag: '👜',
  accessory: '⌚',
};

export const CATEGORY_ORDER: Category[] = [
  'top',
  'bottom',
  'onepiece',
  'outerwear',
  'shoes',
  'bag',
  'accessory',
];

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
    p('top na ramiączkach', 'hot', ['casual', 'party']),
    p('crop top', 'hot', ['casual', 'party', 'sport']),
    p('body', 'mild', ['casual', 'party', 'formal']),
    p('polo', 'hot', ['casual', 'work']),
    p('koszulka sportowa', 'hot', ['sport']),
    p('bluzka', 'mild', ['casual', 'work']),
    p('bluzka elegancka', 'mild', ['party', 'formal', 'work']),
    p('koszula', 'mild', ['work', 'formal', 'casual']),
    p('koszula lniana', 'hot', ['casual', 'work', 'party']),
    p('longsleeve', 'mild', ['casual', 'sport']),
    p('bluza', 'cool', ['casual', 'sport']),
    p('bluza z kapturem', 'cool', ['casual', 'sport']),
    p('kardigan', 'cool', ['casual', 'work']),
    p('sweter', 'cold', ['casual', 'work']),
    p('golf', 'cold', ['casual', 'work', 'formal']),
    p('kamizelka', 'mild', ['casual', 'work', 'formal']),
  ],
  bottom: [
    p('jeansy', 'mild', ['casual', 'party']),
    p('spodnie materiałowe', 'mild', ['work', 'formal', 'casual']),
    p('spodnie eleganckie', 'mild', ['formal', 'work', 'party']),
    p('cygaretki', 'mild', ['work', 'formal', 'party']),
    p('kuloty', 'mild', ['casual', 'work', 'party']),
    p('chinosy', 'mild', ['casual', 'work']),
    p('bojówki (cargo)', 'mild', ['casual']),
    p('spódnica mini', 'hot', ['casual', 'party']),
    p('spódnica midi', 'mild', ['casual', 'work', 'party', 'formal']),
    p('spódnica maxi', 'mild', ['casual', 'party', 'formal']),
    p('szorty', 'hot', ['casual', 'sport']),
    p('szorty jeansowe', 'hot', ['casual', 'party']),
    p('kolarki', 'hot', ['sport', 'casual']),
    p('legginsy', 'mild', ['casual', 'sport']),
    p('legginsy sportowe', 'mild', ['sport']),
    p('dresy', 'cool', ['sport', 'casual']),
    p('spodnie ocieplane', 'cold', ['casual', 'sport']),
  ],
  onepiece: [
    p('sukienka codzienna', 'mild', ['casual', 'work']),
    p('sukienka letnia', 'hot', ['casual', 'party']),
    p('sukienka mini', 'hot', ['party', 'casual']),
    p('sukienka midi', 'mild', ['casual', 'work', 'party', 'formal']),
    p('sukienka maxi', 'mild', ['casual', 'party', 'formal']),
    p('sukienka koktajlowa', 'mild', ['party', 'formal']),
    p('sukienka wieczorowa', 'mild', ['formal', 'party']),
    p('sukienka dzianinowa (swetrowa)', 'cool', ['casual', 'work']),
    p('sukienka koszulowa (szmizjerka)', 'mild', ['work', 'casual']),
    p('kombinezon', 'mild', ['casual', 'party', 'work']),
    p('kombinezon elegancki', 'mild', ['party', 'formal']),
    p('garnitur / komplet', 'mild', ['formal', 'work', 'party']),
  ],
  outerwear: [
    p('marynarka / żakiet', 'mild', ['work', 'formal', 'party']),
    p('ramoneska (skórzana)', 'cool', ['casual', 'party']),
    p('kurtka jeansowa', 'mild', ['casual', 'party']),
    p('bomberka', 'cool', ['casual', 'party']),
    p('kurtka przejściowa', 'cool', ['casual', 'work']),
    p('wiatrówka', 'mild', ['casual', 'sport'], true),
    p('kurtka przeciwdeszczowa', 'mild', ['casual', 'sport', 'work'], true),
    p('trencz', 'cool', ['work', 'formal', 'casual', 'party']),
    p('płaszcz', 'cool', ['work', 'formal', 'casual', 'party']),
    p('płaszcz zimowy', 'cold', ['work', 'formal', 'casual']),
    p('polar', 'cool', ['casual', 'sport']),
    p('softshell', 'cool', ['casual', 'sport'], true),
    p('kurtka puchowa', 'cold', ['casual', 'work'], true),
    p('kurtka zimowa', 'cold', ['casual', 'sport', 'work'], true),
    p('parka', 'cold', ['casual', 'work'], true),
    p('futro / kożuch', 'cold', ['party', 'formal', 'casual']),
  ],
  shoes: [
    p('sneakersy', 'mild', ['casual', 'party', 'sport']),
    p('trampki', 'hot', ['casual']),
    p('buty sportowe', 'mild', ['sport']),
    p('mokasyny / loafersy', 'mild', ['work', 'casual', 'formal']),
    p('baleriny', 'mild', ['casual', 'work', 'formal']),
    p('półbuty', 'mild', ['work', 'formal', 'party']),
    p('szpilki', 'mild', ['party', 'formal']),
    p('czółenka', 'mild', ['work', 'formal', 'party']),
    p('sandały', 'hot', ['casual', 'party']),
    p('klapki', 'hot', ['casual']),
    p('espadryle', 'hot', ['casual']),
    p('botki', 'cool', ['casual', 'party', 'work']),
    p('sztyblety', 'cool', ['casual', 'work', 'formal']),
    p('kowbojki', 'cool', ['casual', 'party']),
    p('kozaki', 'cool', ['casual', 'party', 'work', 'formal']),
    p('kozaki zimowe', 'cold', ['casual', 'work'], true),
    p('traperki', 'cool', ['casual'], true),
    p('śniegowce', 'cold', ['casual'], true),
    p('kalosze', 'cool', ['casual'], true),
  ],
  bag: [
    p('torebka listonoszka', 'mild', ['casual', 'work', 'party']),
    p('torebka shopper', 'mild', ['casual', 'work']),
    p('torebka kopertówka', 'mild', ['party', 'formal']),
    p('torebka na ramię (baguette)', 'mild', ['casual', 'party']),
    p('plecak miejski', 'mild', ['casual', 'work']),
    p('plecak sportowy', 'mild', ['sport', 'casual']),
    p('nerka', 'mild', ['casual', 'sport']),
    p('torba na laptopa / aktówka', 'mild', ['work', 'formal']),
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
    p('krawat / mucha', 'mild', ['formal', 'work']),
    p('apaszka / chusta', 'mild', ['casual', 'work', 'formal']),
    p('czapka z daszkiem', 'hot', ['casual', 'sport']),
    p('kapelusz', 'hot', ['casual', 'party']),
    p('czapka zimowa', 'cold', ['casual', 'sport', 'work']),
    p('beret', 'cool', ['casual', 'work', 'formal']),
    p('szalik', 'cold', ['casual', 'work', 'formal']),
    p('rękawiczki', 'cold', ['casual', 'sport', 'work', 'formal']),
  ],
};

/** Domyślne okazje dla znanej podkategorii (używane m.in. przy migracji starszych danych). */
export function defaultOccasions(category: Category, subCategory: string): Occasion[] {
  const preset = SUBCATEGORIES[category]?.find((x) => x.label === subCategory);
  return preset ? [...preset.occasions] : ['casual'];
}
