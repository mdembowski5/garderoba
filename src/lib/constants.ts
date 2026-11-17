import type {
  BodyShapeId,
  BrightnessType,
  Category,
  DayPreference,
  FitType,
  Occasion,
  PatternType,
  TempRange,
} from '../types';

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

export const PATTERNS: {
  id: PatternType;
  label: string;
  shortLabel: string;
  emoji: string;
  hint: string;
}[] = [
  {
    id: 'solid',
    label: 'Gładkie (bez wzoru)',
    shortLabel: 'Gładkie',
    emoji: '✨',
    hint: 'Jednolita powierzchnia bez nadruków i deseni',
  },
  {
    id: 'print',
    label: 'Z nadrukiem / grafiką',
    shortLabel: 'Nadruk',
    emoji: '🖼️',
    hint: 'Logo, napis lub grafika (np. na piersi t-shirtu/bluzy)',
  },
  {
    id: 'stripes',
    label: 'W paski / prążki',
    shortLabel: 'Paski',
    emoji: '🦓',
    hint: 'Poziome lub pionowe pasy (np. bretonka, koszula w prążek)',
  },
  {
    id: 'plaid',
    label: 'W kratkę / pepitkę',
    shortLabel: 'Kratka',
    emoji: '🏁',
    hint: 'Krata szkocka, flanelowa, księcia Walii lub pepitka',
  },
  {
    id: 'floral',
    label: 'Wzór kwiatowy / artystyczny',
    shortLabel: 'Kwiaty / Wzór',
    emoji: '🌸',
    hint: 'Motywy roślinne, kwiatowe lub wielobarwny print na całości',
  },
  {
    id: 'dots',
    label: 'Drobny deseń / groszki',
    shortLabel: 'Drobny wzór',
    emoji: '⚪',
    hint: 'Groszki, kropki lub drobny powtarzalny mikro-wzór',
  },
];

export const PATTERN_LABELS = Object.fromEntries(
  PATTERNS.map((p) => [p.id, p.shortLabel])
) as Record<PatternType, string>;

export const PATTERN_EMOJIS = Object.fromEntries(
  PATTERNS.map((p) => [p.id, p.emoji])
) as Record<PatternType, string>;

export const FIT_TYPES: { id: FitType; label: string; emoji: string; hint: string }[] = [
  {
    id: 'slim',
    label: 'Dopasowany (Slim)',
    emoji: '🪡',
    hint: 'Blisko ciała – świetnie równoważy luźniejszy dół lub górę',
  },
  {
    id: 'regular',
    label: 'Klasyczny (Regular)',
    emoji: '👔',
    hint: 'Uniwersalny krój pasujący do każdego fasonu',
  },
  {
    id: 'oversize',
    label: 'Luźny (Oversize / Wide)',
    emoji: '🧥',
    hint: 'Swobodna objętość – najlepiej wygląda z bardziej dopasowaną drugą częścią stroju',
  },
];

export const FIT_LABELS: Record<FitType, string> = {
  slim: 'Dopasowany',
  regular: 'Klasyczny',
  oversize: 'Luźny / Oversize',
};

export const BODY_SHAPES: {
  id: BodyShapeId;
  label: string;
  emoji: string;
  hint: string;
}[] = [
  {
    id: 'hourglass',
    label: 'Klepsydra (proporcjonalna z talią)',
    emoji: '⏳',
    hint: 'Równe ramiona i biodra z wcięciem w talii – służy podkreślenie proporcji i fasony regular/slim',
  },
  {
    id: 'pear',
    label: 'Gruszka / Trójkąt (szersze biodra)',
    emoji: '🍐',
    hint: 'Węższe ramiona i pełniejsze biodra – służy przyciągnięcie uwagi do góry (jaśniejsza/wzorzysta góra) i prosty dół',
  },
  {
    id: 'apple',
    label: 'Jabłko / Owal (pełniejszy środek)',
    emoji: '🍎',
    hint: 'Mniej zarysowana talia i zgrabne nogi – służą gładkie, luźniejsze góry (regular/oversize) i dopasowany dół',
  },
  {
    id: 'rectangle',
    label: 'Prostokąt / Kolumna (smukła)',
    emoji: '📏',
    hint: 'Zbliżona szerokość ramion, talii i bioder – świetnie wyglądają kontrasty objętości (oversize + slim) i warstwowanie',
  },
  {
    id: 'inverted_triangle',
    label: 'Odwrócony trójkąt (szersze ramiona)',
    emoji: '🔻',
    hint: 'Wyraziste ramiona i węższe biodra – służy spokojna, gładka góra oraz szerszy lub jaśniejszy dół',
  },
  {
    id: 'athletic',
    label: 'Atletyczna / Trapez (sportowa)',
    emoji: '🏋️',
    hint: 'Harmonijna, sportowa sylwetka – najlepiej prezentuje się w krojach klasycznych (regular) i dopasowanych (slim)',
  },
];

export const THERMAL_OFFSETS: { value: number; label: string; emoji: string; hint: string }[] = [
  { value: -3, label: 'Zmarzluch (-3°C)', emoji: '🥶', hint: 'Szybko marznę – proponuj cieplejsze ubrania i warstwy' },
  { value: 0, label: 'Standardowo (0°C)', emoji: '🙂', hint: 'Odczuwam temperaturę zgodnie z prognozą' },
  { value: 3, label: 'Zawsze mi ciepło (+3°C)', emoji: '🔥', hint: 'Rzadko marznę – proponuj lżejsze warstwy' },
];

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

/** Domyślny krój (fit) na podstawie podkategorii ubrania. */
export function defaultFitForSubCategory(category: Category, subCategory: string): FitType {
  const s = subCategory.toLowerCase();
  if (
    s.includes('oversize') ||
    s.includes('bluza z kapturem') ||
    s.includes('kuloty') ||
    s.includes('cargo') ||
    s.includes('dres') ||
    s.includes('puchow') ||
    s.includes('parka') ||
    s.includes('sweter pleciony')
  ) {
    return 'oversize';
  }
  if (
    s.includes('golf') ||
    s.includes('body') ||
    s.includes('ramiączk') ||
    s.includes('crop') ||
    s.includes('leggins') ||
    s.includes('kolarki') ||
    s.includes('cygaretki') ||
    s.includes('wieczorow') ||
    (category === 'top' && s.includes('koszula wizytowa'))
  ) {
    return 'slim';
  }
  return 'regular';
}

/** Domyślna liczba założeń przed automatycznym przeniesieniem do kosza na pranie. */
export function defaultMaxWearsForSubCategory(category: Category, subCategory: string): number {
  const s = subCategory.toLowerCase();
  if (category === 'outerwear' || category === 'shoes' || category === 'bag') {
    return 99;
  }
  if (category === 'accessory') {
    return 99;
  }
  if (category === 'top') {
    if (s.includes('sweter') || s.includes('kardigan') || s.includes('kamizelka')) return 4;
    if (s.includes('bluza')) return 3;
    if (s.includes('koszula') || s.includes('golf') || s.includes('bluzka')) return 2;
    return 1; // t-shirty, topy, koszulki sportowe – po 1 założeniu
  }
  if (category === 'onepiece') {
    if (s.includes('garnitur')) return 5;
    return 2;
  }
  if (category === 'bottom') {
    if (s.includes('jeans')) return 5;
    if (s.includes('leggins') || s.includes('kolarki') || s.includes('dres')) return 2;
    return 3; // spodnie materiałowe, chinosy, spódnice, szorty
  }
  return 3;
}
