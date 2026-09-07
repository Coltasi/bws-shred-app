"use client";

import { getDaily, getSessions, scanList, getProfile, latestScan } from "./data";
import { bucketByWeek, buildPlan, toIso } from "./nutrition";
import { MODALITY } from "../data/workouts";
import type { BodyScan, SetData, WorkoutSession } from "./types";

/**
 * The coach digest.
 *
 * Every number below is computed here, deterministically, and handed to the
 * model as a finished fact. The model's job is to interpret and prioritise,
 * never to calculate — language models are unreliable at arithmetic and this
 * app already has an engine that does it correctly. It also keeps the prompt
 * small enough that a briefing costs a fraction of a cent.
 */

export interface LiftMove {
  name: string;
  /** Heaviest completed set this session, as logged. */
  topWeight: number;
  topReps: number;
  /** Same exercise, previous session. Null when it's new. */
  prevWeight: number | null;
  prevReps: number | null;
}

export interface CoachDigest {
  generatedFor: string;          // ISO date the digest describes
  unit: "kg" | "lbs";

  training: {
    sessionsLast7: number;
    sessionsLast28: number;
    daysSinceLast: number | null;
    lastSessionName: string | null;
    lastSessionDate: string | null;
    modalitySplit: { kettlebell: number; barbell: number; other: number };
    /** Session tonnage (sets x reps x load) for the last session and the one before. */
    lastVolume: number | null;
    prevVolume: number | null;
    /** Per-exercise top sets from the last session, compared with the previous one. */
    moves: LiftMove[];
  };

  nutrition: {
    /** Food is deliberately not logged in this app, so intake is unknown. */
    intakeTracked: false;
    targetCalories: number;
    targetProtein: number;
    targetFat: number;
    targetCarbs: number;
    /** Weigh-ins, which is the only adherence signal that exists now. */
    daysWeighedLast7: number;
    /** Calorie change the weight trend implies, when there's enough data. */
    suggestedDeltaKcal: number | null;
  };

  weight: {
    avg7: number | null;
    avgPrev7: number | null;
    weeklyChange: number | null;   // negative = losing
    goalWeeklyChange: number;
    onTrack: "ahead" | "on-track" | "behind" | "unknown";
  };

  bodyComp: {
    latestDate: string | null;
    daysSinceScan: number | null;
    bodyFatPct: number | null;
    fatMassKg: number | null;
    muscleMassKg: number | null;
    /** Change since the previous scan. */
    dFat: number | null;
    dMuscle: number | null;
    dWeight: number | null;
    spanDays: number | null;
  };
}

// ── Helpers ────────────────────────────────────────────────────────────────

const num = (s: string | undefined): number | null => {
  if (!s) return null;
  const n = parseFloat(String(s).replace(",", "."));
  return isFinite(n) ? n : null;
};

function sessionVolume(log: Record<string, SetData[]>): number {
  let total = 0;
  for (const sets of Object.values(log)) {
    for (const s of sets) {
      if (!s.done) continue;
      const w = num(s.weight), r = num(s.reps);
      if (w != null && r != null) total += w * r;
    }
  }
  return Math.round(total);
}

function topSet(sets: SetData[]): { weight: number; reps: number } | null {
  let best: { weight: number; reps: number } | null = null;
  for (const s of sets) {
    if (!s.done) continue;
    const w = num(s.weight), r = num(s.reps);
    if (w == null || r == null) continue;
    if (!best || w > best.weight || (w === best.weight && r > best.reps)) best = { weight: w, reps: r };
  }
  return best;
}

const daysBetween = (a: string, b: string) =>
  Math.round((new Date(b).getTime() - new Date(a).getTime()) / 86_400_000);

// ── Digest ─────────────────────────────────────────────────────────────────

export function buildDigest(): CoachDigest {
  const profile = getProfile();
  const daily = getDaily();
  const sessions = [...getSessions()]
    .filter(s => !isNaN(new Date(s.date).getTime()))
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  const now = Date.now();
  const withinDays = (s: WorkoutSession, n: number) =>
    (now - new Date(s.date).getTime()) / 86_400_000 <= n;

  const last = sessions[0] ?? null;
  const prevSameKey = last ? sessions.find((s, i) => i > 0 && s.key === last.key) ?? null : null;

  const moves: LiftMove[] = [];
  if (last) {
    for (const [name, sets] of Object.entries(last.log)) {
      const t = topSet(sets);
      if (!t) continue;
      const p = prevSameKey ? topSet(prevSameKey.log[name] ?? []) : null;
      moves.push({ name, topWeight: t.weight, topReps: t.reps, prevWeight: p?.weight ?? null, prevReps: p?.reps ?? null });
    }
  }

  const split = { kettlebell: 0, barbell: 0, other: 0 };
  for (const s of sessions.filter(s => withinDays(s, 28))) {
    const m = s.modality ?? MODALITY[s.key] ?? "other";
    if (m === "kettlebell") split.kettlebell++;
    else if (m === "barbell") split.barbell++;
    else split.other++;
  }

  // ── Nutrition + weight, from the same buckets the Fuel tab uses ──
  const weeks = bucketByWeek(daily);
  const plan = buildPlan(profile, weeks, latestScan());

  let daysWeighed = 0;
  for (let i = 0; i < 7; i++) {
    const d = new Date(); d.setDate(d.getDate() - i);
    if (daily[toIso(d)]?.weightKg != null) daysWeighed++;
  }

  const windowAvg = (from: number, to: number) => {
    let sum = 0, n = 0;
    for (let i = from; i < to; i++) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const w = daily[toIso(d)]?.weightKg;
      if (typeof w === "number") { sum += w; n++; }
    }
    return n >= 2 ? Math.round((sum / n) * 100) / 100 : null;
  };
  const avg7 = windowAvg(0, 7);
  const avgPrev7 = windowAvg(7, 14);
  const weeklyChange = avg7 != null && avgPrev7 != null ? Math.round((avg7 - avgPrev7) * 100) / 100 : null;

  let onTrack: CoachDigest["weight"]["onTrack"] = "unknown";
  if (weeklyChange != null) {
    const goal = plan.goalWeeklyChangeKg;
    if (goal < 0) {
      if (weeklyChange <= goal * 1.25) onTrack = "ahead";
      else if (weeklyChange <= goal * 0.6) onTrack = "on-track";
      else onTrack = "behind";
    } else if (goal > 0) {
      onTrack = weeklyChange >= goal * 0.6 ? "on-track" : "behind";
    } else {
      onTrack = Math.abs(weeklyChange) < 0.3 ? "on-track" : "behind";
    }
  }

  // ── Body composition ──
  const scans = scanList();
  const latest: BodyScan | null = scans.length ? scans[scans.length - 1] : null;
  const prevScan: BodyScan | null = scans.length > 1 ? scans[scans.length - 2] : null;
  const d = (k: keyof BodyScan) =>
    latest && prevScan && typeof latest[k] === "number" && typeof prevScan[k] === "number"
      ? Math.round(((latest[k] as number) - (prevScan[k] as number)) * 100) / 100
      : null;

  return {
    generatedFor: toIso(new Date()),
    unit: profile.unit,
    training: {
      sessionsLast7: sessions.filter(s => withinDays(s, 7)).length,
      sessionsLast28: sessions.filter(s => withinDays(s, 28)).length,
      daysSinceLast: last ? Math.floor((now - new Date(last.date).getTime()) / 86_400_000) : null,
      lastSessionName: last?.name ?? null,
      lastSessionDate: last?.date ?? null,
      modalitySplit: split,
      lastVolume: last ? sessionVolume(last.log) : null,
      prevVolume: prevSameKey ? sessionVolume(prevSameKey.log) : null,
      moves: moves.slice(0, 8),
    },
    nutrition: {
      intakeTracked: false,
      targetCalories: plan.targets.calories,
      targetProtein: plan.targets.proteinG,
      targetFat: plan.targets.fatG,
      targetCarbs: plan.targets.carbsG,
      daysWeighedLast7: daysWeighed,
      suggestedDeltaKcal: plan.adjustment?.deltaKcal ?? null,
    },
    weight: {
      avg7, avgPrev7, weeklyChange,
      goalWeeklyChange: plan.goalWeeklyChangeKg,
      onTrack,
    },
    bodyComp: {
      latestDate: latest?.date ?? null,
      daysSinceScan: latest ? daysBetween(latest.date, toIso(new Date())) : null,
      bodyFatPct: latest?.bodyFatPct ?? null,
      fatMassKg: latest?.fatMassKg ?? null,
      muscleMassKg: latest?.muscleMassKg ?? null,
      dFat: d("fatMassKg"),
      dMuscle: d("muscleMassKg"),
      dWeight: d("weightKg"),
      spanDays: latest && prevScan ? daysBetween(prevScan.date, latest.date) : null,
    },
  };
}

// ── Briefing ───────────────────────────────────────────────────────────────

export interface Briefing {
  headline: string;
  lifting: string;
  diet: string;
  body: string;
  nextAction: string;
  generatedAt: string;
  source: "haiku" | "local";
  /**
   * Why the model was not used, when it wasn't. Carries the real HTTP status
   * and server message so the failure can be diagnosed from the phone rather
   * than from Vercel's logs.
   */
  fallbackReason?: string;
  /** The digest it was generated from, so the tab can show the numbers behind it. */
  digest: CoachDigest;
}

/**
 * Rules-based briefing. Used when no API key is configured, when the network is
 * down, or when the model call fails — so the tab is never a dead end. It is
 * blunter than the model version but it is never wrong, because it only states
 * what the numbers already say.
 */
export function localBriefing(dg: CoachDigest, fallbackReason?: string): Briefing {
  const u = dg.unit;
  const kg = (n: number) => (u === "kg" ? n : n * 2.2046226218);
  const fmt = (n: number, dp = 2) => `${n > 0 ? "+" : ""}${kg(n).toFixed(dp)} ${u}`;

  // Lifting
  let lifting: string;
  const t = dg.training;
  if (t.sessionsLast7 === 0) {
    lifting = t.daysSinceLast == null
      ? "No sessions logged yet. The first one is the only one that matters right now."
      : `${t.daysSinceLast} days since your last session. Getting one in this week matters more than what's in it.`;
  } else {
    const up = t.moves.filter(m => m.prevWeight != null && m.topWeight > m.prevWeight).length;
    const down = t.moves.filter(m => m.prevWeight != null && m.topWeight < m.prevWeight).length;
    const vol = t.lastVolume != null && t.prevVolume != null
      ? ` Session tonnage ${t.lastVolume > t.prevVolume ? "up" : "down"} ${Math.abs(Math.round(((t.lastVolume - t.prevVolume) / Math.max(t.prevVolume, 1)) * 100))}% on the same workout.`
      : "";
    lifting = `${t.sessionsLast7} session${t.sessionsLast7 === 1 ? "" : "s"} in the last 7 days.` +
      (up || down ? ` ${up} lift${up === 1 ? "" : "s"} up, ${down} down versus last time.` : "") + vol;
  }

  // Diet
  const n = dg.nutrition;
  let diet: string;
  if (n.suggestedDeltaKcal != null) {
    diet = `Target is ${n.targetCalories} kcal and ${n.targetProtein} g protein. The scale says that is ` +
      `${n.suggestedDeltaKcal > 0 ? "too low" : "too high"} by roughly ${Math.abs(n.suggestedDeltaKcal)} kcal a day — ` +
      `assuming you have been eating near it.`;
  } else if (n.daysWeighedLast7 < 3) {
    diet = `Target is ${n.targetCalories} kcal and ${n.targetProtein} g protein. Only ${n.daysWeighedLast7} weigh-ins this week, so there is no way to tell whether that target is right.`;
  } else {
    diet = `Target is ${n.targetCalories} kcal and ${n.targetProtein} g protein. Weight trend is tracking close enough to the goal rate to leave it alone.`;
  }

  // Body
  const w = dg.weight, b = dg.bodyComp;
  let body: string;
  if (w.weeklyChange != null) {
    body = `Weight trend ${fmt(w.weeklyChange)}/week against a ${fmt(w.goalWeeklyChange)} goal — ${w.onTrack}.`;
  } else {
    body = "Not enough weigh-ins for a trend yet. Two weeks of near-daily entries gives you one.";
  }
  if (b.dFat != null && b.dMuscle != null) {
    body += b.dFat < -0.1 && b.dMuscle > -0.3
      ? ` Last two scans: fat ${fmt(b.dFat, 1)}, muscle ${fmt(b.dMuscle, 1)} — the right shape.`
      : ` Last two scans: fat ${fmt(b.dFat, 1)}, muscle ${fmt(b.dMuscle, 1)}.`;
  }

  // Headline + action
  let headline: string, nextAction: string;
  if (t.sessionsLast7 === 0 && n.daysWeighedLast7 < 3) {
    headline = "Nothing logged this week.";
    nextAction = "One workout, and step on the scale tomorrow morning. That's the whole task.";
  } else if (n.daysWeighedLast7 < 4) {
    headline = "Training is happening, weigh-ins aren't.";
    nextAction = `Step on the scale ${4 - n.daysWeighedLast7} more morning${4 - n.daysWeighedLast7 === 1 ? "" : "s"} this week so the app can tell whether your calories are right.`;
  } else if (w.onTrack === "behind") {
    headline = "Consistent, but the scale isn't moving as planned.";
    nextAction = `Hold the current calories for another week before changing anything — one week of weight data is mostly water.`;
  } else if (w.onTrack === "ahead") {
    headline = "Losing faster than target.";
    nextAction = "Add roughly 150 kcal a day. Faster is not better here — that's where muscle goes.";
  } else {
    headline = "On plan.";
    nextAction = t.moves.some(m => m.prevWeight != null && m.topWeight >= m.prevWeight)
      ? "Add reps before load on the lifts that stalled."
      : "Keep the current loads and chase clean reps.";
  }

  return {
    headline, lifting, diet, body, nextAction,
    generatedAt: new Date().toISOString(),
    source: "local",
    fallbackReason,
    digest: dg,
  };
}

/** Cheap signature of the inputs, so we don't re-bill for an unchanged picture. */
export function digestSignature(dg: CoachDigest): string {
  return [
    dg.training.lastSessionDate, dg.training.sessionsLast7, dg.training.lastVolume,
    dg.nutrition.daysWeighedLast7, dg.nutrition.suggestedDeltaKcal,
    dg.weight.avg7, dg.bodyComp.latestDate,
  ].join("|");
}

// ── Persistence ────────────────────────────────────────────────────────────

import { getJSON, setJSON, getItem, setItem } from "./store";
import { touchLocal, schedulePush } from "./sync";

const K_LATEST  = "bws-coach-briefing";
const K_HISTORY = "bws-coach-history";
const K_SIG     = "bws-coach-sig";

export const getBriefing = (): Briefing | null => getJSON<Briefing | null>(K_LATEST, null);
export const getBriefingHistory = (): Briefing[] => getJSON<Briefing[]>(K_HISTORY, []);

export function saveBriefing(b: Briefing): void {
  setJSON(K_LATEST, b);
  // Keep a short history so you can see what the coach said three sessions ago
  // without paying to regenerate it.
  const hist = [b, ...getBriefingHistory().filter(h => h.generatedAt !== b.generatedAt)].slice(0, 20);
  setJSON(K_HISTORY, hist);
  setItem(K_SIG, digestSignature(b.digest));
  touchLocal();
  schedulePush();
}

/** True when the underlying numbers moved since the last briefing was written. */
export function isBriefingStale(dg: CoachDigest): boolean {
  const sig = getItem(K_SIG);
  if (!sig) return true;
  return sig !== digestSignature(dg);
}

/**
 * Ask the server route for a briefing, falling back to the local rules engine
 * on any failure. Never throws: a coaching note is not worth an error state
 * in the middle of a workout.
 */
export async function fetchBriefing(dg: CoachDigest): Promise<Briefing> {
  try {
    const res = await fetch("/api/coach", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ digest: dg }),
    });
    if (!res.ok) {
      // Surface what the server actually said. "Something went wrong" costs an
      // hour of guessing; "503 not-configured, accepts: ..." costs none.
      let detail = "";
      try {
        const err = await res.json();
        detail = [err?.error, err?.message].filter(Boolean).join(": ");
      } catch { /* non-JSON error body */ }
      return localBriefing(dg, `HTTP ${res.status}${detail ? ` — ${detail}` : ""}`);
    }
    const data = await res.json();
    if (!data?.briefing?.headline) {
      return localBriefing(dg, "The server replied but the briefing was empty.");
    }
    return {
      ...data.briefing,
      generatedAt: new Date().toISOString(),
      source: "haiku" as const,
      digest: dg,
    };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return localBriefing(dg, `Could not reach /api/coach — ${msg}`);
  }
}
