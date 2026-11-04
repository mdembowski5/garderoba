import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
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
import { renderFallbackIllustrationForItem } from '../lib/demoWardrobe';
import { weatherKind } from '../lib/weather';

/** Miniaturka ubrania z IndexedDB (odporna na wygasanie Blob URL w iOS Safari). */
export function ItemImage({ item, className = '' }: { item: ClothingItem; className?: string }) {
  const blobUrl = useObjectUrl(item.imageDataUrl ? undefined : item.imageBlob, item.id);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [item.id, item.imageDataUrl, item.colorHex, item.subCategory]);

  const fallbackUrl = useMemo(() => {
    if (item.imageDataUrl && !failed) return undefined;
    if (blobUrl && !failed) return undefined;
    return renderFallbackIllustrationForItem(item);
  }, [item, blobUrl, failed]);

  const src = (!failed && (item.imageDataUrl || blobUrl)) || fallbackUrl;

  return src ? (
    <img
      src={src}
      alt={item.subCategory}
      draggable={false}
      onError={() => setFailed(true)}
      className={`object-cover ${className}`}
    />
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
            className={`min-w-0 flex-1 truncate rounded-xl px-2 py-2 text-xs font-semibold transition-colors sm:text-[13px] ${
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
  footer,
  children,
}: {
  open: boolean;
  title?: string;
  onClose: () => void;
  footer?: ReactNode;
  children: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  if (!open) return null;

  return createPortal(
    <div
      style={{ height: 'var(--app-height, 100dvh)' }}
      className="fixed inset-x-0 top-0 z-[100] flex flex-col justify-end"
    >
      <div className="absolute inset-0 animate-fade-in bg-black/65" onClick={onClose} />
      <div className="relative flex max-h-[86%] w-full max-w-lg animate-sheet-up flex-col overflow-hidden rounded-t-3xl bg-ink-900 shadow-2xl sm:mx-auto">
        {/* Stały nagłówek arkusza */}
        <div className="shrink-0 border-b border-white/10 px-4 pb-2.5 pt-2.5 sm:px-5">
          <div className="mx-auto mb-2 h-1 w-10 rounded-full bg-ink-600" />
          <div className="flex items-center justify-between gap-2">
            <h2 className="truncate text-base font-bold sm:text-lg">{title}</h2>
            <button
              type="button"
              onClick={onClose}
              aria-label="Zamknij"
              className="shrink-0 rounded-full bg-ink-800 p-2 text-ink-300 active:bg-ink-700"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Przewijana zawartość */}
        <div
          className={`scroll-area min-h-0 flex-1 px-4 py-4 sm:px-5 ${
            footer ? 'pb-6' : 'pb-safe-sheet'
          }`}
        >
          {children}
        </div>

        {/* Przypięta dolna belka akcji (np. przycisk usuwania) */}
        {footer && (
          <div className="pb-safe-sheet shrink-0 border-t border-white/10 bg-ink-900/95 px-4 pt-3 backdrop-blur sm:px-5">
            {footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}
