import { useMemo, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Droplets, Plus, Trash2 } from 'lucide-react';
import type { BrightnessType, Category, ClothingItem, Occasion } from '../types';
import { db, deleteItem, updateItem } from '../lib/db';
import {
  BRIGHTNESS_LABELS,
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  OCCASIONS,
  TEMP_RANGES,
} from '../lib/constants';
import { BottomSheet, Chip, ColorDot, ItemImage } from '../components/ui';
import type { Tab } from '../components/TabBar';

type CatFilter = 'all' | Category;
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

  const filtered = useMemo(
    () =>
      (items ?? []).filter(
        (i) =>
          (cat === 'all' || i.category === cat) &&
          (br === 'all' || i.brightnessType === br) &&
          (occ === 'all' || (i.occasions ?? ['casual']).includes(occ))
      ),
    [items, cat, br, occ]
  );

  const toggleOccasion = async (o: Occasion) => {
    if (!selected) return;
    const current = selected.occasions ?? ['casual'];
    const next = current.includes(o) ? current.filter((x) => x !== o) : [...current, o];
    if (next.length === 0) return; // co najmniej jedna okazja
    await updateItem(selected.id, { occasions: next });
    setSelected({ ...selected, occasions: next });
  };

  const counts = useMemo(() => {
    const m: Record<string, number> = { all: items?.length ?? 0 };
    items?.forEach((i) => (m[i.category] = (m[i.category] ?? 0) + 1));
    return m;
  }, [items]);

  const totalKB = useMemo(
    () => Math.round((items ?? []).reduce((s, i) => s + i.imageBlob.size, 0) / 1024),
    [items]
  );

  const close = () => {
    setSelected(null);
    setConfirmDelete(false);
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
    <div className="scroll-area h-full pb-6 pt-safe">
      <header className="mb-3 flex items-end justify-between px-4">
        <div>
          <h1 className="text-2xl font-bold">Moja szafa</h1>
          <p className="text-sm text-ink-400">
            {counts.all} {counts.all === 1 ? 'element' : 'elementów'} · ok.{' '}
            {totalKB >= 1024 ? `${(totalKB / 1024).toFixed(1)} MB` : `${totalKB} KB`}
          </p>
        </div>
      </header>

      <div className="no-scrollbar mb-2 flex gap-2 overflow-x-auto px-4">
        <Chip active={cat === 'all'} onClick={() => setCat('all')}>
          Wszystko {counts.all ? `(${counts.all})` : ''}
        </Chip>
        {CATEGORY_ORDER.map((c) => (
          <Chip key={c} active={cat === c} onClick={() => setCat(c)}>
            {CATEGORY_LABELS[c]} {counts[c] ? `(${counts[c]})` : ''}
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
            {items.length === 0 ? 'Nie masz jeszcze żadnych ubrań.' : 'Brak ubrań dla wybranych filtrów.'}
          </p>
          {items.length === 0 && (
            <button
              onClick={() => onNavigate('add')}
              className="mt-4 inline-flex items-center gap-2 rounded-2xl bg-accent-500 px-5 py-3 font-semibold"
            >
              <Plus size={18} /> Dodaj pierwsze ubranie
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 px-4 sm:grid-cols-3">
          {filtered.map((item) => (
            <button
              key={item.id}
              onClick={() => setSelected(item)}
              className="overflow-hidden rounded-2xl bg-ink-900 text-left active:scale-[0.98] transition-transform"
            >
              <div className="relative aspect-square bg-ink-800">
                <ItemImage item={item} className="h-full w-full" />
                {item.isRainproof && (
                  <span className="absolute right-1.5 top-1.5 rounded-full bg-sky-500/90 p-1">
                    <Droplets size={12} />
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

      <BottomSheet open={!!selected} onClose={close} title={selected?.subCategory}>
        {selected && (
          <div className="pb-3">
            <div className="mx-auto aspect-square w-full max-w-xs overflow-hidden rounded-2xl bg-ink-800">
              <ItemImage item={selected} className="h-full w-full" />
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
              <dt className="text-ink-400">Kategoria</dt>
              <dd>{CATEGORY_LABELS[selected.category]}</dd>
              <dt className="text-ink-400">Kolor</dt>
              <dd className="flex items-center gap-2">
                <ColorDot hex={selected.colorHex} /> {selected.dominantColor}
              </dd>
              <dt className="text-ink-400">Jasność</dt>
              <dd>{BRIGHTNESS_LABELS[selected.brightnessType]}</dd>
              <dt className="text-ink-400">Temperatura</dt>
              <dd>
                {tempInfo(selected).label} ({tempInfo(selected).hint})
              </dd>
              <dt className="text-ink-400">Odporne na deszcz</dt>
              <dd>{selected.isRainproof ? 'Tak' : 'Nie'}</dd>
            </dl>
            <div className="mt-4">
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
            <button
              onClick={remove}
              className={`mt-5 flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 font-semibold transition-colors ${
                confirmDelete ? 'bg-red-600 text-white' : 'bg-red-500/15 text-red-300'
              }`}
            >
              <Trash2 size={18} /> {confirmDelete ? 'Dotknij ponownie, aby usunąć' : 'Usuń z szafy'}
            </button>
          </div>
        )}
      </BottomSheet>
    </div>
  );
}
