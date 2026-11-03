import { useCallback, useEffect, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Check, Plus, Shirt, Shuffle } from 'lucide-react';
import type { Category, ClothingItem, DayPreference, Occasion, RecommendResult } from '../types';
import { acceptOutfit, db, saveFavoriteOutfit } from '../lib/db';
import { recommendOutfit, swapOutfitPiece } from '../lib/outfit';
import { OCCASIONS, PREFERENCE_LABELS } from '../lib/constants';
import type { WeatherState } from '../hooks/useWeather';
import WeatherCard from '../components/WeatherCard';
import OutfitCard from '../components/OutfitCard';
import { Chip, Segmented } from '../components/ui';
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
  const [result, setResult] = useState<RecommendResult | null>(null);
  const [accepted, setAccepted] = useState(false);
  const [savedFav, setSavedFav] = useState(false);
  const [locked, setLocked] = useState<Partial<Record<Category, ClothingItem>>>({});

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
    [pref, occasion]
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

  const empty = items && items.length === 0;

  return (
    <div className="scroll-area h-full px-4 pb-6 pt-safe">
      <header className="mb-4">
        <h1 className="text-2xl font-bold">Dzisiejszy strój</h1>
        <p className="text-sm text-ink-400">Dobrany do pogody, okazji i harmonii barw</p>
      </header>

      <div className="space-y-4">
        <WeatherCard state={weatherState} />

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
              Dodaj kilka ubrań (góra, dół lub sukienka, buty), aby otrzymać pierwszą stylizację.
            </p>
            <button
              onClick={() => onNavigate('add')}
              className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-accent-500 px-5 py-3 font-semibold"
            >
              <Plus size={18} /> Dodaj ubranie
            </button>
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
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => generate(false)}
                className="flex items-center justify-center gap-2 rounded-2xl bg-ink-800 py-3.5 font-semibold active:bg-ink-700"
              >
                <Shuffle size={18} /> Losuj inny zestaw
              </button>
              <button
                onClick={accept}
                disabled={accepted}
                className={`flex items-center justify-center gap-2 rounded-2xl py-3.5 font-semibold transition-colors ${
                  accepted
                    ? 'bg-emerald-600/40 text-emerald-200'
                    : 'bg-accent-500 active:bg-accent-600'
                }`}
              >
                <Check size={18} /> {accepted ? 'Zaakceptowano' : 'Zaakceptuj strój'}
              </button>
            </div>
          </>
        ) : result && !result.ok ? (
          <div className="rounded-3xl bg-ink-900 p-6 text-center">
            <p className="text-sm text-ink-300">{result.message}</p>
            <button
              onClick={() => onNavigate('add')}
              className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-accent-500 px-5 py-3 font-semibold"
            >
              <Plus size={18} /> Dodaj ubranie
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
