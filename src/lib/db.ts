import Dexie, { type Table } from 'dexie';
import type { ClothingItem, NewClothingItem, Occasion, Outfit, SavedOutfit } from '../types';
import { defaultOccasions } from './constants';

class WardrobeDB extends Dexie {
  items!: Table<ClothingItem, string>;
  outfits!: Table<SavedOutfit, string>;

  constructor() {
    super('garderoba-db');
    this.version(1).stores({
      items: 'id, category, brightnessType, createdAt',
      outfits: 'id, acceptedAt',
    });
    this.version(2)
      .stores({
        items: 'id, category, brightnessType, createdAt',
        outfits: 'id, acceptedAt',
      })
      .upgrade((tx) =>
        tx
          .table('items')
          .toCollection()
          .modify((item: ClothingItem) => {
            if (!Array.isArray(item.occasions)) {
              item.occasions = defaultOccasions(item.category, item.subCategory);
            }
          })
      );
  }
}

export const db = new WardrobeDB();

export function newId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const h = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

export async function addItem(data: NewClothingItem): Promise<ClothingItem> {
  let imageDataUrl = data.imageDataUrl;
  if (!imageDataUrl && data.imageBlob) {
    imageDataUrl = await blobToDataUrl(data.imageBlob);
  }
  const item: ClothingItem = {
    id: newId(),
    imageDataUrl,
    category: data.category,
    subCategory: data.subCategory,
    tempRange: data.tempRange,
    isRainproof: Boolean(data.isRainproof),
    dominantColor: data.dominantColor,
    colorHex: data.colorHex,
    secondaryColors: data.secondaryColors ? [...data.secondaryColors] : [],
    secondaryColorHexes: data.secondaryColorHexes ? [...data.secondaryColorHexes] : [],
    pattern: data.pattern ?? 'solid',
    brightnessType: data.brightnessType,
    occasions: data.occasions?.length ? [...data.occasions] : ['casual'],
    createdAt: Date.now(),
    wearCount: 0,
    inLaundry: false,
    isFavorite: false,
  };
  await db.items.add(item);
  return item;
}

export function deleteItem(id: string): Promise<void> {
  return db.items.delete(id);
}

export async function updateItem(id: string, patch: Partial<ClothingItem>): Promise<number> {
  const existing = await db.items.get(id);
  if (!existing) return 0;
  let imageDataUrl = patch.imageDataUrl ?? existing.imageDataUrl;
  if (!imageDataUrl && existing.imageBlob) {
    try {
      imageDataUrl = await blobToDataUrl(existing.imageBlob);
    } catch {
      imageDataUrl = undefined;
    }
  }
  const updated: ClothingItem = {
    ...existing,
    ...patch,
    id: existing.id,
    imageDataUrl,
  };
  delete updated.imageBlob;
  await db.items.put(updated);
  return 1;
}

export function outfitItemIds(outfit: Outfit): string[] {
  return [
    outfit.top?.id,
    outfit.bottom?.id,
    outfit.onepiece?.id,
    outfit.shoes?.id,
    outfit.outerwear?.id,
    outfit.bag?.id,
    ...outfit.accessories.map((a) => a.id),
  ].filter((x): x is string => Boolean(x));
}

/** Zapisuje zaakceptowany strój, zwiększa licznik założeń i oznacza ubrania jako niedawno noszone. */
export async function acceptOutfit(
  outfit: Outfit,
  apparentTemperature: number,
  occasion?: Occasion
): Promise<void> {
  const ids = outfitItemIds(outfit);
  const now = Date.now();
  await db.transaction('rw', db.items, db.outfits, async () => {
    await db.outfits.add({
      id: newId(),
      itemIds: ids,
      acceptedAt: now,
      apparentTemperature,
      occasion,
      score: outfit.score,
      isFavorite: false,
    });
    for (const id of ids) {
      const existing = await db.items.get(id);
      if (!existing) continue;
      const updated: ClothingItem = {
        ...existing,
        lastWornAt: now,
        wearCount: (existing.wearCount ?? 0) + 1,
      };
      delete updated.imageBlob;
      await db.items.put(updated);
    }
  });
}

/** Zapisuje stylizację jako ulubioną. */
export async function saveFavoriteOutfit(
  outfit: Outfit,
  apparentTemperature: number,
  occasion?: Occasion
): Promise<void> {
  const ids = outfitItemIds(outfit);
  await db.outfits.add({
    id: newId(),
    itemIds: ids,
    acceptedAt: Date.now(),
    apparentTemperature,
    occasion,
    score: outfit.score,
    isFavorite: true,
  });
}

export function deleteSavedOutfit(id: string): Promise<void> {
  return db.outfits.delete(id);
}

export function toggleSavedOutfitFavorite(id: string, isFavorite: boolean): Promise<number> {
  return db.outfits.update(id, { isFavorite });
}

/** Oznacza wszystkie ubrania z kosza na pranie jako czyste. */
export async function clearLaundry(): Promise<void> {
  const all = await db.items.toArray();
  const dirty = all.filter((i) => i.inLaundry);
  if (dirty.length === 0) return;
  const cleaned = dirty.map((item) => {
    const copy: ClothingItem = { ...item, inLaundry: false };
    delete copy.imageBlob;
    return copy;
  });
  await db.items.bulkPut(cleaned);
}

// ---- Eksport / Import kopii zapasowej (JSON + Base64) ----

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Błąd odczytu zdjęcia'));
    reader.readAsDataURL(blob);
  });
}

export interface WardrobeBackupFile {
  version: 1;
  exportedAt: number;
  items: (Omit<ClothingItem, 'imageBlob'> & { imageDataUrl: string })[];
  outfits: SavedOutfit[];
}

export async function exportWardrobeBackup(): Promise<string> {
  const [items, outfits] = await Promise.all([db.items.toArray(), db.outfits.toArray()]);
  const serializedItems = await Promise.all(
    items.map(async ({ imageBlob, imageDataUrl, ...rest }) => ({
      ...rest,
      imageDataUrl: imageDataUrl ?? (imageBlob ? await blobToDataUrl(imageBlob) : ''),
    }))
  );
  const payload: WardrobeBackupFile = {
    version: 1,
    exportedAt: Date.now(),
    items: serializedItems,
    outfits,
  };
  return JSON.stringify(payload);
}

export async function importWardrobeBackup(json: string): Promise<number> {
  const parsed = JSON.parse(json) as WardrobeBackupFile;
  if (!parsed || !Array.isArray(parsed.items)) {
    throw new Error('Nieprawidłowy plik kopii zapasowej.');
  }
  const restoredItems: ClothingItem[] = parsed.items.map(({ imageDataUrl, ...rest }) => ({
    ...rest,
    imageDataUrl,
  }));
  await db.transaction('rw', db.items, db.outfits, async () => {
    await db.items.bulkPut(restoredItems);
    if (Array.isArray(parsed.outfits)) {
      await db.outfits.bulkPut(parsed.outfits);
    }
  });
  return restoredItems.length;
}

/** Prosi przeglądarkę o trwały magazyn (ogranicza ryzyko wyczyszczenia danych przez iOS). */
export async function requestPersistentStorage(): Promise<void> {
  try {
    await navigator.storage?.persist?.();
  } catch {
    /* ignoruj */
  }
}
