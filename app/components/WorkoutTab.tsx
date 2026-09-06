"use client";

import { useState, useEffect, useRef } from "react";
import {
  workouts, workoutRotation, allWorkouts, allWorkoutKeys, MODALITY, KB_KEYS,
  type Exercise,
} from "../data/workouts";
import { getItem, setItem, removeItem } from "../lib/store";

// ── Confetti ───────────────────────────────────────────────────────────────
function Confetti({ onDone }: { onDone: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    const COLORS = ["#facc15", "#fb923c", "#34d399", "#60a5fa", "#c084fc", "#f472b6", "#ffffff"];
    type Particle = { x: number; y: number; vx: number; vy: number; color: string; size: number; angle: number; spin: number; shape: "rect" | "circle" };
    const particles: Particle[] = Array.from({ length: 120 }, () => ({
      x: Math.random() * canvas.width, y: -10 - Math.random() * 200,
      vx: (Math.random() - 0.5) * 4, vy: 2 + Math.random() * 4,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      size: 6 + Math.random() * 8, angle: Math.random() * Math.PI * 2,
      spin: (Math.random() - 0.5) * 0.2, shape: Math.random() > 0.5 ? "rect" : "circle",
    }));
    let frame = 0, animId: number;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      frame++;
      let allGone = true;
      for (const p of particles) {
        p.x += p.vx; p.y += p.vy; p.vy += 0.08; p.angle += p.spin;
        if (p.y < canvas.height + 20) allGone = false;
        ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.angle);
        ctx.globalAlpha = Math.max(0, 1 - p.y / canvas.height);
        ctx.fillStyle = p.color;
        if (p.shape === "circle") { ctx.beginPath(); ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2); ctx.fill(); }
        else ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        ctx.restore();
      }
      if (allGone || frame > 300) { onDone(); return; }
      animId = requestAnimationFrame(draw);
    };
    animId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animId);
  }, [onDone]);
  return <canvas ref={canvasRef} className="fixed inset-0 pointer-events-none z-50" />;
}

// ── Types ──────────────────────────────────────────────────────────────────
type SetData = { done: boolean; weight: string; reps: string };
type ExerciseLog = Record<string, SetData[]>;
type CustomWorkout = { key: string; name: string; emoji: string; exercises: Exercise[] };

// ── Constants ──────────────────────────────────────────────────────────────
const ROTATION_KEY    = "bws-rotation-index";
const MY_WORKOUTS_KEY = "bws-my-workouts";
const DATED_LOG_KEY   = "bws-dated-log";
const LAST_KEY        = "bws-last-workout";

type WorkoutSession = { date: string; key: string; name: string; emoji: string; log: ExerciseLog };

const EMOJI_OPTIONS = ["🏋️","🔥","⚡","💥","🥊","🤸","🎯","🏃","🚴","🧘","🪃","🫀","💪","🦾","🏆","⚙️","🌊","🧗","🥋","🎽"];

const WARMUP_OPTIONS = [
  { id: "erg",         label: "Rowing Erg",      icon: "⟿" },
  { id: "treadmill",   label: "Treadmill Walk",   icon: "↑" },
  { id: "stairmaster", label: "Stair Master",     icon: "▲" },
  { id: "bike",        label: "Stationary Bike",  icon: "◎" },
];

const AB_EXERCISES: Exercise[] = [
  { name: "Plank",              sets: "3", reps: "45 sec",      rest: "30 sec", notes: "Brace your core. Keep hips level." },
  { name: "Hanging Leg Raises", sets: "3", reps: "10–12",       rest: "60 sec", notes: "Dead hang, raise legs to 90°. Lower slowly." },
  { name: "Cable Crunch",       sets: "3", reps: "12–15",       rest: "60 sec", notes: "Crunch rib cage to hips, not head to floor." },
  { name: "Dead Bug",           sets: "3", reps: "8 each side", rest: "45 sec", notes: "Lower opposite arm and leg, press back into floor." },
];

const WORKOUT_COLORS: Record<string, string> = {
  blue:   "text-info bg-blue-400/10 border-blue-500/30",
  green:  "text-good bg-green-400/10 border-green-500/30",
  orange: "text-warn bg-orange-400/10 border-orange-500/30",
  purple: "text-alt bg-purple-400/10 border-purple-500/30",
  red:    "text-bad bg-red-400/10 border-red-500/30",
  yellow: "text-accent bg-yellow-400/10 border-yellow-500/30",
};

// ── localStorage helpers ───────────────────────────────────────────────────
const sessionKey  = (k: string) => `bws-session-${k}`;
const historyKey  = (k: string) => `bws-history-${k}`;
const customKey   = (k: string) => `bws-custom-${k}`;

function getRotationIndex() {
  if (typeof window === "undefined") return 0;
  return parseInt(getItem(ROTATION_KEY) || "0", 10) % workoutRotation.length;
}
function loadSession(k: string): ExerciseLog {
  try {
    const raw = getItem(sessionKey(k));
    if (!raw) return {};
    const p = JSON.parse(raw);
    // New format: { date, log } — reset if it's from a previous day
    if (p.date !== undefined) {
      return p.date === new Date().toDateString() ? (p.log ?? {}) : {};
    }
    return p; // legacy format (plain ExerciseLog)
  } catch { return {}; }
}
function saveSession(k: string, log: ExerciseLog, meta?: { name: string; emoji: string }) {
  setItem(sessionKey(k), JSON.stringify({ date: new Date().toDateString(), log }));
  const hasWeight = Object.values(log).some(sets => sets.some(s => s.weight.trim() !== ""));
  if (hasWeight) {
    setItem(historyKey(k), JSON.stringify(log));
    if (meta) {
      try {
        const all: WorkoutSession[] = JSON.parse(getItem(DATED_LOG_KEY) || "[]");
        const today = new Date().toDateString();
        const without = all.filter(s => !(s.date === today && s.key === k));
        setItem(DATED_LOG_KEY, JSON.stringify([
          ...without,
          { date: today, key: k, name: meta.name, emoji: meta.emoji, log },
        ]));
      } catch { /* ignore */ }
    }
  }
}
function loadHistory(k: string): ExerciseLog {
  try { return JSON.parse(getItem(historyKey(k)) || "{}"); } catch { return {}; }
}
function archiveSession(k: string, log: ExerciseLog) {
  const hasData = Object.values(log).some(sets => sets.some(s => s.weight.trim() !== ""));
  if (hasData) setItem(historyKey(k), JSON.stringify(log));
}
function loadCustomExercises(k: string): Exercise[] | null {
  try { const r = getItem(customKey(k)); return r ? JSON.parse(r) : null; } catch { return null; }
}
function saveCustomExercises(k: string, exs: Exercise[]) {
  setItem(customKey(k), JSON.stringify(exs));
}
function loadMyWorkouts(): CustomWorkout[] {
  try { return JSON.parse(getItem(MY_WORKOUTS_KEY) || "[]"); } catch { return []; }
}
function saveMyWorkouts(ws: CustomWorkout[]) {
  setItem(MY_WORKOUTS_KEY, JSON.stringify(ws));
}
function initSets(ex: Exercise, saved: SetData[] | undefined): SetData[] {
  const count = parseInt(ex.sets) || 3;
  return Array.from({ length: count }, (_, i) => saved?.[i] ?? { done: false, weight: "", reps: "" });
}

// ── Component ──────────────────────────────────────────────────────────────
export default function WorkoutTab() {
  const [selectedKey, setSelectedKey]         = useState<string>("Upper");
  const [rotationIdx, setRotationIdx]         = useState(0);
  const [session, setSession]                 = useState<ExerciseLog>({});
  const [history, setHistory]                 = useState<ExerciseLog>({});
  const [timer, setTimer]                     = useState<number | null>(null);
  const [timerRunning, setTimerRunning]       = useState(false);
  const [timerLabel, setTimerLabel]           = useState("");
  const [expandedExercise, setExpandedExercise] = useState<string | null>(null);
  const [warmupDone, setWarmupDone]           = useState(false);
  const [warmupChoice, setWarmupChoice]       = useState("");
  const [cooldownDone, setCooldownDone]       = useState(false);
  const [absDone, setAbsDone]                 = useState<Record<string, boolean>>({});
  const [showConfetti, setShowConfetti]       = useState(false);
  const [weightUnit, setWeightUnit]           = useState<"kg" | "lbs">("kg");

  // Exercise customization (for existing workouts)
  const [editMode, setEditMode]               = useState(false);
  const [customExercises, setCustomExercises] = useState<Record<string, Exercise[]>>({});
  const [showAddForm, setShowAddForm]         = useState(false);
  const [newEx, setNewEx]                     = useState({ name: "", sets: "3", reps: "8–12", rest: "90 sec" });

  // My custom workouts
  const [myWorkouts, setMyWorkouts]           = useState<CustomWorkout[]>([]);
  const [showCreateForm, setShowCreateForm]   = useState(false);
  const [newWorkout, setNewWorkout]           = useState<{ name: string; emoji: string; exercises: Exercise[] }>({
    name: "", emoji: "🏋️", exercises: [],
  });
  const [newWorkoutEx, setNewWorkoutEx]       = useState({ name: "", sets: "3", reps: "8–12", rest: "90 sec" });

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  /**
   * Remember the chosen workout. This deliberately lives in the click handler
   * rather than an effect on `selectedKey`: React StrictMode double-invokes
   * mount effects, so an effect-based write races the restore effect and pins
   * the selection to whatever the initial state happened to be.
   */
  const chooseWorkout = (key: string) => {
    setSelectedKey(key);
    if (key) setItem(LAST_KEY, key);
  };

  useEffect(() => {
    const idx = getRotationIndex();
    setRotationIdx(idx);

    // Resume whatever was open last. Falling back to the kettlebell re-entry
    // session rather than a barbell day is deliberate: kettlebell is the
    // primary modality, and after a layoff the ramp is where to restart.
    const lastKey = getItem(LAST_KEY);
    setSelectedKey(lastKey && allWorkouts[lastKey] ? lastKey : "KBRamp");

    const savedUnit = getItem("bws-weight-unit") as "kg" | "lbs" | null;
    if (savedUnit) setWeightUnit(savedUnit);

    const allCustom: Record<string, Exercise[]> = {};
    for (const k of allWorkoutKeys) {
      const c = loadCustomExercises(k);
      if (c) allCustom[k] = c;
    }
    setCustomExercises(allCustom);
    setMyWorkouts(loadMyWorkouts());
  }, []);

  useEffect(() => {
    if (!selectedKey) return;
    setSession(loadSession(selectedKey));
    setHistory(loadHistory(selectedKey));
    setExpandedExercise(null);
    setWarmupDone(false);
    setWarmupChoice("");
    setCooldownDone(false);
    setAbsDone({});
    setEditMode(false);
    setShowAddForm(false);
    setShowCreateForm(false);
  }, [selectedKey]);

  useEffect(() => {
    if (timerRunning && timer !== null && timer > 0) {
      intervalRef.current = setInterval(() => {
        setTimer(t => {
          if (t === null || t <= 1) { setTimerRunning(false); clearInterval(intervalRef.current!); return 0; }
          return t - 1;
        });
      }, 1000);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [timerRunning, timer]);

  // Look up the current workout from either built-ins or custom
  const builtInWorkout = allWorkouts[selectedKey];
  const myWorkout = myWorkouts.find(w => w.key === selectedKey);
  const workout = builtInWorkout ?? (myWorkout ? { ...myWorkout, color: "yellow" } : null);
  const isMyWorkout = !!myWorkout;

  // Effective exercise list
  const effectiveExercises: Exercise[] = isMyWorkout
    ? myWorkout!.exercises
    : (customExercises[selectedKey] ?? builtInWorkout?.exercises ?? []);

  // ── Custom workout CRUD ────────────────────────────────────────────────
  function addExToNewWorkout() {
    if (!newWorkoutEx.name.trim()) return;
    setNewWorkout(prev => ({
      ...prev,
      exercises: [...prev.exercises, {
        name: newWorkoutEx.name.trim(),
        sets: newWorkoutEx.sets || "3",
        reps: newWorkoutEx.reps || "8–12",
        rest: newWorkoutEx.rest || "90 sec",
        notes: "",
      }],
    }));
    setNewWorkoutEx({ name: "", sets: "3", reps: "8–12", rest: "90 sec" });
  }

  function removeExFromNewWorkout(idx: number) {
    setNewWorkout(prev => ({ ...prev, exercises: prev.exercises.filter((_, i) => i !== idx) }));
  }

  function saveNewWorkout() {
    if (!newWorkout.name.trim() || newWorkout.exercises.length === 0) return;
    const key = `my-${Date.now()}`;
    const created: CustomWorkout = { key, name: newWorkout.name.trim(), emoji: newWorkout.emoji, exercises: newWorkout.exercises };
    const updated = [...myWorkouts, created];
    setMyWorkouts(updated);
    saveMyWorkouts(updated);
    setNewWorkout({ name: "", emoji: "🏋️", exercises: [] });
    setShowCreateForm(false);
    setSelectedKey(key);
  }

  function deleteMyWorkout(key: string) {
    const updated = myWorkouts.filter(w => w.key !== key);
    setMyWorkouts(updated);
    saveMyWorkouts(updated);
    if (selectedKey === key) setSelectedKey(workoutRotation[rotationIdx]);
  }

  // ── Exercise customization (built-in workouts) ─────────────────────────
  function removeExercise(name: string) {
    const updated = effectiveExercises.filter(e => e.name !== name);
    const next = { ...customExercises, [selectedKey]: updated };
    setCustomExercises(next);
    saveCustomExercises(selectedKey, updated);
  }

  function addExercise() {
    if (!newEx.name.trim()) return;
    const ex: Exercise = { name: newEx.name.trim(), sets: newEx.sets || "3", reps: newEx.reps || "8–12", rest: newEx.rest || "90 sec", notes: "" };
    const updated = [...effectiveExercises, ex];
    const next = { ...customExercises, [selectedKey]: updated };
    setCustomExercises(next);
    saveCustomExercises(selectedKey, updated);
    setNewEx({ name: "", sets: "3", reps: "8–12", rest: "90 sec" });
    setShowAddForm(false);
  }

  function resetToDefault() {
    const next = { ...customExercises };
    delete next[selectedKey];
    setCustomExercises(next);
    removeItem(customKey(selectedKey));
    setEditMode(false);
  }

  // ── Set helpers ────────────────────────────────────────────────────────
  function getSets(ex: Exercise): SetData[] { return initSets(ex, session[ex.name]); }

  function updateSet(ex: Exercise, setIdx: number, patch: Partial<SetData>) {
    const updated = getSets(ex).map((s, i) => i === setIdx ? { ...s, ...patch } : s);
    const newSession = { ...session, [ex.name]: updated };
    setSession(newSession);
    saveSession(selectedKey, newSession, workout ? { name: workout.name, emoji: workout.emoji } : undefined);
  }

  function toggleDone(ex: Exercise, setIdx: number) {
    const sets = getSets(ex);
    const wasDone = sets[setIdx].done;
    updateSet(ex, setIdx, { done: !wasDone });
    if (!wasDone && ex.rest) startTimer(parseRestTime(ex.rest), "Rest");
    if (!wasDone) {
      const newSession = { ...session, [ex.name]: sets.map((s, i) => i === setIdx ? { ...s, done: true } : s) };
      const allDone = effectiveExercises.every(e => initSets(e, newSession[e.name]).every(s => s.done));
      if (allDone) {
        setShowConfetti(true);
        archiveSession(selectedKey, newSession);
        setHistory(loadHistory(selectedKey));
      }
    }
  }

  function resetWorkout() {
    archiveSession(selectedKey, session);
    setSession({});
    saveSession(selectedKey, {});
    setHistory(loadHistory(selectedKey));
    setWarmupDone(false); setWarmupChoice(""); setCooldownDone(false); setAbsDone({});
  }

  // ── Timer ──────────────────────────────────────────────────────────────
  const startTimer = (seconds: number, label: string) => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setTimer(seconds); setTimerLabel(label); setTimerRunning(true);
  };
  const stopTimer = () => {
    setTimerRunning(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
    setTimer(null); setTimerLabel("");
  };
  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  // ── Stats ──────────────────────────────────────────────────────────────
  const totalSets   = effectiveExercises.reduce((acc, ex) => acc + (parseInt(ex.sets) || 3), 0);
  const doneSets    = effectiveExercises.reduce((acc, ex) => acc + getSets(ex).filter(s => s.done).length, 0);
  const mainDone    = totalSets > 0 && doneSets === totalSets;
  const abTotal     = AB_EXERCISES.length;
  const abDoneCount = Object.values(absDone).filter(Boolean).length;
  const isCustomized = !isMyWorkout && !!customExercises[selectedKey];

  return (
    <div className="px-4 py-4 space-y-4">
      {showConfetti && <Confetti onDone={() => setShowConfetti(false)} />}

      {/* ── WORKOUT PICKER ── */}
      <div>
        {/* Kettlebell first — it is the primary modality, and the modality the
            Apr–Jul body-composition results actually came from. */}
        <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Kettlebell</p>
        <div className="flex gap-2 overflow-x-auto pb-2 mb-3">
          {KB_KEYS.map(key => {
            const w = allWorkouts[key];
            const isSelected = key === selectedKey;
            const isCust = !!customExercises[key];
            const short = key === "KBRamp" ? "Re-entry" : key === "KBStrength" ? "Strength" : "Complex";
            return (
              <button key={key} onClick={() => chooseWorkout(key)}
                className={`flex-shrink-0 flex flex-col items-center px-3 py-2.5 rounded-xl border transition-all min-w-[78px] ${
                  isSelected ? "bg-yellow-400 text-on-accent border-yellow-400 font-bold"
                  : "bg-gray-900/50 text-gray-400 border-gray-800 hover:border-gray-600"
                }`}>
                <span className="text-lg">{w.emoji}</span>
                <span className="text-[10px] font-semibold mt-0.5 text-center leading-tight">{short}</span>
                {isCust && !isSelected && <span className="text-[8px] text-accent mt-0.5">custom</span>}
              </button>
            );
          })}
        </div>

        <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Barbell · Built With Science</p>
        <div className="flex gap-2 overflow-x-auto pb-2">
          {/* Built-in workouts */}
          {workoutRotation.map((key, idx) => {
            const w = workouts[key];
            const isNext = idx === rotationIdx;
            const isSelected = key === selectedKey;
            const isCust = !!customExercises[key];
            return (
              <button key={key} onClick={() => chooseWorkout(key)}
                className={`flex-shrink-0 flex flex-col items-center px-3 py-2.5 rounded-xl border transition-all min-w-[64px] ${
                  isSelected ? "bg-yellow-400 text-on-accent border-yellow-400 font-bold"
                  : isNext ? "bg-yellow-400/10 text-accent border-yellow-500/40"
                  : "bg-gray-900/50 text-gray-400 border-gray-800 hover:border-gray-600"
                }`}>
                <span className="text-lg">{w.emoji}</span>
                <span className="text-[10px] font-semibold mt-0.5 uppercase tracking-tight">{key}</span>
                {isCust && !isSelected && <span className="text-[8px] text-accent mt-0.5">custom</span>}
                {isNext && !isSelected && !isCust && <span className="text-[9px] text-accent mt-0.5">next</span>}
              </button>
            );
          })}

          {/* My custom workouts */}
          {myWorkouts.map(w => (
            <button key={w.key} onClick={() => chooseWorkout(w.key)}
              className={`flex-shrink-0 flex flex-col items-center px-3 py-2.5 rounded-xl border transition-all min-w-[64px] ${
                selectedKey === w.key ? "bg-yellow-400 text-on-accent border-yellow-400 font-bold"
                : "bg-purple-900/30 text-alt border-purple-700/50 hover:border-purple-500"
              }`}>
              <span className="text-lg">{w.emoji}</span>
              <span className="text-[10px] font-semibold mt-0.5 text-center leading-tight">{w.name.split(" ")[0]}</span>
            </button>
          ))}

          {/* Create new */}
          <button
            onClick={() => { setShowCreateForm(!showCreateForm); setSelectedKey(""); }}
            className="flex-shrink-0 flex flex-col items-center px-3 py-2.5 rounded-xl border border-dashed border-gray-600 text-gray-500 hover:border-yellow-500/50 hover:text-accent transition-all min-w-[64px]">
            <span className="text-lg">＋</span>
            <span className="text-[10px] font-semibold mt-0.5">New</span>
          </button>
        </div>
      </div>

      {/* ── CREATE WORKOUT FORM ── */}
      {showCreateForm && (
        <div className="bg-card border border-yellow-500/20 rounded-2xl p-4 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm font-bold text-accent">Create Workout</p>
            <button onClick={() => setShowCreateForm(false)} className="text-gray-500 hover:text-gray-300 text-sm">✕</button>
          </div>

          {/* Name */}
          <input
            type="text"
            placeholder="Workout name (e.g. Kettlebell Complex)"
            value={newWorkout.name}
            onChange={e => setNewWorkout(p => ({ ...p, name: e.target.value }))}
            className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-gray-200 placeholder-gray-600 outline-none focus:border-yellow-500/50"
          />

          {/* Emoji picker */}
          <div>
            <p className="text-[10px] text-gray-500 uppercase mb-2">Pick an icon</p>
            <div className="flex flex-wrap gap-2">
              {EMOJI_OPTIONS.map(e => (
                <button key={e} onClick={() => setNewWorkout(p => ({ ...p, emoji: e }))}
                  className={`w-9 h-9 rounded-lg text-lg flex items-center justify-center transition-all ${
                    newWorkout.emoji === e ? "bg-yellow-400/20 border border-yellow-500/50" : "bg-gray-900 border border-gray-800 hover:border-gray-600"
                  }`}>
                  {e}
                </button>
              ))}
            </div>
          </div>

          {/* Exercise list */}
          {newWorkout.exercises.length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] text-gray-500 uppercase">Exercises</p>
              {newWorkout.exercises.map((ex, i) => (
                <div key={i} className="flex items-center gap-2 bg-gray-900/60 rounded-xl px-3 py-2 border border-gray-800">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-200 font-medium truncate">{ex.name}</p>
                    <p className="text-xs text-gray-500">{ex.sets} sets × {ex.reps}</p>
                  </div>
                  <button onClick={() => removeExFromNewWorkout(i)} className="text-gray-600 hover:text-bad text-sm px-1">✕</button>
                </div>
              ))}
            </div>
          )}

          {/* Add exercise to new workout */}
          <div className="border border-dashed border-gray-700 rounded-xl p-3 space-y-3">
            <p className="text-[10px] text-gray-500 uppercase">Add exercise</p>
            <input
              type="text"
              placeholder="Exercise name"
              value={newWorkoutEx.name}
              onChange={e => setNewWorkoutEx(p => ({ ...p, name: e.target.value }))}
              onKeyDown={e => e.key === "Enter" && addExToNewWorkout()}
              className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-sm text-gray-200 placeholder-gray-600 outline-none focus:border-yellow-500/50"
            />
            <div className="grid grid-cols-3 gap-2">
              {(["sets","reps","rest"] as const).map(field => (
                <div key={field}>
                  <p className="text-[10px] text-gray-500 mb-1 capitalize">{field}</p>
                  <input
                    type="text"
                    value={newWorkoutEx[field]}
                    onChange={e => setNewWorkoutEx(p => ({ ...p, [field]: e.target.value }))}
                    className="w-full bg-gray-900 border border-gray-700 rounded-xl px-2 py-2 text-sm text-gray-200 text-center outline-none focus:border-yellow-500/50"
                  />
                </div>
              ))}
            </div>
            <button onClick={addExToNewWorkout}
              className="w-full py-2 rounded-xl bg-gray-800 text-gray-300 text-sm font-semibold hover:bg-gray-700">
              + Add Exercise
            </button>
          </div>

          <button
            onClick={saveNewWorkout}
            disabled={!newWorkout.name.trim() || newWorkout.exercises.length === 0}
            className="w-full py-3 rounded-xl bg-yellow-400 text-on-accent font-bold text-sm hover:bg-yellow-300 disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Save Workout
          </button>
        </div>
      )}

      {workout && (<>

        {/* ── WARM-UP ── */}
        <div className={`rounded-2xl p-4 border transition-all ${warmupDone ? "bg-green-500/5 border-green-500/30" : "bg-orange-500/5 border-orange-500/30"}`}>
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-warn">Step 1 — Warm-Up</p>
              <p className="text-sm font-semibold text-gray-200 mt-0.5">10 minutes · get the blood moving</p>
            </div>
            {warmupDone && <span className="text-good text-lg font-bold">✓</span>}
          </div>
          {!warmupDone && (<>
            <div className="grid grid-cols-4 gap-2 mb-3">
              {WARMUP_OPTIONS.map(opt => (
                <button key={opt.id} onClick={() => setWarmupChoice(opt.id)}
                  className={`flex flex-col items-center gap-1 py-2.5 px-1 rounded-xl border text-xs font-semibold transition-all ${
                    warmupChoice === opt.id ? "bg-orange-400/20 text-warn border-orange-400/50" : "bg-gray-900 text-gray-400 border-gray-800"
                  }`}>
                  <span className="text-base font-mono">{opt.icon}</span>
                  <span className="text-center leading-tight text-[10px]">{opt.label}</span>
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={() => startTimer(10 * 60, "Warm-Up")}
                className="flex-1 py-2 rounded-xl bg-orange-400/20 text-warn text-sm font-semibold hover:bg-orange-400/30">
                Start 10-min timer
              </button>
              <button onClick={() => setWarmupDone(true)}
                className="py-2 px-4 rounded-xl bg-green-500/20 text-good text-sm font-semibold hover:bg-green-500/30">
                Done
              </button>
            </div>
          </>)}
          {warmupDone && (
            <p className="text-xs text-good">
              {warmupChoice ? `${WARMUP_OPTIONS.find(o => o.id === warmupChoice)?.label} — ` : ""}Warmed up and ready
            </p>
          )}
        </div>

        {/* ── TIMER ── */}
        {timer !== null && (
          <div className={`rounded-2xl p-4 border text-center transition-all ${
            timer === 0 ? "bg-green-500/10 border-green-500/30 text-good"
            : timerLabel === "Warm-Up" || timerLabel === "Cool-Down" ? "bg-orange-500/10 border-orange-500/30 text-warn"
            : "bg-blue-500/10 border-blue-500/30 text-info"
          }`}>
            {timer === 0 ? (
              <div>
                <p className="text-2xl font-bold">{timerLabel} Complete!</p>
                <button onClick={stopTimer} className="mt-2 text-xs text-gray-400 hover:text-gray-300">Dismiss</button>
              </div>
            ) : (
              <div>
                <p className="text-xs text-gray-400 mb-1">{timerLabel}</p>
                <p className="text-4xl font-mono font-bold">{formatTime(timer)}</p>
                <div className="flex gap-2 justify-center mt-3">
                  <button onClick={() => setTimerRunning(!timerRunning)} className="px-4 py-1.5 rounded-lg bg-current/10 text-sm hover:bg-current/20">
                    {timerRunning ? "Pause" : "Resume"}
                  </button>
                  <button onClick={stopTimer} className="px-4 py-1.5 rounded-lg bg-gray-800 text-gray-400 text-sm hover:bg-gray-700">Cancel</button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── WORKOUT HEADER ── */}
        <div className={`rounded-2xl p-4 border ${WORKOUT_COLORS[workout.color] || WORKOUT_COLORS.yellow}`}>
          <div className="flex items-center justify-between gap-2">
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold">{workout.emoji} {workout.name}</h2>
              <p className="text-xs opacity-60 mt-0.5">Step 2 · {effectiveExercises.length} exercises{isCustomized ? " · customized" : ""}</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Unit toggle */}
              <button onClick={() => {
                const next = weightUnit === "kg" ? "lbs" : "kg";
                setWeightUnit(next);
                setItem("bws-weight-unit", next);
              }} className="px-2.5 py-1.5 rounded-lg text-xs font-semibold border bg-gray-800 border-gray-700 hover:border-gray-500">
                <span className={weightUnit === "kg" ? "text-accent" : "text-gray-500"}>kg</span>
                <span className="text-gray-600 mx-0.5">/</span>
                <span className={weightUnit === "lbs" ? "text-accent" : "text-gray-500"}>lbs</span>
              </button>
              {/* Edit (only for built-in workouts) */}
              {!isMyWorkout && (
                <button onClick={() => { setEditMode(!editMode); setShowAddForm(false); }}
                  className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                    editMode ? "bg-yellow-400 text-on-accent border-yellow-400" : "bg-gray-800 text-gray-400 border-gray-700"
                  }`}>
                  {editMode ? "Done" : "✏️"}
                </button>
              )}
              {/* Delete (only for my workouts) */}
              {isMyWorkout && (
                <button onClick={() => deleteMyWorkout(selectedKey)}
                  className="px-2.5 py-1.5 rounded-lg text-xs border bg-red-900/20 text-bad border-red-800/40 hover:bg-red-900/40">
                  🗑
                </button>
              )}
            </div>
          </div>
          <div className="flex items-center justify-between mt-3">
            <div className="flex-1">
              <div className="h-2 bg-black/30 rounded-full overflow-hidden">
                <div className="h-full bg-current rounded-full transition-all duration-500"
                  style={{ width: `${totalSets > 0 ? (doneSets / totalSets) * 100 : 0}%` }} />
              </div>
            </div>
            <div className="ml-4 text-right">
              <span className="text-xl font-bold">{doneSets}/{totalSets}</span>
              <span className="text-xs opacity-60 ml-1">sets</span>
              {doneSets > 0 && (
                <button onClick={resetWorkout} className="block text-[10px] opacity-40 hover:opacity-70 mt-0.5 ml-auto">reset</button>
              )}
            </div>
          </div>
        </div>

        {/* ── EXERCISE LIST ── */}
        <div className="space-y-3">
          {effectiveExercises.map((ex, exIdx) => {
            const sets = getSets(ex);
            const done = sets.filter(s => s.done).length;
            const isComplete = done === sets.length;
            const isExpanded = !editMode && expandedExercise === ex.name;
            const prevSets = history[ex.name];
            const lastBest = prevSets?.reduce<SetData | null>((b, s) => {
              if (!s.weight) return b;
              return !b || parseFloat(s.weight) > parseFloat(b.weight || "0") ? s : b;
            }, null);

            return (
              <div key={`${ex.name}-${exIdx}`} className={`bg-card border rounded-2xl overflow-hidden transition-all ${
                editMode ? "border-yellow-500/20" : isComplete ? "border-green-500/30" : "border-gray-800"
              }`}>
                {editMode ? (
                  <div className="flex items-center gap-3 p-4">
                    <div className="w-8 h-8 rounded-lg bg-gray-800 text-gray-400 flex items-center justify-center text-xs font-bold">{exIdx + 1}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-200 truncate">{ex.name}</p>
                      <p className="text-xs text-gray-500">{ex.sets} × {ex.reps}</p>
                    </div>
                    <button onClick={() => removeExercise(ex.name)}
                      className="w-8 h-8 rounded-lg bg-red-500/20 text-bad flex items-center justify-center text-sm hover:bg-red-500/40">✕</button>
                  </div>
                ) : (
                  <>
                    <button onClick={() => setExpandedExercise(isExpanded ? null : ex.name)}
                      className="w-full flex items-center gap-3 p-4 text-left">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                        isComplete ? "bg-green-500 text-gray-200" : "bg-gray-800 text-gray-400"
                      }`}>{isComplete ? "✓" : exIdx + 1}</div>
                      <div className="flex-1 min-w-0">
                        <p className={`font-semibold text-sm ${isComplete ? "text-gray-500 line-through" : "text-gray-200"}`}>{ex.name}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {ex.sets} sets × {ex.reps}
                          {ex.rest && <span className="ml-2 text-info/70">· {ex.rest} rest</span>}
                        </p>
                        {lastBest && <p className="text-[11px] text-accent/60 mt-0.5">Last: {lastBest.weight} {weightUnit} × {lastBest.reps || "?"} reps</p>}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-semibold ${isComplete ? "text-good" : "text-gray-500"}`}>{done}/{sets.length}</span>
                        <span className="text-gray-600 text-sm">{isExpanded ? "▲" : "▼"}</span>
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="px-4 pb-4 space-y-3 border-t border-gray-800/50 pt-3">
                        {ex.notes && <p className="text-xs text-accent/80 bg-yellow-400/5 rounded-lg px-3 py-2">{ex.notes}</p>}
                        <div className="grid grid-cols-[32px_1fr_76px_76px_36px] gap-2 px-1">
                          <div /><p className="text-[10px] text-gray-600 uppercase">Set</p>
                          <p className="text-[10px] text-gray-600 uppercase text-center">{weightUnit}</p>
                          <p className="text-[10px] text-gray-600 uppercase text-center">Reps</p>
                          <div />
                        </div>
                        {sets.map((setData, setIdx) => {
                          const prev = prevSets?.[setIdx];
                          return (
                            <div key={setIdx} className="space-y-0.5">
                              <div className={`grid grid-cols-[32px_1fr_76px_76px_36px] gap-2 items-center rounded-xl p-2 transition-all ${
                                setData.done ? "bg-green-500/5 border border-green-500/20" : "bg-gray-900/50 border border-gray-800"
                              }`}>
                                <span className={`w-7 h-7 rounded-md flex items-center justify-center text-xs font-bold ${
                                  setData.done ? "bg-green-500 text-gray-200" : "bg-gray-800 text-gray-400"
                                }`}>{setIdx + 1}</span>
                                <span className={`text-sm font-medium ${setData.done ? "text-gray-500" : "text-gray-200"}`}>Set {setIdx + 1}</span>
                                <input type="number" inputMode="decimal"
                                  placeholder={prev?.weight || "—"} value={setData.weight}
                                  onChange={e => updateSet(ex, setIdx, { weight: e.target.value })}
                                  onClick={e => e.stopPropagation()}
                                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-center text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-yellow-500/50" />
                                <input type="number" inputMode="numeric"
                                  placeholder={prev?.reps || ex.reps.split(/[-–]/)[0]} value={setData.reps}
                                  onChange={e => updateSet(ex, setIdx, { reps: e.target.value })}
                                  onClick={e => e.stopPropagation()}
                                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-center text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-yellow-500/50" />
                                <button onClick={() => toggleDone(ex, setIdx)}
                                  className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm transition-all ${
                                    setData.done ? "bg-green-500 text-gray-200" : "bg-gray-700 text-gray-500 hover:bg-gray-600"
                                  }`}>{setData.done ? "✓" : "·"}</button>
                              </div>
                              {prev?.weight && (
                                <p className="text-[10px] text-gray-600 pl-10">Last: {prev.weight} {weightUnit} × {prev.reps || "?"} reps</p>
                              )}
                            </div>
                          );
                        })}
                        {ex.rest && (
                          <div className="flex items-center justify-between pt-1">
                            <p className="text-xs text-gray-500">Rest: {ex.rest}</p>
                            <button onClick={() => startTimer(parseRestTime(ex.rest!), "Rest")}
                              className="text-xs text-info hover:text-info bg-blue-400/10 px-3 py-1 rounded-lg">
                              Start rest timer
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>
            );
          })}

          {/* Add exercise (edit mode, built-in workouts only) */}
          {editMode && !isMyWorkout && (
            <div className="bg-card border border-dashed border-yellow-500/30 rounded-2xl p-4 space-y-3">
              {!showAddForm ? (
                <button onClick={() => setShowAddForm(true)}
                  className="w-full py-3 text-sm text-accent font-semibold flex items-center justify-center gap-2 hover:text-accent">
                  <span className="text-lg">＋</span> Add Exercise
                </button>
              ) : (
                <>
                  <p className="text-xs text-accent font-semibold uppercase">New Exercise</p>
                  <input type="text" placeholder="Exercise name"
                    value={newEx.name} onChange={e => setNewEx(p => ({ ...p, name: e.target.value }))}
                    className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-gray-200 placeholder-gray-600 outline-none focus:border-yellow-500/50" />
                  <div className="grid grid-cols-3 gap-2">
                    {(["sets","reps","rest"] as const).map(f => (
                      <div key={f}>
                        <p className="text-[10px] text-gray-500 mb-1 capitalize">{f}</p>
                        <input type="text" value={newEx[f]} onChange={e => setNewEx(p => ({ ...p, [f]: e.target.value }))}
                          className="w-full bg-gray-900 border border-gray-700 rounded-xl px-2 py-2 text-sm text-gray-200 text-center outline-none focus:border-yellow-500/50" />
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={addExercise}
                      className="flex-1 py-2.5 rounded-xl bg-yellow-400 text-on-accent text-sm font-bold hover:bg-yellow-300">Add</button>
                    <button onClick={() => setShowAddForm(false)}
                      className="py-2.5 px-4 rounded-xl bg-gray-800 text-gray-400 text-sm hover:bg-gray-700">Cancel</button>
                  </div>
                </>
              )}
            </div>
          )}
          {editMode && isCustomized && (
            <button onClick={resetToDefault}
              className="w-full py-2.5 text-xs text-gray-500 hover:text-bad border border-gray-800 rounded-xl">
              Reset to default workout
            </button>
          )}
        </div>

        {/* ── AB FINISHER ── */}
        <div className={`rounded-2xl p-4 border transition-all ${abDoneCount === abTotal ? "bg-green-500/5 border-green-500/30" : "bg-purple-500/5 border-purple-500/30"}`}>
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-alt">Step 3 — Ab Finisher</p>
              <p className="text-sm font-semibold text-gray-200 mt-0.5">Core circuit · every session</p>
            </div>
            <span className={`text-xs font-bold ${abDoneCount === abTotal ? "text-good" : "text-alt"}`}>{abDoneCount}/{abTotal}</span>
          </div>
          <div className="space-y-2">
            {AB_EXERCISES.map(ex => {
              const done = absDone[ex.name] || false;
              return (
                <div key={ex.name} className={`rounded-xl border p-3 transition-all ${done ? "bg-green-500/5 border-green-500/20" : "bg-gray-900/50 border-gray-800"}`}>
                  <button onClick={() => setAbsDone(p => ({ ...p, [ex.name]: !done }))}
                    className="w-full flex items-center gap-3 text-left">
                    <span className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold flex-shrink-0 ${done ? "bg-green-500 text-gray-200" : "bg-gray-800 text-gray-400"}`}>
                      {done ? "✓" : ""}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold ${done ? "text-gray-500 line-through" : "text-gray-200"}`}>{ex.name}</p>
                      <p className="text-xs text-gray-500">{ex.sets} sets × {ex.reps}{ex.rest ? ` · ${ex.rest} rest` : ""}</p>
                    </div>
                  </button>
                  {!done && ex.notes && <p className="text-xs text-alt/60 mt-2 pl-9 leading-relaxed">{ex.notes}</p>}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── COOL DOWN ── */}
        <div className={`rounded-2xl p-4 border transition-all ${cooldownDone ? "bg-green-500/5 border-green-500/30" : "bg-blue-500/5 border-blue-500/30"}`}>
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-info">Step 4 — Cool Down</p>
              <p className="text-sm font-semibold text-gray-200 mt-0.5">5 minutes · stretch it out</p>
            </div>
            {cooldownDone && <span className="text-good text-lg font-bold">✓</span>}
          </div>
          {!cooldownDone ? (
            <div className="space-y-3">
              <div className="space-y-1.5 text-xs text-gray-400">
                <p>· Hip flexor stretch — 60 sec each side</p>
                <p>· Chest doorframe stretch — 30 sec</p>
                <p>· Child&apos;s pose — 60 sec</p>
                <p>· Hamstring stretch — 45 sec each side</p>
                <p>· Deep breathing — 30 sec</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => startTimer(5 * 60, "Cool-Down")}
                  className="flex-1 py-2 rounded-xl bg-blue-400/20 text-info text-sm font-semibold hover:bg-blue-400/30">
                  Start 5-min timer
                </button>
                <button onClick={() => setCooldownDone(true)}
                  className="py-2 px-4 rounded-xl bg-green-500/20 text-good text-sm font-semibold hover:bg-green-500/30">
                  Done
                </button>
              </div>
            </div>
          ) : (
            <p className="text-xs text-good">Stretched and recovered — great session</p>
          )}
        </div>

        {/* ── COMPLETION ── */}
        {mainDone && (
          <div className="bg-green-500/10 border border-green-500/30 rounded-2xl p-5 text-center">
            <p className="text-2xl mb-1">🎉</p>
            <p className="text-lg font-bold text-good">Workout Saved!</p>
            <p className="text-xs text-gray-400 mt-1 mb-4">
              {abDoneCount < abTotal ? "Weights logged. Finish the ab circuit and cool down when ready." : "All done — mark it complete on the Today tab."}
            </p>
            <button onClick={resetWorkout}
              className="text-xs text-gray-500 hover:text-gray-300 bg-gray-800 px-4 py-2 rounded-lg">
              Start fresh for next session
            </button>
          </div>
        )}

      </>)}
    </div>
  );
}

function parseRestTime(rest: string): number {
  const minMatch = rest.match(/(\d+)\s*min/);
  if (minMatch) return parseInt(minMatch[1]) * 60;
  const rangeMatch = rest.match(/(\d+)[–-](\d+)\s*sec/);
  if (rangeMatch) return Math.round((parseInt(rangeMatch[1]) + parseInt(rangeMatch[2])) / 2);
  const secMatch = rest.match(/(\d+)\s*sec/);
  if (secMatch) return parseInt(secMatch[1]);
  return 60;
}
