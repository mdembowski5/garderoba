import { useMemo, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  AlertCircle,
  Award,
  Briefcase,
  Calendar,
  Camera,
  Check,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  Clock,
  Coins,
  Download,
  Droplets,
  Heart,
  Loader2,
  RefreshCw,
  ShoppingBag,
  Sparkles,
  Square,
  Target,
  Trash2,
  Upload,
  Wand2,
  WashingMachine,
} from 'lucide-react';
import type { ClothingItem, Occasion, Outfit, TempRange, WeatherData } from '../types';
import type { WeatherState } from '../hooks/useWeather';
import {
  acceptOutfit,
  clearLaundryByIds,
  db,
  deleteSavedOutfit,
  exportWardrobeBackup,
  importWardrobeBackup,
  saveFavoriteOutfit,
  toggleSavedOutfitFavorite,
} from '../lib/db';
import { exportOutfitCollage } from '../lib/collage';
import {
  DEMO_MEN_COUNT,
  DEMO_WOMEN_COUNT,
  clearAllWardrobe,
  seedDemoWardrobe,
  type DemoWardrobeGender,
} from '../lib/demoWardrobe';
import {
  CATEGORY_LABELS,
  FIT_LABELS,
  OCCASIONS,
  OCCASION_LABELS,
  PATTERN_EMOJIS,
  PATTERN_LABELS,
  TEMP_RANGES,
} from '../lib/constants';
import {
  buildCapsuleWardrobe,
  computeOutfitScore,
  computeSignature,
  evaluateBodyProportion,
  generatePackingList,
  generateSmartWishlist,
  generateWeeklyPlan,
  groupLaundryIntoLoads,
} from '../lib/outfit';
import { garmentHarmony } from '../lib/palette';
import { DEFAULT_PLACE, weatherLabel } from '../lib/weather';
import { Chip, ColorDot, ColorDots, ItemImage, WeatherIcon } from '../components/ui';

type SubTab = 'weekly' | 'studio' | 'capsule' | 'packing' | 'outfits' | 'stats';

const SUB_TABS: { value: SubTab; label: string }[] = [
  { value: 'weekly', label: '📅 Tydzień' },
  { value: 'studio', label: '🪄 Kreator' },
  { value: 'capsule', label: '🎯 Kapsuła' },
  { value: 'packing', label: '🧳 Walizka' },
  { value: 'outfits', label: '❤️ Zestawy' },
  { value: 'stats', label: '📊 Raport i CPW' },
];

const FALLBACK_WEATHER: WeatherData = {
  temperature: 16,
  apparentTemperature: 15,
  precipitation: 0,
  weatherCode: 1,
  isDay: true,
  fetchedAt: Date.now(),
};

export default function Assistant({
  weatherState,
  notify,
}: {
  weatherState: WeatherState;
  notify: (msg: string) => void;
}) {
  const [subTab, setSubTab] = useState<SubTab>('weekly');
  const items = useLiveQuery(() => db.items.toArray(), []) ?? [];
  const outfits =
    useLiveQuery(() => db.outfits.orderBy('acceptedAt').reverse().toArray(), []) ?? [];
  const activeWeather = weatherState.weather ?? FALLBACK_WEATHER;
  const placeName = weatherState.place?.name ?? DEFAULT_PLACE.name;

  return (
    <div className="scroll-area h-full px-4 pb-12 pt-safe">
      <header className="mb-3">
        <h1 className="text-2xl font-bold">Asystent szafy</h1>
        <p className="text-sm text-ink-400">
          Planer 7-dniowy, kreator Mix & Match, szafa kapsułowa, walizka i raport CPW
        </p>
      </header>

      <div className="no-scrollbar -mx-4 mb-4 flex gap-1.5 overflow-x-auto px-4 py-0.5">
        {SUB_TABS.map((t) => (
          <Chip key={t.value} active={subTab === t.value} onClick={() => setSubTab(t.value)}>
            {t.label}
          </Chip>
        ))}
      </div>

      {subTab === 'weekly' && (
        <WeeklyPlannerView
          items={items}
          weather={activeWeather}
          placeName={placeName}
          notify={notify}
        />
      )}
      {subTab === 'studio' && (
        <MixAndMatchStudioView items={items} weather={activeWeather} notify={notify} />
      )}
      {subTab === 'capsule' && <CapsuleAndWishlistView items={items} />}
      {subTab === 'packing' && <PackingView items={items} />}
      {subTab === 'outfits' && <SavedOutfitsView items={items} outfits={outfits} notify={notify} />}
      {subTab === 'stats' && <StatsAndBackupView items={items} notify={notify} />}
    </div>
  );
}

// ---------------- 1. Planer Stylizacji na 7 Dni (Tygodniowy Kalendarz Pogodowy) ----------------

const DEFAULT_WEEK_OCCASIONS: Occasion[] = [
  'work',
  'work',
  'work',
  'work',
  'party',
  'casual',
  'casual',
];

function WeeklyPlannerView({
  items,
  weather,
  placeName,
  notify,
}: {
  items: ClothingItem[];
  weather: WeatherData;
  placeName: string;
  notify: (msg: string) => void;
}) {
  const [occasionsByDay, setOccasionsByDay] = useState<Occasion[]>(DEFAULT_WEEK_OCCASIONS);
  const [seed, setSeed] = useState(101);

  const plan = useMemo(
    () => generateWeeklyPlan(items, weather, occasionsByDay, undefined, seed),
    [items, weather, occasionsByDay, seed]
  );

  const cycleOccasionForDay = (dayIdx: number) => {
    setOccasionsByDay((prev) => {
      const next = [...prev];
      const curIdx = OCCASIONS.findIndex((o) => o.id === next[dayIdx]);
      next[dayIdx] = OCCASIONS[(curIdx + 1) % OCCASIONS.length].id;
      return next;
    });
  };

  if (items.length === 0) {
    return (
      <div className="rounded-3xl bg-ink-900 p-6 text-center text-sm text-ink-300">
        Załaduj szafę testową lub dodaj własne ubrania, aby wygenerować 7-dniowy plan stylizacji.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <section className="flex items-center justify-between gap-2 rounded-3xl bg-ink-900 p-4">
        <div>
          <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-accent-300">
            <Calendar size={14} /> Prognoza 7-dniowa · {placeName}
          </div>
          <p className="mt-0.5 text-xs text-ink-400">
            Dotknij okazji przy wybranym dniu, aby ją zmienić. Ubrania nie powtarzają się dzień po
            dniu.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setSeed((s) => s + 37)}
          className="flex shrink-0 items-center gap-1.5 rounded-2xl bg-ink-800 px-3 py-2 text-xs font-semibold text-accent-300 active:bg-ink-700"
        >
          <RefreshCw size={14} /> Przelosuj tydzień
        </button>
      </section>

      {plan.map((day) => {
        const occMeta = OCCASIONS.find((o) => o.id === day.occasion) ?? OCCASIONS[0];
        const pieces: ClothingItem[] = day.outfit
          ? [
              day.outfit.onepiece,
              day.outfit.top,
              day.outfit.midLayer,
              day.outfit.bottom,
              day.outfit.outerwear,
              day.outfit.shoes,
              day.outfit.bag,
            ].filter((x): x is ClothingItem => Boolean(x))
          : [];

        return (
          <section key={day.date} className="rounded-3xl bg-ink-900 p-4 ring-1 ring-white/5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <WeatherIcon
                  code={day.forecast.weatherCode}
                  isDay={true}
                  size={24}
                  className="text-accent-300"
                />
                <div>
                  <div className="flex items-center gap-2 text-sm font-bold text-white">
                    <span>{day.dayLabel}</span>
                    <span className="text-xs font-normal text-ink-400">
                      {day.forecast.apparentTempMin}° / {day.forecast.apparentTempMax}°C
                    </span>
                  </div>
                  <div className="text-[11px] text-ink-400">
                    {weatherLabel(day.forecast.weatherCode, true)}
                    {day.forecast.precipitationSum > 0.5
                      ? ` · opady ${day.forecast.precipitationSum.toFixed(1)} mm`
                      : ''}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => cycleOccasionForDay(day.dayIndex)}
                  title="Dotknij, aby zmienić okazję na ten dzień"
                  className="rounded-full bg-accent-500/20 px-2.5 py-1 text-xs font-semibold text-accent-300 ring-1 ring-accent-400/40 active:bg-accent-500/30"
                >
                  {occMeta.emoji} {occMeta.label}
                </button>
                {day.outfit && (
                  <span className="rounded-full bg-emerald-500/15 px-2 py-1 text-[11px] font-semibold text-emerald-300">
                    {day.outfit.score}%
                  </span>
                )}
              </div>
            </div>

            {day.outfit ? (
              <>
                <div className="no-scrollbar -mx-1 flex gap-2.5 overflow-x-auto px-1 py-0.5">
                  {pieces.map((item, idx) => (
                    <div key={`${item.id}-${idx}`} className="w-20 shrink-0">
                      <div className="aspect-square overflow-hidden rounded-xl bg-ink-800">
                        <ItemImage item={item} className="h-full w-full" />
                      </div>
                      <div className="mt-1 truncate text-[10px] font-medium text-white">
                        {item.subCategory}
                      </div>
                      <div className="flex items-center gap-1 text-[9px] text-ink-400">
                        <ColorDot hex={item.colorHex} size={7} />
                        <span className="truncate">{item.dominantColor}</span>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-2.5 flex items-center justify-end gap-2 border-t border-white/5 pt-2">
                  <button
                    type="button"
                    onClick={async () => {
                      await exportOutfitCollage(day.outfit!, weather, day.occasion);
                      notify(`Pobrano kartę stylizacji na: ${day.dayLabel} 📸`);
                    }}
                    className="inline-flex items-center gap-1 rounded-xl bg-ink-800 px-2.5 py-1.5 text-[11px] font-semibold text-ink-300 active:bg-ink-700"
                  >
                    <Camera size={12} /> Kolaż JPG
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      await saveFavoriteOutfit(
                        day.outfit!,
                        day.forecast.apparentTemperature,
                        day.occasion
                      );
                      notify(`Zapisano zestaw (${day.dayLabel}) w ulubionych ❤️`);
                    }}
                    className="inline-flex items-center gap-1 rounded-xl bg-ink-800 px-2.5 py-1.5 text-[11px] font-semibold text-rose-300 active:bg-ink-700"
                  >
                    <Heart size={12} /> Ulubione
                  </button>
                </div>
              </>
            ) : (
              <p className="text-xs text-ink-400">Brak wystarczających ubrań do złożenia zestawu.</p>
            )}
          </section>
        );
      })}
    </div>
  );
}

// ---------------- 2. Kreator Własnych Zestawów „Mix & Match” + Kolaż ----------------

function MixAndMatchStudioView({
  items,
  weather,
  notify,
}: {
  items: ClothingItem[];
  weather: WeatherData;
  notify: (msg: string) => void;
}) {
  const clean = useMemo(() => {
    const c = items.filter((i) => !i.inLaundry);
    return c.length > 0 ? c : items;
  }, [items]);

  const tops = useMemo(() => clean.filter((i) => i.category === 'top'), [clean]);
  const bottoms = useMemo(() => clean.filter((i) => i.category === 'bottom'), [clean]);
  const onepieces = useMemo(() => clean.filter((i) => i.category === 'onepiece'), [clean]);
  const outers = useMemo(() => clean.filter((i) => i.category === 'outerwear'), [clean]);
  const shoesList = useMemo(() => clean.filter((i) => i.category === 'shoes'), [clean]);
  const bags = useMemo(() => clean.filter((i) => i.category === 'bag'), [clean]);

  const [useOnepiece, setUseOnepiece] = useState(false);
  const [topIdx, setTopIdx] = useState(0);
  const [midIdx, setMidIdx] = useState(-1); // -1 = brak drugiej warstwy
  const [botIdx, setBotIdx] = useState(0);
  const [oneIdx, setOneIdx] = useState(0);
  const [outerIdx, setOuterIdx] = useState(-1); // -1 = brak okrycia
  const [shoeIdx, setShoeIdx] = useState(0);
  const [bagIdx, setBagIdx] = useState(0);

  const selectedTop = !useOnepiece && tops.length > 0 ? tops[topIdx % tops.length] : undefined;
  const selectedMid =
    !useOnepiece && midIdx >= 0 && tops.length > 1
      ? tops[midIdx % tops.length]
      : undefined;
  const selectedBottom =
    !useOnepiece && bottoms.length > 0 ? bottoms[botIdx % bottoms.length] : undefined;
  const selectedOnepiece =
    useOnepiece && onepieces.length > 0 ? onepieces[oneIdx % onepieces.length] : undefined;
  const selectedOuter =
    outerIdx >= 0 && outers.length > 0 ? outers[outerIdx % outers.length] : undefined;
  const selectedShoes =
    shoesList.length > 0 ? shoesList[shoeIdx % shoesList.length] : undefined;
  const selectedBag = bags.length > 0 ? bags[bagIdx % bags.length] : undefined;

  const customOutfit: Outfit = useMemo(() => {
    const notes: string[] = [];
    if (selectedTop && selectedBottom) {
      const gh = garmentHarmony(selectedTop, selectedBottom);
      if (gh.stylistNote) notes.push(`🎨 ${gh.stylistNote}`);
      const prop = evaluateBodyProportion(selectedTop, selectedBottom, 'casual');
      if (prop.note) notes.push(prop.note);
    }
    if (selectedMid && selectedTop && selectedMid.id !== selectedTop.id) {
      notes.push(
        `🧅 Warstwowanie „na cebulkę”: ${selectedTop.subCategory} + ${selectedMid.subCategory}.`
      );
    }
    const partial = {
      top: selectedTop,
      midLayer: selectedMid && selectedMid.id !== selectedTop?.id ? selectedMid : undefined,
      bottom: selectedBottom,
      onepiece: selectedOnepiece,
      outerwear: selectedOuter,
      shoes: selectedShoes,
      bag: selectedBag,
      accessories: [] as ClothingItem[],
    };
    return {
      ...partial,
      notes,
      score: computeOutfitScore(partial),
      signature: computeSignature(partial),
    };
  }, [
    selectedTop,
    selectedMid,
    selectedBottom,
    selectedOnepiece,
    selectedOuter,
    selectedShoes,
    selectedBag,
  ]);

  if (items.length === 0) {
    return (
      <div className="rounded-3xl bg-ink-900 p-6 text-center text-sm text-ink-300">
        Dodaj ubrania lub załaduj szafę testową, aby korzystać z kreatora własnych stylizacji.
      </div>
    );
  }

  const renderSlot = (
    title: string,
    current: ClothingItem | undefined,
    totalCount: number,
    onPrev: () => void,
    onNext: () => void,
    allowNone = false,
    onClear?: () => void
  ) => (
    <div className="flex items-center justify-between gap-3 rounded-2xl bg-ink-800 p-2.5">
      <button
        type="button"
        onClick={onPrev}
        disabled={totalCount === 0}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ink-900 text-ink-200 active:bg-accent-500 disabled:opacity-30"
      >
        <ChevronLeft size={18} />
      </button>

      {current ? (
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-ink-900">
            <ItemImage item={current} className="h-full w-full" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[10px] font-bold uppercase tracking-wide text-accent-300">
              {title}
            </div>
            <div className="truncate text-sm font-bold text-white">{current.subCategory}</div>
            <div className="flex items-center gap-1.5 text-xs text-ink-400">
              <ColorDots
                primaryHex={current.colorHex}
                secondaryHexes={current.secondaryColorHexes}
                size={9}
              />
              <span className="truncate">
                {current.dominantColor} · {FIT_LABELS[current.fit ?? 'regular']}
                {current.pattern && current.pattern !== 'solid'
                  ? ` · ${PATTERN_EMOJIS[current.pattern]} ${PATTERN_LABELS[current.pattern]}`
                  : ''}
              </span>
            </div>
          </div>
          {allowNone && onClear && (
            <button
              type="button"
              onClick={onClear}
              className="rounded-lg bg-ink-900 px-2 py-1 text-[10px] font-semibold text-ink-400 active:text-white"
            >
              Zdejmij
            </button>
          )}
        </div>
      ) : (
        <div className="min-w-0 flex-1 text-center">
          <div className="text-[10px] font-bold uppercase tracking-wide text-ink-400">{title}</div>
          <div className="text-xs text-ink-400">
            {totalCount === 0 ? 'Brak w szafie' : 'Brak (kliknij ◀ / ▶ aby dodać warstwę)'}
          </div>
        </div>
      )}

      <button
        type="button"
        onClick={onNext}
        disabled={totalCount === 0}
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-ink-900 text-ink-200 active:bg-accent-500 disabled:opacity-30"
      >
        <ChevronRight size={18} />
      </button>
    </div>
  );

  return (
    <div className="space-y-4">
      <section className="rounded-3xl bg-ink-900 p-4 ring-1 ring-white/10">
        <div className="flex items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-accent-300">
              <Wand2 size={14} /> Kreator Mix & Match na żywo
            </div>
            <p className="mt-0.5 text-xs text-ink-400">
              Przewijaj warstwy strzałkami ◀ ▶ i sprawdzaj ocenę stylisty w czasie rzeczywistym
            </p>
          </div>
          <div className="rounded-2xl bg-emerald-500/20 px-3.5 py-2 text-center">
            <div className="text-lg font-bold leading-none text-emerald-300">
              {customOutfit.score}%
            </div>
            <div className="mt-0.5 text-[9px] font-semibold uppercase text-emerald-200">
              Harmonia
            </div>
          </div>
        </div>

        {onepieces.length > 0 && (
          <div className="mt-3 flex gap-2">
            <Chip active={!useOnepiece} onClick={() => setUseOnepiece(false)}>
              👕 Góra + 👖 Dół
            </Chip>
            <Chip active={useOnepiece} onClick={() => setUseOnepiece(true)}>
              👗 Sukienka / 1-część. ({onepieces.length})
            </Chip>
          </div>
        )}

        <div className="mt-3 space-y-2">
          {!useOnepiece ? (
            <>
              {renderSlot(
                '1. Góra bazowa',
                selectedTop,
                tops.length,
                () => setTopIdx((i) => (i - 1 + tops.length) % tops.length),
                () => setTopIdx((i) => (i + 1) % tops.length)
              )}
              {renderSlot(
                '2. Druga warstwa góry („na cebulkę”)',
                selectedMid,
                tops.length,
                () => setMidIdx((i) => (i <= 0 ? tops.length - 1 : i - 1)),
                () => setMidIdx((i) => (i + 1) % tops.length),
                true,
                () => setMidIdx(-1)
              )}
              {renderSlot(
                '3. Dół (Spodnie / Spódnica)',
                selectedBottom,
                bottoms.length,
                () => setBotIdx((i) => (i - 1 + bottoms.length) % bottoms.length),
                () => setBotIdx((i) => (i + 1) % bottoms.length)
              )}
            </>
          ) : (
            renderSlot(
              '1. Sukienka / Kombinezon',
              selectedOnepiece,
              onepieces.length,
              () => setOneIdx((i) => (i - 1 + onepieces.length) % onepieces.length),
              () => setOneIdx((i) => (i + 1) % onepieces.length)
            )
          )}

          {renderSlot(
            'Okrycie wierzchnie (Kurtka / Płaszcz / Marynarka)',
            selectedOuter,
            outers.length,
            () => setOuterIdx((i) => (i <= 0 ? outers.length - 1 : i - 1)),
            () => setOuterIdx((i) => (i + 1) % outers.length),
            true,
            () => setOuterIdx(-1)
          )}

          {renderSlot(
            'Buty',
            selectedShoes,
            shoesList.length,
            () => setShoeIdx((i) => (i - 1 + shoesList.length) % shoesList.length),
            () => setShoeIdx((i) => (i + 1) % shoesList.length)
          )}

          {renderSlot(
            'Torebka / Plecak',
            selectedBag,
            bags.length,
            () => setBagIdx((i) => (i - 1 + bags.length) % bags.length),
            () => setBagIdx((i) => (i + 1) % bags.length)
          )}
        </div>

        {customOutfit.notes.length > 0 && (
          <div className="mt-3 space-y-1.5">
            {customOutfit.notes.map((n) => (
              <div
                key={n}
                className="rounded-xl bg-amber-500/10 px-3 py-2 text-xs text-amber-200"
              >
                {n}
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-3">
          <button
            type="button"
            onClick={async () => {
              await acceptOutfit(customOutfit, weather.apparentTemperature, 'casual');
              notify('Zaakceptowano własny zestaw z kreatora ✨');
            }}
            className="flex items-center justify-center gap-1.5 rounded-2xl bg-accent-500 py-3 text-xs font-bold text-white active:bg-accent-600"
          >
            <Check size={16} /> Załóż ten zestaw dziś
          </button>
          <button
            type="button"
            onClick={async () => {
              await saveFavoriteOutfit(customOutfit, weather.apparentTemperature, 'casual');
              notify('Zapisano zestaw w ulubionych ❤️');
            }}
            className="flex items-center justify-center gap-1.5 rounded-2xl bg-ink-800 py-3 text-xs font-semibold text-rose-300 active:bg-ink-700"
          >
            <Heart size={16} /> Dodaj do ulubionych
          </button>
          <button
            type="button"
            onClick={async () => {
              await exportOutfitCollage(customOutfit, weather, 'casual');
              notify('Pobrano kolaż stylizacji (JPG) 📸');
            }}
            className="flex items-center justify-center gap-1.5 rounded-2xl bg-ink-800 py-3 text-xs font-semibold text-ink-200 active:bg-ink-700"
          >
            <Camera size={16} /> Pobierz kolaż JPG
          </button>
        </div>
      </section>
    </div>
  );
}

// ---------------- 3. Kreator Szafy Kapsułowej i „Smart Wishlist” ----------------

function CapsuleAndWishlistView({ items }: { items: ClothingItem[] }) {
  const [seasonTemp, setSeasonTemp] = useState<TempRange>('mild');

  const capsule = useMemo(
    () => buildCapsuleWardrobe(items, seasonTemp),
    [items, seasonTemp]
  );

  const wishlist = useMemo(() => generateSmartWishlist(items), [items]);

  if (items.length === 0) {
    return (
      <div className="rounded-3xl bg-ink-900 p-6 text-center text-sm text-ink-300">
        Załaduj szafę testową lub dodaj ubrania, aby wygenerować szafę kapsułową i listę zakupową.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <section className="space-y-3 rounded-3xl bg-ink-900 p-4">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h2 className="flex items-center gap-2 text-base font-bold">
              <Target size={18} className="text-accent-400" /> Twoja Szafa Kapsułowa (
              {capsule.capsuleItems.length} szt.)
            </h2>
            <p className="text-xs text-ink-400">
              Najbardziej uniwersalne ubrania z Twojej szafy, które pasują niemal do wszystkiego:
            </p>
          </div>
          <span className="shrink-0 rounded-2xl bg-emerald-500/20 px-3 py-1.5 text-xs font-bold text-emerald-300">
            {capsule.totalCombinations} kombinacji
          </span>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {TEMP_RANGES.map((t) => (
            <Chip key={t.id} active={seasonTemp === t.id} onClick={() => setSeasonTemp(t.id)}>
              Sezon: {t.label} ({t.hint})
            </Chip>
          ))}
        </div>

        <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-5">
          {capsule.capsuleItems.map(({ item, versatilityScore }) => (
            <div key={item.id} className="min-w-0 rounded-2xl bg-ink-800 p-2">
              <div className="relative aspect-square overflow-hidden rounded-xl bg-ink-900">
                <ItemImage item={item} className="h-full w-full" />
                <span className="absolute bottom-1 right-1 rounded bg-emerald-600/90 px-1.5 py-0.5 text-[9px] font-bold text-white">
                  {versatilityScore}%
                </span>
              </div>
              <div className="mt-1.5 truncate text-[11px] font-semibold text-white">
                {item.subCategory}
              </div>
              <div className="flex items-center gap-1 text-[10px] text-ink-400">
                <ColorDot hex={item.colorHex} size={8} />
                <span className="truncate">{item.dominantColor}</span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3 rounded-3xl bg-ink-900 p-4">
        <div>
          <h2 className="flex items-center gap-2 text-base font-bold">
            <ShoppingBag size={18} className="text-amber-400" /> Inteligentna Lista Zakupowa (Smart
            Wishlist)
          </h2>
          <p className="mt-0.5 text-xs text-ink-400">
            Symulacja brakujących klasyków – sprawdź, jaki 1 zakup odblokuje najwięcej nowych
            stylizacji z ubrań, które już masz:
          </p>
        </div>

        <div className="space-y-2.5">
          {wishlist.map((w) => (
            <div
              key={w.title}
              className="flex items-center justify-between gap-3 rounded-2xl bg-ink-800 p-3"
            >
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <span
                  className="h-10 w-10 shrink-0 rounded-2xl ring-2 ring-white/20"
                  style={{ backgroundColor: w.colorHex }}
                />
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-bold text-white">{w.title}</div>
                  <div className="text-[11px] text-ink-300">{w.reason}</div>
                </div>
              </div>
              <div className="shrink-0 text-right">
                <div className="rounded-xl bg-accent-500/20 px-2.5 py-1 text-xs font-bold text-accent-300">
                  +{w.newOutfitsCount} zestawów
                </div>
                <div className="mt-0.5 text-[10px] text-ink-400">Dopasowanie {w.overallScore}%</div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

// ---------------- 4. Asystent Pakowania Walizki ----------------

function PackingView({ items }: { items: ClothingItem[] }) {
  const [days, setDays] = useState(4);
  const [temp, setTemp] = useState<TempRange>('mild');
  const [rain, setRain] = useState(false);
  const [occasion, setOccasion] = useState<Occasion>('casual');
  const [checkedIds, setCheckedIds] = useState<Set<string>>(new Set());

  const plan = useMemo(
    () => generatePackingList(items, days, temp, rain, occasion),
    [items, days, temp, rain, occasion]
  );

  const toggleCheck = (id: string) => {
    setCheckedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const packedCount = plan.entries.filter((e) => checkedIds.has(e.item.id)).length;

  return (
    <div className="space-y-4">
      <section className="space-y-4 rounded-3xl bg-ink-900 p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold">Długość wyjazdu: {days} dni</span>
          <span className="rounded-full bg-accent-500/20 px-2.5 py-0.5 text-xs font-semibold text-accent-300">
            {plan.combinationsCount} możliwych stylizacji
          </span>
        </div>
        <input
          type="range"
          min={1}
          max={14}
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
          className="w-full accent-violet-500"
        />

        <div>
          <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink-400">
            Prognozowana temperatura
          </div>
          <div className="flex flex-wrap gap-2">
            {TEMP_RANGES.map((t) => (
              <Chip key={t.id} active={temp === t.id} onClick={() => setTemp(t.id)}>
                {t.label} ({t.hint})
              </Chip>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink-400">
            Charakter wyjazdu
          </div>
          <div className="flex flex-wrap gap-2">
            {OCCASIONS.map((o) => (
              <Chip key={o.id} active={occasion === o.id} onClick={() => setOccasion(o.id)}>
                {o.emoji} {o.label}
              </Chip>
            ))}
          </div>
        </div>

        <label className="flex items-center justify-between rounded-2xl bg-ink-800 px-3.5 py-2.5 text-sm">
          <span className="flex items-center gap-2 font-medium">
            <Droplets size={16} className="text-sky-400" /> Spodziewane opady deszczu
          </span>
          <input
            type="checkbox"
            checked={rain}
            onChange={(e) => setRain(e.target.checked)}
            className="h-5 w-5 accent-violet-500"
          />
        </label>
      </section>

      {plan.entries.length === 0 ? (
        <div className="rounded-3xl bg-ink-900 p-6 text-center text-sm text-ink-300">
          Dodaj ubrania do szafy, aby wygenerować kapsułową listę pakowania.
        </div>
      ) : (
        <section className="rounded-3xl bg-ink-900 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-base font-bold">
              <Briefcase size={18} className="text-accent-400" /> Lista do spakowania (
              {packedCount}/{plan.entries.length})
            </h2>
            {packedCount > 0 && (
              <button
                onClick={() => setCheckedIds(new Set())}
                className="text-xs font-semibold text-ink-400 active:text-white"
              >
                Odznacz wszystko
              </button>
            )}
          </div>

          <div className="space-y-2">
            {plan.entries.map(({ item, role }) => {
              const checked = checkedIds.has(item.id);
              return (
                <button
                  key={item.id}
                  onClick={() => toggleCheck(item.id)}
                  className={`flex w-full items-center gap-3 rounded-2xl p-2 text-left transition-colors ${
                    checked ? 'bg-emerald-500/15 opacity-65' : 'bg-ink-800 active:bg-ink-700'
                  }`}
                >
                  <div className="h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-ink-900">
                    <ItemImage item={item} className="h-full w-full" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div
                      className={`truncate text-sm font-semibold ${
                        checked ? 'line-through text-ink-300' : 'text-white'
                      }`}
                    >
                      {item.subCategory}
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-ink-400">
                      <ColorDot hex={item.colorHex} size={9} />
                      <span>
                        {item.dominantColor} · {role}
                      </span>
                    </div>
                  </div>
                  <span className="pr-1 text-accent-300">
                    {checked ? <CheckSquare size={20} /> : <Square size={20} />}
                  </span>
                </button>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}

// ---------------- 5. Ulubione i Historia Stylizacji ----------------

function SavedOutfitsView({
  items,
  outfits,
  notify,
}: {
  items: ClothingItem[];
  outfits: {
    id: string;
    itemIds: string[];
    acceptedAt: number;
    apparentTemperature: number;
    occasion?: Occasion;
    score?: number;
    isFavorite?: boolean;
  }[];
  notify: (msg: string) => void;
}) {
  const [onlyFav, setOnlyFav] = useState(false);
  const itemMap = useMemo(() => new Map(items.map((i) => [i.id, i])), [items]);

  const list = useMemo(
    () => (onlyFav ? outfits.filter((o) => o.isFavorite) : outfits),
    [outfits, onlyFav]
  );

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <Chip active={!onlyFav} onClick={() => setOnlyFav(false)}>
          Wszystkie ({outfits.length})
        </Chip>
        <Chip active={onlyFav} onClick={() => setOnlyFav(true)}>
          ❤️ Tylko ulubione ({outfits.filter((o) => o.isFavorite).length})
        </Chip>
      </div>

      {list.length === 0 ? (
        <div className="rounded-3xl bg-ink-900 p-8 text-center text-sm text-ink-300">
          {onlyFav
            ? 'Nie masz jeszcze ulubionych zestawów. Kliknij ikonę ❤️ przy stylizacji na ekranie głównym.'
            : 'Brak zapisanych stylizacji. Zaakceptuj strój lub dodaj go do ulubionych na ekranie głównym.'}
        </div>
      ) : (
        <div className="space-y-3">
          {list.map((o) => {
            const resolved = o.itemIds
              .map((id) => itemMap.get(id))
              .filter((x): x is ClothingItem => Boolean(x));
            if (resolved.length === 0) return null;
            const dateStr = new Date(o.acceptedAt).toLocaleDateString('pl-PL', {
              day: 'numeric',
              month: 'short',
            });
            return (
              <div key={o.id} className="rounded-3xl bg-ink-900 p-4">
                <div className="mb-2.5 flex items-center justify-between text-xs text-ink-400">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white">{dateStr}</span>
                    <span>· {Math.round(o.apparentTemperature)}°C</span>
                    {o.occasion && <span>· {OCCASION_LABELS[o.occasion]}</span>}
                    {o.score && (
                      <span className="rounded-full bg-emerald-500/15 px-2 py-0.5 text-[11px] font-semibold text-emerald-300">
                        {o.score}%
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => toggleSavedOutfitFavorite(o.id, !o.isFavorite)}
                      className={`rounded-full p-1.5 ${
                        o.isFavorite ? 'text-rose-400' : 'text-ink-400'
                      }`}
                      aria-label="Ulubione"
                    >
                      <Heart size={15} fill={o.isFavorite ? 'currentColor' : 'none'} />
                    </button>
                    <button
                      onClick={async () => {
                        await deleteSavedOutfit(o.id);
                        notify('Usunięto wpis z historii');
                      }}
                      className="rounded-full p-1.5 text-ink-400 active:text-red-300"
                      aria-label="Usuń"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
                <div className="grid grid-cols-4 gap-2 sm:grid-cols-6">
                  {resolved.map((item) => (
                    <div key={item.id} className="min-w-0">
                      <div className="aspect-square overflow-hidden rounded-xl bg-ink-800">
                        <ItemImage item={item} className="h-full w-full" />
                      </div>
                      <div className="mt-1 truncate text-[10px] text-ink-300">
                        {item.subCategory}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ---------------- 6. Statystyki Szafy, Cost Per Wear (CPW), Pralnia i Kopia Zapasowa ----------------

function StatsAndBackupView({
  items,
  notify,
}: {
  items: ClothingItem[];
  notify: (msg: string) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [seeding, setSeeding] = useState<DemoWardrobeGender | null>(null);
  const [confirmClear, setConfirmClear] = useState(false);

  const handleSeedDemo = async (gender: DemoWardrobeGender) => {
    if (seeding || busy) return;
    setSeeding(gender);
    try {
      const count = await seedDemoWardrobe(gender);
      const label = gender === 'women' ? 'damską' : 'męską';
      notify(`Załadowano ${label} szafę testową (${count} ubrań ze zdjęciami) ✨`);
    } catch {
      notify('Błąd podczas ładowania szafy testowej');
    } finally {
      setSeeding(null);
    }
  };

  const handleClearAll = async () => {
    if (!confirmClear) {
      setConfirmClear(true);
      return;
    }
    setBusy(true);
    try {
      await clearAllWardrobe();
      setConfirmClear(false);
      notify('Wyczyszczono całą szafę i historię');
    } finally {
      setBusy(false);
    }
  };

  // Obliczenia finansowe i Cost Per Wear (CPW)
  const cpwStats = useMemo(() => {
    const priced = items.filter((i) => (i.price ?? 0) > 0);
    const totalValue = priced.reduce((s, i) => s + (i.price ?? 0), 0);
    const unwornValue = priced
      .filter((i) => !i.wearCount || i.wearCount === 0)
      .reduce((s, i) => s + (i.price ?? 0), 0);
    const totalWears = items.reduce((s, i) => s + (i.wearCount ?? 0), 0);
    const avgCpw = totalWears > 0 ? Math.round(totalValue / totalWears) : 0;

    const bestValueItems = [...priced]
      .filter((i) => (i.wearCount ?? 0) > 0)
      .map((item) => ({
        item,
        cpw: Math.round((item.price ?? 0) / Math.max(1, item.wearCount ?? 1)),
      }))
      .sort((a, b) => a.cpw - b.cpw)
      .slice(0, 4);

    return { totalValue, unwornValue, avgCpw, bestValueItems };
  }, [items]);

  const laundryLoads = useMemo(() => groupLaundryIntoLoads(items), [items]);

  const colorStats = useMemo(() => {
    const map = new Map<string, { name: string; hex: string; count: number }>();
    for (const item of items) {
      const existing = map.get(item.dominantColor);
      if (existing) existing.count++;
      else map.set(item.dominantColor, { name: item.dominantColor, hex: item.colorHex, count: 1 });
    }
    return Array.from(map.values()).sort((a, b) => b.count - a.count);
  }, [items]);

  const topWorn = useMemo(
    () =>
      [...items]
        .filter((i) => (i.wearCount ?? 0) > 0)
        .sort((a, b) => (b.wearCount ?? 0) - (a.wearCount ?? 0))
        .slice(0, 4),
    [items]
  );

  const forgotten = useMemo(
    () =>
      [...items]
        .filter((i) => !i.wearCount || i.wearCount === 0)
        .slice(0, 4),
    [items]
  );

  const gaps = useMemo(() => {
    if (items.length === 0) return [];
    const tips: string[] = [];
    if (!items.some((i) => i.category === 'outerwear' && i.isRainproof)) {
      tips.push('Brak kurtki przeciwdeszczowej lub trencza odpornego na deszcz.');
    }
    if (!items.some((i) => i.category === 'shoes' && i.isRainproof)) {
      tips.push('Brak obuwia odpornego na deszcz (np. botki, sztyblety).');
    }
    if (!items.some((i) => (i.occasions ?? []).includes('formal'))) {
      tips.push('Brak ubrań oznaczonych na eleganckie wyjścia.');
    }
    if (!items.some((i) => i.tempRange === 'cold')) {
      tips.push('Brak ciepłych ubrań na mroźne dni (< 8°C).');
    }
    return tips;
  }, [items]);

  const handleExport = async () => {
    setBusy(true);
    try {
      const json = await exportWardrobeBackup();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `garderoba-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      notify('Pobrano kopię zapasową szafy 📦');
    } catch {
      notify('Błąd podczas tworzenia kopii zapasowej');
    } finally {
      setBusy(false);
    }
  };

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setBusy(true);
    try {
      const text = await file.text();
      const count = await importWardrobeBackup(text);
      notify(`Zaimportowano ${count} ubrań do szafy ✓`);
    } catch {
      notify('Nieprawidłowy plik kopii zapasowej');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Wartość szafy i Cost Per Wear (CPW) */}
      {items.length > 0 && cpwStats.totalValue > 0 && (
        <section className="rounded-3xl bg-ink-900 p-4">
          <h2 className="mb-2 flex items-center gap-2 text-base font-bold">
            <Coins size={18} className="text-emerald-400" /> Wartość szafy i Cost Per Wear (CPW)
          </h2>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-2xl bg-ink-800 p-2.5">
              <div className="text-sm font-bold text-white">{cpwStats.totalValue} zł</div>
              <div className="text-[10px] text-ink-400">Wartość szafy</div>
            </div>
            <div className="rounded-2xl bg-ink-800 p-2.5">
              <div className="text-sm font-bold text-emerald-300">
                {cpwStats.avgCpw > 0 ? `${cpwStats.avgCpw} zł` : '—'}
              </div>
              <div className="text-[10px] text-ink-400">Śr. koszt założenia</div>
            </div>
            <div className="rounded-2xl bg-ink-800 p-2.5">
              <div className="text-sm font-bold text-amber-300">{cpwStats.unwornValue} zł</div>
              <div className="text-[10px] text-ink-400">Nienoszone rzeczy</div>
            </div>
          </div>

          {cpwStats.bestValueItems.length > 0 && (
            <div className="mt-3">
              <div className="mb-2 text-xs font-semibold text-ink-300">
                🏆 Najbardziej opłacalne zakupy (najniższy koszt na 1 założenie):
              </div>
              <div className="grid grid-cols-4 gap-2">
                {cpwStats.bestValueItems.map(({ item, cpw }) => (
                  <div key={item.id} className="min-w-0">
                    <div className="relative aspect-square overflow-hidden rounded-xl bg-ink-800">
                      <ItemImage item={item} className="h-full w-full" />
                      <span className="absolute bottom-1 right-1 rounded bg-emerald-600/90 px-1.5 py-0.5 text-[9px] font-bold text-white">
                        {cpw} zł/zał.
                      </span>
                    </div>
                    <div className="mt-1 truncate text-[10px] text-ink-300">{item.subCategory}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {/* Inteligentna Pralnia i Sortowanie Prania */}
      {laundryLoads.length > 0 && (
        <section className="rounded-3xl bg-ink-900 p-4 ring-1 ring-sky-400/30">
          <h2 className="mb-2 flex items-center gap-2 text-base font-bold">
            <WashingMachine size={18} className="text-sky-400" /> Asystent pralni (posortowane
            wsady)
          </h2>
          <div className="space-y-2">
            {laundryLoads.map((load) => (
              <div
                key={load.id}
                className="flex items-center justify-between gap-2 rounded-2xl bg-ink-800 p-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-white">
                    {load.emoji} {load.title} ({load.items.length} szt.)
                  </div>
                  <div className="text-[10px] text-ink-400">{load.programHint}</div>
                </div>
                <button
                  type="button"
                  onClick={async () => {
                    await clearLaundryByIds(load.items.map((i) => i.id));
                    notify(`Wyprano wsad: ${load.title} ✨`);
                  }}
                  className="shrink-0 rounded-xl bg-sky-500/20 px-3 py-1.5 text-xs font-semibold text-sky-300 active:bg-sky-500/30"
                >
                  Wypierz
                </button>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Paleta barw szafy */}
      {items.length > 0 && (
        <section className="rounded-3xl bg-ink-900 p-4">
          <h2 className="mb-2 text-base font-bold">Paleta Twojej szafy</h2>
          <div className="flex h-4 w-full overflow-hidden rounded-full ring-1 ring-white/15">
            {colorStats.map((c) => (
              <div
                key={c.name}
                style={{
                  width: `${(c.count / items.length) * 100}%`,
                  backgroundColor: c.hex,
                }}
                title={`${c.name}: ${c.count}`}
              />
            ))}
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {colorStats.slice(0, 6).map((c) => (
              <span
                key={c.name}
                className="inline-flex items-center gap-1.5 rounded-full bg-ink-800 px-2.5 py-1 text-xs text-ink-300"
              >
                <ColorDot hex={c.hex} size={10} /> {c.name} ({c.count})
              </span>
            ))}
          </div>
        </section>
      )}

      {/* Najczęściej noszone */}
      {topWorn.length > 0 && (
        <section className="rounded-3xl bg-ink-900 p-4">
          <h2 className="mb-3 flex items-center gap-2 text-base font-bold">
            <Award size={18} className="text-amber-400" /> Najczęściej noszone
          </h2>
          <div className="grid grid-cols-4 gap-2.5">
            {topWorn.map((item) => (
              <div key={item.id} className="min-w-0">
                <div className="relative aspect-square overflow-hidden rounded-xl bg-ink-800">
                  <ItemImage item={item} className="h-full w-full" />
                  <span className="absolute bottom-1 right-1 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-bold text-amber-300">
                    {item.wearCount}×
                  </span>
                </div>
                <div className="mt-1 truncate text-[11px] text-ink-300">{item.subCategory}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Zapomniane ubrania */}
      {forgotten.length > 0 && (
        <section className="rounded-3xl bg-ink-900 p-4">
          <h2 className="mb-1 flex items-center gap-2 text-base font-bold">
            <Clock size={18} className="text-accent-300" /> Czekają na założenie
          </h2>
          <p className="mb-3 text-xs text-ink-400">
            Ubrania w szafie, które nie były jeszcze w żadnej zaakceptowanej stylizacji
          </p>
          <div className="grid grid-cols-4 gap-2.5">
            {forgotten.map((item) => (
              <div key={item.id} className="min-w-0">
                <div className="aspect-square overflow-hidden rounded-xl bg-ink-800">
                  <ItemImage item={item} className="h-full w-full" />
                </div>
                <div className="mt-1 truncate text-[11px] text-ink-300">
                  {CATEGORY_LABELS[item.category]} · {item.subCategory}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Analiza braków w szafie */}
      {gaps.length > 0 && (
        <section className="rounded-3xl bg-ink-900 p-4">
          <h2 className="mb-2 flex items-center gap-2 text-base font-bold">
            <AlertCircle size={18} className="text-sky-400" /> Co warto uzupełnić w szafie
          </h2>
          <ul className="space-y-1.5 text-xs text-ink-300">
            {gaps.map((g) => (
              <li key={g} className="rounded-xl bg-ink-800 px-3 py-2">
                • {g}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Kopia zapasowa JSON */}
      <section className="rounded-3xl bg-ink-900 p-4">
        <h2 className="text-base font-bold">Kopia zapasowa szafy</h2>
        <p className="mt-1 text-xs text-ink-400">
          Zapisz całą szafę (wraz ze zdjęciami) do pliku JSON, aby przenieść ją na inny telefon lub
          zabezpieczyć dane.
        </p>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json,.json"
          className="hidden"
          onChange={handleImport}
        />
        <div className="mt-3 grid grid-cols-2 gap-2.5">
          <button
            onClick={handleExport}
            disabled={busy || items.length === 0}
            className="flex items-center justify-center gap-2 rounded-2xl bg-accent-500 py-3 text-xs font-semibold text-white active:bg-accent-600 disabled:opacity-50"
          >
            <Download size={16} /> Eksportuj szafę
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={busy}
            className="flex items-center justify-center gap-2 rounded-2xl bg-ink-800 py-3 text-xs font-semibold text-ink-200 active:bg-ink-700"
          >
            <Upload size={16} /> Importuj z pliku
          </button>
        </div>
      </section>

      {/* Szafa testowa (Demo) */}
      <section className="rounded-3xl bg-ink-900 p-4">
        <h2 className="flex items-center gap-2 text-base font-bold">
          <Sparkles size={18} className="text-accent-400" /> Szafy testowe ze zdjęciami z Internetu
        </h2>
        <p className="mt-1 text-xs text-ink-400">
          Wybierz gotową szafę testową ze zdjęciami ubrań pobranymi z Internetu (osobna szafa
          damska i męska – bez mieszania typów ubrań):
        </p>
        <div className="mt-3 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
          <button
            onClick={() => handleSeedDemo('women')}
            disabled={Boolean(seeding) || busy}
            className="flex items-center justify-center gap-2 rounded-2xl bg-accent-500/20 py-3 text-xs font-semibold text-accent-300 ring-1 ring-accent-400/40 active:bg-accent-500/30 disabled:opacity-50"
          >
            {seeding === 'women' ? (
              <>
                <Loader2 size={16} className="animate-spin" /> Ładowanie szafy damskiej...
              </>
            ) : (
              <>
                <Sparkles size={16} /> 👩 Szafa testowa Damska ({DEMO_WOMEN_COUNT} ubrań)
              </>
            )}
          </button>
          <button
            onClick={() => handleSeedDemo('men')}
            disabled={Boolean(seeding) || busy}
            className="flex items-center justify-center gap-2 rounded-2xl bg-accent-500/20 py-3 text-xs font-semibold text-accent-300 ring-1 ring-accent-400/40 active:bg-accent-500/30 disabled:opacity-50"
          >
            {seeding === 'men' ? (
              <>
                <Loader2 size={16} className="animate-spin" /> Ładowanie szafy męskiej...
              </>
            ) : (
              <>
                <Sparkles size={16} /> 👨 Szafa testowa Męska ({DEMO_MEN_COUNT} ubrań)
              </>
            )}
          </button>
        </div>
        {items.length > 0 && (
          <button
            onClick={handleClearAll}
            disabled={busy || Boolean(seeding)}
            className={`mt-2.5 flex w-full items-center justify-center gap-2 rounded-2xl py-3 text-xs font-semibold transition-colors ${
              confirmClear
                ? 'bg-red-600 text-white'
                : 'bg-red-500/15 text-red-300 active:bg-red-500/25'
            }`}
          >
            <Trash2 size={16} />
            {confirmClear ? 'Dotknij ponownie, aby wyczyścić' : 'Wyczyść całą szafę'}
          </button>
        )}
      </section>
    </div>
  );
}
