import type { Workout } from "./workouts";

/**
 * Full-body kettlebell library, transcribed from Colin's exercise chart and
 * prescribed against his actual kit.
 *
 * Context that matters: the Apr–Jul 2026 Tanita scans (−4.0 kg fat, muscle mass
 * held at ~75 kg) were produced by KETTLEBELL training, not barbell work. So
 * this is not a fallback modality in this app — it is the modality with
 * evidence behind it. The barbell BWS sessions are the alternative.
 */

/** Bells Colin actually has. Some sizes exist as pairs. */
export const KB_KIT = [8, 12, 16, 20, 24, 30] as const;
export type BellKg = typeof KB_KIT[number];

export type KbPattern =
  | "hinge" | "squat" | "push" | "pull" | "carry" | "core" | "power" | "mobility";

export interface KbExercise {
  name: string;
  pattern: KbPattern;
  cue: string;
  notes: string;
  bells: "single" | "double" | "either";
  /** Working load guidance for a ~100 kg intermediate lifter with this kit. */
  load: string;
}

export const KB_LIBRARY: KbExercise[] = [
  {
    name: "Kettlebell Swing", pattern: "power", bells: "single", load: "24–30 kg",
    cue: "Hinge hips, swing to chest.",
    notes: "The hips throw the bell, the arms just steer. Snap the glutes hard at the top and let the bell float. Do not squat it up or lift with the shoulders. Go heavy here — the 30 should feel appropriate, the 16 is a warm-up.",
  },
  {
    name: "Goblet Squat", pattern: "squat", bells: "single", load: "24–30 kg",
    cue: "Keep chest tall, squat deep.",
    notes: "Held at the chest by the horns, elbows inside the knees at the bottom. The front load keeps you upright, so chase depth. Once the 30 is easy for 12, switch to double front-rack squats or add a 3-second pause at the bottom.",
  },
  {
    name: "Kettlebell Deadlift", pattern: "hinge", bells: "either", load: "2×30 kg",
    cue: "Hinge hips, lift with legs.",
    notes: "Push the floor away, spine neutral. This is the movement that runs out of load fastest — with only 60 kg available, use it for volume and tempo rather than heavy work, or take deadlifts to the barbell.",
  },
  {
    name: "Overhead Press", pattern: "push", bells: "either", load: "20–24 kg single, 2×16–20 kg double",
    cue: "Press overhead, lower slowly.",
    notes: "From the front rack. Brace the core and squeeze the glutes so the ribs don't flare. Bicep to ear at lockout, then lower under control for 2–3 seconds. Doubles are the harder and better version once you can press the 24 for 8.",
  },
  {
    name: "Clean", pattern: "power", bells: "either", load: "20–24 kg",
    cue: "Pull close, rack smoothly.",
    notes: "Keep the bell tight to the body and tame the arc — it should land softly in the rack, not bang the forearm. Bruised wrists mean you're muscling it instead of hinging it.",
  },
  {
    name: "Push Press", pattern: "push", bells: "either", load: "24 kg single, 2×20 kg double",
    cue: "Dip slightly, drive overhead.",
    notes: "Short dip from the knees, then drive. Lets you handle a bell heavier than you can strict press. Control the descent back to the rack — that eccentric is most of the stimulus.",
  },
  {
    name: "Front Rack Reverse Lunge", pattern: "squat", bells: "either", load: "2×16–20 kg or single 24 kg",
    cue: "Step back, lower with control.",
    notes: "Step back, back knee to just off the floor, drive through the front heel. Front-racked load makes the core work hard. Per side.",
  },
  {
    name: "Single Arm Row", pattern: "pull", bells: "single", load: "24–30 kg",
    cue: "Pull elbow toward ribs.",
    notes: "Hinged, free hand on a bench or knee. Pull to the hip, not the armpit. Squeeze the lat and resist rotating. This is your main back movement without a pull-up bar, so treat it seriously. Per side.",
  },
  {
    name: "Russian Twist", pattern: "core", bells: "single", load: "12–16 kg",
    cue: "Rotate torso side to side.",
    notes: "Feet up if you can. Move the bell around the torso with control, no frantic swinging. Stop the set when the lower back starts doing the work.",
  },
  {
    name: "Halo", pattern: "mobility", bells: "single", load: "8–12 kg",
    cue: "Circle around head slowly.",
    notes: "Shoulder warm-up. Keep the ribs down and the bell close to the head. Slow, deliberate circles in both directions. Light on purpose.",
  },
  {
    name: "Sumo Squat", pattern: "squat", bells: "single", load: "30 kg",
    cue: "Wide stance, knees outward.",
    notes: "Bell hanging between the legs, toes out, drive the knees apart. Hits adductors and glutes harder than a conventional squat.",
  },
  {
    name: "Alternating High Pull", pattern: "power", bells: "single", load: "16–20 kg",
    cue: "Drive elbow up, switch arms.",
    notes: "Hinge, then pull the elbow high and wide. Rear delts and traps with a conditioning cost. Switch hands at the bottom of the swing.",
  },
  {
    name: "Windmill", pattern: "mobility", bells: "single", load: "8–12 kg",
    cue: "Keep arm straight, hinge sideways.",
    notes: "Bell locked out overhead, eyes on it throughout. Push the hip away and hinge sideways. Start with the 8 or no weight until the pattern is clean — this one punishes sloppiness with a tweaked back.",
  },
  {
    name: "Single-Leg Romanian Deadlift", pattern: "hinge", bells: "single", load: "16–24 kg",
    cue: "Hinge forward, balance steadily.",
    notes: "Hamstrings, glutes and balance. Keep the hips square — don't let the free hip rotate open. Slow is the point, not heavy. Per side.",
  },
  {
    name: "Figure 8 Pass", pattern: "core", bells: "single", load: "12–16 kg",
    cue: "Pass bell through legs.",
    notes: "Athletic stance, pass the bell in a figure 8 around the legs. Anti-rotation core work disguised as a warm-up.",
  },
  {
    name: "Thruster", pattern: "power", bells: "either", load: "16–20 kg single, 2×16 kg double",
    cue: "Squat then press overhead.",
    notes: "Front squat straight into an overhead press, one movement. Brutal conditioning cost. This is what makes a 20-minute session count. Go lighter than your press — fatigue arrives fast.",
  },
];

export const KB_BY_NAME = Object.fromEntries(KB_LIBRARY.map(e => [e.name, e]));

const ex = (
  name: string, sets: string, reps: string, rest: string, prefix = "",
) => {
  const e = KB_BY_NAME[name];
  return {
    name, sets, reps, rest,
    notes: `${prefix}${prefix ? " " : ""}Load: ${e?.load ?? "—"}. ${e?.notes ?? ""}`,
  };
};

/**
 * Three presets.
 *
 * KBRamp is the re-entry session after a layoff. Deliberately submaximal:
 * after five weeks off, the limiting factor for two weeks is connective tissue
 * and soreness, not muscle. Going straight back to July's loads buys a week of
 * being too wrecked to train, which is how layoffs become permanent.
 *
 * KBStrength is the main hypertrophy driver — every major pattern, enough
 * volume to build with, loads chosen so the top of the rep range is genuinely
 * hard with the bells available.
 *
 * KBConditioning is the 20-minute deficit accelerator for otherwise-rest days.
 * Don't run it the day before a heavy lower session.
 */
export const kettlebellWorkouts: Record<string, Workout> = {
  KBRamp: {
    name: "KB Re-Entry — Week 1–2",
    emoji: "🌱",
    color: "green",
    exercises: [
      ex("Halo", "2", "5 each way", "none", "Warm-up."),
      ex("Figure 8 Pass", "2", "30 sec", "30 sec", "Warm-up."),
      ex("Goblet Squat", "3", "10–12", "90 sec", "Use the 16 or 20, NOT the 30. Stop 3 reps short of failure."),
      ex("Overhead Press", "3", "8–10 / side", "75 sec", "Use the 16. Stop 3 reps short."),
      ex("Single Arm Row", "3", "10–12 / side", "75 sec", "Use the 20."),
      ex("Single-Leg Romanian Deadlift", "2", "8 / side", "60 sec", "Use the 12 or 16."),
      ex("Kettlebell Swing", "3", "15", "60 sec", "Use the 20. Quality over load this fortnight."),
    ],
  },

  KBStrength: {
    name: "KB Full Body — Strength",
    emoji: "🔔",
    color: "orange",
    exercises: [
      ex("Halo", "2", "5 each way", "none", "Warm-up."),
      ex("Goblet Squat", "4", "8–12", "90 sec"),
      ex("Overhead Press", "4", "6–10 / side", "90 sec"),
      ex("Single Arm Row", "4", "8–12 / side", "75 sec"),
      ex("Front Rack Reverse Lunge", "3", "8–10 / side", "75 sec"),
      ex("Single-Leg Romanian Deadlift", "3", "8–10 / side", "60 sec"),
      ex("Kettlebell Swing", "3", "15–20", "60 sec", "Finisher."),
    ],
  },

  KBConditioning: {
    name: "KB Complex — Conditioning",
    emoji: "⚡",
    color: "red",
    exercises: [
      ex("Figure 8 Pass", "2", "30 sec", "none", "Warm-up."),
      ex("Kettlebell Swing", "5", "20", "45 sec"),
      ex("Clean", "4", "6 / side", "45 sec"),
      ex("Thruster", "4", "8–10", "60 sec"),
      ex("Alternating High Pull", "3", "10 / side", "45 sec"),
      ex("Push Press", "3", "8–10 / side", "45 sec"),
      ex("Russian Twist", "3", "20 total", "30 sec"),
      ex("Windmill", "2", "5 / side", "30 sec", "Cool-down."),
    ],
  },
};

export const kettlebellRotation = ["KBStrength", "KBConditioning"] as const;
export const KB_KEYS = ["KBRamp", "KBStrength", "KBConditioning"] as const;
