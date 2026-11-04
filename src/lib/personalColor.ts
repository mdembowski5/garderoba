import type {
  Category,
  ColorSeasonId,
  EyeColorId,
  HairColorId,
  PersonalColorProfile,
  SkinToneId,
} from '../types';
import { PALETTE, hexToRgb } from './palette';

export const PERSONAL_PROFILE_KEY = 'garderoba.personalProfile';
export const PERSONAL_PROFILE_EVENT = 'garderoba:profile-change';

export interface TraitOption<T extends string> {
  id: T;
  label: string;
  hint: string;
  swatchHex: string;
  temp: 'warm' | 'cool' | 'neutral';
  depth: 'light' | 'medium' | 'deep';
}

export const SKIN_TONES: TraitOption<SkinToneId>[] = [
  {
    id: 'fair-cool',
    label: 'Jasna porcelanowa (chłodna)',
    hint: 'Różowy lub alabastrowy podton, łatwo się czerwieni',
    swatchHex: '#f7dfd9',
    temp: 'cool',
    depth: 'light',
  },
  {
    id: 'fair-warm',
    label: 'Jasna brzoskwiniowa (ciepła)',
    hint: 'Złocisty/kremowy podton, czasem złote piegi',
    swatchHex: '#f6dec5',
    temp: 'warm',
    depth: 'light',
  },
  {
    id: 'light-neutral',
    label: 'Jasno-średnia neutralna',
    hint: 'Naturalny beż, zbalansowany podton',
    swatchHex: '#ead0b8',
    temp: 'neutral',
    depth: 'light',
  },
  {
    id: 'medium-warm',
    label: 'Średnia złocista (ciepła)',
    hint: 'Miodowy lub ciepły beż, łatwo się opala na brąz',
    swatchHex: '#d8af88',
    temp: 'warm',
    depth: 'medium',
  },
  {
    id: 'medium-cool',
    label: 'Średnia oliwkowa (chłodna)',
    hint: 'Chłodny beż lub oliwkowy odcień skóry',
    swatchHex: '#cfb09a',
    temp: 'cool',
    depth: 'medium',
  },
  {
    id: 'deep-warm',
    label: 'Śniada / karmelowa (ciepła)',
    hint: 'Ciemniejsza skóra ze złocistym lub brzoskwiniowym blaskiem',
    swatchHex: '#a97752',
    temp: 'warm',
    depth: 'deep',
  },
  {
    id: 'deep-cool',
    label: 'Śniada / głęboka (chłodna)',
    hint: 'Ciemniejsza skóra z chłodnym, kakaowym podtonem',
    swatchHex: '#875b46',
    temp: 'cool',
    depth: 'deep',
  },
];

export const HAIR_COLORS: TraitOption<HairColorId>[] = [
  {
    id: 'platinum-blonde',
    label: 'Platynowy / popielaty blond',
    hint: 'Chłodny jasny blond bez złotych tonów',
    swatchHex: '#e3ddd3',
    temp: 'cool',
    depth: 'light',
  },
  {
    id: 'golden-blonde',
    label: 'Złoty / miodowy blond',
    hint: 'Ciepły, słoneczny lub truskawkowy blond',
    swatchHex: '#d9b36c',
    temp: 'warm',
    depth: 'light',
  },
  {
    id: 'ash-brown',
    label: 'Chłodny szatyn / mysi brąz',
    hint: 'Średni brąz lub ciemny blond o popielatym odcieniu',
    swatchHex: '#7d6e63',
    temp: 'cool',
    depth: 'medium',
  },
  {
    id: 'warm-brown-red',
    label: 'Rudy / miedziany / kasztanowy',
    hint: 'Włosy rude, miedziane lub brąz ze złotym/czerwonym refleksem',
    swatchHex: '#9d4a2b',
    temp: 'warm',
    depth: 'medium',
  },
  {
    id: 'dark-brown',
    label: 'Ciemny brąz / czekoladowy',
    hint: 'Głęboki brąz o średnim lub wysokim kontraście',
    swatchHex: '#432c21',
    temp: 'neutral',
    depth: 'deep',
  },
  {
    id: 'black',
    label: 'Czarny / kruczoczarny',
    hint: 'Bardzo ciemne, wyraziste włosy',
    swatchHex: '#18181c',
    temp: 'cool',
    depth: 'deep',
  },
  {
    id: 'grey-silver',
    label: 'Siwy / srebrzysty',
    hint: 'Szlachetny chłodny srebrny lub szary odcień',
    swatchHex: '#a5aab2',
    temp: 'cool',
    depth: 'light',
  },
];

export const EYE_COLORS: TraitOption<EyeColorId>[] = [
  {
    id: 'blue',
    label: 'Niebieskie / błękitne',
    hint: 'Jasnobłękitne, morskie lub stalowe',
    swatchHex: '#5b8ec9',
    temp: 'cool',
    depth: 'light',
  },
  {
    id: 'grey',
    label: 'Szare / przydymione',
    hint: 'Chłodne szaroniebieskie lub szarozielone',
    swatchHex: '#7e8c99',
    temp: 'cool',
    depth: 'light',
  },
  {
    id: 'green',
    label: 'Zielone',
    hint: 'Szmaragdowe, trawiaste lub ze złotą obwódką',
    swatchHex: '#4f8a5b',
    temp: 'warm',
    depth: 'light',
  },
  {
    id: 'hazel',
    label: 'Piwne (zielono-brązowe)',
    hint: 'Wielotonowe połączenie zieleni, złota i brązu',
    swatchHex: '#8d6e3a',
    temp: 'warm',
    depth: 'medium',
  },
  {
    id: 'amber-brown',
    label: 'Bursztynowe / ciepły brąz',
    hint: 'Miodowe, złocistobrązowe lub orzechowe',
    swatchHex: '#9e5b28',
    temp: 'warm',
    depth: 'medium',
  },
  {
    id: 'dark-brown',
    label: 'Ciemnobrązowe / czarne',
    hint: 'Głęboka, ciemna tęczówka o wysokim kontraście',
    swatchHex: '#382218',
    temp: 'cool',
    depth: 'deep',
  },
];

export interface SeasonInfo {
  id: ColorSeasonId;
  name: string;
  emoji: string;
  subtitle: string;
  undertone: 'warm' | 'cool';
  description: string;
  powerColors: string[];
  goodColors: string[];
  avoidNearFace: string[];
}

export const SEASONS: Record<ColorSeasonId, SeasonInfo> = {
  spring: {
    id: 'spring',
    name: 'Wiosna',
    emoji: '🌸',
    subtitle: 'Typ ciepły, jasny i świeży',
    undertone: 'warm',
    description:
      'Twoja uroda rozkwita w czystych, ciepłych i świetlistych barwach. Najlepiej wyglądasz w odcieniach kremowych, brzoskwiniowych, koralowych, karmelowych i świeżych błękitach.',
    powerColors: [
      'Kremowy / Écru',
      'Beż',
      'Karmel / Camel',
      'Koralowy',
      'Brzoskwiniowy / Łososiowy',
      'Żółty / Musztardowy',
      'Jasny brąz',
      'Błękit',
      'Miętowy / Szałwiowy',
      'Czerwień',
    ],
    goodColors: ['Biel', 'Granat', 'Niebieski', 'Zieleń', 'Pudrowy róż', 'Brąz'],
    avoidNearFace: ['Czerń', 'Grafit / Antracyt', 'Bordowy / Burgund', 'Fuksja / Magenta'],
  },
  summer: {
    id: 'summer',
    name: 'Lato',
    emoji: '🌊',
    subtitle: 'Typ chłodny, harmonijny i łagodny',
    undertone: 'cool',
    description:
      'Twoją urodę najlepiej podkreślają barwy chłodne, pastelowe i lekko zgaszone: błękity, pudrowy róż, lawenda, szałwia, szarości oraz szlachetny granat i burgund.',
    powerColors: [
      'Błękit',
      'Pudrowy róż',
      'Lawendowy / Fiolet',
      'Miętowy / Szałwiowy',
      'Szarość',
      'Granat',
      'Niebieski',
      'Bordowy / Burgund',
      'Biel',
    ],
    goodColors: ['Grafit / Antracyt', 'Kremowy / Écru', 'Beż', 'Fuksja / Magenta', 'Zieleń'],
    avoidNearFace: [
      'Pomarańczowy / Terakota',
      'Żółty / Musztardowy',
      'Karmel / Camel',
      'Czerń',
    ],
  },
  autumn: {
    id: 'autumn',
    name: 'Jesień',
    emoji: '🍂',
    subtitle: 'Typ ciepły, głęboki i ziemisty',
    undertone: 'warm',
    description:
      'Twoja uroda harmonizuje z nasyconymi, ciepłymi barwami natury: brązami, karmelem, oliwką, butelkową zielenią, terakotą, musztardą, ciepłym beżem i głębokim burgundem.',
    powerColors: [
      'Brąz',
      'Karmel / Camel',
      'Jasny brąz',
      'Oliwkowy / Khaki',
      'Zieleń',
      'Pomarańczowy / Terakota',
      'Żółty / Musztardowy',
      'Beż',
      'Kremowy / Écru',
      'Bordowy / Burgund',
    ],
    goodColors: ['Granat', 'Czerwień', 'Miętowy / Szałwiowy', 'Koralowy', 'Brzoskwiniowy / Łososiowy'],
    avoidNearFace: ['Fuksja / Magenta', 'Pudrowy róż', 'Lawendowy / Fiolet', 'Czerń', 'Biel'],
  },
  winter: {
    id: 'winter',
    name: 'Zima',
    emoji: '❄️',
    subtitle: 'Typ chłodny, czysty i kontrastowy',
    undertone: 'cool',
    description:
      'Twoja kontrastowa uroda świetnie nosi mocne, czyste i chłodne kolory: głęboką czerń, śnieżną biel, granat, nasycony błękit/kobalt, czerwień, fuksję, burgund i szmaragdową zieleń.',
    powerColors: [
      'Czerń',
      'Biel',
      'Granat',
      'Niebieski',
      'Czerwień',
      'Fuksja / Magenta',
      'Bordowy / Burgund',
      'Grafit / Antracyt',
      'Zieleń',
      'Lawendowy / Fiolet',
    ],
    goodColors: ['Szarość', 'Błękit', 'Pudrowy róż', 'Kremowy / Écru'],
    avoidNearFace: [
      'Karmel / Camel',
      'Jasny brąz',
      'Pomarańczowy / Terakota',
      'Żółty / Musztardowy',
      'Oliwkowy / Khaki',
    ],
  },
};

export const DEFAULT_PERSONAL_PROFILE: PersonalColorProfile = {
  enabled: true,
  skinTone: 'light-neutral',
  hairColor: 'ash-brown',
  eyeColor: 'blue',
};

export function loadPersonalProfile(): PersonalColorProfile {
  try {
    const raw = localStorage.getItem(PERSONAL_PROFILE_KEY);
    if (!raw) return DEFAULT_PERSONAL_PROFILE;
    const parsed = JSON.parse(raw) as Partial<PersonalColorProfile>;
    const skinTone = SKIN_TONES.some((s) => s.id === parsed.skinTone)
      ? (parsed.skinTone as SkinToneId)
      : DEFAULT_PERSONAL_PROFILE.skinTone;
    const hairColor = HAIR_COLORS.some((h) => h.id === parsed.hairColor)
      ? (parsed.hairColor as HairColorId)
      : DEFAULT_PERSONAL_PROFILE.hairColor;
    const eyeColor = EYE_COLORS.some((e) => e.id === parsed.eyeColor)
      ? (parsed.eyeColor as EyeColorId)
      : DEFAULT_PERSONAL_PROFILE.eyeColor;
    return {
      enabled: parsed.enabled !== false,
      skinTone,
      hairColor,
      eyeColor,
    };
  } catch {
    return DEFAULT_PERSONAL_PROFILE;
  }
}

export function savePersonalProfile(profile: PersonalColorProfile): void {
  localStorage.setItem(PERSONAL_PROFILE_KEY, JSON.stringify(profile));
  window.dispatchEvent(new CustomEvent(PERSONAL_PROFILE_EVENT, { detail: profile }));
}

/** Wyznacza porę roku (typ urody) na podstawie odcienia skóry, włosów i oczu. */
export function resolveColorSeason(profile: PersonalColorProfile): SeasonInfo {
  const skin = SKIN_TONES.find((s) => s.id === profile.skinTone) ?? SKIN_TONES[2];
  const hair = HAIR_COLORS.find((h) => h.id === profile.hairColor) ?? HAIR_COLORS[2];
  const eye = EYE_COLORS.find((e) => e.id === profile.eyeColor) ?? EYE_COLORS[0];

  // Punktacja temperatury: dodatnia = ciepły (Wiosna/Jesień), ujemna = chłodny (Lato/Zima)
  let warmScore = 0;
  if (skin.temp === 'warm') warmScore += 3;
  else if (skin.temp === 'cool') warmScore -= 3;

  if (hair.temp === 'warm') warmScore += 2.5;
  else if (hair.temp === 'cool') warmScore -= 2.5;

  if (eye.temp === 'warm') warmScore += 1.5;
  else if (eye.temp === 'cool') warmScore -= 1.5;

  // Punktacja głębi / kontrastu: dodatnia = głęboki/kontrastowy (Jesień/Zima), ujemna = jasny/delikatny (Wiosna/Lato)
  let depthScore = 0;
  if (skin.depth === 'deep') depthScore += 2;
  else if (skin.depth === 'medium') depthScore += 0.5;
  else depthScore -= 1;

  if (hair.depth === 'deep') depthScore += 2.5;
  else if (hair.depth === 'medium') depthScore += 0.5;
  else depthScore -= 2;

  if (eye.depth === 'deep') depthScore += 1.5;
  else if (eye.depth === 'medium') depthScore += 0.5;
  else depthScore -= 1;

  const isWarm = warmScore > 0;
  const isDeep = depthScore >= 0.5;

  if (isWarm) {
    return isDeep ? SEASONS.autumn : SEASONS.spring;
  }
  return isDeep ? SEASONS.winter : SEASONS.summer;
}

export type PersonalColorTier = 'power' | 'good' | 'neutral' | 'caution';

export interface PersonalColorEvaluation {
  season: SeasonInfo;
  tier: PersonalColorTier;
  scoreDelta: number;
  matchPercent: number;
  isNearFace: boolean;
  headline: string;
  explanation: string;
}

/** Sprawdza, czy dany kolor ubrania (i kategoria) pasuje do typu urody użytkownika. */
export function evaluateColorForPerson(
  dominantColor: string,
  colorHex: string,
  category: Category,
  profile: PersonalColorProfile
): PersonalColorEvaluation {
  const season = resolveColorSeason(profile);
  const isNearFace =
    category === 'top' || category === 'onepiece' || category === 'outerwear';

  // Określamy również ciepło samego HEX-u na wypadek niestandardowego koloru
  const [r, , b] = hexToRgb(colorHex);
  const itemIsWarm = r - b > 18;
  const itemIsCool = b - r > 14;

  if (season.powerColors.includes(dominantColor)) {
    return {
      season,
      tier: 'power',
      scoreDelta: isNearFace ? 13 : 6,
      matchPercent: isNearFace ? 96 : 92,
      isNearFace,
      headline: `🌟 Kolor z Twojej głównej palety (${season.emoji} ${season.name})`,
      explanation: isNearFace
        ? `Odcień „${dominantColor}” noszony blisko twarzy idealnie współgra z Twoim odcieniem skóry, kolorem włosów i oczu – rozświetla cerę i podkreśla rysy.`
        : `Odcień „${dominantColor}” należy do Twojej palety barw (${season.name}) i świetnie spina całą stylizację.`,
    };
  }

  if (season.goodColors.includes(dominantColor)) {
    return {
      season,
      tier: 'good',
      scoreDelta: isNearFace ? 6 : 4,
      matchPercent: 84,
      isNearFace,
      headline: `👍 Dobra, harmonijna baza dla typu ${season.name}`,
      explanation: `Kolor „${dominantColor}” jest bezpieczny dla Twojej urody i łatwo połączysz go z Twoimi kolorami przewodnimi (${season.powerColors.slice(0, 3).join(', ')}).`,
    };
  }

  if (season.avoidNearFace.includes(dominantColor)) {
    if (!isNearFace) {
      return {
        season,
        tier: 'neutral',
        scoreDelta: 1,
        matchPercent: 74,
        isNearFace,
        headline: `👌 Dobry wybór poza strefą twarzy`,
        explanation: `Choć „${dominantColor}” nie leży w głównej palecie typu ${season.name}, jako ${
          category === 'bottom' ? 'dół (spodnie/spódnica)' : 'element oddalony od twarzy'
        } nie wpływa negatywnie na odcień cery.`,
      };
    }
    return {
      season,
      tier: 'caution',
      scoreDelta: -11,
      matchPercent: 45,
      isNearFace,
      headline: `⚠️ Kolor trudniejszy przy twarzy dla typu ${season.name}`,
      explanation: `Odcień „${dominantColor}” ma inną temperaturę lub kontrast niż Twoja uroda (${season.subtitle.toLowerCase()}). Przy twarzy może lekko przytłaczać lub gasić cerę – warto przełamać go narzutką, marynarką lub dodatkiem w kolorze z Twojej palety (${season.powerColors.slice(0, 3).join(', ')}).`,
    };
  }

  // Pozostałe kolory z palety 20 barw – oceniamy po zgodności temperatury podtonu
  const undertoneMatch =
    (season.undertone === 'warm' && itemIsWarm) ||
    (season.undertone === 'cool' && itemIsCool);

  if (undertoneMatch) {
    return {
      season,
      tier: 'good',
      scoreDelta: isNearFace ? 5 : 3,
      matchPercent: 80,
      isNearFace,
      headline: `👍 Zgodny podton z Twoim typem urody (${season.name})`,
      explanation: `Temperatura barwy „${dominantColor}” pasuje do Twojego podtonu skóry i włosów.`,
    };
  }

  return {
    season,
    tier: 'neutral',
    scoreDelta: isNearFace ? -2 : 2,
    matchPercent: isNearFace ? 68 : 76,
    isNearFace,
    headline: `👌 Neutralne dopasowanie do typu ${season.name}`,
    explanation: isNearFace
      ? `Kolor „${dominantColor}” jest neutralny dla Twojej urody – najlepiej zestawić go z dołem lub okryciem z Twojej palety (${season.powerColors.slice(0, 3).join(', ')}).`
      : `Jako element oddalony od twarzy „${dominantColor}” będzie bezpiecznym uzupełnieniem stroju.`,
  };
}

/** Pomocnik do pobrania koloru HEX z palety po nazwie. */
export function paletteHexByName(name: string): string {
  return PALETTE.find((p) => p.name === name)?.hex ?? '#888888';
}
