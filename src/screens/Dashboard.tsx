import { useCallback, useEffect, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Check, Loader2, Palette, Plus, Shirt, Shuffle, Sparkles } from 'lucide-react';
import type {
  Category,
  ClothingItem,
  DayPreference,
  Occasion,
  PersonalColorProfile,
  RecommendResult,
} from '../types';
import { acceptOutfit, db, saveFavoriteOutfit } from '../lib/db';
import { recommendOutfit, swapOutfitPiece } from '../lib/outfit';
import { seedDemoWardrobe } from '../lib/demoWardrobe';
import { OCCASIONS, PREFERENCE_LABELS } from '../lib/constants';
import {
  EYE_COLORS,
  HAIR_COLORS,
  PERSONAL_PROFILE_EVENT,
  SKIN_TONES,
  loadPersonalProfile,
  resolveColorSeason,
  savePersonalProfile,
} from '../lib/personalColor';
import type { WeatherState } from '../hooks/useWeather';
import WeatherCard from '../components/WeatherCard';
import OutfitCard from '../components/OutfitCard';
import PersonalPaletteSheet from '../components/PersonalPaletteSheet';
import { Chip, ColorDot, Segmented } from '../components/ui';
import type { Tab } from '../components/TabBar';

const PREF_KEY = 'garderoba.pref';
const OCCASION_KEY = 'garderoba.occasion';
const PREF_OPTIONS = (Object.keys(PREFERENCE_LABELS) as DayPreference[]).map((v) => ({
  value: v,
  label: PREFERENCE_LABELS[v],
}));

function loadPref(): DayPreference {
  const v = localStorage.getItem(PREF_KEY);
  return v === 'light' || v === 'dark' || v === 'any' ? v : 'any';
}

function loadOccasion(): Occasion {
  const v = localStorage.getItem(OCCASION_KEY);
  return OCCASIONS.some((o) => o.id === v) ? (v as Occasion) : 'casual';
}

export default function Dashboard({
  weatherState,
  onNavigate,
  notify,
}: {
  weatherState: WeatherState;
  onNavigate: (t: Tab) => void;
  notify: (msg: string) => void;
}) {
  const { weather } = weatherState;
  const items = useLiveQuery(() => db.items.toArray(), []);
  const [pref, setPref] = useState<DayPreference>(loadPref);
  const [occasion, setOccasion] = useState<Occasion>(loadOccasion);
  const [personalProfile, setPersonalProfile] =
    useState<PersonalColorProfile>(loadPersonalProfile);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [result, setResult] = useState<RecommendResult | null>(null);
  const [accepted, setAccepted] = useState(false);
  const [savedFav, setSavedFav] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [locked, setLocked] = useState<Partial<Record<Category, ClothingItem>>>({});

  useEffect(() => {
    const syncProfile = () => setPersonalProfile(loadPersonalProfile());
    window.addEventListener(PERSONAL_PROFILE_EVENT, syncProfile);
    return () => window.removeEventListener(PERSONAL_PROFILE_EVENT, syncProfile);
  }, []);

  const seen = useRef<Set<string>>(new Set());
  const itemsRef = useRef(items);
  itemsRef.current = items;
  const weatherRef = useRef(weather);
  weatherRef.current = weather;
  const lockedRef = useRef(locked);
  lockedRef.current = locked;

  const generate = useCallback(
    (resetHistory: boolean) => {
      const list = itemsRef.current;
      const w = weatherRef.current;
      if (!list || !w) return;
      if (resetHistory) seen.current.clear();
      const r = recommendOutfit(list, w, {
        preference: pref,
        occasion,
        personalProfile,
        locked: lockedRef.current,
        seed: Math.floor(Math.random() * 2 ** 32),
        exclude: seen.current,
      });
      if (r.ok) {
        seen.current.add(r.outfit.signature);
        if (seen.current.size > 60) seen.current.clear();
      }
      setResult(r);
      setAccepted(false);
      setSavedFav(false);
    },
    [pref, occasion, personalProfile]
  );

  const itemsKey = items
    ? items.map((i) => `${i.id}:${i.inLaundry ? 1 : 0}`).join(',')
    : 'loading';
  const weatherKey = weather
    ? `${Math.round(weather.apparentTemperature)}|${weather.weatherCode}|${weather.precipitation > 0}|${weather.isDay}`
    : 'none';
  useEffect(() => {
    generate(true);
  }, [itemsKey, weatherKey, generate]);

  const changePref = (p: DayPreference) => {
    localStorage.setItem(PREF_KEY, p);
    setPref(p);
  };

  const changeOccasion = (o: Occasion) => {
    localStorage.setItem(OCCASION_KEY, o);
    setOccasion(o);
  };

  const toggleLock = (cat: Category, item: ClothingItem) => {
    setLocked((prev) => {
      const next = { ...prev };
      if (next[cat]?.id === item.id) {
        delete next[cat];
      } else {
        // Przypięcie sukienki odblokowuje górę/dół i odwrotnie
        if (cat === 'onepiece') {
          delete next.top;
          delete next.bottom;
        } else if (cat === 'top' || cat === 'bottom') {
          delete next.onepiece;
        }
        next[cat] = item;
      }
      return next;
    });
  };

  const handleSwapPiece = (cat: Category) => {
    if (!result?.ok || !items || !weather) return;
    const swapped = swapOutfitPiece(result.outfit, cat, items, weather, occasion);
    if (!swapped) {
      notify('Brak innego pasującego elementu w tej kategorii');
      return;
    }
    setResult({ ok: true, outfit: swapped });
    setAccepted(false);
    setSavedFav(false);
  };

  const handleSaveFavorite = async () => {
    if (!result?.ok || !weather || savedFav) return;
    await saveFavoriteOutfit(result.outfit, weather.apparentTemperature, occasion);
    setSavedFav(true);
    notify('Zapisano w ulubionych stylizacjach ❤️');
  };

  const accept = async () => {
    if (!result?.ok || !weather || accepted) return;
    await acceptOutfit(result.outfit, weather.apparentTemperature, occasion);
    setAccepted(true);
    notify('Strój zaakceptowany – miłego dnia! ✨');
  };

  const handleSeedDemo = async () => {
    if (seeding) return;
    setSeeding(true);
    try {
      const count = await seedDemoWardrobe();
      notify(`Załadowano testową szafę (${count} ubrań) ✨`);
    } catch {
      notify('Nie udało się wygenerować szafy testowej');
    } finally {
      setSeeding(false);
    }
  };

  const empty = items && items.length === 0;
  const season = resolveColorSeason(personalProfile);
  const skinSwatch =
    SKIN_TONES.find((s) => s.id === personalProfile.skinTone)?.swatchHex ?? '#ead0b8';
  const hairSwatch =
    HAIR_COLORS.find((h) => h.id === personalProfile.hairColor)?.swatchHex ?? '#7d6e63';
  const eyeSwatch =
    EYE_COLORS.find((e) => e.id === personalProfile.eyeColor)?.swatchHex ?? '#5b8ec9';

  const handleProfileChange = (next: PersonalColorProfile) => {
    setPersonalProfile(next);
    savePersonalProfile(next);
  };

  return (
    <div className="scroll-area h-full px-4 pb-12 pt-safe">
      <header className="mb-4">
        <h1 className="text-2xl font-bold">Dzisiejszy strój</h1>
        <p className="text-sm text-ink-400">
          Dobrany do pogody, okazji, Twojej urody i harmonii barw
        </p>
      </header>

      <div className="space-y-4">
        <WeatherCard state={weatherState} />

        {/* Pasek osobistej palety barw (Skóra, Włosy, Oczy) */}
        <button
          type="button"
          onClick={() => setPaletteOpen(true)}
          className="flex w-full items-center justify-between gap-2 rounded-2xl bg-ink-900 px-3.5 py-2.5 text-left ring-1 ring-white/10 active:bg-ink-800"
        >
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-white">
              <Palette size={14} className="shrink-0 text-accent-400" />
              <span className="truncate">
                Paleta urody: {season.emoji} {season.name}
                {!personalProfile.enabled ? ' (wył.)' : ''}
              </span>
            </div>
            <div className="mt-0.5 flex items-center gap-2.5 text-[11px] text-ink-400">
              <span className="inline-flex items-center gap-1">
                <ColorDot hex={skinSwatch} size={9} /> Skóra
              </span>
              <span className="inline-flex items-center gap-1">
                <ColorDot hex={hairSwatch} size={9} /> Włosy
              </span>
              <span className="inline-flex items-center gap-1">
                <ColorDot hex={eyeSwatch} size={9} /> Oczy
              </span>
            </div>
          </div>
          <span className="shrink-0 rounded-xl bg-accent-500/20 px-2.5 py-1 text-[11px] font-semibold text-accent-300">
            Zmień
          </span>
        </button>

        <div>
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-400">
            Okazja
          </div>
          <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4">
            {OCCASIONS.map((o) => (
              <Chip key={o.id} active={o.id === occasion} onClick={() => changeOccasion(o.id)}>
                {o.emoji} {o.label}
              </Chip>
            ))}
          </div>
        </div>

        <Segmented value={pref} options={PREF_OPTIONS} onChange={changePref} />

        {empty ? (
          <div className="rounded-3xl bg-ink-900 p-6 text-center">
            <Shirt size={36} className="mx-auto mb-3 text-accent-400" />
            <h2 className="font-bold">Twoja szafa jest pusta</h2>
            <p className="mt-1 text-sm text-ink-400">
              Dodaj własne ubrania lub jednym kliknięciem załaduj gotową szafę testową (27 ubrań),
              aby przetestować działanie aplikacji.
            </p>
            <div className="mt-4 flex flex-col gap-2.5 sm:flex-row sm:justify-center">
              <button
                onClick={() => onNavigate('add')}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-accent-500 px-5 py-3 font-semibold"
              >
                <Plus size={18} /> Dodaj ubranie
              </button>
              <button
                onClick={handleSeedDemo}
                disabled={seeding}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-ink-800 px-5 py-3 font-semibold text-accent-300 ring-1 ring-accent-400/40 active:bg-ink-700 disabled:opacity-50"
              >
                {seeding ? (
                  <>
                    <Loader2 size={18} className="animate-spin" /> Generowanie szafy...
                  </>
                ) : (
                  <>
                    <Sparkles size={18} /> Załaduj szafę testową (27)
                  </>
                )}
              </button>
            </div>
          </div>
        ) : !weather ? (
          <div className="h-64 animate-pulse rounded-3xl bg-ink-900" />
        ) : result?.ok ? (
          <>
            <OutfitCard
              outfit={result.outfit}
              lockedCategories={locked}
              onToggleLock={toggleLock}
              onSwapPiece={handleSwapPiece}
              isSavedFavorite={savedFav}
              onSaveFavorite={handleSaveFavorite}
            />
            <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
              <button
                onClick={() => generate(false)}
                className="flex min-w-0 items-center justify-center gap-1.5 rounded-2xl bg-ink-800 px-3 py-3.5 text-xs font-semibold active:bg-ink-700 sm:gap-2 sm:text-sm"
              >
                <Shuffle size={17} className="shrink-0" />
                <span className="truncate">Losuj inny zestaw</span>
              </button>
              <button
                onClick={accept}
                disabled={accepted}
                className={`flex min-w-0 items-center justify-center gap-1.5 rounded-2xl px-3 py-3.5 text-xs font-semibold transition-colors sm:gap-2 sm:text-sm ${
                  accepted
                    ? 'bg-emerald-600/40 text-emerald-200'
                    : 'bg-accent-500 active:bg-accent-600'
                }`}
              >
                <Check size={17} className="shrink-0" />
                <span className="truncate">
                  {accepted ? 'Zaakceptowano' : 'Zaakceptuj strój'}
                </span>
              </button>
            </div>
          </>
        ) : result && !result.ok ? (
          <div className="rounded-3xl bg-ink-900 p-6 text-center">
            <p className="text-sm text-ink-300">{result.message}</p>
            <div className="mt-4 flex flex-col gap-2.5 sm:flex-row sm:justify-center">
              <button
                onClick={() => onNavigate('add')}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-accent-500 px-5 py-3 font-semibold"
              >
                <Plus size={18} /> Dodaj ubranie
              </button>
              <button
                onClick={handleSeedDemo}
                disabled={seeding}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-ink-800 px-5 py-3 font-semibold text-accent-300 ring-1 ring-accent-400/40 active:bg-ink-700 disabled:opacity-50"
              >
                {seeding ? (
                  <>
                    <Loader2 size={18} className="animate-spin" /> Generowanie...
                  </>
                ) : (
                  <>
                    <Sparkles size={18} /> Załaduj szafę testową (27)
                  </>
                )}
              </button>
            </div>
          </div>
        ) : null}
      </div>

      <PersonalPaletteSheet
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        profile={personalProfile}
        onChange={handleProfileChange}
      />
    </div>
  );
}
