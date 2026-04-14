"use client";

import { useState, useEffect } from "react";
import { workouts, workoutRotation } from "../data/workouts";

type Tab = "today" | "workout" | "meals" | "recipes" | "progress";
type ActivityType = "lift" | "swim" | "bike" | "rest" | null;

interface TodayTabProps {
  onNavigate: (tab: Tab) => void;
}

const ROTATION_KEY = "bws-rotation-index";

function getRotationIndex(): number {
  if (typeof window === "undefined") return 0;
  return parseInt(localStorage.getItem(ROTATION_KEY) || "0", 10) % workoutRotation.length;
}

function advanceRotation() {
  const next = (getRotationIndex() + 1) % workoutRotation.length;
  localStorage.setItem(ROTATION_KEY, String(next));
  return next;
}

const ACTIVITIES: { type: ActivityType; label: string; color: string; icon: string }[] = [
  { type: "lift",  label: "Lift",          color: "yellow", icon: "↑" },
  { type: "swim",  label: "Swim Laps",    color: "blue",   icon: "~" },
  { type: "bike",  label: "Mountain Bike", color: "green",  icon: "◎" },
  { type: "rest",  label: "Rest / Fish",   color: "gray",   icon: "—" },
];

const COLOR = {
  yellow: { bg: "bg-yellow-400/15 border-yellow-500/40", text: "text-yellow-400", active: "bg-yellow-400 text-black border-yellow-400" },
  blue:   { bg: "bg-blue-400/15 border-blue-500/40",     text: "text-blue-400",   active: "bg-blue-400 text-black border-blue-400"   },
  green:  { bg: "bg-green-400/15 border-green-500/40",   text: "text-green-400",  active: "bg-green-400 text-black border-green-400"  },
  gray:   { bg: "bg-gray-700/30 border-gray-600/40",     text: "text-gray-400",   active: "bg-gray-500 text-white border-gray-500"    },
};

const BREAKFAST = [
  { key: "coffee",   label: "Black Coffee",          cal: 0,   protein: 0  },
  { key: "yogurt",   label: "Greek Yogurt + Berries", cal: 180, protein: 18 },
  { key: "smoothie", label: "Protein Smoothie",       cal: 310, protein: 30 },
];

const isWeekend = () => { const d = new Date().getDay(); return d === 0 || d === 6; };

export default function TodayTab({ onNavigate }: TodayTabProps) {
  const [activity, setActivity]     = useState<ActivityType>(null);
  const [checkedMeals, setCheckedMeals] = useState<Record<string, boolean>>({});
  const [waterCount, setWaterCount] = useState(0);
  const [workoutDone, setWorkoutDone] = useState(false);
  const [rotationIdx, setRotationIdx] = useState(0);
  const [sleepHours, setSleepHours] = useState<number | null>(null);
  const [lunchDone, setLunchDone]   = useState(false);
  const [dinnerDone, setDinnerDone] = useState(false);

  const dateKey = new Date().toDateString();

  useEffect(() => {
    setRotationIdx(getRotationIndex());
    const saved = localStorage.getItem(`bws-today-${dateKey}`);
    if (saved) {
      const p = JSON.parse(saved);
      setCheckedMeals(p.meals || {});
      setWaterCount(p.water || 0);
      setWorkoutDone(p.workoutDone || false);
      setActivity(p.activity ?? null);
      setSleepHours(p.sleep ?? null);
      setLunchDone(p.lunchDone || false);
      setDinnerDone(p.dinnerDone || false);
    }
  }, [dateKey]);

  const persist = (updates: object) => {
    const current = JSON.parse(localStorage.getItem(`bws-today-${dateKey}`) || "{}");
    localStorage.setItem(`bws-today-${dateKey}`, JSON.stringify({ ...current, ...updates }));
  };

  const selectActivity = (a: ActivityType) => { setActivity(a); persist({ activity: a }); };

  const toggleMeal = (key: string) => {
    const updated = { ...checkedMeals, [key]: !checkedMeals[key] };
    setCheckedMeals(updated);
    persist({ meals: updated });
  };

  const setWater = (n: number) => { setWaterCount(n); persist({ water: n }); };

  const adjustSleep = (delta: number) => {
    const current = sleepHours ?? 7;
    const next = Math.min(12, Math.max(3, Math.round((current + delta) * 2) / 2));
    setSleepHours(next);
    persist({ sleep: next });
  };

  const markWorkoutDone = () => {
    const updated = !workoutDone;
    setWorkoutDone(updated);
    if (updated) { const next = advanceRotation(); setRotationIdx(next); }
    persist({ workoutDone: updated });
  };

  const nextWorkoutKey = workoutRotation[rotationIdx];
  const nextWorkout = workouts[nextWorkoutKey];

  const breakfastDone = BREAKFAST.filter(b => checkedMeals[b.key]).length;
  const activityDone = workoutDone || activity === "swim" || activity === "bike";
  const totalChecks = BREAKFAST.length + 1 + 1 + (activityDone ? 0 : 1) + (waterCount >= 8 ? 0 : 1);
  const doneChecks  = breakfastDone + (lunchDone ? 1 : 0) + (dinnerDone ? 1 : 0) + (activityDone ? 1 : 0) + Math.min(waterCount, 8) / 8;
  const progress = Math.round((doneChecks / (BREAKFAST.length + 2 + 1 + 1)) * 100);

  const hour = new Date().getHours();
  const greeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const activeActivity = ACTIVITIES.find(a => a.type === activity);

  return (
    <div className="px-4 py-4 space-y-5">

      {/* Greeting + Progress */}
      <div className="bg-gradient-to-r from-yellow-500/20 to-orange-500/10 border border-yellow-500/30 rounded-2xl p-4">
        <p className="text-sm text-yellow-300/70">{greeting}, Colin</p>
        <h2 className="text-xl font-bold text-white mt-1">
          {activity ? `${activeActivity?.label} Day` : "What are you doing today?"}
        </h2>
        <p className="text-xs text-gray-400 mt-1">
          {new Date().toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric" })}
        </p>
        <div className="mt-3">
          <div className="flex justify-between text-xs text-gray-400 mb-1">
            <span>Daily Progress</span>
            <span className="text-yellow-400 font-bold">{Math.min(progress, 100)}%</span>
          </div>
          <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-yellow-400 to-orange-400 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(progress, 100)}%` }} />
          </div>
        </div>
      </div>

      {/* Sleep Tracker */}
      <div className="bg-[#0f0f1a] border border-gray-800 rounded-2xl p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-white text-sm">Sleep Last Night</h3>
            <p className="text-xs text-gray-500 mt-0.5">Garmin logged</p>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={() => adjustSleep(-0.5)}
              className="w-8 h-8 rounded-lg bg-gray-800 text-gray-300 text-lg font-bold hover:bg-gray-700 flex items-center justify-center">−</button>
            <span className="text-xl font-bold text-white min-w-[52px] text-center">
              {sleepHours !== null ? `${sleepHours}h` : "—"}
            </span>
            <button onClick={() => adjustSleep(0.5)}
              className="w-8 h-8 rounded-lg bg-gray-800 text-gray-300 text-lg font-bold hover:bg-gray-700 flex items-center justify-center">+</button>
          </div>
        </div>
        {sleepHours !== null && (
          <div className="mt-2">
            <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all ${
                sleepHours >= 7.5 ? "bg-green-400" : sleepHours >= 6 ? "bg-yellow-400" : "bg-red-400"
              }`} style={{ width: `${Math.min((sleepHours / 9) * 100, 100)}%` }} />
            </div>
            <p className={`text-xs mt-1 ${sleepHours >= 7.5 ? "text-green-400" : sleepHours >= 6 ? "text-yellow-400" : "text-red-400"}`}>
              {sleepHours >= 7.5 ? "Well rested — great for muscle recovery" : sleepHours >= 6 ? "Decent — aim for 7.5h+" : "Low — prioritise sleep tonight"}
            </p>
          </div>
        )}
      </div>

      {/* Activity Picker */}
      <div className="bg-[#0f0f1a] border border-gray-800 rounded-2xl p-4">
        <h3 className="font-bold text-white mb-3">Today&apos;s Activity</h3>
        <div className="grid grid-cols-2 gap-2">
          {ACTIVITIES.map((a) => {
            const c = COLOR[a.color as keyof typeof COLOR];
            const isSelected = activity === a.type;
            return (
              <button key={a.type} onClick={() => selectActivity(a.type)}
                className={`flex items-center gap-2.5 px-3 py-3 rounded-xl border font-semibold text-sm transition-all ${
                  isSelected ? c.active : `${c.bg} ${c.text}`
                }`}>
                <span className="text-base font-mono w-4 text-center">{a.icon}</span>
                <span>{a.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Lift Panel */}
      {activity === "lift" && (
        <div className="bg-[#0f0f1a] border border-gray-800 rounded-2xl p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="text-xs text-gray-500 uppercase tracking-wider">Next in rotation</p>
              <h3 className="font-bold text-white text-lg mt-0.5">
                {nextWorkout.emoji} {nextWorkout.name}
              </h3>
            </div>
            <button onClick={() => onNavigate("workout")}
              className="text-xs text-yellow-400 border border-yellow-500/30 px-3 py-1.5 rounded-lg hover:bg-yellow-400/10">
              Open →
            </button>
          </div>
          <div className="space-y-1.5 mb-4">
            {nextWorkout.exercises.slice(0, 4).map((ex, i) => (
              <div key={i} className="flex items-center gap-2 text-sm text-gray-300">
                <span className="text-yellow-400 font-mono text-xs w-4">{i + 1}.</span>
                <span className="flex-1 truncate">{ex.name}</span>
                <span className="text-gray-500 text-xs">{ex.sets}×{ex.reps}</span>
              </div>
            ))}
            {nextWorkout.exercises.length > 4 && (
              <p className="text-xs text-gray-500 pl-6">+ {nextWorkout.exercises.length - 4} more</p>
            )}
          </div>
          <button onClick={markWorkoutDone}
            className={`w-full py-3 rounded-xl font-semibold text-sm transition-all ${
              workoutDone
                ? "bg-green-500/20 text-green-400 border border-green-500/30"
                : "bg-yellow-400 text-black hover:bg-yellow-300"
            }`}>
            {workoutDone ? `Done! Next: ${workoutRotation[(rotationIdx) % workoutRotation.length]}` : "Mark Workout Complete"}
          </button>
        </div>
      )}

      {/* Active Recovery */}
      {activity === "swim" && <ActiveCard title="Swim Session" color="blue"
        tip="Aim for 20–40 min of continuous laps. Great full-body cardio with zero joint impact." />}
      {activity === "bike" && <ActiveCard title="Mountain Bike" color="green"
        tip="Any length counts. The elevation changes and resistance burn serious calories — enjoy it." />}
      {activity === "rest" && <ActiveCard title="Rest Day" color="gray"
        tip="Recovery is when muscle growth actually happens. Fish, relax, come back fresh." />}

      {/* Weekend Alcohol Note */}
      {isWeekend() && (
        <div className="bg-purple-500/10 border border-purple-500/20 rounded-2xl p-3">
          <p className="text-xs text-purple-300 font-semibold">Weekend — Vermouth</p>
          <p className="text-xs text-gray-400 mt-0.5">1–2 glasses is fine. Try Yzaguirre or Zarzaparilla. Enjoy it without guilt — consistency over perfection.</p>
        </div>
      )}

      {/* Breakfast */}
      <div className="bg-[#0f0f1a] border border-gray-800 rounded-2xl p-4">
        <h3 className="font-bold text-white mb-3">Breakfast</h3>
        <div className="space-y-2">
          {BREAKFAST.map(b => (
            <button key={b.key} onClick={() => toggleMeal(b.key)}
              className={`w-full flex items-center gap-3 p-2.5 rounded-xl transition-all text-left ${
                checkedMeals[b.key] ? "bg-green-500/10 border border-green-500/20" : "bg-gray-900/50 border border-gray-800"
              }`}>
              <span className={`w-5 h-5 rounded-md flex-shrink-0 flex items-center justify-center text-xs ${
                checkedMeals[b.key] ? "bg-green-500 text-white" : "bg-gray-700 text-gray-500"
              }`}>{checkedMeals[b.key] ? "✓" : ""}</span>
              <div className="flex-1">
                <p className={`text-sm font-medium ${checkedMeals[b.key] ? "line-through text-gray-500" : "text-white"}`}>{b.label}</p>
                {b.cal > 0 && <p className="text-xs text-gray-500">{b.cal} cal · {b.protein}g protein</p>}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Lunch + Dinner */}
      <div className="bg-[#0f0f1a] border border-gray-800 rounded-2xl p-4 space-y-3">
        <h3 className="font-bold text-white">Meals</h3>
        <button onClick={() => { setLunchDone(!lunchDone); persist({ lunchDone: !lunchDone }); }}
          className={`w-full flex items-center gap-3 p-2.5 rounded-xl transition-all text-left ${
            lunchDone ? "bg-green-500/10 border border-green-500/20" : "bg-gray-900/50 border border-gray-800"
          }`}>
          <span className={`w-5 h-5 rounded-md flex-shrink-0 flex items-center justify-center text-xs ${
            lunchDone ? "bg-green-500 text-white" : "bg-gray-700 text-gray-500"
          }`}>{lunchDone ? "✓" : ""}</span>
          <div className="flex-1">
            <p className={`text-sm font-medium ${lunchDone ? "line-through text-gray-500" : "text-white"}`}>Meal prep lunch</p>
            <p className="text-xs text-gray-500">One of your 5 prepped containers</p>
          </div>
          <button onClick={(e) => { e.stopPropagation(); onNavigate("meals"); }}
            className="text-xs text-yellow-400 border border-yellow-500/30 px-2 py-1 rounded-lg">Plan</button>
        </button>
        <button onClick={() => { setDinnerDone(!dinnerDone); persist({ dinnerDone: !dinnerDone }); }}
          className={`w-full flex items-center gap-3 p-2.5 rounded-xl transition-all text-left ${
            dinnerDone ? "bg-green-500/10 border border-green-500/20" : "bg-gray-900/50 border border-gray-800"
          }`}>
          <span className={`w-5 h-5 rounded-md flex-shrink-0 flex items-center justify-center text-xs ${
            dinnerDone ? "bg-green-500 text-white" : "bg-gray-700 text-gray-500"
          }`}>{dinnerDone ? "✓" : ""}</span>
          <div className="flex-1">
            <p className={`text-sm font-medium ${dinnerDone ? "line-through text-gray-500" : "text-white"}`}>Dinner</p>
            <p className="text-xs text-gray-500">Home-cooked — check Recipes tab for ideas</p>
          </div>
          <button onClick={(e) => { e.stopPropagation(); onNavigate("recipes"); }}
            className="text-xs text-yellow-400 border border-yellow-500/30 px-2 py-1 rounded-lg">Recipes</button>
        </button>
      </div>

      {/* Water */}
      <div className="bg-[#0f0f1a] border border-gray-800 rounded-2xl p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-bold text-white">Water</h3>
          <span className="text-xs text-gray-500">Goal: 8 glasses / 2L</span>
        </div>
        <div className="flex flex-wrap gap-2 mb-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <button key={i} onClick={() => setWater(i < waterCount ? i : i + 1)}
              className={`w-10 h-10 rounded-xl text-lg transition-all ${
                i < waterCount ? "bg-blue-500/30 text-blue-300" : "bg-gray-800 text-gray-600"
              }`}>
              {i < waterCount ? "◉" : "○"}
            </button>
          ))}
        </div>
        <p className="text-sm text-gray-400">
          <span className="text-blue-400 font-bold">{waterCount}</span> / 8
          {waterCount >= 8 && <span className="text-green-400 ml-2">Goal reached</span>}
        </p>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-4 gap-2">
        <StatCard label="Sleep" value={sleepHours !== null ? `${sleepHours}h` : "—"} color={sleepHours && sleepHours >= 7 ? "green" : "gray"} />
        <StatCard label="Active" value={activityDone ? "Yes" : "—"} color="yellow" />
        <StatCard label="Water" value={`${waterCount}/8`} color="blue" />
        <StatCard label="Meals" value={`${breakfastDone + (lunchDone ? 1 : 0) + (dinnerDone ? 1 : 0)}/${BREAKFAST.length + 2}`} color="purple" />
      </div>
    </div>
  );
}

function ActiveCard({ title, tip, color }: { title: string; tip: string; color: string }) {
  const colorMap: Record<string, string> = {
    blue:  "bg-blue-500/10 border-blue-500/30 text-blue-400",
    green: "bg-green-500/10 border-green-500/30 text-green-400",
    gray:  "bg-gray-700/20 border-gray-600/30 text-gray-400",
  };
  return (
    <div className={`rounded-2xl p-4 border ${colorMap[color]}`}>
      <h3 className="font-bold text-white text-base mb-1">{title}</h3>
      <p className="text-sm leading-relaxed opacity-80">{tip}</p>
    </div>
  );
}

function StatCard({ label, value, color }: { label: string; value: string; color: string }) {
  const colorMap: Record<string, string> = {
    yellow: "text-yellow-400 bg-yellow-400/10 border-yellow-500/20",
    blue:   "text-blue-400 bg-blue-400/10 border-blue-500/20",
    green:  "text-green-400 bg-green-400/10 border-green-500/20",
    purple: "text-purple-400 bg-purple-400/10 border-purple-500/20",
    gray:   "text-gray-400 bg-gray-800/50 border-gray-700/30",
  };
  return (
    <div className={`rounded-xl p-2.5 border text-center ${colorMap[color]}`}>
      <p className="text-base font-bold leading-tight">{value}</p>
      <p className="text-[9px] text-gray-400 mt-0.5 uppercase tracking-wide">{label}</p>
    </div>
  );
}
