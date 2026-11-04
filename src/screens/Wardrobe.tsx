import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Droplets, Heart, Loader2, Plus, Sparkles, Trash2, WashingMachine } from 'lucide-react';
import type { BrightnessType, Category, ClothingItem, Occasion } from '../types';
import { clearLaundry, db, deleteItem, updateItem } from '../lib/db';
import { seedDemoWardrobe } from '../lib/demoWardrobe';
import {
  BRIGHTNESS_LABELS,
  CATEGORY_EMOJIS,
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  OCCASIONS,
  SUBCATEGORIES,
  TEMP_RANGES,
} from '../lib/constants';
import { PALETTE, brightnessOfHex } from '../lib/palette';
import { BottomSheet, Chip, ColorDot, ItemImage } from '../components/ui';
import type { Tab } from '../components/TabBar';

type CatFilter = 'all' | 'fav' | 'laundry' | Category;
type BrFilter = 'all' | BrightnessType;
type OccFilter = 'all' | Occasion;

export default function Wardrobe({
  onNavigate,
  notify,
}: {
  onNavigate: (t: Tab) => void;
  notify: (msg: string) => void;
}) {
  const items = useLiveQuery(() => db.items.orderBy('createdAt').reverse().toArray(), []);
  const [cat, setCat] = useState<CatFilter>('all');
  const [br, setBr] = useState<BrFilter>('all');
  const [occ, setOcc] = useState<OccFilter>('all');
  const [selected, setSelected] = useState<ClothingItem | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [seeding, setSeeding] = useState(false);

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

  const filtered = useMemo(
    () =>
      (items ?? []).filter((i) => {
        if (cat === 'fav' && !i.isFavorite) return false;
        if (cat === 'laundry' && !i.inLaundry) return false;
        if (cat !== 'all' && cat !== 'fav' && cat !== 'laundry' && i.category !== cat) return false;
        if (br !== 'all' && i.brightnessType !== br) return false;
        if (occ !== 'all' && !(i.occasions ?? ['casual']).includes(occ)) return false;
        return true;
      }),
    [items, cat, br, occ]
  );

  const counts = useMemo(() => {
    const m: Record<string, number> = {
      all: items?.length ?? 0,
      fav: 0,
      laundry: 0,
    };
    items?.forEach((i) => {
      m[i.category] = (m[i.category] ?? 0) + 1;
      if (i.isFavorite) m.fav++;
      if (i.inLaundry) m.laundry++;
    });
    return m;
  }, [items]);

  const totalKB = useMemo(
    () =>
      Math.round(
        (items ?? []).reduce((s, i) => {
          if (i.imageDataUrl) return s + Math.round(i.imageDataUrl.length * 0.75);
          return s + (i.imageBlob?.size ?? 0);
        }, 0) / 1024
      ),
    [items]
  );

  const close = () => {
    setSelected(null);
    setConfirmDelete(false);
  };

  const toggleOccasion = async (o: Occasion) => {
    if (!selected) return;
    const current = selected.occasions ?? ['casual'];
    const next = current.includes(o) ? current.filter((x) => x !== o) : [...current, o];
    if (next.length === 0) return;
    setSelected((prev) => (prev ? { ...prev, occasions: next } : prev));
    await updateItem(selected.id, { occasions: next });
  };

  const toggleItemFavorite = async () => {
    if (!selected) return;
    const next = !selected.isFavorite;
    setSelected((prev) => (prev ? { ...prev, isFavorite: next } : prev));
    await updateItem(selected.id, { isFavorite: next });
    notify(next ? 'Dodano do ulubionych ❤️' : 'Usunięto z ulubionych');
  };

  const toggleItemLaundry = async () => {
    if (!selected) return;
    const next = !selected.inLaundry;
    setSelected((prev) => (prev ? { ...prev, inLaundry: next } : prev));
    await updateItem(selected.id, { inLaundry: next });
    notify(next ? 'Wrzucono do kosza na pranie 🧺' : 'Oznaczono jako czyste ✨');
  };

  const handleWashAll = async () => {
    await clearLaundry();
    notify('Wszystkie ubrania wyprane i gotowe do noszenia! ✨');
  };

  const changeCategory = async (newCat: Category) => {
    if (!selected) return;
    const firstSub = SUBCATEGORIES[newCat][0].label;
    setSelected((prev) => (prev ? { ...prev, category: newCat, subCategory: firstSub } : prev));
    await updateItem(selected.id, { category: newCat, subCategory: firstSub });
  };

  const changeSubCategory = async (newSub: string) => {
    if (!selected) return;
    setSelected((prev) => (prev ? { ...prev, subCategory: newSub } : prev));
    await updateItem(selected.id, { subCategory: newSub });
  };

  const changeColor = async (name: string, hex: string) => {
    if (!selected) return;
    const brightnessType = brightnessOfHex(hex);
    setSelected((prev) =>
      prev ? { ...prev, dominantColor: name, colorHex: hex, brightnessType } : prev
    );
    await updateItem(selected.id, { dominantColor: name, colorHex: hex, brightnessType });
  };

  const remove = async () => {
    if (!selected) return;
    if (!confirmDelete) {
      setConfirmDelete(true);
      return;
    }
    await deleteItem(selected.id);
    close();
    notify('Usunięto z szafy');
  };

  const tempInfo = (i: ClothingItem) => TEMP_RANGES.find((t) => t.id === i.tempRange)!;

  return (
    <div className="scroll-area h-full pb-12 pt-safe">
      <header className="mb-3 flex items-end justify-between px-4">
        <div>
          <h1 className="text-2xl font-bold">Moja szafa</h1>
          <p className="text-sm text-ink-400">
            {counts.all} {counts.all === 1 ? 'element' : 'elementów'} · ok.{' '}
            {totalKB >= 1024 ? `${(totalKB / 1024).toFixed(1)} MB` : `${totalKB} KB`}
          </p>
        </div>
        {counts.laundry > 0 && (
          <button
            onClick={handleWashAll}
            className="flex items-center gap-1.5 rounded-full bg-sky-500/20 px-3 py-1.5 text-xs font-semibold text-sky-300 active:bg-sky-500/30"
          >
            <Sparkles size={13} /> Wypierz ({counts.laundry})
          </button>
        )}
      </header>

      <div className="no-scrollbar mb-2 flex gap-2 overflow-x-auto px-4">
        <Chip active={cat === 'all'} onClick={() => setCat('all')}>
          Wszystko {counts.all ? `(${counts.all})` : ''}
        </Chip>
        {counts.fav > 0 && (
          <Chip active={cat === 'fav'} onClick={() => setCat('fav')}>
            ❤️ Ulubione ({counts.fav})
          </Chip>
        )}
        {counts.laundry > 0 && (
          <Chip active={cat === 'laundry'} onClick={() => setCat('laundry')}>
            🧺 W praniu ({counts.laundry})
          </Chip>
        )}
        {CATEGORY_ORDER.map((c) => (
          <Chip key={c} active={cat === c} onClick={() => setCat(c)}>
            {CATEGORY_EMOJIS[c]} {CATEGORY_LABELS[c]} {counts[c] ? `(${counts[c]})` : ''}
          </Chip>
        ))}
      </div>
      <div className="no-scrollbar mb-2 flex gap-2 overflow-x-auto px-4">
        <Chip active={br === 'all'} onClick={() => setBr('all')}>
          Każda jasność
        </Chip>
        {(['light', 'dark', 'neutral'] as BrightnessType[]).map((b) => (
          <Chip key={b} active={br === b} onClick={() => setBr(b)}>
            {BRIGHTNESS_LABELS[b]}
          </Chip>
        ))}
      </div>
      <div className="no-scrollbar mb-4 flex gap-2 overflow-x-auto px-4">
        <Chip active={occ === 'all'} onClick={() => setOcc('all')}>
          Każda okazja
        </Chip>
        {OCCASIONS.map((o) => (
          <Chip key={o.id} active={occ === o.id} onClick={() => setOcc(o.id)}>
            {o.emoji} {o.label}
          </Chip>
        ))}
      </div>

      {items && filtered.length === 0 ? (
        <div className="mx-4 rounded-3xl bg-ink-900 p-8 text-center">
          <p className="text-sm text-ink-300">
            {items.length === 0
              ? 'Nie masz jeszcze żadnych ubrań.'
              : 'Brak ubrań dla wybranych filtrów.'}
          </p>
          {items.length === 0 && (
            <div className="mt-4 flex flex-col gap-2.5 sm:flex-row sm:justify-center">
              <button
                onClick={() => onNavigate('add')}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-accent-500 px-5 py-3 font-semibold"
              >
                <Plus size={18} /> Dodaj pierwsze ubranie
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
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 px-4 sm:grid-cols-3">
          {filtered.map((item) => (
            <button
              key={item.id}
              onClick={() => setSelected(item)}
              className="overflow-hidden rounded-2xl bg-ink-900 text-left transition-transform active:scale-[0.98]"
            >
              <div className="relative aspect-square bg-ink-800">
                <ItemImage
                  item={item}
                  className={`h-full w-full ${item.inLaundry ? 'opacity-50 grayscale-[40%]' : ''}`}
                />
                {item.isFavorite && (
                  <span className="absolute left-1.5 top-1.5 rounded-full bg-rose-500/90 p-1 text-white">
                    <Heart size={11} fill="currentColor" />
                  </span>
                )}
                {item.isRainproof && (
                  <span className="absolute right-1.5 top-1.5 rounded-full bg-sky-500/90 p-1">
                    <Droplets size={12} />
                  </span>
                )}
                {item.inLaundry && (
                  <span className="absolute inset-x-2 bottom-2 flex items-center justify-center gap-1 rounded-lg bg-amber-500/90 py-1 text-[11px] font-bold text-ink-950">
                    <WashingMachine size={12} /> W praniu
                  </span>
                )}
                {!item.inLaundry && (item.wearCount ?? 0) > 0 && (
                  <span className="absolute bottom-1.5 right-1.5 rounded-md bg-black/60 px-1.5 py-0.5 text-[10px] font-medium text-white/85 backdrop-blur-sm">
                    {item.wearCount}×
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5 px-2.5 py-2 text-[12px]">
                <ColorDot hex={item.colorHex} />
                <span className="truncate font-medium">{item.subCategory}</span>
              </div>
            </button>
          ))}
        </div>
      )}

      <BottomSheet
        open={!!selected}
        onClose={close}
        title={selected?.subCategory}
        footer={
          selected ? (
            confirmDelete ? (
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setConfirmDelete(false)}
                  className="flex items-center justify-center rounded-2xl bg-ink-800 px-3 py-3 text-xs font-semibold text-ink-200 active:bg-ink-700 sm:text-sm"
                >
                  Anuluj
                </button>
                <button
                  type="button"
                  onClick={remove}
                  className="flex items-center justify-center gap-1.5 rounded-2xl bg-red-600 px-3 py-3 text-xs font-semibold text-white active:bg-red-700 sm:text-sm"
                >
                  <Trash2 size={16} className="shrink-0" /> Potwierdź usunięcie
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={remove}
                className="flex w-full items-center justify-center gap-2 rounded-2xl bg-red-500/15 px-4 py-3 text-sm font-semibold text-red-300 active:bg-red-500/25"
              >
                <Trash2 size={17} className="shrink-0" /> Usuń z szafy
              </button>
            )
          ) : undefined
        }
      >
        {selected && (
          <div className="space-y-4">
            <div className="flex items-center gap-3.5">
              <div className="aspect-square h-28 w-28 shrink-0 overflow-hidden rounded-2xl bg-ink-800">
                <ItemImage item={selected} className="h-full w-full" />
              </div>

              <dl className="min-w-0 flex-1 space-y-1.5 text-xs sm:text-sm">
                <div className="flex items-center justify-between gap-2">
                  <dt className="text-ink-400">Kolor</dt>
                  <dd className="flex items-center gap-1.5 truncate font-medium">
                    <ColorDot hex={selected.colorHex} /> {selected.dominantColor}
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <dt className="text-ink-400">Jasność</dt>
                  <dd className="truncate">{BRIGHTNESS_LABELS[selected.brightnessType]}</dd>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <dt className="text-ink-400">Pogoda</dt>
                  <dd className="truncate">
                    {tempInfo(selected).label} ({tempInfo(selected).hint})
                  </dd>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <dt className="text-ink-400">Założono</dt>
                  <dd>{selected.wearCount ?? 0} razy</dd>
                </div>
              </dl>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={toggleItemFavorite}
                className={`flex min-w-0 items-center justify-center gap-1.5 rounded-2xl px-3 py-2.5 text-center text-xs font-semibold leading-tight transition-colors ${
                  selected.isFavorite
                    ? 'bg-rose-500/20 text-rose-300 ring-1 ring-rose-400/40'
                    : 'bg-ink-800 text-ink-300'
                }`}
              >
                <Heart
                  size={15}
                  className="shrink-0"
                  fill={selected.isFavorite ? 'currentColor' : 'none'}
                />
                <span className="truncate">
                  {selected.isFavorite ? 'Ulubione' : 'Do ulubionych'}
                </span>
              </button>
              <button
                type="button"
                onClick={toggleItemLaundry}
                className={`flex min-w-0 items-center justify-center gap-1.5 rounded-2xl px-3 py-2.5 text-center text-xs font-semibold leading-tight transition-colors ${
                  selected.inLaundry
                    ? 'bg-amber-500/25 text-amber-200 ring-1 ring-amber-400/40'
                    : 'bg-ink-800 text-ink-300'
                }`}
              >
                <WashingMachine size={15} className="shrink-0" />
                <span className="truncate">
                  {selected.inLaundry ? 'Oznacz jako czyste' : 'Wrzuć do prania'}
                </span>
              </button>
            </div>

            <div>
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-400">
                Kategoria (dotknij, aby zmienić)
              </div>
              <div className="flex flex-wrap gap-2">
                {CATEGORY_ORDER.map((c) => (
                  <Chip key={c} active={selected.category === c} onClick={() => changeCategory(c)}>
                    {CATEGORY_EMOJIS[c]} {CATEGORY_LABELS[c]}
                  </Chip>
                ))}
              </div>
            </div>

            <div>
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-400">
                Rodzaj
              </div>
              <div className="flex flex-wrap gap-2">
                {SUBCATEGORIES[selected.category].map((s) => (
                  <Chip
                    key={s.label}
                    active={selected.subCategory === s.label}
                    onClick={() => changeSubCategory(s.label)}
                  >
                    {s.label}
                  </Chip>
                ))}
              </div>
            </div>

            <div>
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-400">
                Zmień kolor
              </div>
              <div className="grid grid-cols-5 gap-x-1.5 gap-y-2.5">
                {PALETTE.map((p) => {
                  const active = p.name === selected.dominantColor;
                  return (
                    <button
                      key={p.name}
                      type="button"
                      onClick={() => changeColor(p.name, p.hex)}
                      className="flex min-w-0 flex-col items-center gap-1"
                    >
                      <span
                        className={`h-8 w-8 rounded-full ring-offset-2 ring-offset-ink-900 ${
                          active ? 'ring-2 ring-accent-400' : 'ring-1 ring-white/20'
                        }`}
                        style={{ backgroundColor: p.hex }}
                      />
                      <span
                        className={`w-full truncate text-center text-[10px] ${
                          active ? 'font-semibold text-white' : 'text-ink-400'
                        }`}
                      >
                        {p.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div>
              <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-400">
                Przeznaczenie (dotknij, aby zmienić)
              </div>
              <div className="flex flex-wrap gap-2">
                {OCCASIONS.map((o) => (
                  <Chip
                    key={o.id}
                    active={(selected.occasions ?? ['casual']).includes(o.id)}
                    onClick={() => toggleOccasion(o.id)}
                  >
                    {o.emoji} {o.label}
                  </Chip>
                ))}
              </div>
            </div>
          </div>
        )}
      </BottomSheet>
    </div>
  );
}
