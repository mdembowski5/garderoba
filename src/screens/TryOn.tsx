import { useEffect, useMemo, useRef, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import {
  AlertTriangle,
  Camera,
  Check,
  CheckCircle2,
  ImagePlus,
  Loader2,
  Palette,
  Pipette,
  RotateCcw,
  ShoppingBag,
  Sparkles,
} from 'lucide-react';
import type {
  BrightnessType,
  Category,
  Occasion,
  PatternType,
  PersonalColorProfile,
  TempRange,
} from '../types';
import { addItem, db } from '../lib/db';
import { compressImage, removeBackgroundImage, type CompressedImage } from '../lib/image';
import { analyzeImage, type ColorAnalysis, type Point2D } from '../lib/colorAnalysis';
import { PALETTE, brightnessOfHex } from '../lib/palette';
import {
  CATEGORY_EMOJIS,
  CATEGORY_LABELS,
  CATEGORY_ORDER,
  OCCASIONS,
  PATTERNS,
  PATTERN_EMOJIS,
  PATTERN_LABELS,
  SUBCATEGORIES,
  TEMP_RANGES,
} from '../lib/constants';
import {
  EYE_COLORS,
  HAIR_COLORS,
  PERSONAL_PROFILE_EVENT,
  SKIN_TONES,
  loadPersonalProfile,
  paletteHexByName,
  resolveColorSeason,
  savePersonalProfile,
} from '../lib/personalColor';
import { analyzePurchaseCandidate } from '../lib/outfit';
import { Chip, ColorDot, ColorDots, ItemImage } from '../components/ui';
import PersonalPaletteSheet from '../components/PersonalPaletteSheet';
import type { Tab } from '../components/TabBar';

interface TryOnDraft {
  original: CompressedImage;
  cutout: CompressedImage;
  analysis: ColorAnalysis;
}

const TEMP_IDS = TEMP_RANGES.map((t) => t.id);

export default function TryOn({
  onNavigate,
  notify,
}: {
  onNavigate: (t: Tab) => void;
  notify: (msg: string) => void;
}) {
  const galleryRef = useRef<HTMLInputElement>(null);
  const cameraRef = useRef<HTMLInputElement>(null);

  const items = useLiveQuery(() => db.items.toArray(), []) ?? [];
  const [profile, setProfile] = useState<PersonalColorProfile>(loadPersonalProfile);
  const [paletteOpen, setPaletteOpen] = useState(false);

  const [busy, setBusy] = useState(false);
  const [refining, setRefining] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [draft, setDraft] = useState<TryOnDraft | null>(null);
  const [useCutout, setUseCutout] = useState(true);
  const [focusPoint, setFocusPoint] = useState<Point2D | null>(null);

  const [category, setCategory] = useState<Category>('top');
  const [subCategory, setSubCategory] = useState(SUBCATEGORIES.top[0].label);
  const [tempIdx, setTempIdx] = useState(1);
  const [rainproof, setRainproof] = useState(false);
  const [occasions, setOccasions] = useState<Occasion[]>(['casual']);
  const [colorName, setColorName] = useState('Pudrowy róż');
  const [colorHex, setColorHex] = useState('#e6b5c0');
  const [secondaryColors, setSecondaryColors] = useState<string[]>([]);
  const [secondaryColorHexes, setSecondaryColorHexes] = useState<string[]>([]);
  const [pattern, setPattern] = useState<PatternType>('solid');
  const [brightness, setBrightness] = useState<BrightnessType>('light');
  const [savingToWardrobe, setSavingToWardrobe] = useState(false);

  useEffect(() => {
    const onProfileChange = () => setProfile(loadPersonalProfile());
    window.addEventListener(PERSONAL_PROFILE_EVENT, onProfileChange);
    return () => window.removeEventListener(PERSONAL_PROFILE_EVENT, onProfileChange);
  }, []);

  const updateProfile = (next: PersonalColorProfile) => {
    setProfile(next);
    savePersonalProfile(next);
  };

  const applyPreset = (cat: Category, label: string, overridePattern?: PatternType) => {
    const preset = SUBCATEGORIES[cat].find((p) => p.label === label) ?? SUBCATEGORIES[cat][0];
    if (!preset) return;
    setTempIdx(TEMP_IDS.indexOf(preset.temp));
    setRainproof(Boolean(preset.rainproof));
    setOccasions([...preset.occasions]);
    if (overridePattern) {
      setPattern(overridePattern);
    }
  };

  const chooseCategory = (
    cat: Category,
    preferredSub?: string,
    detectedPattern?: PatternType
  ) => {
    setCategory(cat);
    const list = SUBCATEGORIES[cat];
    const chosen =
      preferredSub && list.some((s) => s.label === preferredSub) ? preferredSub : list[0].label;
    setSubCategory(chosen);
    applyPreset(cat, chosen, detectedPattern);
  };

  const chooseSubCategory = (label: string) => {
    setSubCategory(label);
    applyPreset(category, label);
  };

  const onFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
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
      setDraft({ original, cutout, analysis });
      setColorName(analysis.paletteName);
      setColorHex(analysis.hex);
      setSecondaryColors(analysis.secondaryColors ?? []);
      setSecondaryColorHexes(analysis.secondaryColorHexes ?? []);
      setPattern(analysis.suggestedPattern ?? 'solid');
      setBrightness(analysis.brightness);
      chooseCategory(
        analysis.suggestedCategory,
        analysis.suggestedSubCategory,
        analysis.suggestedPattern
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Nie udało się przeanalizować zdjęcia.');
    } finally {
      setBusy(false);
    }
  };

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
      setDraft({ ...draft, cutout, analysis });
      setColorName(analysis.paletteName);
      setColorHex(analysis.hex);
      setSecondaryColors(analysis.secondaryColors ?? []);
      setSecondaryColorHexes(analysis.secondaryColorHexes ?? []);
      setPattern(analysis.suggestedPattern ?? 'solid');
      setBrightness(analysis.brightness);
    } finally {
      setRefining(false);
    }
  };

  const pickPaletteColor = (name: string, hex: string) => {
    setColorName(name);
    setColorHex(hex);
    setBrightness(brightnessOfHex(hex));
    const filteredIdx = secondaryColors
      .map((c, idx) => (c !== name ? idx : -1))
      .filter((idx) => idx >= 0);
    if (filteredIdx.length !== secondaryColors.length) {
      setSecondaryColors(filteredIdx.map((i) => secondaryColors[i]));
      setSecondaryColorHexes(filteredIdx.map((i) => secondaryColorHexes[i]));
    }
  };

  const toggleSecondaryColor = (name: string, hex: string) => {
    if (name === colorName) return;
    const idx = secondaryColors.indexOf(name);
    if (idx >= 0) {
      setSecondaryColors(secondaryColors.filter((_, i) => i !== idx));
      setSecondaryColorHexes(secondaryColorHexes.filter((_, i) => i !== idx));
    } else if (secondaryColors.length < 2) {
      setSecondaryColors([...secondaryColors, name]);
      setSecondaryColorHexes([...secondaryColorHexes, hex]);
    } else {
      setSecondaryColors([secondaryColors[0], name]);
      setSecondaryColorHexes([secondaryColorHexes[0], hex]);
    }
  };

  const toggleOccasion = (o: Occasion) => {
    setOccasions((prev) => {
      const next = prev.includes(o) ? prev.filter((x) => x !== o) : [...prev, o];
      return next.length > 0 ? next : prev;
    });
  };

  const season = useMemo(() => resolveColorSeason(profile), [profile]);
  const skinInfo = SKIN_TONES.find((s) => s.id === profile.skinTone) ?? SKIN_TONES[2];
  const hairInfo = HAIR_COLORS.find((h) => h.id === profile.hairColor) ?? HAIR_COLORS[2];
  const eyeInfo = EYE_COLORS.find((e) => e.id === profile.eyeColor) ?? EYE_COLORS[0];

  const report = useMemo(
    () =>
      analyzePurchaseCandidate(
        {
          category,
          subCategory,
          dominantColor: colorName,
          colorHex,
          secondaryColors,
          secondaryColorHexes,
          pattern,
          brightnessType: brightness,
          occasions,
        },
        items,
        profile
      ),
    [
      category,
      subCategory,
      colorName,
      colorHex,
      secondaryColors,
      secondaryColorHexes,
      pattern,
      brightness,
      occasions,
      items,
      profile,
    ]
  );

  const handleSaveToWardrobe = async () => {
    if (!draft || savingToWardrobe) return;
    setSavingToWardrobe(true);
    const activeImage = useCutout ? draft.cutout : draft.original;
    try {
      await addItem({
        imageBlob: activeImage.blob,
        imageDataUrl: activeImage.dataUrl,
        category,
        subCategory,
        tempRange: TEMP_IDS[tempIdx] as TempRange,
        isRainproof: rainproof,
        dominantColor: colorName,
        colorHex,
        secondaryColors,
        secondaryColorHexes,
        pattern,
        brightnessType: brightness,
        occasions: occasions.length ? occasions : ['casual'],
      });
      notify('Dodano przymierzone ubranie do szafy ✓');
      setDraft(null);
      onNavigate('wardrobe');
    } catch {
      setError('Nie udało się zapisać ubrania.');
    } finally {
      setSavingToWardrobe(false);
    }
  };

  const activePreviewUrl = draft ? (useCutout ? draft.cutout.dataUrl : draft.original.dataUrl) : '';

  return (
    <div className="scroll-area h-full px-4 pb-14 pt-safe">
      <header className="mb-4">
        <h1 className="text-2xl font-bold">Przymierz do szafy</h1>
        <p className="text-sm text-ink-400">
          Sprawdź przed zakupem, czy ubranie z internetu pasuje do Twojej urody i rzeczy w szafie
        </p>
      </header>

      <input ref={galleryRef} type="file" accept="image/*" className="hidden" onChange={onFile} />
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={onFile}
      />

      <div className="space-y-4">
        {/* Karta profilu urody użytkownika (Skóra + Włosy + Oczy) */}
        <section className="rounded-3xl bg-ink-900 p-4 ring-1 ring-white/10">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-accent-300">
                <Palette size={14} /> Twoja paleta barw · {season.emoji} {season.name}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-ink-300">
                <span className="inline-flex items-center gap-1.5">
                  <ColorDot hex={skinInfo.swatchHex} size={11} /> Skóra
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <ColorDot hex={hairInfo.swatchHex} size={11} /> Włosy
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <ColorDot hex={eyeInfo.swatchHex} size={11} /> Oczy
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setPaletteOpen(true)}
              className="shrink-0 rounded-2xl bg-accent-500/20 px-3.5 py-2 text-xs font-semibold text-accent-300 ring-1 ring-accent-400/40 active:bg-accent-500/30"
            >
              Edytuj urodę
            </button>
          </div>

          <div className="mt-3 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
            <span className="shrink-0 text-[11px] text-ink-400">Twoje kolory:</span>
            {season.powerColors.slice(0, 7).map((c) => (
              <span
                key={c}
                className="inline-flex shrink-0 items-center gap-1 rounded-full bg-ink-800 px-2 py-0.5 text-[10px] text-ink-200"
              >
                <ColorDot hex={paletteHexByName(c)} size={8} />
                {c}
              </span>
            ))}
          </div>
        </section>

        {/* Wgrywanie zdjęcia ubrania z internetu / sklepu */}
        {!draft && (
          <section className="space-y-3 rounded-3xl bg-ink-900 p-5 text-center">
            <ShoppingBag size={36} className="mx-auto text-accent-400" />
            <div>
              <h2 className="text-base font-bold">Zastanawiasz się nad zakupem ubrania?</h2>
              <p className="mt-1 text-xs leading-relaxed text-ink-400">
                Wgraj zrzut ekranu lub zdjęcie ubrania ze sklepu internetowego (np. różowej bluzki,
                spodni, sukienki). Aplikacja oceni, czy ten kolor pasuje do Twojej skóry, włosów i
                oczu oraz czy masz w szafie rzeczy, z którymi go założysz.
              </p>
            </div>

            <div className="grid grid-cols-1 gap-2.5 pt-2 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => galleryRef.current?.click()}
                disabled={busy}
                className="flex items-center justify-center gap-2 rounded-2xl bg-accent-500 px-4 py-3.5 text-sm font-bold text-white active:bg-accent-600 disabled:opacity-50"
              >
                {busy ? (
                  <>
                    <Loader2 size={18} className="animate-spin" /> Analizowanie zdjęcia...
                  </>
                ) : (
                  <>
                    <ImagePlus size={18} /> Wgraj zdjęcie z internetu / galerii
                  </>
                )}
              </button>
              <button
                type="button"
                onClick={() => cameraRef.current?.click()}
                disabled={busy}
                className="flex items-center justify-center gap-2 rounded-2xl bg-ink-800 px-4 py-3.5 text-sm font-semibold text-ink-200 active:bg-ink-700 disabled:opacity-50"
              >
                <Camera size={18} /> Zrób zdjęcie w sklepie
              </button>
            </div>
          </section>
        )}

        {error && (
          <div className="rounded-2xl bg-red-500/15 px-4 py-3 text-xs text-red-200">{error}</div>
        )}

        {/* Wynik analizy wgranego zdjęcia */}
        {draft && (
          <div className="space-y-4">
            {/* Podgląd zdjęcia i szybka korekta parametrów */}
            <section className="rounded-3xl bg-ink-900 p-4">
              <div className="flex gap-3.5">
                <button
                  type="button"
                  onClick={onPickPointOnImage}
                  title="Dotknij ubrania na zdjęciu, aby pobrać kolor z wybranego miejsca"
                  className="relative h-32 w-32 shrink-0 overflow-hidden rounded-2xl bg-ink-800 ring-1 ring-white/10"
                >
                  <img src={activePreviewUrl} alt="Przymierzane ubranie" className="h-full w-full object-cover" />
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
                      <Loader2 size={20} className="animate-spin text-white" />
                    </span>
                  )}
                  <span className="pointer-events-none absolute inset-x-1.5 bottom-1.5 flex items-center justify-center gap-1 rounded-lg bg-black/65 px-1.5 py-0.5 text-[10px] text-white/90 backdrop-blur-sm">
                    <Pipette size={10} /> Wskaż kolor
                  </span>
                </button>

                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="text-[11px] font-semibold uppercase tracking-wide text-ink-400">
                    Rozpoznane ubranie
                  </div>
                  <div className="flex items-center gap-2 text-base font-bold">
                    <ColorDots
                      primaryHex={colorHex}
                      secondaryHexes={secondaryColorHexes}
                      size={16}
                    />
                    <span className="truncate">
                      {colorName}
                      {secondaryColors.length > 0 ? ` + ${secondaryColors.join(', ')}` : ''}
                    </span>
                  </div>
                  <div className="truncate text-xs font-medium text-accent-300">
                    {CATEGORY_EMOJIS[category]} {CATEGORY_LABELS[category]} · {subCategory} ·{' '}
                    {PATTERN_EMOJIS[pattern]} {PATTERN_LABELS[pattern]}
                  </div>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    <button
                      type="button"
                      onClick={() => setUseCutout((v) => !v)}
                      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold ${
                        useCutout
                          ? 'bg-accent-500/25 text-accent-300 ring-1 ring-accent-400/40'
                          : 'bg-ink-800 text-ink-300'
                      }`}
                    >
                      <Sparkles size={11} /> {useCutout ? 'Tło wycięte' : 'Oryginał'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setDraft(null)}
                      className="inline-flex items-center gap-1 rounded-full bg-ink-800 px-2.5 py-1 text-[11px] font-semibold text-ink-300 active:bg-ink-700"
                    >
                      <RotateCcw size={11} /> Inne zdjęcie
                    </button>
                  </div>
                </div>
              </div>

              {/* Szybka zmiana kategorii / rodzaju / wzoru / koloru */}
              <div className="mt-4 space-y-3 border-t border-white/10 pt-3">
                <div>
                  <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-400">
                    Kategoria (zmień, jeśli to inny typ ubrania)
                  </div>
                  <div className="no-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4">
                    {CATEGORY_ORDER.map((c) => (
                      <Chip key={c} active={c === category} onClick={() => chooseCategory(c)}>
                        {CATEGORY_EMOJIS[c]} {CATEGORY_LABELS[c]}
                      </Chip>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-400">
                    Dokładny fason
                  </div>
                  <div className="no-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4">
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
                </div>

                <div>
                  <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-400">
                    Wzór / Nadruk (rozpoznany automatycznie)
                  </div>
                  <div className="no-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4">
                    {PATTERNS.map((p) => (
                      <Chip key={p.id} active={pattern === p.id} onClick={() => setPattern(p.id)}>
                        {p.emoji} {p.label}
                      </Chip>
                    ))}
                  </div>
                </div>

                <div>
                  <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-400">
                    Kolor główny (dotknij zdjęcia powyżej lub wybierz z palety)
                  </div>
                  <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 py-0.5">
                    {PALETTE.map((p) => {
                      const active = p.name === colorName;
                      return (
                        <button
                          key={p.name}
                          type="button"
                          onClick={() => pickPaletteColor(p.name, p.hex)}
                          className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                            active
                              ? 'bg-white text-ink-950 font-semibold'
                              : 'bg-ink-800 text-ink-300'
                          }`}
                        >
                          <ColorDot hex={p.hex} size={11} />
                          {p.name}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-[11px] font-semibold uppercase tracking-wide text-ink-400">
                      Dodatkowe kolory (wielokolorowe / wzór – maks. 2)
                    </span>
                    {secondaryColors.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setSecondaryColors([]);
                          setSecondaryColorHexes([]);
                        }}
                        className="text-[11px] font-semibold text-accent-300"
                      >
                        Wyczyść
                      </button>
                    )}
                  </div>
                  <div className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 py-0.5">
                    {PALETTE.filter((p) => p.name !== colorName).map((p) => {
                      const active = secondaryColors.includes(p.name);
                      return (
                        <button
                          key={p.name}
                          type="button"
                          onClick={() => toggleSecondaryColor(p.name, p.hex)}
                          className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-colors ${
                            active
                              ? 'bg-accent-500 text-white font-semibold'
                              : 'bg-ink-800 text-ink-300'
                          }`}
                        >
                          <ColorDot hex={p.hex} size={11} />
                          {p.name}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <div className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-400">
                    Na jaką okazję chcesz to nosić?
                  </div>
                  <div className="no-scrollbar -mx-4 flex gap-1.5 overflow-x-auto px-4">
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
                </div>
              </div>
            </section>

            {/* 1. Główny werdykt zakupowy */}
            <section
              className={`rounded-3xl p-4 ring-1 ${
                report.verdictTone === 'great'
                  ? 'bg-emerald-950/40 ring-emerald-500/40'
                  : report.verdictTone === 'good'
                  ? 'bg-amber-950/35 ring-amber-500/40'
                  : 'bg-rose-950/40 ring-rose-500/40'
              }`}
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wide text-ink-300">
                    Werdykt doradcy zakupowego
                  </div>
                  <h2 className="mt-0.5 text-lg font-bold text-white">{report.verdictTitle}</h2>
                </div>
                <div
                  className={`flex h-14 w-14 shrink-0 flex-col items-center justify-center rounded-2xl font-bold ${
                    report.verdictTone === 'great'
                      ? 'bg-emerald-500/25 text-emerald-300'
                      : report.verdictTone === 'good'
                      ? 'bg-amber-500/25 text-amber-200'
                      : 'bg-rose-500/25 text-rose-300'
                  }`}
                >
                  <span className="text-lg leading-none">{report.overallScore}%</span>
                  <span className="mt-0.5 text-[9px] font-medium uppercase">Ocena</span>
                </div>
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2 text-center">
                <div className="rounded-2xl bg-ink-900/80 p-2.5">
                  <div className="text-sm font-bold text-white">
                    {report.personalEval.matchPercent}%
                  </div>
                  <div className="text-[10px] text-ink-400">Twoja uroda</div>
                </div>
                <div className="rounded-2xl bg-ink-900/80 p-2.5">
                  <div className="text-sm font-bold text-white">{report.wardrobeMatchPercent}%</div>
                  <div className="text-[10px] text-ink-400">Zgodność z szafą</div>
                </div>
                <div className="rounded-2xl bg-ink-900/80 p-2.5">
                  <div className="text-sm font-bold text-accent-300">{report.newOutfitsCount}</div>
                  <div className="text-[10px] text-ink-400">Nowych zestawów</div>
                </div>
              </div>

              {report.pros.length > 0 && (
                <ul className="mt-3 space-y-1.5 text-xs text-emerald-200">
                  {report.pros.map((p) => (
                    <li key={p} className="flex items-start gap-2">
                      <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-emerald-400" />
                      <span>{p}</span>
                    </li>
                  ))}
                </ul>
              )}

              {report.warnings.length > 0 && (
                <ul className="mt-2.5 space-y-1.5 text-xs text-amber-200">
                  {report.warnings.map((w) => (
                    <li key={w} className="flex items-start gap-2">
                      <AlertTriangle size={14} className="mt-0.5 shrink-0 text-amber-400" />
                      <span>{w}</span>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* 2. Analiza dopasowania do osobistej palety barw (Skóra, Włosy, Oczy) */}
            <section className="rounded-3xl bg-ink-900 p-4">
              <div className="mb-1 text-xs font-semibold uppercase tracking-wide text-accent-300">
                1. Dopasowanie do Twojej urody ({report.personalEval.season.emoji}{' '}
                {report.personalEval.season.name})
              </div>
              <h3 className="text-sm font-bold text-white">{report.personalEval.headline}</h3>
              <p className="mt-1.5 text-xs leading-relaxed text-ink-300">
                {report.personalEval.explanation}
              </p>
            </section>

            {/* 3. Szczegółowa analiza dopasowania do ubrań w szafie */}
            <section className="space-y-3 rounded-3xl bg-ink-900 p-4">
              <div>
                <div className="text-xs font-semibold uppercase tracking-wide text-accent-300">
                  2. Dopasowanie do rzeczy w Twojej szafie
                </div>
                <p className="mt-0.5 text-xs text-ink-400">
                  Sprawdziliśmy wszystkie ubrania w Twojej szafie, z którymi możesz założyć ten
                  element:
                </p>
              </div>

              {items.length === 0 ? (
                <div className="rounded-2xl bg-ink-800 p-4 text-center text-xs text-ink-300">
                  Twoja szafa jest obecnie pusta – dodaj ubrania lub załaduj szafę testową na
                  ekranie głównym, aby zobaczyć z czym połączysz ten zakup.
                </div>
              ) : (
                <div className="space-y-4">
                  {report.groups.map((g) => (
                    <div key={g.category} className="rounded-2xl bg-ink-800/70 p-3">
                      <div className="mb-2 flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-white">
                          {CATEGORY_EMOJIS[g.category]} {g.title}
                        </span>
                        <span
                          className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                            g.matchingItems.length > 0
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : 'bg-rose-500/20 text-rose-300'
                          }`}
                        >
                          Pasujące: {g.matchingItems.length} z {g.totalInWardrobe}
                        </span>
                      </div>

                      {g.matchingItems.length > 0 ? (
                        <div className="no-scrollbar -mx-1 flex gap-2.5 overflow-x-auto px-1 py-1">
                          {g.matchingItems.slice(0, 8).map(({ item, harmonyPercent }) => (
                            <div key={item.id} className="w-24 shrink-0">
                              <div className="relative aspect-square overflow-hidden rounded-xl bg-ink-900">
                                <ItemImage item={item} className="h-full w-full" />
                                <span className="absolute bottom-1 right-1 rounded-md bg-emerald-600/90 px-1.5 py-0.5 text-[10px] font-bold text-white">
                                  {harmonyPercent}%
                                </span>
                              </div>
                              <div className="mt-1 truncate text-[11px] font-medium text-white">
                                {item.subCategory}
                              </div>
                              <div className="flex items-center gap-1 text-[10px] text-ink-400">
                                <ColorDot hex={item.colorHex} size={8} />
                                <span className="truncate">{item.dominantColor}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="rounded-xl bg-rose-500/15 px-3 py-2 text-xs text-rose-200">
                          ⚠️ {g.missingWarning}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Przyciski akcji na dole */}
            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              <button
                type="button"
                onClick={handleSaveToWardrobe}
                disabled={savingToWardrobe}
                className="flex items-center justify-center gap-2 rounded-2xl bg-accent-500 py-3.5 text-sm font-bold text-white active:bg-accent-600 disabled:opacity-50"
              >
                {savingToWardrobe ? (
                  <Loader2 size={18} className="animate-spin" />
                ) : (
                  <Check size={18} />
                )}
                Kupuję! Dodaj od razu do mojej szafy
              </button>
              <button
                type="button"
                onClick={() => galleryRef.current?.click()}
                className="flex items-center justify-center gap-2 rounded-2xl bg-ink-800 py-3.5 text-sm font-semibold text-ink-200 active:bg-ink-700"
              >
                <ImagePlus size={18} /> Sprawdź inne ubranie z internetu
              </button>
            </div>
          </div>
        )}
      </div>

      <PersonalPaletteSheet
        open={paletteOpen}
        onClose={() => setPaletteOpen(false)}
        profile={profile}
        onChange={updateProfile}
      />
    </div>
  );
}
