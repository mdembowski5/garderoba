import Dexie, { type Table } from 'dexie';
import type { ClothingItem, NewClothingItem, Outfit, SavedOutfit } from '../types';
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
    // v2: dodano pole `occasions` – starym ubraniom przypisujemy okazje na podstawie rodzaju.
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
  const item: ClothingItem = { ...data, id: newId(), createdAt: Date.now() };
  await db.items.add(item);
  return item;
}

export function deleteItem(id: string): Promise<void> {
  return db.items.delete(id);
}

export function updateItem(id: string, patch: Partial<ClothingItem>): Promise<number> {
  return db.items.update(id, patch);
}

/** Zapisuje zaakceptowany strój i oznacza ubrania jako niedawno noszone. */
export async function acceptOutfit(outfit: Outfit, apparentTemperature: number): Promise<void> {
  const ids = [
    outfit.top?.id,
    outfit.bottom?.id,
    outfit.onepiece?.id,
    outfit.shoes?.id,
    outfit.outerwear?.id,
    outfit.bag?.id,
    ...outfit.accessories.map((a) => a.id),
  ].filter((x): x is string => Boolean(x));
  const now = Date.now();
  await db.transaction('rw', db.items, db.outfits, async () => {
    await db.outfits.add({ id: newId(), itemIds: ids, acceptedAt: now, apparentTemperature });
    await db.items.where('id').anyOf(ids).modify({ lastWornAt: now });
  });
}

/** Prosi przeglądarkę o trwały magazyn (ogranicza ryzyko wyczyszczenia danych przez iOS). */
export async function requestPersistentStorage(): Promise<void> {
  try {
    await navigator.storage?.persist?.();
  } catch {
    /* ignoruj */
  }
}
