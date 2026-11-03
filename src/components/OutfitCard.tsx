import { Heart, Info, Lock, RefreshCw, Umbrella, Unlock } from 'lucide-react';
import type { Category, ClothingItem, Outfit } from '../types';
import { CATEGORY_LABELS } from '../lib/constants';
import { ColorDot, ItemImage } from './ui';

function Piece({
  item,
  label,
  locked,
  onToggleLock,
  onSwap,
}: {
  item: ClothingItem;
  label: string;
  locked: boolean;
  onToggleLock?: () => void;
  onSwap?: () => void;
}) {
  return (
    <div className="min-w-0">
      <div
        className={`relative aspect-square overflow-hidden rounded-2xl bg-ink-800 ${
          locked ? 'ring-2 ring-accent-400' : ''
        }`}
      >
        <ItemImage item={item} className="h-full w-full" />

        {onToggleLock && (
          <button
            type="button"
            onClick={onToggleLock}
            aria-label={locked ? 'Odepnij element' : 'Przypnij element'}
            title={locked ? 'Przypięty (zostaje przy losowaniu)' : 'Przypnij ten element'}
            className={`absolute left-1.5 top-1.5 rounded-full p-1.5 backdrop-blur-sm transition-colors ${
              locked
                ? 'bg-accent-500 text-white shadow'
                : 'bg-black/55 text-white/80 active:bg-black/80'
            }`}
          >
            {locked ? <Lock size={13} /> : <Unlock size={13} />}
          </button>
        )}

        {item.isRainproof && (
          <span
            title="Odporne na deszcz"
            className="absolute right-1.5 top-1.5 rounded-full bg-sky-500/90 p-1.5 text-white shadow"
          >
            <Umbrella size={12} />
          </span>
        )}

        {onSwap && (
          <button
            type="button"
            onClick={onSwap}
            aria-label="Wymień tylko ten element"
            title="Wymień tylko ten element"
            className="absolute bottom-1.5 right-1.5 rounded-full bg-black/60 p-1.5 text-white/90 backdrop-blur-sm active:bg-accent-500"
          >
            <RefreshCw size={13} />
          </button>
        )}
      </div>

      <div className="mt-1.5 flex items-center gap-1.5 text-[12px] text-ink-300">
        <ColorDot hex={item.colorHex} size={10} />
        <span className="truncate">
          <span className="font-semibold text-white">{label}</span> · {item.subCategory}
        </span>
      </div>
    </div>
  );
}

export default function OutfitCard({
  outfit,
  lockedCategories,
  onToggleLock,
  onSwapPiece,
  isSavedFavorite,
  onSaveFavorite,
}: {
  outfit: Outfit;
  lockedCategories?: Partial<Record<Category, ClothingItem>>;
  onToggleLock?: (cat: Category, item: ClothingItem) => void;
  onSwapPiece?: (cat: Category) => void;
  isSavedFavorite?: boolean;
  onSaveFavorite?: () => void;
}) {
  const main: { item: ClothingItem; label: string; cat: Category }[] = [];
  if (outfit.onepiece) {
    main.push({ item: outfit.onepiece, label: 'Sukienka / 1-cz.', cat: 'onepiece' });
  } else {
    if (outfit.top) main.push({ item: outfit.top, label: CATEGORY_LABELS.top, cat: 'top' });
    if (outfit.bottom)
      main.push({ item: outfit.bottom, label: CATEGORY_LABELS.bottom, cat: 'bottom' });
  }
  if (outfit.shoes) main.push({ item: outfit.shoes, label: CATEGORY_LABELS.shoes, cat: 'shoes' });
  if (outfit.outerwear)
    main.push({ item: outfit.outerwear, label: 'Wierzchnie', cat: 'outerwear' });
  if (outfit.bag) main.push({ item: outfit.bag, label: 'Torebka / Plecak', cat: 'bag' });

  const hasAnyLocked = lockedCategories && Object.keys(lockedCategories).length > 0;

  return (
    <section className="rounded-3xl bg-ink-900 p-4">
      <div className="mb-3 flex items-center justify-between gap-2">
        <div>
          <h2 className="text-base font-bold">Twój zestaw</h2>
          <p className="text-[11px] text-ink-400">
            🔒 przypnij wybrany element · 🔄 wymień pojedynczą rzecz
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs font-semibold text-emerald-300">
            Harmonia {outfit.score}%
          </span>
          {onSaveFavorite && (
            <button
              type="button"
              onClick={onSaveFavorite}
              disabled={isSavedFavorite}
              aria-label="Zapisz zestaw w ulubionych"
              className={`rounded-full p-2 transition-colors ${
                isSavedFavorite
                  ? 'bg-rose-500/20 text-rose-400'
                  : 'bg-ink-800 text-ink-300 active:bg-rose-500/20 active:text-rose-300'
              }`}
            >
              <Heart size={16} fill={isSavedFavorite ? 'currentColor' : 'none'} />
            </button>
          )}
        </div>
      </div>

      {hasAnyLocked && (
        <div className="mb-3 rounded-xl bg-accent-500/15 px-3 py-1.5 text-[11px] text-accent-300">
          Przypięte elementy pozostaną bez zmian podczas losowania kolejnego zestawu.
        </div>
      )}

      <div className="grid grid-cols-2 gap-3">
        {main.map((m) => (
          <Piece
            key={m.item.id}
            item={m.item}
            label={m.label}
            locked={Boolean(lockedCategories?.[m.cat]?.id === m.item.id)}
            onToggleLock={onToggleLock ? () => onToggleLock(m.cat, m.item) : undefined}
            onSwap={onSwapPiece ? () => onSwapPiece(m.cat) : undefined}
          />
        ))}
      </div>

      {outfit.accessories.length > 0 && (
        <div className="mt-4">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-400">
            Dodatki
          </div>
          <div className="grid grid-cols-4 gap-3">
            {outfit.accessories.map((a) => (
              <div key={a.id} className="min-w-0">
                <div className="aspect-square overflow-hidden rounded-xl bg-ink-800">
                  <ItemImage item={a} className="h-full w-full" />
                </div>
                <div className="mt-1 truncate text-[11px] text-ink-300">{a.subCategory}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {outfit.notes.length > 0 && (
        <ul className="mt-4 space-y-1.5">
          {outfit.notes.map((n) => (
            <li
              key={n}
              className="flex items-start gap-2 rounded-xl bg-amber-500/10 px-3 py-2 text-[12px] text-amber-200"
            >
              <Info size={14} className="mt-0.5 shrink-0" />
              {n}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
