import { useEffect, useState } from 'react';
import { Loader2, LocateFixed, Search } from 'lucide-react';
import type { Place } from '../types';
import { POPULAR_PLACES, searchPlaces } from '../lib/weather';
import { BottomSheet } from './ui';

export default function CitySheet({
  open,
  onClose,
  onPick,
  onUseLocation,
}: {
  open: boolean;
  onClose: () => void;
  onPick: (p: Place) => void;
  onUseLocation: () => void;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Place[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (query.trim().length < 2) {
      setResults([]);
      return;
    }
    const ctrl = new AbortController();
    setLoading(true);
    const t = setTimeout(() => {
      searchPlaces(query, ctrl.signal)
        .then(setResults)
        .catch(() => undefined)
        .finally(() => setLoading(false));
    }, 300);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [query]);

  const list = query.trim().length >= 2 ? results : POPULAR_PLACES;

  return (
    <BottomSheet open={open} onClose={onClose} title="Wybierz miasto">
      <button
        onClick={onUseLocation}
        className="mb-3 flex w-full items-center gap-2 rounded-2xl bg-accent-500/20 px-4 py-3 text-left font-semibold text-accent-300"
      >
        <LocateFixed size={18} /> Użyj mojej lokalizacji
      </button>
      <div className="relative mb-2">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Szukaj miasta…"
          className="w-full rounded-2xl bg-ink-800 py-3 pl-9 pr-9 text-white outline-none placeholder:text-ink-400"
        />
        {loading && <Loader2 size={16} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-ink-400" />}
      </div>
      <ul className="pb-2">
        {list.map((p) => (
          <li key={`${p.name}-${p.latitude}`}>
            <button
              onClick={() => onPick(p)}
              className="w-full rounded-xl px-3 py-3 text-left active:bg-ink-800"
            >
              {p.name}
            </button>
          </li>
        ))}
        {list.length === 0 && !loading && <li className="px-3 py-3 text-sm text-ink-400">Brak wyników</li>}
      </ul>
    </BottomSheet>
  );
}
