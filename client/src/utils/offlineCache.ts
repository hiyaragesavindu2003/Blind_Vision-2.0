import type { FavoriteLocation } from "@/types";
import type { NavigationRoute } from "@shared/types";

const ROUTE_KEY = "ai-nav:lastRoute";
const PREFETCH_AUDIO_KEY = "ai-nav:audioCache";

/**
 * Saves the most recent route to localStorage so the app can fall back when
 * offline. Note: cached routes are best-effort and may be stale.
 */
export const saveLastRoute = (route: NavigationRoute | null): void => {
  try {
    if (route) {
      localStorage.setItem(ROUTE_KEY, JSON.stringify(route));
    } else {
      localStorage.removeItem(ROUTE_KEY);
    }
  } catch {
    // localStorage may be unavailable (private mode, quota); ignore.
  }
};

export const loadLastRoute = (): NavigationRoute | null => {
  try {
    const raw = localStorage.getItem(ROUTE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as NavigationRoute;
  } catch {
    return null;
  }
};

interface AudioCacheEntry {
  text: string;
  blobBase64: string;
  mimeType: string;
}

/**
 * Saves a prefetched ElevenLabs audio clip to localStorage as base64. Used
 * for the few highest-priority phrases so the app remains useful while offline.
 */
export const cacheAudio = async (text: string, blob: Blob): Promise<void> => {
  try {
    const buffer = await blob.arrayBuffer();
    const bytes = new Uint8Array(buffer);
    let bin = "";
    for (let i = 0; i < bytes.byteLength; i += 1) {
      bin += String.fromCharCode(bytes[i]);
    }
    const blobBase64 = btoa(bin);

    const raw = localStorage.getItem(PREFETCH_AUDIO_KEY);
    const list: AudioCacheEntry[] = raw ? JSON.parse(raw) : [];
    const existing = list.findIndex((e) => e.text === text);
    const entry: AudioCacheEntry = {
      text,
      blobBase64,
      mimeType: blob.type || "audio/mpeg",
    };
    if (existing >= 0) list[existing] = entry;
    else list.push(entry);

    while (list.length > 5) list.shift();
    localStorage.setItem(PREFETCH_AUDIO_KEY, JSON.stringify(list));
  } catch {
    // ignore quota / serialization errors
  }
};

export const getCachedAudio = (text: string): Blob | null => {
  try {
    const raw = localStorage.getItem(PREFETCH_AUDIO_KEY);
    if (!raw) return null;
    const list: AudioCacheEntry[] = JSON.parse(raw);
    const found = list.find((e) => e.text === text);
    if (!found) return null;
    const bin = atob(found.blobBase64);
    const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i += 1) bytes[i] = bin.charCodeAt(i);
    return new Blob([bytes], { type: found.mimeType });
  } catch {
    return null;
  }
};

// ----- Favorites (IndexedDB) -----

const DB_NAME = "ai-nav-db";
const DB_VERSION = 1;
const FAVORITES_STORE = "favorites";

const openDb = (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(FAVORITES_STORE)) {
        const store = db.createObjectStore(FAVORITES_STORE, {
          keyPath: "id",
        });
        store.createIndex("name", "name", { unique: false });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

export const listFavorites = async (): Promise<FavoriteLocation[]> => {
  try {
    const db = await openDb();
    return await new Promise((resolve, reject) => {
      const tx = db.transaction(FAVORITES_STORE, "readonly");
      const store = tx.objectStore(FAVORITES_STORE);
      const req = store.getAll();
      req.onsuccess = () =>
        resolve((req.result as FavoriteLocation[]) ?? []);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return [];
  }
};

export const saveFavorite = async (
  fav: FavoriteLocation,
): Promise<void> => {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(FAVORITES_STORE, "readwrite");
      tx.objectStore(FAVORITES_STORE).put(fav);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // ignore
  }
};

export const deleteFavorite = async (id: string): Promise<void> => {
  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(FAVORITES_STORE, "readwrite");
      tx.objectStore(FAVORITES_STORE).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch {
    // ignore
  }
};

export const findFavoriteByName = async (
  name: string,
): Promise<FavoriteLocation | null> => {
  const all = await listFavorites();
  const lower = name.trim().toLowerCase();
  return (
    all.find((f) => f.name.toLowerCase() === lower) ??
    all.find((f) => f.name.toLowerCase().includes(lower)) ??
    null
  );
};
