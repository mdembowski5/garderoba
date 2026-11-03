import type { Place, TempRange, WeatherData, WeatherKind } from '../types';

const FORECAST_URL = 'https://api.open-meteo.com/v1/forecast';
const GEOCODE_URL = 'https://geocoding-api.open-meteo.com/v1/search';
const REVERSE_URL = 'https://api.bigdatacloud.net/data/reverse-geocode-client';

export const DEFAULT_PLACE: Place = {
  name: 'Warszawa',
  latitude: 52.2297,
  longitude: 21.0122,
  source: 'default',
};

export const POPULAR_PLACES: Place[] = [
  DEFAULT_PLACE,
  { name: 'Kraków', latitude: 50.0647, longitude: 19.945, source: 'manual' },
  { name: 'Gdańsk', latitude: 54.352, longitude: 18.6466, source: 'manual' },
  { name: 'Wrocław', latitude: 51.1079, longitude: 17.0385, source: 'manual' },
  { name: 'Poznań', latitude: 52.4064, longitude: 16.9252, source: 'manual' },
].map((p) => ({ ...p, source: 'manual' as const }));

export async function fetchWeather(lat: number, lon: number, signal?: AbortSignal): Promise<WeatherData> {
  const url =
    `${FORECAST_URL}?latitude=${lat}&longitude=${lon}` +
    `&current=temperature_2m,apparent_temperature,precipitation,weather_code,is_day&timezone=auto`;
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`Open-Meteo: HTTP ${res.status}`);
  const json = await res.json();
  const c = json.current;
  if (!c) throw new Error('Open-Meteo: brak danych bieżących');
  return {
    temperature: c.temperature_2m,
    apparentTemperature: c.apparent_temperature,
    precipitation: c.precipitation ?? 0,
    weatherCode: c.weather_code,
    isDay: c.is_day === 1,
    fetchedAt: Date.now(),
  };
}

export async function reverseGeocode(lat: number, lon: number): Promise<string | null> {
  try {
    const res = await fetch(`${REVERSE_URL}?latitude=${lat}&longitude=${lon}&localityLanguage=pl`);
    if (!res.ok) return null;
    const j = await res.json();
    return j.city || j.locality || j.principalSubdivision || null;
  } catch {
    return null;
  }
}

export async function searchPlaces(query: string, signal?: AbortSignal): Promise<Place[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const res = await fetch(`${GEOCODE_URL}?name=${encodeURIComponent(q)}&count=6&language=pl&format=json`, { signal });
  if (!res.ok) return [];
  const j = await res.json();
  return (j.results ?? []).map((r: any) => ({
    name: r.admin1 && r.admin1 !== r.name ? `${r.name}, ${r.admin1}` : r.name,
    latitude: r.latitude,
    longitude: r.longitude,
    source: 'manual' as const,
  }));
}

export function getPosition(): Promise<GeolocationPosition | null> {
  return new Promise((resolve) => {
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (p) => resolve(p),
      () => resolve(null),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 10 * 60 * 1000 }
    );
  });
}

// ---- Mapowanie warunków ----

export function weatherKind(code: number): WeatherKind {
  if (code === 0 || code === 1) return 'clear';
  if (code === 2) return 'partly';
  if (code === 3) return 'cloudy';
  if (code === 45 || code === 48) return 'fog';
  if (code >= 51 && code <= 57) return 'drizzle';
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82)) return 'rain';
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'snow';
  if (code >= 95) return 'storm';
  return 'cloudy';
}

const KIND_LABELS: Record<WeatherKind, string> = {
  clear: 'Bezchmurnie',
  partly: 'Częściowe zachmurzenie',
  cloudy: 'Pochmurno',
  fog: 'Mgła',
  drizzle: 'Mżawka',
  rain: 'Deszcz',
  snow: 'Śnieg',
  storm: 'Burza',
};

export function weatherLabel(code: number, isDay = true): string {
  const kind = weatherKind(code);
  if (kind === 'clear' && !isDay) return 'Bezchmurna noc';
  return KIND_LABELS[kind];
}

/** Opady, mżawka, deszcz, burza (a także śnieg) → priorytet dla rzeczy z flagą isRainproof. */
export function isWet(w: WeatherData): boolean {
  if (w.precipitation > 0) return true;
  const k = weatherKind(w.weatherCode);
  return k === 'drizzle' || k === 'rain' || k === 'storm' || k === 'snow';
}

/** Bezchmurny dzień → okulary przeciwsłoneczne. */
export function isSunny(w: WeatherData): boolean {
  return w.isDay && weatherKind(w.weatherCode) === 'clear' && w.precipitation === 0;
}

/** Przedziały: hot > 22°C, mild 15–22°C, cool 8–15°C, cold < 8°C (temperatura odczuwalna). */
export function tempRangeFor(apparent: number): TempRange {
  if (apparent > 22) return 'hot';
  if (apparent >= 15) return 'mild';
  if (apparent >= 8) return 'cool';
  return 'cold';
}
