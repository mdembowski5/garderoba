import { useState } from 'react';
import { CloudOff, Droplets, MapPin, RefreshCw, Thermometer } from 'lucide-react';
import type { WeatherState } from '../hooks/useWeather';
import { weatherLabel } from '../lib/weather';
import { WeatherIcon } from './ui';
import CitySheet from './CitySheet';

export default function WeatherCard({ state }: { state: WeatherState }) {
  const { weather, place, status, stale, refresh } = state;
  const [cityOpen, setCityOpen] = useState(false);

  return (
    <section className="rounded-3xl bg-gradient-to-br from-indigo-600/90 to-violet-800/90 p-5 shadow-lg">
      <div className="flex items-center justify-between">
        <button
          onClick={() => setCityOpen(true)}
          className="flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-sm font-semibold"
        >
          <MapPin size={15} />
          {place?.name ?? 'Wybierz miasto'}
        </button>
        <button
          onClick={refresh}
          aria-label="Odśwież pogodę"
          className="rounded-full bg-white/15 p-2 active:bg-white/25"
        >
          <RefreshCw size={16} className={status === 'loading' ? 'animate-spin' : ''} />
        </button>
      </div>

      {weather ? (
        <div className="mt-4 flex items-center justify-between">
          <div>
            <div className="text-6xl font-light leading-none tracking-tight">
              {Math.round(weather.temperature)}°
            </div>
            <div className="mt-2 text-sm text-white/85">{weatherLabel(weather.weatherCode, weather.isDay)}</div>
          </div>
          <WeatherIcon code={weather.weatherCode} isDay={weather.isDay} size={72} className="text-white" />
        </div>
      ) : status === 'error' ? (
        <div className="mt-6 text-sm text-white/90">Nie udało się pobrać pogody. Sprawdź połączenie i spróbuj ponownie.</div>
      ) : (
        <div className="mt-4 h-[84px] animate-pulse rounded-2xl bg-white/10" />
      )}

      {weather && (
        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-white/85">
          <span className="flex items-center gap-1">
            <Thermometer size={14} /> Odczuwalna {Math.round(weather.apparentTemperature)}°
          </span>
          <span className="flex items-center gap-1">
            <Droplets size={14} /> Opady {weather.precipitation} mm
          </span>
          {stale && (
            <span className="flex items-center gap-1 text-amber-200">
              <CloudOff size={14} /> dane offline
            </span>
          )}
        </div>
      )}

      <CitySheet
        open={cityOpen}
        onClose={() => setCityOpen(false)}
        onPick={(p) => {
          setCityOpen(false);
          state.chooseCity(p);
        }}
        onUseLocation={() => {
          setCityOpen(false);
          state.useMyLocation();
        }}
      />
    </section>
  );
}
