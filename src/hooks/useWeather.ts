import { useCallback, useEffect, useRef, useState } from 'react';
import type { Place, WeatherData } from '../types';
import { DEFAULT_PLACE, fetchWeather, getPosition, reverseGeocode } from '../lib/weather';

const PLACE_KEY = 'garderoba.place';
const WEATHER_KEY = 'garderoba.weather';
const REFRESH_AFTER_MS = 30 * 60 * 1000;

interface CachedWeather {
  weather: WeatherData;
  place: Place;
}

function readJSON<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeJSON(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* pełny/niedostępny localStorage */
  }
}

export type WeatherStatus = 'loading' | 'ready' | 'error';

export interface WeatherState {
  weather: WeatherData | null;
  place: Place | null;
  status: WeatherStatus;
  /** true, gdy pokazujemy dane z pamięci podręcznej (brak sieci). */
  stale: boolean;
  refresh: () => void;
  chooseCity: (place: Place) => void;
  useMyLocation: () => void;
}

export function useWeather(): WeatherState {
  const cached = useRef(readJSON<CachedWeather>(WEATHER_KEY));
  const [weather, setWeather] = useState<WeatherData | null>(cached.current?.weather ?? null);
  const [place, setPlace] = useState<Place | null>(cached.current?.place ?? null);
  const [status, setStatus] = useState<WeatherStatus>(cached.current ? 'ready' : 'loading');
  const [stale, setStale] = useState(false);
  const requestId = useRef(0);

  const load = useCallback(async (mode: 'auto' | Place) => {
    const id = ++requestId.current;
    setStatus((s) => (s === 'ready' ? s : 'loading'));

    let target: Place;
    if (mode !== 'auto') {
      target = mode;
      writeJSON(PLACE_KEY, mode);
    } else {
      const saved = readJSON<Place>(PLACE_KEY);
      if (saved && saved.source === 'manual') {
        target = saved;
      } else {
        const pos = await getPosition();
        if (pos) {
          const { latitude, longitude } = pos.coords;
          const name = (await reverseGeocode(latitude, longitude)) ?? 'Twoja lokalizacja';
          target = { name, latitude, longitude, source: 'gps' };
        } else {
          target = DEFAULT_PLACE; // fallback, gdy brak zgody / błąd GPS
        }
      }
    }

    try {
      const w = await fetchWeather(target.latitude, target.longitude);
      if (id !== requestId.current) return;
      setWeather(w);
      setPlace(target);
      setStale(false);
      setStatus('ready');
      writeJSON(WEATHER_KEY, { weather: w, place: target } satisfies CachedWeather);
    } catch {
      if (id !== requestId.current) return;
      const c = readJSON<CachedWeather>(WEATHER_KEY);
      if (c) {
        setWeather(c.weather);
        setPlace(c.place);
        setStale(true);
        setStatus('ready');
      } else {
        setPlace(target);
        setStatus('error');
      }
    }
  }, []);

  useEffect(() => {
    load('auto');
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      const c = readJSON<CachedWeather>(WEATHER_KEY);
      if (!c || Date.now() - c.weather.fetchedAt > REFRESH_AFTER_MS) load('auto');
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [load]);

  return {
    weather,
    place,
    status,
    stale,
    refresh: () => load(place && place.source === 'manual' ? place : 'auto'),
    chooseCity: (p) => load({ ...p, source: 'manual' }),
    useMyLocation: () => {
      try {
        localStorage.removeItem(PLACE_KEY);
      } catch {
        /* ignoruj */
      }
      load('auto');
    },
  };
}
