import { useMemo, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  AlertCircle,
  Award,
  Briefcase,
  CheckSquare,
  Clock,
  Download,
  Droplets,
  Heart,
  Loader2,
  Sparkles,
  Square,
  Trash2,
  Upload,
} from 'lucide-react';
import type { ClothingItem, Occasion, TempRange } from '../types';
import {
  db,
  deleteSavedOutfit,
  exportWardrobeBackup,
  importWardrobeBackup,
  toggleSavedOutfitFavorite,
} from '../lib/db';
import { clearAllWardrobe, seedDemoWardrobe } from '../lib/demoWardrobe';
import {
  CATEGORY_LABELS,
  OCCASIONS,
  OCCASION_LABELS,
  TEMP_RANGES,
} from '../lib/constants';
import { generatePackingList } from '../lib/outfit';
import { Chip, ColorDot, ItemImage, Segmented } from '../components/ui';

type SubTab = 'packing' | 'outfits' | 'stats';

const SUB_TABS: { value: SubTab; label: string }[] = [
  { value: 'packing', label: '🧳 Walizka' },
  { value: 'outfits', label: '❤️ Zestawy' },
  { value: 'stats', label: '📊 Raport' },
];

export default function Assistant({ notify }: { notify: (msg: string) => void }) {
  const [subTab, setSubTab] = useState<SubTab>('packing');
  const items = useLiveQuery(() => db.items.toArray(), []) ?? [];
  const outfits =
    useLiveQuery(() => db.outfits.orderBy('acceptedAt').reverse().toArray(), []) ?? [];

  return (
    <div className="scroll-area h-full px-4 pb-6 pt-safe">
      <header className="mb-4">
        <h1 className="text-2xl font-bold">Asystent szafy</h1>
        <p className="text-sm text-ink-400">
          Pakowanie na wyjazd, zapisane stylizacje i statystyki
        </p>
      </header>

      <Segmented value={subTab} options={SUB_TABS} onChange={setSubTab} className="mb-4" />

      {subTab === 'packing' && <PackingView items={items} />}
      {subTab === 'outfits' && <SavedOutfitsView items={items} outfits={outfits} notify={notify} />}
      {subTab === 'stats' && <StatsAndBackupView items={items} notify={notify} />}
    </div>
  );
}

// ---------------- 1. Asystent Pakowania Walizki ----------------

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

// ---------------- 2. Ulubione i Historia Stylizacji ----------------

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

// ---------------- 3. Statystyki Szafy i Kopia Zapasowa ----------------

function StatsAndBackupView({
  items,
  notify,
}: {
  items: ClothingItem[];
  notify: (msg: string) => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [confirmClear, setConfirmClear] = useState(false);

  const handleSeedDemo = async () => {
    if (seeding || busy) return;
    setSeeding(true);
    try {
      const count = await seedDemoWardrobe();
      notify(`Załadowano testową szafę (${count} ubrań) ✨`);
    } catch {
      notify('Błąd podczas ładowania szafy testowej');
    } finally {
      setSeeding(false);
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
      tips.push('Brak obuwia odpornego na deszcz (np. botki, traperki).');
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
          <Sparkles size={18} className="text-accent-400" /> Szafa testowa (Demo)
        </h2>
        <p className="mt-1 text-xs text-ink-400">
          Załaduj 27 gotowych, wyrenderowanych ubrań (góra, dół, sukienki, okrycia, buty, torebki i
          dodatki na każdą pogodę i okazję), aby od razu przetestować wszystkie funkcje aplikacji.
        </p>
        <div className="mt-3 flex flex-col gap-2.5 sm:flex-row">
          <button
            onClick={handleSeedDemo}
            disabled={seeding || busy}
            className="flex flex-1 items-center justify-center gap-2 rounded-2xl bg-accent-500/20 py-3 text-xs font-semibold text-accent-300 ring-1 ring-accent-400/40 active:bg-accent-500/30 disabled:opacity-50"
          >
            {seeding ? (
              <>
                <Loader2 size={16} className="animate-spin" /> Generowanie 27 ubrań...
              </>
            ) : (
              <>
                <Sparkles size={16} /> Załaduj szafę testową (27 ubrań)
              </>
            )}
          </button>
          {items.length > 0 && (
            <button
              onClick={handleClearAll}
              disabled={busy || seeding}
              className={`flex flex-1 items-center justify-center gap-2 rounded-2xl py-3 text-xs font-semibold transition-colors ${
                confirmClear
                  ? 'bg-red-600 text-white'
                  : 'bg-red-500/15 text-red-300 active:bg-red-500/25'
              }`}
            >
              <Trash2 size={16} />
              {confirmClear ? 'Dotknij ponownie, aby wyczyścić' : 'Wyczyść całą szafę'}
            </button>
          )}
        </div>
      </section>
    </div>
  );
}
