import { useEffect, type ReactNode } from 'react';
import {
  Cloud,
  CloudDrizzle,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSnow,
  CloudSun,
  Moon,
  Sun,
  X,
  type LucideIcon,
} from 'lucide-react';
import type { ClothingItem, WeatherKind } from '../types';
import { useObjectUrl } from '../hooks/useObjectUrl';
import { weatherKind } from '../lib/weather';

/** Miniaturka ubrania z IndexedDB. */
export function ItemImage({ item, className = '' }: { item: ClothingItem; className?: string }) {
  const url = useObjectUrl(item.imageBlob, item.id);
  return url ? (
    <img src={url} alt={item.subCategory} draggable={false} className={`object-cover ${className}`} />
  ) : (
    <div className={`animate-pulse bg-ink-700 ${className}`} />
  );
}

export function ColorDot({ hex, size = 12 }: { hex: string; size?: number }) {
  return (
    <span
      className="inline-block shrink-0 rounded-full ring-1 ring-white/25"
      style={{ width: size, height: size, backgroundColor: hex }}
    />
  );
}

const ICONS: Record<WeatherKind, LucideIcon> = {
  clear: Sun,
  partly: CloudSun,
  cloudy: Cloud,
  fog: CloudFog,
  drizzle: CloudDrizzle,
  rain: CloudRain,
  snow: CloudSnow,
  storm: CloudLightning,
};

export function WeatherIcon({
  code,
  isDay = true,
  size = 48,
  className = '',
}: {
  code: number;
  isDay?: boolean;
  size?: number;
  className?: string;
}) {
  const kind = weatherKind(code);
  const Icon = kind === 'clear' && !isDay ? Moon : ICONS[kind];
  return <Icon size={size} strokeWidth={1.6} className={className} />;
}

export function Segmented<T extends string>({
  value,
  options,
  onChange,
  className = '',
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  className?: string;
}) {
  return (
    <div className={`flex rounded-2xl bg-ink-800 p-1 ${className}`} role="tablist">
      {options.map((o) => {
        const active = o.value === value;
        return (
          <button
            key={o.value}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(o.value)}
            className={`flex-1 rounded-xl px-2 py-2 text-[13px] font-semibold transition-colors ${
              active ? 'bg-accent-500 text-white shadow' : 'text-ink-300 active:bg-ink-700'
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`shrink-0 whitespace-nowrap rounded-full px-3.5 py-1.5 text-[13px] font-medium transition-colors ${
        active ? 'bg-white text-ink-950' : 'bg-ink-800 text-ink-300 active:bg-ink-700'
      }`}
    >
      {children}
    </button>
  );
}

export function BottomSheet({
  open,
  title,
  onClose,
  children,
}: {
  open: boolean;
  title?: string;
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex flex-col justify-end">
      <div className="absolute inset-0 animate-fade-in bg-black/60" onClick={onClose} />
      <div className="pb-safe relative max-h-[88%] animate-sheet-up overflow-y-auto rounded-t-3xl bg-ink-900 px-5 pt-3 shadow-2xl">
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-ink-600" />
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-lg font-bold">{title}</h2>
          <button onClick={onClose} aria-label="Zamknij" className="rounded-full bg-ink-800 p-2 text-ink-300">
            <X size={18} />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}
