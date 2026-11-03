import { Info, Umbrella } from 'lucide-react';
import type { ClothingItem, Outfit } from '../types';
import { CATEGORY_LABELS } from '../lib/constants';
import { ColorDot, ItemImage } from './ui';

function Piece({ item, label }: { item: ClothingItem; label: string }) {
  return (
    <div className="min-w-0">
      <div className="relative aspect-square overflow-hidden rounded-2xl bg-ink-800">
        <ItemImage item={item} className="h-full w-full" />
        {item.isRainproof && (
          <span className="absolute right-1.5 top-1.5 rounded-full bg-sky-500/90 p-1">
            <Umbrella size={12} />
          </span>
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

export default function OutfitCard({ outfit }: { outfit: Outfit }) {
  const main: { item: ClothingItem; label: string }[] = [];
  if (outfit.onepiece) {
    main.push({ item: outfit.onepiece, label: 'Sukienka / 1-cz.' });
  } else {
    if (outfit.top) main.push({ item: outfit.top, label: CATEGORY_LABELS.top });
    if (outfit.bottom) main.push({ item: outfit.bottom, label: CATEGORY_LABELS.bottom });
  }
  if (outfit.shoes) main.push({ item: outfit.shoes, label: CATEGORY_LABELS.shoes });
  if (outfit.outerwear) main.push({ item: outfit.outerwear, label: 'Wierzchnie' });
  if (outfit.bag) main.push({ item: outfit.bag, label: 'Torebka / Plecak' });

  return (
    <section className="rounded-3xl bg-ink-900 p-4">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-base font-bold">Twój zestaw</h2>
        <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-xs font-semibold text-emerald-300">
          Harmonia {outfit.score}%
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {main.map((m) => (
          <Piece key={m.item.id} {...m} />
        ))}
      </div>

      {outfit.accessories.length > 0 && (
        <div className="mt-4">
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-400">Dodatki</div>
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
