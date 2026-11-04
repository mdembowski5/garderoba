import { Sparkles } from 'lucide-react';
import type { PersonalColorProfile } from '../types';
import {
  EYE_COLORS,
  HAIR_COLORS,
  SKIN_TONES,
  paletteHexByName,
  resolveColorSeason,
} from '../lib/personalColor';
import { BottomSheet, ColorDot } from './ui';

export default function PersonalPaletteSheet({
  open,
  onClose,
  profile,
  onChange,
}: {
  open: boolean;
  onClose: () => void;
  profile: PersonalColorProfile;
  onChange: (next: PersonalColorProfile) => void;
}) {
  const season = resolveColorSeason(profile);

  return (
    <BottomSheet
      open={open}
      onClose={onClose}
      title="Twoja paleta barw (Analiza urody)"
      footer={
        <button
          type="button"
          onClick={onClose}
          className="flex w-full items-center justify-center gap-2 rounded-2xl bg-accent-500 py-3 text-sm font-bold text-white active:bg-accent-600"
        >
          Gotowe – zapisz profil urody
        </button>
      }
    >
      <div className="space-y-5">
        {/* Wynik analizy kolorystycznej */}
        <div className="rounded-2xl bg-gradient-to-br from-accent-600/25 to-indigo-900/40 p-4 ring-1 ring-accent-400/30">
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="text-[11px] font-semibold uppercase tracking-wide text-accent-300">
                Twój wyznaczony typ urody
              </div>
              <div className="mt-0.5 text-xl font-bold text-white">
                {season.emoji} {season.name}{' '}
                <span className="text-sm font-normal text-ink-300">· {season.subtitle}</span>
              </div>
            </div>
          </div>
          <p className="mt-2 text-xs leading-relaxed text-ink-300">{season.description}</p>

          <div className="mt-3">
            <div className="mb-1.5 text-[11px] font-semibold text-emerald-300">
              🌟 Twoje najlepsze kolory (szczególnie blisko twarzy):
            </div>
            <div className="flex flex-wrap gap-1.5">
              {season.powerColors.map((name) => (
                <span
                  key={name}
                  className="inline-flex items-center gap-1.5 rounded-full bg-ink-900/90 px-2.5 py-1 text-[11px] font-medium text-white ring-1 ring-white/10"
                >
                  <ColorDot hex={paletteHexByName(name)} size={10} />
                  {name}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-3">
            <div className="mb-1.5 text-[11px] font-semibold text-amber-300">
              ⚠️ Kolory mniej korzystne bezpośrednio przy twarzy:
            </div>
            <div className="flex flex-wrap gap-1.5">
              {season.avoidNearFace.map((name) => (
                <span
                  key={name}
                  className="inline-flex items-center gap-1.5 rounded-full bg-ink-900/70 px-2.5 py-1 text-[11px] text-ink-300 ring-1 ring-white/10"
                >
                  <ColorDot hex={paletteHexByName(name)} size={10} />
                  {name}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Przełącznik aktywności przy losowaniu stroju */}
        <label className="flex items-center justify-between gap-3 rounded-2xl bg-ink-800 px-4 py-3">
          <span className="flex items-center gap-2 text-xs font-semibold sm:text-sm">
            <Sparkles size={16} className="shrink-0 text-accent-400" />
            Dobieraj codzienny strój pod moją paletę urody
          </span>
          <input
            type="checkbox"
            checked={profile.enabled}
            onChange={(e) => onChange({ ...profile, enabled: e.target.checked })}
            className="h-5 w-5 shrink-0 accent-violet-500"
          />
        </label>

        {/* 1. Odcień skóry */}
        <div>
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-400">
            1. Odcień i podton Twojej skóry
          </div>
          <div className="grid grid-cols-1 gap-2">
            {SKIN_TONES.map((s) => {
              const active = profile.skinTone === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => onChange({ ...profile, skinTone: s.id })}
                  className={`flex items-center gap-3 rounded-2xl p-2.5 text-left transition-colors ${
                    active
                      ? 'bg-accent-500/20 ring-2 ring-accent-400'
                      : 'bg-ink-800 active:bg-ink-700'
                  }`}
                >
                  <span
                    className="h-9 w-9 shrink-0 rounded-full ring-2 ring-white/25"
                    style={{ backgroundColor: s.swatchHex }}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-semibold text-white sm:text-sm">{s.label}</div>
                    <div className="truncate text-[11px] text-ink-400">{s.hint}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. Kolor włosów */}
        <div>
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-400">
            2. Kolor Twoich włosów
          </div>
          <div className="grid grid-cols-1 gap-2">
            {HAIR_COLORS.map((h) => {
              const active = profile.hairColor === h.id;
              return (
                <button
                  key={h.id}
                  type="button"
                  onClick={() => onChange({ ...profile, hairColor: h.id })}
                  className={`flex items-center gap-3 rounded-2xl p-2.5 text-left transition-colors ${
                    active
                      ? 'bg-accent-500/20 ring-2 ring-accent-400'
                      : 'bg-ink-800 active:bg-ink-700'
                  }`}
                >
                  <span
                    className="h-9 w-9 shrink-0 rounded-full ring-2 ring-white/25"
                    style={{ backgroundColor: h.swatchHex }}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-semibold text-white sm:text-sm">{h.label}</div>
                    <div className="truncate text-[11px] text-ink-400">{h.hint}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* 3. Kolor oczu */}
        <div>
          <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-ink-400">
            3. Kolor Twoich oczu
          </div>
          <div className="grid grid-cols-2 gap-2">
            {EYE_COLORS.map((e) => {
              const active = profile.eyeColor === e.id;
              return (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => onChange({ ...profile, eyeColor: e.id })}
                  className={`flex items-center gap-2.5 rounded-2xl p-2.5 text-left transition-colors ${
                    active
                      ? 'bg-accent-500/20 ring-2 ring-accent-400'
                      : 'bg-ink-800 active:bg-ink-700'
                  }`}
                >
                  <span
                    className="h-7 w-7 shrink-0 rounded-full ring-2 ring-white/25"
                    style={{ backgroundColor: e.swatchHex }}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xs font-semibold text-white">{e.label}</div>
                    <div className="truncate text-[10px] text-ink-400">{e.hint}</div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </BottomSheet>
  );
}
