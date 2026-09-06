/**
 * Minimal IndexedDB wrapper. No dependency, no ORM — this app stores a handful
 * of small JSON blobs and does not need 40kB of library to do it.
 *
 * Why IndexedDB at all, when localStorage worked?
 *   1. localStorage is capped at ~5MB and fails *silently* when full. A few
 *      years of daily logs plus workout history will get there.
 *   2. IndexedDB gets a share of actual disk (~60% on WebKit once persistence
 *      is granted), so it will not be the thing that breaks.
 *   3. It's async, so large writes don't block the main thread mid-workout.
 *
 * IndexedDB does NOT on its own survive Safari's 7-day eviction. That's what
 * requestPersistence() and installing to the home screen are for.
 */

const DB_NAME = "bws-shred";
const DB_VERSION = 1;
const STORE = "kv";

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") {
    return Promise.reject(new Error("IndexedDB unavailable"));
  }
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    req.onblocked = () => reject(new Error("IndexedDB upgrade blocked by another tab"));
  });
  return dbPromise;
}

export async function idbGet<T>(key: string): Promise<T | undefined> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const req = tx.objectStore(STORE).get(key);
    req.onsuccess = () => resolve(req.result as T | undefined);
    req.onerror = () => reject(req.error);
  });
}

export async function idbSet(key: string, value: unknown): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
    tx.onabort = () => reject(tx.error);
  });
}

export async function idbDelete(key: string): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    tx.objectStore(STORE).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function idbGetAll(): Promise<Record<string, unknown>> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const store = tx.objectStore(STORE);
    const out: Record<string, unknown> = {};
    const req = store.openCursor();
    req.onsuccess = () => {
      const cursor = req.result;
      if (cursor) {
        out[String(cursor.key)] = cursor.value;
        cursor.continue();
      } else {
        resolve(out);
      }
    };
    req.onerror = () => reject(req.error);
  });
}

// ── Persistence ────────────────────────────────────────────────────────────

export interface PersistenceStatus {
  persisted: boolean;
  /** Bytes used / available, when the browser reports them. */
  usage?: number;
  quota?: number;
  /** True when running as an installed home-screen app. */
  standalone: boolean;
  supported: boolean;
}

/**
 * Ask the browser to mark this origin's storage as persistent.
 *
 * Chrome and WebKit grant this silently based on engagement heuristics
 * (installed app, bookmarked, frequent visits). Firefox prompts. When granted,
 * data is only removed if the user explicitly clears it — which is the whole
 * point, because Safari otherwise deletes all script-written storage after
 * 7 days without interaction.
 *
 * Installing to the home screen is the more reliable protection on iOS, so the
 * UI nags about that separately.
 */
export async function requestPersistence(): Promise<PersistenceStatus> {
  const standalone = isStandalone();
  if (typeof navigator === "undefined" || !navigator.storage) {
    return { persisted: false, standalone, supported: false };
  }
  let persisted = false;
  try {
    persisted = (await navigator.storage.persisted?.()) ?? false;
    if (!persisted && navigator.storage.persist) {
      persisted = await navigator.storage.persist();
    }
  } catch {
    // Some embedded webviews throw on these. Not fatal.
  }
  let usage: number | undefined, quota: number | undefined;
  try {
    const est = await navigator.storage.estimate?.();
    usage = est?.usage; quota = est?.quota;
  } catch { /* ignore */ }

  return { persisted, usage, quota, standalone, supported: true };
}

export function isStandalone(): boolean {
  if (typeof window === "undefined") return false;
  const iosStandalone = (window.navigator as unknown as { standalone?: boolean }).standalone;
  return Boolean(
    iosStandalone ||
    window.matchMedia?.("(display-mode: standalone)").matches ||
    window.matchMedia?.("(display-mode: fullscreen)").matches,
  );
}
