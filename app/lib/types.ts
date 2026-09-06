// ── Core domain types ──────────────────────────────────────────────────────
// All body weights are stored canonically in KILOGRAMS.
// Lift weights are stored as free text with a per-session unit, matching the
// existing WorkoutTab behaviour (gym plates in Barcelona are kg, but the user
// may log lbs).

export type Sex = "male" | "female";
export type TrainingExperience = "beginner" | "intermediate" | "advanced";
export type MainGoal = "build-muscle" | "lose-fat" | "maintain";
export type Phase = "cut" | "bulk" | "maintain";
export type WeightUnit = "kg" | "lbs";

/** Static-ish profile. Drives the whole nutrition engine. */
export interface Profile {
  name: string;
  sex: Sex;
  birthYear: number | null;
  heightCm: number;
  experience: TrainingExperience;
  mainGoal: MainGoal;
  phase: Phase;
  /** Display unit. Storage is always kg. */
  unit: WeightUnit;
  /** Weekly weight-change target in kg. Negative = cut. */
  goalWeeklyChangeKg: number | null;
  /** When true, the engine recomputes goalWeeklyChangeKg from BF% + goal. */
  autoGoalChange: boolean;
  /** Optional tape measurements (cm) for the Navy BF% fallback. */
  waistCm: number | null;
  neckCm: number | null;
  hipCm: number | null;
  startDate: string; // ISO yyyy-mm-dd
}

/** One day of nutrition + bodyweight. The single most important record. */
export interface DailyEntry {
  date: string;        // ISO yyyy-mm-dd — primary key
  weightKg?: number;
  calories?: number;
  proteinG?: number;
  fatG?: number;
  carbsG?: number;
  steps?: number;
  sleepHours?: number;
  note?: string;
}

/** A Tanita MC-780MA-N scan. Fields are optional: not every screen gets photographed. */
export interface BodyScan {
  date: string;        // ISO yyyy-mm-dd — primary key
  weightKg: number;
  bodyFatPct?: number;
  fatMassKg?: number;
  musclePct?: number;
  muscleMassKg?: number;
  bodyWaterPct?: number;
  bodyWaterKg?: number;
  visceralFat?: number;
  bmrKcal?: number;
  bmi?: number;
  /** Segmental body-fat percentages. */
  segFat?: SegmentalReading;
  /** Segmental muscle mass in kg. */
  segMuscle?: SegmentalReading;
  source?: "tanita" | "manual";
  note?: string;
}

export interface SegmentalReading {
  trunk?: number;
  armL?: number;
  armR?: number;
  legL?: number;
  legR?: number;
}

export type SetData = { done: boolean; weight: string; reps: string };
export type ExerciseLog = Record<string, SetData[]>;

export interface WorkoutSession {
  date: string;        // toDateString() for backwards compat with existing data
  key: string;
  name: string;
  emoji: string;
  log: ExerciseLog;
  /** Distinguishes barbell (BWS) sessions from kettlebell sessions in the stats. */
  modality?: Modality;
  durationMin?: number;
}

export type Modality = "barbell" | "kettlebell" | "cardio" | "other";

/** Everything the app owns, in one serialisable object. This is the sync unit. */
export interface AppState {
  schemaVersion: number;
  profile: Profile;
  daily: Record<string, DailyEntry>;      // keyed by ISO date
  scans: Record<string, BodyScan>;        // keyed by ISO date
  sessions: WorkoutSession[];
  customWorkouts: CustomWorkout[];
  /** Per-workout exercise overrides, keyed by workout key. */
  workoutOverrides: Record<string, unknown>;
  /** Last-completed rotation index for the BWS cycle. */
  rotationIndex: number;
  updatedAt: string;  // ISO timestamp, drives last-write-wins
}

export interface CustomWorkout {
  key: string;
  name: string;
  emoji: string;
  modality?: Modality;
  exercises: { name: string; sets: string; reps: string; rest?: string; notes?: string }[];
}

export const SCHEMA_VERSION = 2;

export const LB_PER_KG = 2.2046226218;
export const KCAL_PER_KG_FAT = 7716.17;   // 3500 kcal per lb
export const KCAL_PER_LB_FAT = 3500;

export const toDisplayWeight = (kg: number, unit: WeightUnit): number =>
  unit === "kg" ? kg : kg * LB_PER_KG;

export const fromDisplayWeight = (value: number, unit: WeightUnit): number =>
  unit === "kg" ? value : value / LB_PER_KG;
