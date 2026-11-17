import type { Outfit, WeatherData } from '../types';
import { weatherLabel } from './weather';

const NOTIF_SETTINGS_KEY = 'garderoba.notifications.v1';

export interface NotificationSettings {
  enabled: boolean;
  morningHour: number; // np. 7 (7:00) lub 8 (8:00)
  lastSentDate?: string; // YYYY-MM-DD
}

export function loadNotificationSettings(): NotificationSettings {
  try {
    const raw = localStorage.getItem(NOTIF_SETTINGS_KEY);
    if (!raw) return { enabled: false, morningHour: 7 };
    const parsed = JSON.parse(raw) as Partial<NotificationSettings>;
    return {
      enabled: Boolean(parsed.enabled),
      morningHour: typeof parsed.morningHour === 'number' ? parsed.morningHour : 7,
      lastSentDate: parsed.lastSentDate,
    };
  } catch {
    return { enabled: false, morningHour: 7 };
  }
}

export function saveNotificationSettings(settings: NotificationSettings): void {
  try {
    localStorage.setItem(NOTIF_SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // ignore
  }
}

export async function requestMorningNotificationPermission(): Promise<boolean> {
  if (typeof window === 'undefined' || !('Notification' in window)) {
    return false;
  }
  if (Notification.permission === 'granted') {
    return true;
  }
  const result = await Notification.requestPermission();
  return result === 'granted';
}

export function sendOutfitNotificationNow(
  outfit: Outfit | null,
  weather: WeatherData | null,
  placeName = 'Twojej okolicy'
): boolean {
  if (typeof window === 'undefined' || !('Notification' in window)) return false;
  if (Notification.permission !== 'granted') return false;

  const tempStr = weather
    ? `${Math.round(weather.apparentTemperature)}°C (${weatherLabel(
        weather.weatherCode,
        weather.isDay
      ).toLowerCase()})`
    : 'sprawdź pogodę';

  const pieces = outfit
    ? [
        outfit.onepiece?.subCategory,
        outfit.top?.subCategory,
        outfit.midLayer?.subCategory,
        outfit.bottom?.subCategory,
        outfit.outerwear?.subCategory,
      ]
        .filter(Boolean)
        .join(' + ')
    : 'Twój zestaw dnia czeka w aplikacji';

  const title = `🌤️ Garderoba: ${tempStr} w ${placeName}`;
  const body = outfit
    ? `Propozycja na dziś (Harmonia ${outfit.score}%): ${pieces}.`
    : pieces;

  try {
    if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
      void navigator.serviceWorker.ready.then((reg) =>
        reg.showNotification(title, {
          body,
          icon: '/icon.svg',
          badge: '/icon.svg',
        })
      );
    } else {
      new Notification(title, { body, icon: '/icon.svg' });
    }
    return true;
  } catch {
    return false;
  }
}

/**
 * Sprawdza, czy nadeszła pora porannego powiadomienia w danym dniu i wysyła je maksymalnie raz dziennie.
 */
export function checkAndTriggerMorningNotification(
  outfit: Outfit | null,
  weather: WeatherData | null,
  placeName?: string
): void {
  const settings = loadNotificationSettings();
  if (!settings.enabled || !outfit || !weather) return;

  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  if (settings.lastSentDate === todayStr) return;

  if (now.getHours() >= settings.morningHour) {
    const sent = sendOutfitNotificationNow(outfit, weather, placeName);
    if (sent) {
      saveNotificationSettings({ ...settings, lastSentDate: todayStr });
    }
  }
}
