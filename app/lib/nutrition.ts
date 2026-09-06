import {
  KCAL_PER_KG_FAT, LB_PER_KG,
  type BodyScan, type DailyEntry, type MainGoal, type Phase,
  type Profile, type Sex, type TrainingExperience,
} from "./types";

/**
 * The BWS nutrition engine, ported from the Built With Science Intermediate
 * spreadsheet. Every formula below was reverse-engineered from the workbook's
 * CALCULATIONS sheet and verified against its own worked example
 * (226.8 lb male, 27% BF, intermediate, cutting → 2182 kcal / 166P / 61F / 244C).
 *
 * The one thing that matters conceptually: TDEE here is *measured*, not
 * predicted. After three weeks of data the app stops trusting any equation and
 * starts deriving your true expenditure from what you ate and what the scale
 * did. That is the entire point of the program, and it is why the daily weigh-in
 * is non-negotiable.
 */

// ── Body fat estimation (US Navy, metric) ──────────────────────────────────

/**
 * Navy tape-measure body fat. Only used as a fallback when there's no Tanita
 * scan. Expect ±3–4 percentage points of error versus your bioimpedance
 * readings — prefer a real scan whenever one exists.
 */
export function navyBodyFat(
  sex: Sex, heightCm: number, waistCm: number, neckCm: number, hipCm?: number,
): number | null {
  if (!heightCm || !waistCm || !neckCm) return null;
  if (sex === "male") {
    const d = waistCm - neckCm;
    if (d <= 0) return null;
    const bf = 495 / (1.0324 - 0.19077 * Math.log10(d) + 0.15456 * Math.log10(heightCm)) - 450;
    return clamp(round1(bf), 3, 60);
  }
  if (!hipCm) return null;
  const d = waistCm + hipCm - neckCm;
  if (d <= 0) return null;
  const bf = 495 / (1.29579 - 0.35004 * Math.log10(d) + 0.22100 * Math.log10(heightCm)) - 450;
  return clamp(round1(bf), 3, 60);
}

// ── Phase recommendation ───────────────────────────────────────────────────

/**
 * Mirrors the spreadsheet's "here is the phase we recommend for you" logic:
 * above roughly 20% body fat (28% for women) a male intermediate should strip
 * fat first, even when the stated goal is building muscle. Muscle gained at
 * high body fat comes with disproportionate fat gain, and insulin sensitivity
 * is better on the other side of a cut.
 */
export function recommendPhase(sex: Sex, bodyFatPct: number | null, goal: MainGoal): {
  phase: Phase; reason: string;
} {
  const highBf = sex === "male" ? 20 : 28;
  const lowBf  = sex === "male" ? 12 : 20;

  if (bodyFatPct == null) {
    return {
      phase: goal === "lose-fat" ? "cut" : goal === "build-muscle" ? "bulk" : "maintain",
      reason: "No body fat measurement yet, so this follows your stated goal directly. Log a Tanita scan for a real recommendation.",
    };
  }
  if (bodyFatPct >= highBf) {
    return {
      phase: "cut",
      reason: goal === "build-muscle"
        ? `At ${bodyFatPct}% body fat, cut first. Building muscle here means gaining more fat per kg of muscle than you'd like, and you'll end up cutting anyway.`
        : `At ${bodyFatPct}% body fat, a calorie deficit is the right call.`,
    };
  }
  if (bodyFatPct <= lowBf) {
    return {
      phase: goal === "lose-fat" ? "cut" : "bulk",
      reason: goal === "lose-fat"
        ? `You're already at ${bodyFatPct}%. Cutting further will cost you muscle — consider maintaining instead.`
        : `At ${bodyFatPct}% you have room to build. A modest surplus is the efficient move.`,
    };
  }
  return {
    phase: goal === "build-muscle" ? "bulk" : goal === "lose-fat" ? "cut" : "maintain",
    reason: `At ${bodyFatPct}% you're in the middle band, so your stated goal decides.`,
  };
}

// ── Goal rate of weight change ─────────────────────────────────────────────

/**
 * Weekly weight change as a percentage of current bodyweight.
 * Calibrated against the spreadsheet, which produces −0.7%/week for an
 * intermediate lifter in a cut. More experienced lifters move slower because
 * they have less room to lose fat without losing hard-won muscle.
 */
const RATE_PCT: Record<Phase, Record<TrainingExperience, number>> = {
  cut:      { beginner: -1.0, intermediate: -0.7, advanced: -0.5 },
  bulk:     { beginner:  0.5, intermediate:  0.25, advanced:  0.15 },
  maintain: { beginner:  0,   intermediate:  0,    advanced:  0 },
};

export function goalWeeklyChangeKg(
  phase: Phase, experience: TrainingExperience, currentWeightKg: number, bodyFatPct?: number | null,
): number {
  let pct = RATE_PCT[phase][experience];
  // Very high body fat tolerates a slightly steeper deficit; very low does not.
  if (phase === "cut" && bodyFatPct != null) {
    if (bodyFatPct >= 30) pct *= 1.2;
    else if (bodyFatPct <= 15) pct *= 0.75;
  }
  return round2((currentWeightKg * pct) / 100);
}

// ── TDEE ───────────────────────────────────────────────────────────────────

/**
 * Katch-McArdle BMR × activity multiplier. Used only for the first three weeks,
 * before there's enough logged data to measure expenditure directly.
 * The 1.5 multiplier is the spreadsheet's own value and already accounts for
 * training — this is why the program tells you not to eat back exercise
 * calories.
 */
export function baselineTdee(weightKg: number, bodyFatPct: number | null): number {
  const bf = bodyFatPct ?? 25;
  const leanKg = weightKg * (1 - bf / 100);
  const bmr = 370 + 21.6 * leanKg;
  return Math.round(bmr * 1.5);
}

export interface WeekBucket {
  /** ISO date of the Monday (or configured start day) that opens the week. */
  weekStart: string;
  entries: DailyEntry[];
  avgWeightKg: number | null;
  avgCalories: number | null;
  daysWeightLogged: number;
  daysCaloriesLogged: number;
}

/**
 * Measured TDEE, the spreadsheet's core trick:
 *
 *   TDEE = average daily calories + (weight lost over the week × 7716 kcal/kg ÷ days logged)
 *
 * If you ate 2300/day and lost 0.45 kg across 7 logged days, you actually
 * expended about 2300 + (0.45 × 7716 / 7) = 2796 kcal/day. No equation on earth
 * beats this, because it's arithmetic on your own results rather than a
 * population average applied to you.
 *
 * Returns null when there isn't enough data to be honest about.
 */
export function measuredTdee(current: WeekBucket, previous: WeekBucket | null): number | null {
  if (current.avgCalories == null || current.avgWeightKg == null) return null;
  if (current.daysCaloriesLogged < 4 || current.daysWeightLogged < 3) return null;
  const prevWeight = previous?.avgWeightKg;
  if (prevWeight == null) return null;

  const deltaKg = current.avgWeightKg - prevWeight;       // negative = lost weight
  const days = Math.max(current.daysCaloriesLogged, 1);
  const tdee = current.avgCalories - (deltaKg * KCAL_PER_KG_FAT) / days;

  // Guard against nonsense from water-weight swings on a short log.
  if (!isFinite(tdee) || tdee < 1000 || tdee > 6000) return null;
  return Math.round(tdee);
}

/**
 * Blends measured TDEE across the last few weeks so a single bad week of
 * water retention doesn't yank your calorie target around. Weighted toward
 * the most recent week.
 */
export function smoothedTdee(weeks: WeekBucket[]): number | null {
  const measures: number[] = [];
  for (let i = weeks.length - 1; i >= 1 && measures.length < 3; i--) {
    const m = measuredTdee(weeks[i], weeks[i - 1]);
    if (m != null) measures.push(m);
  }
  if (measures.length === 0) return null;
  const weights = [3, 2, 1].slice(0, measures.length);
  const total = weights.reduce((a, b) => a + b, 0);
  return Math.round(measures.reduce((s, m, i) => s + m * weights[i], 0) / total);
}

// ── Targets ────────────────────────────────────────────────────────────────

export interface MacroTargets {
  calories: number;
  proteinG: number;
  fatG: number;
  carbsG: number;
  proteinRange: [number, number];
  fatRange: [number, number];
  carbRange: [number, number];
}

/**
 * Protein is set from total bodyweight in pounds (0.73 g/lb recommended,
 * 1.0 g/lb ceiling) exactly as the spreadsheet does. Fat takes 25% of calories
 * (15–30% band). Carbs get whatever's left, because carbs are the lever that
 * moves when calories move.
 */
export function macroTargets(
  calories: number, weightKg: number,
  opts: { proteinMultiplier?: number; fatPct?: number } = {},
): MacroTargets {
  const lbs = weightKg * LB_PER_KG;
  const proteinMult = opts.proteinMultiplier ?? 0.73;
  const fatPct = opts.fatPct ?? 0.25;

  const proteinG = Math.round(lbs * proteinMult);
  const fatG = Math.round((calories * fatPct) / 9);
  const carbsG = Math.max(0, Math.round((calories - proteinG * 4 - fatG * 9) / 4));

  return {
    calories: Math.round(calories),
    proteinG, fatG, carbsG,
    proteinRange: [Math.round(lbs * 0.73), Math.round(lbs * 1.0)],
    fatRange:     [Math.round((calories * 0.15) / 9), Math.round((calories * 0.30) / 9)],
    carbRange: [
      Math.max(0, Math.round((calories - Math.round(lbs * 1.0) * 4 - Math.round((calories * 0.30) / 9) * 9) / 4)),
      Math.max(0, Math.round((calories - Math.round(lbs * 0.73) * 4 - Math.round((calories * 0.15) / 9) * 9) / 4)),
    ],
  };
}

export interface NutritionPlan {
  bodyFatPct: number | null;
  bodyFatSource: "tanita" | "navy" | "assumed";
  currentWeightKg: number | null;
  tdee: number;
  tdeeSource: "measured" | "baseline";
  weeksLogged: number;
  goalWeeklyChangeKg: number;
  dailyDelta: number;
  targets: MacroTargets;
  phase: Phase;
  phaseReason: string;
  /** Human-readable caveat when the plan is running on assumptions. */
  confidence: "high" | "medium" | "low";
  confidenceNote: string;
}

/**
 * The single entry point the UI calls. Assembles everything above into the
 * numbers shown on the Nutrition tab.
 */
export function buildPlan(
  profile: Profile, weeks: WeekBucket[], latestScan: BodyScan | null,
): NutritionPlan {
  // Body fat: measured beats taped beats guessed.
  let bodyFatPct: number | null = null;
  let bodyFatSource: NutritionPlan["bodyFatSource"] = "assumed";
  if (latestScan?.bodyFatPct != null) {
    bodyFatPct = latestScan.bodyFatPct;
    bodyFatSource = "tanita";
  } else if (profile.waistCm && profile.neckCm) {
    const navy = navyBodyFat(profile.sex, profile.heightCm, profile.waistCm, profile.neckCm, profile.hipCm ?? undefined);
    if (navy != null) { bodyFatPct = navy; bodyFatSource = "navy"; }
  }

  // Current weight: most recent weekly average, else the latest scan.
  const recentWeek = [...weeks].reverse().find(w => w.avgWeightKg != null);
  const currentWeightKg = recentWeek?.avgWeightKg ?? latestScan?.weightKg ?? null;

  const weeksLogged = weeks.filter(w => w.daysCaloriesLogged >= 4).length;
  const measured = smoothedTdee(weeks);
  const useMeasured = measured != null && weeksLogged >= 3;

  const weightForCalc = currentWeightKg ?? 100;
  const tdee = useMeasured ? measured! : baselineTdee(weightForCalc, bodyFatPct);
  const tdeeSource: NutritionPlan["tdeeSource"] = useMeasured ? "measured" : "baseline";

  const { phase, reason } = profile.autoGoalChange
    ? recommendPhase(profile.sex, bodyFatPct, profile.mainGoal)
    : { phase: profile.phase, reason: "Phase set manually in your profile." };

  const weeklyChange = profile.autoGoalChange || profile.goalWeeklyChangeKg == null
    ? goalWeeklyChangeKg(phase, profile.experience, weightForCalc, bodyFatPct)
    : profile.goalWeeklyChangeKg;

  const dailyDelta = Math.round((weeklyChange * KCAL_PER_KG_FAT) / 7);
  // Never prescribe below a floor — the spreadsheet uses 1500 kcal.
  const calories = Math.max(1500, tdee + dailyDelta);

  const targets = macroTargets(calories, weightForCalc);

  let confidence: NutritionPlan["confidence"] = "low";
  let confidenceNote: string;
  if (useMeasured && bodyFatSource === "tanita") {
    confidence = "high";
    confidenceNote = `Measured from ${weeksLogged} weeks of your own logs and your latest scan. This is as accurate as it gets.`;
  } else if (useMeasured) {
    confidence = "medium";
    confidenceNote = `TDEE is measured from your logs, but body fat is ${bodyFatSource === "navy" ? "taped, not scanned" : "assumed"}. A Tanita scan tightens the macros.`;
  } else {
    confidence = "low";
    confidenceNote = `Estimated from an equation, not your data. It needs about 3 weeks of daily weight and calorie logs before it can measure your real expenditure. ${weeksLogged} logged so far.`;
  }

  return {
    bodyFatPct, bodyFatSource, currentWeightKg,
    tdee, tdeeSource, weeksLogged,
    goalWeeklyChangeKg: weeklyChange,
    dailyDelta, targets,
    phase, phaseReason: reason,
    confidence, confidenceNote,
  };
}

// ── Week bucketing ─────────────────────────────────────────────────────────

/** ISO date (yyyy-mm-dd) of the Monday on or before `date`. */
export function weekStartOf(date: string): string {
  const d = new Date(date + "T00:00:00");
  const dow = (d.getDay() + 6) % 7;   // 0 = Monday
  d.setDate(d.getDate() - dow);
  return toIso(d);
}

export function bucketByWeek(daily: Record<string, DailyEntry>): WeekBucket[] {
  const groups = new Map<string, DailyEntry[]>();
  for (const entry of Object.values(daily)) {
    if (!entry.date) continue;
    const ws = weekStartOf(entry.date);
    const arr = groups.get(ws) ?? [];
    arr.push(entry);
    groups.set(ws, arr);
  }
  return [...groups.entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([weekStart, entries]) => {
      const w = entries.map(e => e.weightKg).filter((n): n is number => typeof n === "number");
      const c = entries.map(e => e.calories).filter((n): n is number => typeof n === "number");
      return {
        weekStart, entries,
        avgWeightKg: w.length ? round2(w.reduce((a, b) => a + b, 0) / w.length) : null,
        avgCalories: c.length ? Math.round(c.reduce((a, b) => a + b, 0) / c.length) : null,
        daysWeightLogged: w.length,
        daysCaloriesLogged: c.length,
      };
    });
}

// ── helpers ────────────────────────────────────────────────────────────────
const round1 = (n: number) => Math.round(n * 10) / 10;
const round2 = (n: number) => Math.round(n * 100) / 100;
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));
export const toIso = (d: Date) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export const todayIso = () => toIso(new Date());
