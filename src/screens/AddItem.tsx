import { useEffect, useRef, useState } from 'react';
import {
  Camera,
  Check,
  Droplets,
  ImagePlus,
  Loader2,
  Pipette,
  RotateCcw,
  Sparkles,
} from 'lucide-react';
import type { BrightnessType, Category, Occasion, TempRange } from '../types';
import { addItem } from '../lib/db';
import { compressImage, removeBackgroundImage, type CompressedImage } from '../lib/image';
import { analyzeImage, type ColorAnalysis, type Point2D } from '../lib/colorAnalysis';
import {
  PALETTE,
  brightnessOfHex,
  hexToRgb,
  nearestPaletteColor,
} from '../lib/palette';
import {
  BRIGHTNESS_LABELS,
  CATEGORY_EMOJIS,
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  OCCASIONS,
  SUBCATEGORIES,
  TEMP_RANGES,
} from '../lib/constants';
import { Chip, ColorDot, Segmented } from '../components/ui';

interface Draft {
  original: CompressedImage;
  originalUrl: string;
  cutout: CompressedImage;
  cutoutUrl: string;
  analysis: ColorAnalysis;
}

const TEMP_IDS = TEMP_RANGES.map((t) => t.id);
const BRIGHTNESS_OPTIONS = (['light', 'neutral', 'dark'] as BrightnessType[]).map((v) => ({
  value: v,
  label: BRIGHTNESS_LABELS[v],
}));

export default function AddItem({
  onSaved,
  notify,
}: {
  onSaved: () => void;
  notify: (msg: string) => void;
}) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<Draft | null>(null);
  const [useCutout, setUseCutout] = useState(true);
  const [focusPoint, setFocusPoint] = useState<Point2D | null>(null);
  const [refining, setRefining] = useState(false);

  const [category, setCategory] = useState<Category>('top');
  const [subCategory, setSubCategory] = useState(SUBCATEGORIES.top[0].label);
  const [tempIdx, setTempIdx] = useState(2);
  const [rainproof, setRainproof] = useState(false);
  const [occasions, setOccasions] = useState<Occasion[]>(SUBCATEGORIES.top[0].occasions);
  const [colorName, setColorName] = useState('');
  const [colorHex, setColorHex] = useState('#808080');
  const [brightness, setBrightness] = useState<BrightnessType>('neutral');
  const [colorEdited, setColorEdited] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    return () => {
      if (draft) {
        URL.revokeObjectURL(draft.originalUrl);
        URL.revokeObjectURL(draft.cutoutUrl);
      }
    };
  }, [draft]);

  const applyPreset = (cat: Category, label: string) => {
    const preset = SUBCATEGORIES[cat].find((p) => p.label === label) ?? SUBCATEGORIES[cat][0];
    if (!preset) return;
    setTempIdx(TEMP_IDS.indexOf(preset.temp));
    setRainproof(Boolean(preset.rainproof));
    setOccasions([...preset.occasions]);
  };

  const toggleOccasion = (o: Occasion) =>
    setOccasions((prev) => (prev.includes(o) ? prev.filter((x) => x !== o) : [...prev, o]));

  const chooseCategory = (cat: Category, preferredSub?: string) => {
    setCategory(cat);
    const list = SUBCATEGORIES[cat];
    const chosen =
      preferredSub && list.some((s) => s.label === preferredSub) ? preferredSub : list[0].label;
    setSubCategory(chosen);
    applyPreset(cat, chosen);
  };

  const chooseSubCategory = (label: string) => {
    setSubCategory(label);
    applyPreset(category, label);
  };

  const reset = () => {
    setDraft(null);
    setError(null);
    setColorEdited(false);
    setFocusPoint(null);
    chooseCategory('top');
  };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // pozwala wybrać to samo zdjęcie ponownie
    if (!file) return;
    setBusy(true);
    setError(null);
    setFocusPoint(null);
    try {
      const original = await compressImage(file);
      const [analysis, cutout] = await Promise.all([
        analyzeImage(original.blob),
        removeBackgroundImage(original.blob),
      ]);
      setDraft({
        original,
        originalUrl: URL.createObjectURL(original.blob),
        cutout,
        cutoutUrl: URL.createObjectURL(cutout.blob),
        analysis,
      });
      setColorName(analysis.paletteName);
      setColorHex(analysis.hex);
      setBrightness(analysis.brightness);
      setColorEdited(false);
      chooseCategory(analysis.suggestedCategory, analysis.suggestedSubCategory);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nie udało się przetworzyć zdjęcia.');
    } finally {
      setBusy(false);
    }
  };

  /** Kliknięcie w ubranie na zdjęciu: próbkuje kolor w tym miejscu i odświeża wycięcie tła. */
  const onPickPointOnImage = async (e: React.MouseEvent<HTMLButtonElement>) => {
    if (!draft || refining) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = Math.max(0.05, Math.min(0.95, (e.clientX - rect.left) / rect.width));
    const y = Math.max(0.05, Math.min(0.95, (e.clientY - rect.top) / rect.height));
    const point: Point2D = { x, y };
    setFocusPoint(point);
    setRefining(true);
    try {
      const [analysis, cutout] = await Promise.all([
        analyzeImage(draft.original.blob, point),
        removeBackgroundImage(draft.original.blob, point),
      ]);
      URL.revokeObjectURL(draft.cutoutUrl);
      setDraft({
        ...draft,
        cutout,
        cutoutUrl: URL.createObjectURL(cutout.blob),
        analysis,
      });
      setColorName(analysis.paletteName);
      setColorHex(analysis.hex);
      setBrightness(analysis.brightness);
      setColorEdited(false);
    } finally {
      setRefining(false);
    }
  };

  const pickPaletteColor = (name: string, hex: string) => {
    setColorName(name);
    setColorHex(hex);
    setBrightness(brightnessOfHex(hex));
    setColorEdited(true);
  };

  const onCustomHexChange = (hex: string) => {
    const [r, g, b] = hexToRgb(hex);
    const nearest = nearestPaletteColor(r, g, b);
    setColorHex(hex);
    setColorName(nearest.name);
    setBrightness(brightnessOfHex(hex));
    setColorEdited(true);
  };

  const save = async () => {
    if (!draft || saving) return;
    setSaving(true);
    const activeImage = useCutout ? draft.cutout : draft.original;
    try {
      await addItem({
        imageBlob: activeImage.blob,
        category,
        subCategory,
        tempRange: TEMP_IDS[tempIdx] as TempRange,
        isRainproof: rainproof,
        dominantColor: colorName,
        colorHex,
        brightnessType: brightness,
        occasions: occasions.length ? occasions : ['casual'],
      });
      notify('Dodano do szafy ✓');
      reset();
      onSaved();
    } catch {
      setError('Nie udało się zapisać (czy pamięć urządzenia jest pełna?).');
    } finally {
      setSaving(false);
    }
  };

  const temp = TEMP_RANGES[tempIdx];
  const activeImage = draft ? (useCutout ? draft.cutout : draft.original) : null;
  const activePreviewUrl = draft ? (useCutout ? draft.cutoutUrl : draft.originalUrl) : '';

  return (
    <div className="scroll-area h-full px-4 pb-6 pt-safe">
      <header className="mb-4">
        <h1 className="text-2xl font-bold">Dodaj ubranie</h1>
        <p className="text-sm text-ink-400">
          Tło jest wycinane automatycznie, a kolor i sylwetka rozpoznawane ze zdjęcia
        </p>
      </header>

      {/* Ukryte inputy: aparat (tylny) i galeria */}
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={onFile}
      />
      <input ref={galleryRef} type="file" accept="image/*" className="hidden" onChange={onFile} />

      {!draft && (
        <div className="space-y-3">
          <button
            onClick={() => cameraRef.current?.click()}
            disabled={busy}
            className="flex w-full flex-col items-center justify-center gap-3 rounded-3xl border-2 border-dashed border-accent-500/50 bg-accent-500/10 py-14 active:bg-accent-500/20"
          >
            {busy ? (
              <Loader2 size={40} className="animate-spin text-accent-300" />
            ) : (
              <Camera size={40} className="text-accent-300" />
            )}
            <span className="text-lg font-semibold">
              {busy ? 'Wycinanie tła i analiza ubrania…' : 'Zrób zdjęcie'}
            </span>
            <span className="text-xs text-ink-400">
              Umieść ubranie na środku kadru – tło i cienie zostaną odcięte
            </span>
          </button>
          <button
            onClick={() => galleryRef.current?.click()}
            disabled={busy}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-ink-800 py-3.5 font-semibold active:bg-ink-700"
          >
            <ImagePlus size={18} /> Wybierz z galerii
          </button>
        </div>
      )}

      {error && (
        <div className="mt-3 rounded-xl bg-red-500/15 px-3 py-2 text-sm text-red-200">{error}</div>
      )}

      {draft && activeImage && (
        <div className="space-y-5">
          <div className="flex gap-4">
            <button
              type="button"
              onClick={onPickPointOnImage}
              title="Dotknij ubrania na zdjęciu, aby pobrać kolor z tego miejsca"
              className="relative h-36 w-36 shrink-0 overflow-hidden rounded-2xl bg-ink-800 ring-1 ring-white/10"
            >
              <img src={activePreviewUrl} alt="Podgląd" className="h-full w-full object-cover" />
              {focusPoint && (
                <span
                  className="pointer-events-none absolute h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white shadow-md"
                  style={{
                    left: `${focusPoint.x * 100}%`,
                    top: `${focusPoint.y * 100}%`,
                    backgroundColor: colorHex,
                  }}
                />
              )}
              {refining && (
                <span className="absolute inset-0 flex items-center justify-center bg-black/45">
                  <Loader2 size={22} className="animate-spin text-white" />
                </span>
              )}
              <span className="pointer-events-none absolute inset-x-1.5 bottom-1.5 flex items-center justify-center gap-1 rounded-lg bg-black/60 px-1.5 py-0.5 text-[10px] text-white/90 backdrop-blur-sm">
                <Pipette size={10} /> Dotknij, by wskazać
              </span>
            </button>

            <div className="min-w-0 flex-1 space-y-1.5 text-sm">
              <div className="text-xs font-semibold uppercase tracking-wide text-ink-400">
                {colorEdited
                  ? 'Kolor (wybrany ręcznie)'
                  : focusPoint
                  ? 'Kolor ze wskazanego miejsca'
                  : 'Wykryty kolor i fason'}
              </div>
              <div className="flex items-center gap-2 text-base font-semibold">
                <ColorDot hex={colorHex} size={18} /> {colorName}
              </div>
              <div className="truncate text-xs font-medium text-accent-300">
                {CATEGORY_EMOJIS[category]} {CATEGORY_LABELS[category]} · {subCategory}
              </div>
              <div className="text-xs text-ink-300">
                Jasność: {BRIGHTNESS_LABELS[brightness].toLowerCase()}
              </div>
              <div className="flex flex-wrap gap-1.5 pt-0.5">
                <button
                  type="button"
                  onClick={() => setUseCutout((v) => !v)}
                  className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold transition-colors ${
                    useCutout
                      ? 'bg-accent-500/25 text-accent-300 ring-1 ring-accent-400/40'
                      : 'bg-ink-800 text-ink-300'
                  }`}
                >
                  <Sparkles size={12} /> {useCutout ? 'Tło wycięte' : 'Oryginalne tło'}
                </button>
              </div>
              <button
                onClick={reset}
                className="mt-0.5 flex items-center gap-1 text-xs font-semibold text-ink-400 active:text-white"
              >
                <RotateCcw size={12} /> Inne zdjęcie
              </button>
            </div>
          </div>

          <Field label="Kategoria ubrania">
            <div className="flex flex-wrap gap-2">
              {CATEGORY_ORDER.map((c) => (
                <Chip key={c} active={c === category} onClick={() => chooseCategory(c)}>
                  {CATEGORY_EMOJIS[c]} {CATEGORY_LABELS[c]}
                </Chip>
              ))}
            </div>
          </Field>

          <Field label="Dokładny rodzaj">
            <div className="flex flex-wrap gap-2">
              {SUBCATEGORIES[category].map((s) => (
                <Chip
                  key={s.label}
                  active={s.label === subCategory}
                  onClick={() => chooseSubCategory(s.label)}
                >
                  {s.label}
                </Chip>
              ))}
            </div>
          </Field>

          <Field label="Kolor dominujący (20 odcieni lub dotknij ubrania na zdjęciu)">
            <div className="grid grid-cols-5 gap-y-3 gap-x-2">
              {PALETTE.map((p) => {
                const active = p.name === colorName;
                return (
                  <button
                    key={p.name}
                    type="button"
                    onClick={() => pickPaletteColor(p.name, p.hex)}
                    className="flex flex-col items-center gap-1"
                    aria-label={p.name}
                  >
                    <span
                      className={`h-9 w-9 rounded-full ring-offset-2 ring-offset-ink-950 transition-transform ${
                        active ? 'scale-110 ring-2 ring-accent-400' : 'ring-1 ring-white/20'
                      }`}
                      style={{ backgroundColor: p.hex }}
                    />
                    <span
                      className={`w-full truncate text-center text-[10px] leading-tight ${
                        active ? 'font-semibold text-white' : 'text-ink-400'
                      }`}
                    >
                      {p.name}
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="mt-3 flex items-center justify-between rounded-xl bg-ink-900 px-3 py-2 text-xs text-ink-300">
              <span>Dokładny odcień z próbki: {colorHex.toUpperCase()}</span>
              <label className="cursor-pointer font-semibold text-accent-300">
                Własny odcień
                <input
                  type="color"
                  value={colorHex}
                  onChange={(e) => onCustomHexChange(e.target.value)}
                  className="sr-only"
                />
              </label>
            </div>
          </Field>

          <Field label="Jasność">
            <Segmented value={brightness} options={BRIGHTNESS_OPTIONS} onChange={setBrightness} />
          </Field>

          <Field label="Przeznaczenie – na jakie okazje (można kilka)">
            <div className="flex flex-wrap gap-2">
              {OCCASIONS.map((o) => (
                <Chip
                  key={o.id}
                  active={occasions.includes(o.id)}
                  onClick={() => toggleOccasion(o.id)}
                >
                  {o.emoji} {o.label}
                </Chip>
              ))}
            </div>
          </Field>

          <Field label={`Odpowiednia temperatura: ${temp.label} (${temp.hint})`}>
            <input
              type="range"
              min={0}
              max={3}
              step={1}
              value={tempIdx}
              onChange={(e) => setTempIdx(Number(e.target.value))}
              className="w-full accent-violet-500"
            />
            <div className="mt-1 grid grid-cols-4 text-[11px] text-ink-400">
              {TEMP_RANGES.map((t, i) => (
                <span
                  key={t.id}
                  className={`${
                    i === 0 ? 'text-left' : i === 3 ? 'text-right' : 'text-center'
                  } ${i === tempIdx ? 'font-semibold text-white' : ''}`}
                >
                  {t.label}
                </span>
              ))}
            </div>
          </Field>

          <label className="flex items-center justify-between rounded-2xl bg-ink-800 px-4 py-3.5">
            <span className="flex items-center gap-2 font-medium">
              <Droplets size={18} className="text-sky-400" /> Odporne na deszcz
            </span>
            <input
              type="checkbox"
              checked={rainproof}
              onChange={(e) => setRainproof(e.target.checked)}
              className="h-6 w-6 accent-violet-500"
            />
          </label>

          <button
            onClick={save}
            disabled={saving}
            className="flex w-full items-center justify-center gap-2 rounded-2xl bg-accent-500 py-4 text-base font-bold active:bg-accent-600 disabled:opacity-60"
          >
            {saving ? <Loader2 size={18} className="animate-spin" /> : <Check size={18} />} Zapisz
            w szafie
          </button>
        </div>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-400">{label}</div>
      {children}
    </div>
  );
}
