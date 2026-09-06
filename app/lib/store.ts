"use client";

import { idbGet, idbGetAll, idbSet, requestPersistence, type PersistenceStatus } from "./db";

/**
 * A synchronous key/value facade backed by IndexedDB.
 *
 * The existing components (WorkoutTab, TodayTab, ProgressTab) were written
 * against localStorage's synchronous API. Rewriting ~2000 lines of working
 * component logic to be async would be a large, bug-prone change for no user
 * benefit, so instead this module keeps an in-memory mirror that is:
 *
 *   - hydrated from IndexedDB once at boot (before the UI renders data),
 *   - read synchronously by components exactly as localStorage was,
 *   - written synchronously to memory, then flushed to IndexedDB (debounced)
 *     and mirrored to localStorage as a secondary copy.
 *
 * The localStorage mirror is deliberate belt-and-braces: it costs nothing while
 * the data is small, and it means a user whose IndexedDB gets wiped (or who
 * opens the app in a context where IDB throws, which some iOS webviews do)
 * still has their data. Writes that exceed the localStorage quota are caught
 * and ignored rather than throwing — IndexedDB is the source of truth.
 */

const LEGACY_MIGRATED_FLAG = "bws-idb-migrated";
const FLUSH_DEBOUNCE_MS = 400;

type Listener = () => void;

let memory = new Map<string, string>();
let hydrated = false;
let hydrating: Promise<void> | null = null;
let flushTimer: ReturnType<typeof setTimeout> | null = null;
const dirty = new Set<string>();
const listeners = new Set<Listener>();

export const isHydrated = () => hydrated;

export function subscribe(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function notify() {
  for (const fn of listeners) {
    try { fn(); } catch { /* a bad subscriber must not break a save */ }
  }
}

// ── Read/write API (localStorage-shaped) ───────────────────────────────────

export function getItem(key: string): string | null {
  if (memory.has(key)) return memory.get(key) ?? null;
  // Pre-hydration reads fall through to localStorage so first paint isn't blank.
  if (!hydrated && typeof localStorage !== "undefined") {
    try { return localStorage.getItem(key); } catch { return null; }
  }
  return null;
}

export function setItem(key: string, value: string): void {
  memory.set(key, value);
  dirty.add(key);
  mirrorToLocalStorage(key, value);
  scheduleFlush();
  notify();
}

export function removeItem(key: string): void {
  memory.delete(key);
  dirty.add(key);
  try { localStorage?.removeItem(key); } catch { /* ignore */ }
  scheduleFlush();
  notify();
}

export function getJSON<T>(key: string, fallback: T): T {
  const raw = getItem(key);
  if (raw == null) return fallback;
  try { return JSON.parse(raw) as T; } catch { return fallback; }
}

export function setJSON(key: string, value: unknown): void {
  setItem(key, JSON.stringify(value));
}

export function allKeys(): string[] {
  return [...memory.keys()];
}

export function snapshot(): Record<string, string> {
  return Object.fromEntries(memory);
}

/** Replaces the whole store. Used by import and by pulling a newer cloud snapshot. */
export function replaceAll(data: Record<string, string>): void {
  memory = new Map(Object.entries(data));
  for (const k of memory.keys()) dirty.add(k);
  for (const [k, v] of memory) mirrorToLocalStorage(k, v);
  scheduleFlush();
  notify();
}

function mirrorToLocalStorage(key: string, value: string) {
  try {
    localStorage?.setItem(key, value);
  } catch {
    // QuotaExceededError. Expected once history grows — IndexedDB carries on.
  }
}

// ── Flushing ───────────────────────────────────────────────────────────────

function scheduleFlush() {
  if (flushTimer) clearTimeout(flushTimer);
  flushTimer = setTimeout(() => { void flush(); }, FLUSH_DEBOUNCE_MS);
}

export async function flush(): Promise<void> {
  if (flushTimer) { clearTimeout(flushTimer); flushTimer = null; }
  if (dirty.size === 0) return;
  const keys = [...dirty];
  dirty.clear();
  try {
    await Promise.all(keys.map(k => {
      const v = memory.get(k);
      return v === undefined ? idbSet(k, undefined) : idbSet(k, v);
    }));
  } catch {
    // Put them back so the next flush retries rather than silently dropping data.
    for (const k of keys) dirty.add(k);
  }
}

// ── Hydration + migration ──────────────────────────────────────────────────

export function hydrate(): Promise<void> {
  if (hydrating) return hydrating;
  hydrating = (async () => {
    try {
      const stored = await idbGetAll();
      for (const [k, v] of Object.entries(stored)) {
        if (typeof v === "string") memory.set(k, v);
      }
    } catch {
      // IndexedDB unavailable (private mode in some browsers, locked-down
      // webviews). Fall back to localStorage-only operation.
    }

    const migrated = memory.get(LEGACY_MIGRATED_FLAG) === "1";
    if (!migrated) migrateFromLocalStorage();

    hydrated = true;
    notify();
    await flush();
    void requestPersistence();
  })();
  return hydrating;
}

/**
 * One-time copy of every pre-existing `bws-*` localStorage key into the new
 * store. Non-destructive: localStorage is left untouched, so if this migration
 * is wrong in some way the original data is still sitting there.
 *
 * IndexedDB values win on conflict, because if a key is already in IDB it was
 * written by this version of the app and is therefore newer.
 */
function migrateFromLocalStorage(): void {
  if (typeof localStorage === "undefined") return;
  let copied = 0;
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith("bws-")) continue;
      if (memory.has(key)) continue;
      const value = localStorage.getItem(key);
      if (value == null) continue;
      memory.set(key, value);
      dirty.add(key);
      copied++;
    }
  } catch { /* ignore */ }

  memory.set(LEGACY_MIGRATED_FLAG, "1");
  dirty.add(LEGACY_MIGRATED_FLAG);
  if (copied > 0) {
    // eslint-disable-next-line no-console
    console.info(`[bws] migrated ${copied} legacy keys from localStorage into IndexedDB`);
  }
}

// ── Persistence status, re-exported for the settings UI ────────────────────

let cachedStatus: PersistenceStatus | null = null;

export async function persistenceStatus(force = false): Promise<PersistenceStatus> {
  if (cachedStatus && !force) return cachedStatus;
  cachedStatus = await requestPersistence();
  return cachedStatus;
}

export async function readRaw<T>(key: string): Promise<T | undefined> {
  return idbGet<T>(key);
}

/** Flush pending writes when the tab is hidden or closed — phones background apps aggressively. */
export function installFlushHooks(): () => void {
  if (typeof document === "undefined") return () => {};
  const onHide = () => { void flush(); };
  document.addEventListener("visibilitychange", onHide);
  window.addEventListener("pagehide", onHide);
  return () => {
    document.removeEventListener("visibilitychange", onHide);
    window.removeEventListener("pagehide", onHide);
  };
}
