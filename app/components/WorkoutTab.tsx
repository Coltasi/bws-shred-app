"use client";

import { useState, useEffect, useRef } from "react";
import { workouts, workoutRotation, type Exercise } from "../data/workouts";

// ── Confetti ───────────────────────────────────────────────────────────────
function Confetti({ onDone }: { onDone: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;

    const COLORS = ["#facc15", "#fb923c", "#34d399", "#60a5fa", "#c084fc", "#f472b6", "#ffffff"];
    const COUNT  = 120;

    type Particle = {
      x: number; y: number; vx: number; vy: number;
      color: string; size: number; angle: number; spin: number; shape: "rect" | "circle";
    };

    const particles: Particle[] = Array.from({ length: COUNT }, () => ({
      x:      Math.random() * canvas.width,
      y:      -10 - Math.random() * 200,
      vx:     (Math.random() - 0.5) * 4,
      vy:     2 + Math.random() * 4,
      color:  COLORS[Math.floor(Math.random() * COLORS.length)],
      size:   6 + Math.random() * 8,
      angle:  Math.random() * Math.PI * 2,
      spin:   (Math.random() - 0.5) * 0.2,
      shape:  Math.random() > 0.5 ? "rect" : "circle",
    }));

    let frame = 0;
    let animId: number;

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      frame++;

      let allGone = true;
      for (const p of particles) {
        p.x     += p.vx;
        p.y     += p.vy;
        p.vy    += 0.08;
        p.angle += p.spin;
        if (p.y < canvas.height + 20) allGone = false;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.angle);
        ctx.globalAlpha = Math.max(0, 1 - p.y / canvas.height);
        ctx.fillStyle = p.color;
        if (p.shape === "circle") {
          ctx.beginPath();
          ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
          ctx.fill();
        } else {
          ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        }
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

// ── Constants ──────────────────────────────────────────────────────────────
const ROTATION_KEY = "bws-rotation-index";

const WARMUP_OPTIONS = [
  { id: "erg",        label: "Rowing Erg",      icon: "⟿" },
  { id: "treadmill",  label: "Treadmill Walk",   icon: "↑" },
  { id: "stairmaster",label: "Stair Master",     icon: "▲" },
  { id: "bike",       label: "Stationary Bike",  icon: "◎" },
];

const AB_EXERCISES: Exercise[] = [
  { name: "Plank",              sets: "3", reps: "45 sec",      rest: "30 sec", notes: "Brace your core like someone's about to punch you. Keep hips level — don't let them sag or pike." },
  { name: "Hanging Leg Raises", sets: "3", reps: "10–12",       rest: "60 sec", notes: "Dead hang from a pull-up bar. Raise legs to 90° keeping them as straight as possible. Lower slowly." },
  { name: "Cable Crunch",       sets: "3", reps: "12–15",       rest: "60 sec", notes: "Kneel facing cable with rope. Crunch your rib cage down to your hips — not your head to the floor. Keep hips still." },
  { name: "Dead Bug",           sets: "3", reps: "8 each side", rest: "45 sec", notes: "Lie on back, arms up, knees at 90°. Lower opposite arm and leg slowly while pressing your lower back into the floor. Switch sides." },
];

const colorMap: Record<string, string> = {
  blue:   "text-blue-400 bg-blue-400/10 border-blue-500/30",
  green:  "text-green-400 bg-green-400/10 border-green-500/30",
  orange: "text-orange-400 bg-orange-400/10 border-orange-500/30",
  purple: "text-purple-400 bg-purple-400/10 border-purple-500/30",
  red:    "text-red-400 bg-red-400/10 border-red-500/30",
};

// ── localStorage helpers ───────────────────────────────────────────────────
function sessionKey(k: string)   { return `bws-session-${k}`; }
function historyKey(k: string)   { return `bws-history-${k}`; }
function customKey(k: string)    { return `bws-custom-${k}`; }

function getRotationIndex(): number {
  if (typeof window === "undefined") return 0;
  return parseInt(localStorage.getItem(ROTATION_KEY) || "0", 10) % workoutRotation.length;
}

function loadSession(k: string): ExerciseLog {
  try { return JSON.parse(localStorage.getItem(sessionKey(k)) || "{}"); }
  catch { return {}; }
}
function saveSession(k: string, log: ExerciseLog) {
  localStorage.setItem(sessionKey(k), JSON.stringify(log));
}
function loadHistory(k: string): ExerciseLog {
  try { return JSON.parse(localStorage.getItem(historyKey(k)) || "{}"); }
  catch { return {}; }
}
function archiveSession(k: string, log: ExerciseLog) {
  const hasData = Object.values(log).some(sets => sets.some(s => s.weight.trim() !== ""));
  if (hasData) localStorage.setItem(historyKey(k), JSON.stringify(log));
}
function loadCustomExercises(k: string): Exercise[] | null {
  try {
    const raw = localStorage.getItem(customKey(k));
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}
function saveCustomExercises(k: string, exercises: Exercise[]) {
  localStorage.setItem(customKey(k), JSON.stringify(exercises));
}

function initSets(ex: Exercise, saved: SetData[] | undefined): SetData[] {
  const count = parseInt(ex.sets) || 3;
  return Array.from({ length: count }, (_, i) =>
    saved?.[i] ?? { done: false, weight: "", reps: "" }
  );
}

// ── Component ──────────────────────────────────────────────────────────────
export default function WorkoutTab() {
  const [selectedKey, setSelectedKey]           = useState<string>("Upper");
  const [rotationIdx, setRotationIdx]           = useState(0);
  const [session, setSession]                   = useState<ExerciseLog>({});
  const [history, setHistory]                   = useState<ExerciseLog>({});
  const [timer, setTimer]                       = useState<number | null>(null);
  const [timerRunning, setTimerRunning]         = useState(false);
  const [timerLabel, setTimerLabel]             = useState("");
  const [expandedExercise, setExpandedExercise] = useState<string | null>(null);
  const [warmupDone, setWarmupDone]             = useState(false);
  const [warmupChoice, setWarmupChoice]         = useState<string>("");
  const [cooldownDone, setCooldownDone]         = useState(false);
  const [absDone, setAbsDone]                   = useState<Record<string, boolean>>({});
  const [showConfetti, setShowConfetti]         = useState(false);

  // Exercise customization
  const [editMode, setEditMode]                 = useState(false);
  const [customExercises, setCustomExercises]   = useState<Record<string, Exercise[]>>({});
  const [showAddForm, setShowAddForm]           = useState(false);
  const [newEx, setNewEx]                       = useState<{ name: string; sets: string; reps: string; rest: string }>({
    name: "", sets: "3", reps: "8–12", rest: "90 sec"
  });

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const idx = getRotationIndex();
    setRotationIdx(idx);
    setSelectedKey(workoutRotation[idx]);

    // Load all custom exercise lists
    const allCustom: Record<string, Exercise[]> = {};
    for (const k of workoutRotation) {
      const custom = loadCustomExercises(k);
      if (custom) allCustom[k] = custom;
    }
    setCustomExercises(allCustom);
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
  }, [selectedKey]);

  useEffect(() => {
    if (timerRunning && timer !== null && timer > 0) {
      intervalRef.current = setInterval(() => {
        setTimer(t => {
          if (t === null || t <= 1) {
            setTimerRunning(false);
            clearInterval(intervalRef.current!);
            return 0;
          }
          return t - 1;
        });
      }, 1000);
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [timerRunning, timer]);

  const workout = workouts[selectedKey];

  // Effective exercises = custom override or default
  const effectiveExercises: Exercise[] = customExercises[selectedKey] ?? workout?.exercises ?? [];

  // ── Exercise customization helpers ─────────────────────────────────────
  function removeExercise(name: string) {
    const updated = effectiveExercises.filter(e => e.name !== name);
    const next = { ...customExercises, [selectedKey]: updated };
    setCustomExercises(next);
    saveCustomExercises(selectedKey, updated);
  }

  function addExercise() {
    if (!newEx.name.trim()) return;
    const ex: Exercise = {
      name: newEx.name.trim(),
      sets: newEx.sets || "3",
      reps: newEx.reps || "8–12",
      rest: newEx.rest || "90 sec",
      notes: "",
    };
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
    localStorage.removeItem(customKey(selectedKey));
    setEditMode(false);
  }

  // ── Set helpers ────────────────────────────────────────────────────────
  function getSets(ex: Exercise): SetData[] {
    return initSets(ex, session[ex.name]);
  }

  function updateSet(ex: Exercise, setIdx: number, patch: Partial<SetData>) {
    const current = getSets(ex);
    const updated = current.map((s, i) => i === setIdx ? { ...s, ...patch } : s);
    const newSession = { ...session, [ex.name]: updated };
    setSession(newSession);
    saveSession(selectedKey, newSession);
  }

  function toggleDone(ex: Exercise, setIdx: number) {
    const sets = getSets(ex);
    const wasDone = sets[setIdx].done;
    updateSet(ex, setIdx, { done: !wasDone });
    if (!wasDone && ex.rest) startTimer(parseRestTime(ex.rest), "Rest");

    if (!wasDone) {
      const newSession = { ...session, [ex.name]: sets.map((s, i) => i === setIdx ? { ...s, done: true } : s) };
      const allDone = effectiveExercises.every(e => {
        const eSets = initSets(e, newSession[e.name]);
        return eSets.every(s => s.done);
      });
      if (allDone) setShowConfetti(true);
    }
  }

  function resetWorkout() {
    archiveSession(selectedKey, session);
    setSession({});
    saveSession(selectedKey, {});
    setHistory(loadHistory(selectedKey));
    setWarmupDone(false);
    setWarmupChoice("");
    setCooldownDone(false);
    setAbsDone({});
  }

  // ── Timer ──────────────────────────────────────────────────────────────
  const startTimer = (seconds: number, label: string) => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setTimer(seconds);
    setTimerLabel(label);
    setTimerRunning(true);
  };
  const stopTimer = () => {
    setTimerRunning(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
    setTimer(null);
    setTimerLabel("");
  };
  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  // ── Progress ───────────────────────────────────────────────────────────
  const totalSets = effectiveExercises.reduce((acc, ex) => acc + (parseInt(ex.sets) || 3), 0);
  const doneSets  = effectiveExercises.reduce((acc, ex) => acc + getSets(ex).filter(s => s.done).length, 0);
  const mainDone  = totalSets > 0 && doneSets === totalSets;
  const abTotal   = AB_EXERCISES.length;
  const abDoneCount = Object.values(absDone).filter(Boolean).length;
  const isCustomized = !!customExercises[selectedKey];

  return (
    <div className="px-4 py-4 space-y-4">

      {showConfetti && <Confetti onDone={() => setShowConfetti(false)} />}

      {/* Workout Selector */}
      <div>
        <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Pick a workout</p>
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {workoutRotation.map((key, idx) => {
            const w = workouts[key];
            const isNext = idx === rotationIdx;
            const isSelected = key === selectedKey;
            const isCustomized = !!customExercises[key];
            return (
              <button key={key} onClick={() => setSelectedKey(key)}
                className={`flex-shrink-0 flex flex-col items-center px-3 py-2.5 rounded-xl border transition-all min-w-[64px] ${
                  isSelected
                    ? "bg-yellow-400 text-black border-yellow-400 font-bold"
                    : isNext
                    ? "bg-yellow-400/10 text-yellow-300 border-yellow-500/40"
                    : "bg-gray-900/50 text-gray-400 border-gray-800 hover:border-gray-600"
                }`}>
                <span className="text-lg">{w.emoji}</span>
                <span className="text-[10px] font-semibold mt-0.5 uppercase tracking-tight">{key}</span>
                {isCustomized && <span className="text-[8px] text-yellow-500 mt-0.5">custom</span>}
                {isNext && !isSelected && !isCustomized && <span className="text-[9px] text-yellow-400 mt-0.5">NEXT UP</span>}
              </button>
            );
          })}
        </div>
      </div>

      {workout && (<>

        {/* ── WARM-UP ── */}
        <div className={`rounded-2xl p-4 border transition-all ${
          warmupDone ? "bg-green-500/5 border-green-500/30" : "bg-orange-500/5 border-orange-500/30"
        }`}>
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-orange-400">Step 1 — Warm-Up</p>
              <p className="text-sm font-semibold text-white mt-0.5">10 minutes · get the blood moving</p>
            </div>
            {warmupDone && <span className="text-green-400 text-lg font-bold">✓</span>}
          </div>

          {!warmupDone && (
            <div className="grid grid-cols-4 gap-2 mb-3">
              {WARMUP_OPTIONS.map(opt => (
                <button key={opt.id} onClick={() => setWarmupChoice(opt.id)}
                  className={`flex flex-col items-center gap-1 py-2.5 px-1 rounded-xl border text-xs font-semibold transition-all ${
                    warmupChoice === opt.id
                      ? "bg-orange-400/20 text-orange-300 border-orange-400/50"
                      : "bg-gray-900 text-gray-400 border-gray-800 hover:border-gray-600"
                  }`}>
                  <span className="text-base font-mono">{opt.icon}</span>
                  <span className="text-center leading-tight text-[10px]">{opt.label}</span>
                </button>
              ))}
            </div>
          )}

          {!warmupDone && (
            <div className="flex gap-2">
              <button onClick={() => startTimer(10 * 60, "Warm-Up")}
                className="flex-1 py-2 rounded-xl bg-orange-400/20 text-orange-300 text-sm font-semibold hover:bg-orange-400/30">
                Start 10-min timer
              </button>
              <button onClick={() => setWarmupDone(true)}
                className="py-2 px-4 rounded-xl bg-green-500/20 text-green-400 text-sm font-semibold hover:bg-green-500/30">
                Done
              </button>
            </div>
          )}

          {warmupDone && (
            <p className="text-xs text-green-400">
              {warmupChoice ? `${WARMUP_OPTIONS.find(o => o.id === warmupChoice)?.label} — ` : ""}Warmed up and ready
            </p>
          )}
        </div>

        {/* ── TIMER ── */}
        {timer !== null && (
          <div className={`rounded-2xl p-4 border text-center transition-all ${
            timer === 0
              ? "bg-green-500/10 border-green-500/30 text-green-400"
              : timerLabel === "Warm-Up" || timerLabel === "Cool-Down"
              ? "bg-orange-500/10 border-orange-500/30 text-orange-300"
              : "bg-blue-500/10 border-blue-500/30 text-blue-400"
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
                  <button onClick={() => setTimerRunning(!timerRunning)}
                    className="px-4 py-1.5 rounded-lg bg-current/10 text-sm hover:bg-current/20">
                    {timerRunning ? "Pause" : "Resume"}
                  </button>
                  <button onClick={stopTimer}
                    className="px-4 py-1.5 rounded-lg bg-gray-800 text-gray-400 text-sm hover:bg-gray-700">
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── WORKOUT HEADER ── */}
        <div className={`rounded-2xl p-4 border ${colorMap[workout.color] || "text-yellow-400 bg-yellow-400/10 border-yellow-500/30"}`}>
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              {selectedKey === workoutRotation[rotationIdx] && (
                <span className="text-xs font-bold uppercase tracking-widest opacity-60 bg-current/10 px-2 py-0.5 rounded-full">Next Up</span>
              )}
              <h2 className="text-xl font-bold mt-1">{workout.emoji} {workout.name}</h2>
              <p className="text-xs opacity-60 mt-0.5">Step 2 · {effectiveExercises.length} exercises{isCustomized ? " · customized" : ""}</p>
            </div>
            <div className="flex items-start gap-3">
              {/* Edit button */}
              <button
                onClick={() => { setEditMode(!editMode); setShowAddForm(false); }}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                  editMode
                    ? "bg-yellow-400 text-black border-yellow-400"
                    : "bg-gray-800 text-gray-400 border-gray-700 hover:border-gray-500"
                }`}
              >
                {editMode ? "Done" : "✏️ Edit"}
              </button>
              <div className="text-right">
                <p className="text-2xl font-bold">{doneSets}/{totalSets}</p>
                <p className="text-xs opacity-70">sets done</p>
                {doneSets > 0 && (
                  <button onClick={resetWorkout} className="text-xs opacity-50 hover:opacity-80 mt-1">reset</button>
                )}
              </div>
            </div>
          </div>
          {totalSets > 0 && (
            <div className="mt-3">
              <div className="h-2 bg-black/30 rounded-full overflow-hidden">
                <div className="h-full bg-current rounded-full transition-all duration-500"
                  style={{ width: `${(doneSets / totalSets) * 100}%` }} />
              </div>
            </div>
          )}
        </div>

        {/* ── EXERCISE LIST ── */}
        <div className="space-y-3">
          {effectiveExercises.map((ex, exIdx) => {
            const sets       = getSets(ex);
            const done       = sets.filter(s => s.done).length;
            const total      = sets.length;
            const isComplete = done === total;
            const isExpanded = !editMode && expandedExercise === ex.name;
            const prevSets   = history[ex.name];
            const lastBest   = prevSets?.reduce<SetData | null>((b, s) => {
              if (!s.weight) return b;
              return !b || parseFloat(s.weight) > parseFloat(b.weight || "0") ? s : b;
            }, null);

            return (
              <div key={`${ex.name}-${exIdx}`} className={`bg-[#0f0f1a] border rounded-2xl overflow-hidden transition-all ${
                editMode ? "border-yellow-500/20" : isComplete ? "border-green-500/30" : "border-gray-800"
              }`}>
                {/* Edit mode row */}
                {editMode ? (
                  <div className="flex items-center gap-3 p-4">
                    <div className="w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 bg-gray-800 text-gray-400">
                      {exIdx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm text-white">{ex.name}</p>
                      <p className="text-xs text-gray-500">{ex.sets} sets × {ex.reps}</p>
                    </div>
                    <button
                      onClick={() => removeExercise(ex.name)}
                      className="w-8 h-8 rounded-lg bg-red-500/20 text-red-400 flex items-center justify-center text-sm hover:bg-red-500/40 flex-shrink-0"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <>
                    <button onClick={() => setExpandedExercise(isExpanded ? null : ex.name)}
                      className="w-full flex items-center gap-3 p-4 text-left">
                      <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                        isComplete ? "bg-green-500 text-white" : "bg-gray-800 text-gray-400"
                      }`}>
                        {isComplete ? "✓" : exIdx + 1}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`font-semibold text-sm ${isComplete ? "text-gray-500 line-through" : "text-white"}`}>{ex.name}</p>
                        <p className="text-xs text-gray-500 mt-0.5">
                          {ex.sets} sets × {ex.reps}
                          {ex.rest && <span className="ml-2 text-blue-400/70">· {ex.rest} rest</span>}
                        </p>
                        {lastBest && (
                          <p className="text-[11px] text-yellow-400/60 mt-0.5">Last: {lastBest.weight} lbs × {lastBest.reps || "?"} reps</p>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-xs font-semibold ${isComplete ? "text-green-400" : "text-gray-500"}`}>{done}/{total}</span>
                        <span className="text-gray-600 text-sm">{isExpanded ? "▲" : "▼"}</span>
                      </div>
                    </button>

                    {isExpanded && (
                      <div className="px-4 pb-4 space-y-3 border-t border-gray-800/50 pt-3">
                        {ex.notes && (
                          <p className="text-xs text-yellow-400/80 bg-yellow-400/5 rounded-lg px-3 py-2">{ex.notes}</p>
                        )}
                        <div className="grid grid-cols-[32px_1fr_76px_76px_36px] gap-2 px-1">
                          <div /><p className="text-[10px] text-gray-600 uppercase tracking-wider">Set</p>
                          <p className="text-[10px] text-gray-600 uppercase tracking-wider text-center">lbs</p>
                          <p className="text-[10px] text-gray-600 uppercase tracking-wider text-center">Reps</p>
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
                                  setData.done ? "bg-green-500 text-white" : "bg-gray-800 text-gray-400"
                                }`}>{setIdx + 1}</span>
                                <span className={`text-sm font-medium ${setData.done ? "text-gray-500" : "text-gray-200"}`}>Set {setIdx + 1}</span>
                                <input type="number" inputMode="decimal"
                                  placeholder={prev?.weight || "—"} value={setData.weight}
                                  onChange={e => updateSet(ex, setIdx, { weight: e.target.value })}
                                  onClick={e => e.stopPropagation()}
                                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-center text-sm text-white placeholder-gray-600 focus:outline-none focus:border-yellow-500/50" />
                                <input type="number" inputMode="numeric"
                                  placeholder={prev?.reps || ex.reps.split(/[-–]/)[0]} value={setData.reps}
                                  onChange={e => updateSet(ex, setIdx, { reps: e.target.value })}
                                  onClick={e => e.stopPropagation()}
                                  className="w-full bg-gray-800 border border-gray-700 rounded-lg px-2 py-1.5 text-center text-sm text-white placeholder-gray-600 focus:outline-none focus:border-yellow-500/50" />
                                <button onClick={() => toggleDone(ex, setIdx)}
                                  className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all text-sm ${
                                    setData.done ? "bg-green-500 text-white" : "bg-gray-700 text-gray-500 hover:bg-gray-600"
                                  }`}>
                                  {setData.done ? "✓" : "·"}
                                </button>
                              </div>
                              {prev?.weight && (
                                <p className="text-[10px] text-gray-600 pl-10">Last: {prev.weight} lbs × {prev.reps || "?"} reps</p>
                              )}
                            </div>
                          );
                        })}
                        {ex.rest && (
                          <div className="flex items-center justify-between pt-1">
                            <p className="text-xs text-gray-500">Rest: {ex.rest}</p>
                            <button onClick={() => startTimer(parseRestTime(ex.rest!), "Rest")}
                              className="text-xs text-blue-400 hover:text-blue-300 bg-blue-400/10 px-3 py-1 rounded-lg">
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

          {/* Edit mode: Add exercise form */}
          {editMode && (
            <div className="bg-[#0f0f1a] border border-dashed border-yellow-500/30 rounded-2xl p-4 space-y-3">
              {!showAddForm ? (
                <button
                  onClick={() => setShowAddForm(true)}
                  className="w-full py-3 text-sm text-yellow-400 font-semibold flex items-center justify-center gap-2 hover:text-yellow-300"
                >
                  <span className="text-lg">＋</span> Add Exercise
                </button>
              ) : (
                <>
                  <p className="text-xs text-yellow-400 font-semibold uppercase tracking-wide">New Exercise</p>
                  <input
                    type="text"
                    placeholder="Exercise name (e.g. Bicep Curls)"
                    value={newEx.name}
                    onChange={e => setNewEx(p => ({ ...p, name: e.target.value }))}
                    className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-white placeholder-gray-600 outline-none focus:border-yellow-500/50"
                  />
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <p className="text-[10px] text-gray-500 mb-1">Sets</p>
                      <input
                        type="number"
                        value={newEx.sets}
                        onChange={e => setNewEx(p => ({ ...p, sets: e.target.value }))}
                        className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white text-center outline-none focus:border-yellow-500/50"
                      />
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-500 mb-1">Reps</p>
                      <input
                        type="text"
                        value={newEx.reps}
                        onChange={e => setNewEx(p => ({ ...p, reps: e.target.value }))}
                        placeholder="8–12"
                        className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white text-center outline-none focus:border-yellow-500/50"
                      />
                    </div>
                    <div>
                      <p className="text-[10px] text-gray-500 mb-1">Rest</p>
                      <input
                        type="text"
                        value={newEx.rest}
                        onChange={e => setNewEx(p => ({ ...p, rest: e.target.value }))}
                        placeholder="90 sec"
                        className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2 text-sm text-white text-center outline-none focus:border-yellow-500/50"
                      />
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={addExercise}
                      className="flex-1 py-2.5 rounded-xl bg-yellow-400 text-black text-sm font-bold hover:bg-yellow-300"
                    >
                      Add
                    </button>
                    <button
                      onClick={() => setShowAddForm(false)}
                      className="py-2.5 px-4 rounded-xl bg-gray-800 text-gray-400 text-sm hover:bg-gray-700"
                    >
                      Cancel
                    </button>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Edit mode: reset to default */}
          {editMode && isCustomized && (
            <button
              onClick={resetToDefault}
              className="w-full py-2.5 text-xs text-gray-500 hover:text-red-400 border border-gray-800 rounded-xl transition-colors"
            >
              Reset to default workout
            </button>
          )}
        </div>

        {/* ── AB FINISHER ── */}
        <div className={`rounded-2xl p-4 border transition-all ${
          abDoneCount === abTotal ? "bg-green-500/5 border-green-500/30" : "bg-purple-500/5 border-purple-500/30"
        }`}>
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-purple-400">Step 3 — Ab Finisher</p>
              <p className="text-sm font-semibold text-white mt-0.5">Core circuit · every lift day</p>
            </div>
            <span className={`text-xs font-bold ${abDoneCount === abTotal ? "text-green-400" : "text-purple-400"}`}>
              {abDoneCount}/{abTotal}
            </span>
          </div>
          <div className="space-y-2">
            {AB_EXERCISES.map((ex) => {
              const done = absDone[ex.name] || false;
              return (
                <div key={ex.name} className={`rounded-xl border p-3 transition-all ${
                  done ? "bg-green-500/5 border-green-500/20" : "bg-gray-900/50 border-gray-800"
                }`}>
                  <button onClick={() => setAbsDone(prev => ({ ...prev, [ex.name]: !done }))}
                    className="w-full flex items-center gap-3 text-left">
                    <span className={`w-6 h-6 rounded-md flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                      done ? "bg-green-500 text-white" : "bg-gray-800 text-gray-400"
                    }`}>{done ? "✓" : ""}</span>
                    <div className="flex-1 min-w-0">
                      <p className={`text-sm font-semibold ${done ? "text-gray-500 line-through" : "text-white"}`}>{ex.name}</p>
                      <p className="text-xs text-gray-500">{ex.sets} sets × {ex.reps}{ex.rest ? ` · ${ex.rest} rest` : ""}</p>
                    </div>
                  </button>
                  {!done && ex.notes && (
                    <p className="text-xs text-purple-300/60 mt-2 pl-9 leading-relaxed">{ex.notes}</p>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ── COOL DOWN ── */}
        <div className={`rounded-2xl p-4 border transition-all ${
          cooldownDone ? "bg-green-500/5 border-green-500/30" : "bg-blue-500/5 border-blue-500/30"
        }`}>
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-blue-400">Step 4 — Cool Down</p>
              <p className="text-sm font-semibold text-white mt-0.5">5 minutes · stretch it out</p>
            </div>
            {cooldownDone && <span className="text-green-400 text-lg font-bold">✓</span>}
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
                  className="flex-1 py-2 rounded-xl bg-blue-400/20 text-blue-300 text-sm font-semibold hover:bg-blue-400/30">
                  Start 5-min timer
                </button>
                <button onClick={() => setCooldownDone(true)}
                  className="py-2 px-4 rounded-xl bg-green-500/20 text-green-400 text-sm font-semibold hover:bg-green-500/30">
                  Done
                </button>
              </div>
            </div>
          ) : (
            <p className="text-xs text-green-400">Stretched and recovered — great session</p>
          )}
        </div>

        {/* ── COMPLETION ── */}
        {mainDone && (
          <div className="bg-green-500/10 border border-green-500/30 rounded-2xl p-5 text-center">
            <p className="text-lg font-bold text-green-400">Workout Complete! 🎉</p>
            <p className="text-xs text-gray-400 mt-1">
              {abDoneCount < abTotal ? "Finish the ab circuit and cool down to wrap up." : "All done — mark it on the Today tab to advance your rotation."}
            </p>
            <button onClick={resetWorkout}
              className="mt-3 text-xs text-gray-500 hover:text-gray-300 bg-gray-800 px-4 py-2 rounded-lg">
              Save & reset for next session
            </button>
          </div>
        )}

      </>)}
    </div>
  );
}

function parseRestTime(rest: string): number {
  const minMatch   = rest.match(/(\d+)\s*min/);
  if (minMatch) return parseInt(minMatch[1]) * 60;
  const rangeMatch = rest.match(/(\d+)[–-](\d+)\s*sec/);
  if (rangeMatch) return Math.round((parseInt(rangeMatch[1]) + parseInt(rangeMatch[2])) / 2);
  const secMatch   = rest.match(/(\d+)\s*sec/);
  if (secMatch) return parseInt(secMatch[1]);
  return 60;
}
