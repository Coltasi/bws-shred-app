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
 * IndexedDB is not automatically permanent. What threatens it differs by
 * browser, and the difference matters enough that the UI reports it separately:
 *
 *   Chrome / Android  — no timer. Data is evicted only when the device runs
 *                       genuinely low on disk, and persistent storage exempts
 *                       the origin from even that. Installing the app makes the
 *                       persistence grant automatic.
 *   Safari / iOS      — seven days without a visit wipes all script-written
 *                       storage in a plain tab. Installing to the home screen
 *                       is the exemption.
 *
 * Either way the answer is the same: install it, and hold the persistence
 * grant. requestPersistence() asks for the grant; isStandalone() reports
 * whether it is installed.
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
 * Chrome and WebKit grant this silently based on engagement heuristics.
 * Chrome treats an installed PWA as sufficient on its own, so on Android this
 * usually flips to true the moment the app is installed. Firefox prompts.
 *
 * When granted, data is removed only if the user clears it deliberately.
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

/**
 * True on iOS/iPadOS, where every browser is WebKit underneath and the 7-day
 * eviction rule applies regardless of which browser icon was tapped. Used only
 * to decide which install instructions and which storage warning to show.
 *
 * iPadOS reports itself as a Mac, hence the touch-point check.
 */
export function isAppleMobile(): boolean {
  if (typeof navigator === "undefined") return false;
  const ua = navigator.userAgent;
  return /iPad|iPhone|iPod/.test(ua) ||
    (/Macintosh/.test(ua) && (navigator.maxTouchPoints ?? 0) > 1);
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
