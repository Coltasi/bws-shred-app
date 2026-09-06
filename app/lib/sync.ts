"use client";

import { createClient, type SupabaseClient, type Session } from "@supabase/supabase-js";
import { flush, replaceAll, snapshot, getItem, setItem } from "./store";

/**
 * Cloud backup via a single Supabase row.
 *
 * The design is deliberately dumb: one table, one row per user, the entire app
 * state as a JSONB blob, last-write-wins on a timestamp. There is no schema to
 * migrate, no relational modelling, and no server code. It exists for exactly
 * one reason — so that losing or wiping the phone does not lose the training
 * log — and anything more elaborate would be a maintenance burden for a
 * single-user app.
 *
 * Everything degrades to fully-offline if the env vars are absent or the
 * network is down. The gym has no signal; that is the normal case, not the
 * error case.
 *
 * Required table (run once in the Supabase SQL editor):
 *
 *   create table public.bws_snapshots (
 *     user_id    uuid primary key references auth.users(id) on delete cascade,
 *     data       jsonb not null,
 *     updated_at timestamptz not null default now()
 *   );
 *   alter table public.bws_snapshots enable row level security;
 *   create policy "own row" on public.bws_snapshots
 *     for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
 */

const URL_ENV = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY_ENV = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const TABLE = "bws_snapshots";
export const UPDATED_AT_KEY = "bws-updated-at";
export const syncConfigured = Boolean(URL_ENV && KEY_ENV);

let client: SupabaseClient | null = null;

export function getClient(): SupabaseClient | null {
  if (!syncConfigured) return null;
  if (!client) client = createClient(URL_ENV!, KEY_ENV!, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
  });
  return client;
}

export type SyncState =
  | { status: "disabled" }
  | { status: "signed-out" }
  | { status: "idle";    email: string; lastSyncedAt: string | null }
  | { status: "syncing"; email: string }
  | { status: "error";   email: string | null; message: string };

export function localUpdatedAt(): string {
  return getItem(UPDATED_AT_KEY) ?? new Date(0).toISOString();
}

export function touchLocal(): void {
  setItem(UPDATED_AT_KEY, new Date().toISOString());
}

export async function currentSession(): Promise<Session | null> {
  const c = getClient();
  if (!c) return null;
  const { data } = await c.auth.getSession();
  return data.session;
}

/** Sends a magic link. One tap in the email and the device is authorised. */
export async function signIn(email: string): Promise<{ error?: string }> {
  const c = getClient();
  if (!c) return { error: "Cloud backup isn't configured for this build." };
  const { error } = await c.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: typeof window !== "undefined" ? window.location.origin : undefined },
  });
  return error ? { error: error.message } : {};
}

export async function signOut(): Promise<void> {
  await getClient()?.auth.signOut();
}

/**
 * Pull the remote snapshot and adopt it if it is newer than local.
 * Returns true when local state was replaced.
 */
export async function pull(): Promise<boolean> {
  const c = getClient();
  const session = await currentSession();
  if (!c || !session) return false;

  const { data, error } = await c
    .from(TABLE)
    .select("data, updated_at")
    .eq("user_id", session.user.id)
    .maybeSingle();

  if (error || !data) return false;

  const remoteAt = new Date(data.updated_at as string).getTime();
  const localAt = new Date(localUpdatedAt()).getTime();

  // Strictly newer, to avoid a pointless replace on an equal timestamp.
  if (!(remoteAt > localAt)) return false;

  const payload = data.data as { kv?: Record<string, string> } | null;
  if (!payload?.kv || typeof payload.kv !== "object") return false;

  replaceAll(payload.kv);
  setItem(UPDATED_AT_KEY, new Date(remoteAt).toISOString());
  await flush();
  return true;
}

/** Push the whole local store up. Cheap enough to do on every meaningful change. */
export async function push(): Promise<{ error?: string }> {
  const c = getClient();
  const session = await currentSession();
  if (!c || !session) return { error: "Not signed in" };

  await flush();
  const updatedAt = new Date().toISOString();
  const kv = snapshot();

  const { error } = await c.from(TABLE).upsert({
    user_id: session.user.id,
    data: { kv, version: 2 },
    updated_at: updatedAt,
  });

  if (error) return { error: error.message };
  setItem(UPDATED_AT_KEY, updatedAt);
  return {};
}

/**
 * Debounced background push. Called after writes. Failures are silent by
 * design — a failed sync must never interrupt logging a set mid-workout. The
 * settings screen surfaces the last error for anyone who wants to know.
 */
let pushTimer: ReturnType<typeof setTimeout> | null = null;
let lastError: string | null = null;
let lastPushedAt: string | null = null;

export const lastSyncError = () => lastError;
export const lastSyncedAt = () => lastPushedAt;

export function schedulePush(delayMs = 5000): void {
  if (!syncConfigured) return;
  if (pushTimer) clearTimeout(pushTimer);
  pushTimer = setTimeout(async () => {
    const { error } = await push();
    lastError = error ?? null;
    if (!error) lastPushedAt = new Date().toISOString();
  }, delayMs);
}

/** Boot sequence: adopt anything newer from the cloud, then push what we have. */
export async function initialSync(): Promise<void> {
  if (!syncConfigured) return;
  try {
    const replaced = await pull();
    if (!replaced) await push();
  } catch (e) {
    lastError = e instanceof Error ? e.message : String(e);
  }
}

// ── Manual export / import ─────────────────────────────────────────────────

export interface ExportFile {
  app: "bws-shred";
  version: number;
  exportedAt: string;
  kv: Record<string, string>;
}

export function buildExport(): ExportFile {
  return { app: "bws-shred", version: 2, exportedAt: new Date().toISOString(), kv: snapshot() };
}

export function downloadExport(): void {
  const blob = new Blob([JSON.stringify(buildExport(), null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `bws-shred-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function importFromFile(file: File): Promise<{ error?: string; keys?: number }> {
  try {
    const parsed = JSON.parse(await file.text()) as ExportFile;
    if (parsed.app !== "bws-shred" || !parsed.kv) return { error: "That doesn't look like a BWS Shred backup." };
    replaceAll(parsed.kv);
    touchLocal();
    await flush();
    schedulePush(0);
    return { keys: Object.keys(parsed.kv).length };
  } catch (e) {
    return { error: e instanceof Error ? e.message : "Could not read that file." };
  }
}
