export type Exercise = {
  name: string;
  sets: string;
  reps: string;
  rest: string;
  notes: string;
};

export type Workout = {
  name: string;
  emoji: string;
  color: string;
  exercises: Exercise[];
};

export type WeekDay = {
  day: string;
  short: string;
  workout: string | null;
  isRest: boolean;
};

// Fixed weekly schedule kept for reference / ProgressTab streak logic
export const weekSchedule: WeekDay[] = [
  { day: "Monday", short: "MON", workout: "Upper", isRest: false },
  { day: "Tuesday", short: "TUE", workout: "Lower", isRest: false },
  { day: "Wednesday", short: "WED", workout: null, isRest: true },
  { day: "Thursday", short: "THU", workout: "Push", isRest: false },
  { day: "Friday", short: "FRI", workout: "Pull", isRest: false },
  { day: "Saturday", short: "SAT", workout: "Legs", isRest: false },
  { day: "Sunday", short: "SUN", workout: null, isRest: true },
];

// Rotating order — workouts cycle through regardless of day of week
export const workoutRotation = ["Upper", "Lower", "Push", "Pull", "Legs"] as const;
export type WorkoutKey = typeof workoutRotation[number];

export const workouts: Record<string, Workout> = {
  Upper: {
    name: "Upper Body + Prehab",
    emoji: "💪",
    color: "blue",
    exercises: [
      {
        name: "Bench Press",
        sets: "4",
        reps: "4–6",
        rest: "3 min",
        notes: "Primary chest movement. Use a spotter or safety bars. Control the descent, pause briefly at chest, drive up explosively.",
      },
      {
        name: "Chest-Supported Row",
        sets: "3",
        reps: "6–8",
        rest: "2 min",
        notes: "Lie face-down on incline bench. Drive elbows back and squeeze shoulder blades together at the top. Avoid shrugging.",
      },
      {
        name: "Standing Overhead Press",
        sets: "3",
        reps: "8–10",
        rest: "2–3 min",
        notes: "Barbell or dumbbell. Brace core, glutes tight. Press directly overhead without flaring elbows out excessively.",
      },
      {
        name: "Lat Pulldown",
        sets: "3",
        reps: "10–12",
        rest: "2 min",
        notes: "Lean back slightly, pull bar to upper chest, drive elbows down and back. Squeeze lats at bottom.",
      },
      {
        name: "High-to-Low Cable Flies",
        sets: "3",
        reps: "12–15",
        rest: "90 sec",
        notes: "Set cables at top. Slight forward lean, arms slightly bent, sweep down and together. Feel the stretch at the top.",
      },
      {
        name: "Lying Face Pulls",
        sets: "3",
        reps: "10–12",
        rest: "90 sec",
        notes: "Lie face-up under cable. Pull rope to forehead with elbows flared high. Targets rear delts and external rotators. Prehab movement.",
      },
    ],
  },

  Lower: {
    name: "Lower Body + Prehab",
    emoji: "🦵",
    color: "green",
    exercises: [
      {
        name: "Front Squat",
        sets: "3",
        reps: "10–12",
        rest: "2.5–3 min",
        notes: "Barbell in front rack or crossed-arm position. Stay upright, knees tracking over toes, hit full depth.",
      },
      {
        name: "Deadlift",
        sets: "4",
        reps: "6–8",
        rest: "3 min",
        notes: "Conventional stance. Bar over mid-foot, big breath and brace, push the floor away. Lock out fully at top.",
      },
      {
        name: "Barbell Hip Thrust",
        sets: "4",
        reps: "8–12",
        rest: "2 min",
        notes: "Upper back on bench, barbell across hips. Drive through heels, squeeze glutes HARD at lockout. Chin tucked.",
      },
      {
        name: "Single Leg Weighted Calf Raise",
        sets: "3",
        reps: "6–8",
        rest: "60–90 sec",
        notes: "Stand on elevated surface (step/plate). Hold dumbbell, full range of motion — stretch all the way down, rise onto ball of foot.",
      },
      {
        name: "Leg Press Calf Raise",
        sets: "3",
        reps: "8–12",
        rest: "60–90 sec",
        notes: "Use leg press machine with toes on edge of platform. Full range of motion. Don't lock knees. Both legs simultaneously.",
      },
    ],
  },

  Push: {
    name: "Push + Abs 1 + Prehab",
    emoji: "🔥",
    color: "orange",
    exercises: [
      {
        name: "Incline Dumbbell Press",
        sets: "3",
        reps: "8–10",
        rest: "2–3 min",
        notes: "Set bench to 30–45°. Drive dumbbells up and slightly together. Don't lock out elbows. Feel upper chest stretch at bottom.",
      },
      {
        name: "Flat Dumbbell Press (RPT)",
        sets: "3",
        reps: "6–8 / 8–10 / 10–12",
        rest: "2–3 min",
        notes: "Reverse Pyramid Training: Set 1 heaviest (6–8 reps), reduce weight ~10% for Set 2 (8–10), reduce again for Set 3 (10–12).",
      },
      {
        name: "Lateral Raises (Cable + DB)",
        sets: "4",
        reps: "8–12",
        rest: "45–60 sec",
        notes: "Alternate between cable lateral raises and dumbbell lateral raises each set. Slight forward lean, lead with elbows, stop at shoulder height.",
      },
      {
        name: "Banded Push-Ups",
        sets: "2",
        reps: "10+ to failure",
        rest: "90–120 sec",
        notes: "Wrap resistance band around upper back and through palms. Go to complete failure. Great for chest and tricep endurance.",
      },
      {
        name: "Overhead Rope Extensions",
        sets: "3",
        reps: "12–15",
        rest: "90 sec",
        notes: "Cable with rope attachment above head. Face away, lean slightly forward, extend forearms. Keep elbows close to head.",
      },
      {
        name: "Bar Tricep Pushdowns",
        sets: "3",
        reps: "8–12",
        rest: "90 sec",
        notes: "Straight bar or EZ bar on cable. Elbows tucked at sides, push bar down to full extension. Squeeze triceps at bottom.",
      },
    ],
  },

  Pull: {
    name: "Pull Day",
    emoji: "🎯",
    color: "purple",
    exercises: [
      {
        name: "Weighted Pull-Ups (RPT)",
        sets: "3",
        reps: "4–6 / 6–8 / 8–10",
        rest: "2.5–3 min",
        notes: "Reverse Pyramid Training: Set 1 with most weight (4–6 reps), reduce weight for Set 2 (6–8), reduce again for Set 3 (8–10). Use dip belt.",
      },
      {
        name: "Seated Cable Row",
        sets: "3",
        reps: "8–10",
        rest: "2 min",
        notes: "Keep torso upright, drive elbows straight back. Squeeze shoulder blades together at peak contraction. Don't round lower back.",
      },
      {
        name: "Reverse Pec Deck",
        sets: "3",
        reps: "10–12",
        rest: "2 min",
        notes: "Face into the machine, arms slightly bent. Open arms wide sweeping outward. Targets rear delts. Control the return.",
      },
      {
        name: "Kneeling Face Pulls",
        sets: "4",
        reps: "10–15",
        rest: "90 sec",
        notes: "Kneel facing cable set at head height with rope. Pull to forehead, elbows flaring up and out, making a 'W' shape. Prehab movement.",
      },
      {
        name: "Incline Dumbbell Curls",
        sets: "3",
        reps: "8–10",
        rest: "90–120 sec",
        notes: "Set bench to 45–60°. Arms hang straight. Curl with a supinated grip (palms up). Full stretch at bottom. Don't swing.",
      },
      {
        name: "Hammer Curls",
        sets: "3",
        reps: "8–10",
        rest: "90–120 sec",
        notes: "Neutral grip (thumbs up). Can be done alternating or simultaneously. Targets brachialis and brachioradialis (forearm).",
      },
      {
        name: "Scapular Pull-Ups",
        sets: "2",
        reps: "5–10+",
        rest: "60 sec",
        notes: "Hang from pull-up bar, arms straight. Without bending elbows, depress and retract shoulder blades to lift body slightly. Prehab.",
      },
    ],
  },

  Legs: {
    name: "Legs + Abs 2",
    emoji: "⚡",
    color: "red",
    exercises: [
      {
        name: "Back Squat (Slow Eccentric)",
        sets: "4",
        reps: "6–8",
        rest: "3 min",
        notes: "3–4 second controlled descent, pause briefly at bottom, explode up. Bar on upper traps. Go to full depth, knees tracking over toes.",
      },
      {
        name: "Bulgarian Split Squat",
        sets: "4",
        reps: "8–10 each leg",
        rest: "45–60 sec between legs",
        notes: "Rear foot elevated on bench. Focus on the front leg doing the work. Torso upright. Deep stretch at bottom. Use dumbbells or barbell.",
      },
      {
        name: "Glute Ham Raise",
        sets: "4",
        reps: "10–12",
        rest: "2 min",
        notes: "GHD machine. Start at top, lower yourself using hamstrings controlling the descent, pull back up. Add weight when bodyweight becomes easy.",
      },
      {
        name: "Smith Machine Calf Raises",
        sets: "3",
        reps: "10–15",
        rest: "60–90 sec",
        notes: "Stand on elevated plate, toes on edge. Full range — deep stretch at bottom, rise onto ball of foot. Slow and controlled.",
      },
      {
        name: "Seated Weighted Calf Raises",
        sets: "3",
        reps: "10–15",
        rest: "60–90 sec",
        notes: "Use seated calf raise machine or plate on knees. Full range of motion. Targets the soleus (different from standing raises).",
      },
    ],
  },
};
