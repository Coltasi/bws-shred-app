"use client";

import { getJSON, setJSON, getItem, setItem } from "./store";
import { touchLocal, schedulePush } from "./sync";
import { SEED_SCANS } from "../data/bodyScans";
import { todayIso, toIso } from "./nutrition";
import {
  SCHEMA_VERSION, LB_PER_KG,
  type BodyScan, type DailyEntry, type Profile, type WorkoutSession,
} from "./types";

/**
 * Typed accessors over the key/value store. Every mutation marks the local
 * state dirty and schedules a cloud push, so no caller has to remember to.
 */

export const K = {
  profile:   "bws-profile",
  daily:     "bws-daily",
  scans:     "bws-scans",
  sessions:  "bws-dated-log",
  seeded:    "bws-scans-seeded",
  legacyWeight: "bws-weight-log",
  legacyWeightMigrated: "bws-legacy-weight-migrated",
} as const;

export const DEFAULT_PROFILE: Profile = {
  name: "Colin",
  sex: "male",
  birthYear: null,
  heightCm: 191,
  experience: "intermediate",
  mainGoal: "lose-fat",
  phase: "cut",
  unit: "kg",
  goalWeeklyChangeKg: null,
  autoGoalChange: true,
  waistCm: null,
  neckCm: null,
  hipCm: null,
  startDate: todayIso(),
};

function commit() {
  touchLocal();
  schedulePush();
}

// ── Profile ────────────────────────────────────────────────────────────────

export function getProfile(): Profile {
  return { ...DEFAULT_PROFILE, ...getJSON<Partial<Profile>>(K.profile, {}) };
}

export function saveProfile(patch: Partial<Profile>): Profile {
  const next = { ...getProfile(), ...patch };
  setJSON(K.profile, next);
  commit();
  return next;
}

// ── Daily entries ──────────────────────────────────────────────────────────

export function getDaily(): Record<string, DailyEntry> {
  return getJSON<Record<string, DailyEntry>>(K.daily, {});
}

export function getDay(date = todayIso()): DailyEntry {
  return getDaily()[date] ?? { date };
}

export function saveDay(date: string, patch: Partial<DailyEntry>): DailyEntry {
  const all = getDaily();
  const next: DailyEntry = { ...all[date], ...patch, date };
  // Drop keys that were explicitly cleared so averages don't count zeroes.
  (Object.keys(next) as (keyof DailyEntry)[]).forEach(k => {
    if (next[k] === undefined || next[k] === null || next[k] === "") delete next[k];
  });
  all[date] = next;
  setJSON(K.daily, all);
  commit();
  return next;
}

export function deleteDay(date: string): void {
  const all = getDaily();
  delete all[date];
  setJSON(K.daily, all);
  commit();
}

/** Most recent logged bodyweight in kg, looking back up to `days`. */
export function latestWeightKg(days = 21): { kg: number; date: string } | null {
  const all = getDaily();
  for (let i = 0; i < days; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = toIso(d);
    const kg = all[key]?.weightKg;
    if (typeof kg === "number") return { kg, date: key };
  }
  return null;
}

// ── Body scans ─────────────────────────────────────────────────────────────

export function getScans(): Record<string, BodyScan> {
  return getJSON<Record<string, BodyScan>>(K.scans, {});
}

export function scanList(): BodyScan[] {
  return Object.values(getScans()).sort((a, b) => a.date.localeCompare(b.date));
}

export function latestScan(): BodyScan | null {
  const list = scanList();
  return list.length ? list[list.length - 1] : null;
}

export function saveScan(scan: BodyScan): void {
  const all = getScans();
  all[scan.date] = { ...all[scan.date], ...scan };
  setJSON(K.scans, all);
  commit();
}

export function deleteScan(date: string): void {
  const all = getScans();
  delete all[date];
  setJSON(K.scans, all);
  commit();
}

/** Days since the most recent scan, or null if there are none. */
export function daysSinceScan(): number | null {
  const s = latestScan();
  if (!s) return null;
  const ms = Date.now() - new Date(s.date + "T00:00:00").getTime();
  return Math.floor(ms / 86_400_000);
}

// ── Sessions ───────────────────────────────────────────────────────────────

export function getSessions(): WorkoutSession[] {
  return getJSON<WorkoutSession[]>(K.sessions, []);
}

export function saveSessions(list: WorkoutSession[]): void {
  setJSON(K.sessions, list);
  commit();
}

/** Days since the most recent logged workout of any modality. */
export function daysSinceWorkout(): number | null {
  const sessions = getSessions();
  if (!sessions.length) return null;
  const newest = sessions
    .map(s => new Date(s.date).getTime())
    .filter(t => !isNaN(t))
    .sort((a, b) => b - a)[0];
  if (!newest) return null;
  return Math.floor((Date.now() - newest) / 86_400_000);
}

// ── First-run seeding + legacy import ──────────────────────────────────────

/**
 * Seeds the four transcribed Tanita scans, once. Guarded by a flag rather than
 * an emptiness check so that deleting a seeded scan doesn't resurrect it on the
 * next launch.
 */
export function seedScansOnce(): void {
  if (getItem(K.seeded) === "1") return;
  const all = getScans();
  let added = 0;
  for (const s of SEED_SCANS) {
    if (!all[s.date]) { all[s.date] = s; added++; }
  }
  if (added) setJSON(K.scans, all);
  setItem(K.seeded, "1");
  if (added) commit();
}

/**
 * Imports the old flat `bws-weight-log` array into daily entries.
 *
 * Unit is genuinely ambiguous in the legacy data — the old ProgressTab accepted
 * anything from 50 to 500 with no unit attached, and the `bws-weight-unit` key
 * it referenced was actually the *lift* weight toggle. So: values above 140 are
 * treated as pounds (Colin walks around at ~100 kg, so 140+ cannot be kg),
 * anything else as kilograms. Anything mis-assigned is editable in the app.
 */
export function migrateLegacyWeights(): number {
  if (getItem(K.legacyWeightMigrated) === "1") return 0;
  const legacy = getJSON<{ date: string; weight: number }[]>(K.legacyWeight, []);
  const daily = getDaily();
  let imported = 0;

  for (const row of legacy) {
    if (typeof row?.weight !== "number") continue;
    const parsed = new Date(row.date);
    if (isNaN(parsed.getTime())) continue;
    const iso = toIso(parsed);
    if (daily[iso]?.weightKg != null) continue;
    const kg = row.weight > 140 ? row.weight / LB_PER_KG : row.weight;
    daily[iso] = { ...daily[iso], date: iso, weightKg: Math.round(kg * 10) / 10 };
    imported++;
  }

  if (imported) setJSON(K.daily, daily);
  setItem(K.legacyWeightMigrated, "1");
  if (imported) commit();
  return imported;
}

/** Pulls steps/sleep out of the legacy per-day `bws-today-<toDateString>` keys. */
export function migrateLegacyDays(keys: string[]): number {
  const daily = getDaily();
  let imported = 0;
  for (const key of keys) {
    if (!key.startsWith("bws-today-")) continue;
    const dateStr = key.slice("bws-today-".length);
    const parsed = new Date(dateStr);
    if (isNaN(parsed.getTime())) continue;
    const iso = toIso(parsed);
    const legacy = getJSON<{ steps?: number; sleep?: number }>(key, {});
    const existing = daily[iso] ?? { date: iso };
    let changed = false;
    if (existing.steps == null && typeof legacy.steps === "number") { existing.steps = legacy.steps; changed = true; }
    if (existing.sleepHours == null && typeof legacy.sleep === "number") { existing.sleepHours = legacy.sleep; changed = true; }
    if (changed) { daily[iso] = existing; imported++; }
  }
  if (imported) { setJSON(K.daily, daily); commit(); }
  return imported;
}

export function bootstrapData(allStoreKeys: string[]): void {
  seedScansOnce();
  migrateLegacyWeights();
  migrateLegacyDays(allStoreKeys);
  const meta = getJSON<{ schemaVersion?: number }>("bws-meta", {});
  if (meta.schemaVersion !== SCHEMA_VERSION) {
    setJSON("bws-meta", { ...meta, schemaVersion: SCHEMA_VERSION });
  }
}
