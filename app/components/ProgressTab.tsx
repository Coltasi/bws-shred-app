"use client";

import { useState, useEffect } from "react";
import { workouts, workoutRotation } from "../data/workouts";
import { getItem, setItem, removeItem, getJSON } from "../lib/store";
import { getDaily, saveDay, scanList } from "../lib/data";
import { toIso } from "../lib/nutrition";

type WeightEntry    = { date: string; weight: number };
type DailyLog       = { date: string; workoutDone: boolean; waterCount: number };
type SetData        = { done: boolean; weight: string; reps: string };
type ExerciseLog    = Record<string, SetData[]>;
type CustomWorkout  = { key: string; name: string; emoji: string; exercises: { name: string; sets: string; reps: string; rest?: string; notes?: string }[] };
type WorkoutSession = { date: string; key: string; name: string; emoji: string; log: ExerciseLog };

const MY_WORKOUTS_KEY = "bws-my-workouts";
const DATED_LOG_KEY   = "bws-dated-log";

function getDateKey(offset = 0): string {
  const d = new Date();
  d.setDate(d.getDate() - offset);
  return d.toDateString();
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function friendlyDate(dateStr: string): string {
  const today     = new Date().toDateString();
  const yesterday = new Date(Date.now() - 864e5).toDateString();
  if (dateStr === today)     return "Today";
  if (dateStr === yesterday) return "Yesterday";
  return new Date(dateStr).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
}

function getLast7Days(): string[] {
  return Array.from({ length: 7 }, (_, i) => getDateKey(6 - i));
}

function getBestSet(sets: SetData[]): SetData | null {
  const doneSets = sets.filter(s => s.done && s.weight);
  if (doneSets.length === 0) return null;
  return doneSets.reduce((best, s) =>
    parseFloat(s.weight) > parseFloat(best.weight) ? s : best
  );
}

export default function ProgressTab() {
  const [weightEntries, setWeightEntries]     = useState<WeightEntry[]>([]);
  const [newWeight, setNewWeight]             = useState("");
  const [dailyLogs, setDailyLogs]             = useState<DailyLog[]>([]);
  const [activeSection, setActiveSection]     = useState<"overview" | "weight" | "strength" | "log" | "body" | "streak">("overview");
  const [selectedWorkout, setSelectedWorkout] = useState<string>("Upper");
  const [historyData, setHistoryData]         = useState<Record<string, ExerciseLog>>({});
  const [weightUnit, setWeightUnit]           = useState<"kg" | "lbs">("kg");
  const [myWorkouts, setMyWorkouts]           = useState<CustomWorkout[]>([]);

  // Log section state
  const [datedLog, setDatedLog]               = useState<WorkoutSession[]>([]);
  const [expandedLog, setExpandedLog]         = useState<string | null>(null); // "date|key"
  const [editingLog, setEditingLog]           = useState<string | null>(null); // "date|key" being edited
  const [editBuffer, setEditBuffer]           = useState<ExerciseLog>({});

  const todayKey = getDateKey(0);

  useEffect(() => {
    // Canonical source: the daily log the Fuel tab writes. Fall back to the
    // legacy flat array only for entries the migration hasn't picked up.
    const fromDaily: WeightEntry[] = Object.values(getDaily())
      .filter(d => typeof d.weightKg === "number")
      .map(d => ({ date: new Date(d.date + "T00:00:00").toDateString(), weight: d.weightKg as number }))
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    if (fromDaily.length) {
      setWeightEntries(fromDaily);
    } else {
      const saved = getItem("bws-weight-log");
      if (saved) setWeightEntries(JSON.parse(saved));
    }

    const savedUnit = getItem("bws-weight-unit") as "kg" | "lbs" | null;
    if (savedUnit) setWeightUnit(savedUnit);

    const allDaily = getDaily();
    const loggedSessionDays = new Set(
      getJSON<WorkoutSession[]>(DATED_LOG_KEY, []).map(x => x.date),
    );
    const logs: DailyLog[] = [];
    for (let i = 0; i < 14; i++) {
      const key = getDateKey(i);
      const raw = getItem(`bws-today-${key}`);
      if (loggedSessionDays.has(key) && !allDaily[toIso(new Date(key))]?.trained) {
        // Session recorded before the daily flag existed — still counts.
        logs.push({ date: key, workoutDone: true, waterCount: 0 });
        continue;
      }
      const isoDay = toIso(new Date(key));
      const fromDaily = allDaily[isoDay];
      const parsed = raw ? JSON.parse(raw) : {};
      // A day counts as trained if a session was logged in the Train tab, if the
      // daily log says so, or if the Today tab's manual toggle was used. Before
      // this, only the last of those three counted.
      const trained = Boolean(fromDaily?.trained) || Boolean(parsed.workoutDone);
      if (raw || fromDaily) logs.push({ date: key, workoutDone: trained, waterCount: 0 });
    }
    setDailyLogs(logs);

    const myWs: CustomWorkout[] = (() => {
      try { return JSON.parse(getItem(MY_WORKOUTS_KEY) || "[]"); } catch { return []; }
    })();
    setMyWorkouts(myWs);

    const allWorkoutKeys = [...workoutRotation, ...myWs.map(w => w.key)];
    const history: Record<string, ExerciseLog> = {};
    for (const key of allWorkoutKeys) {
      const archived   = getItem(`bws-history-${key}`);
      const sessionRaw = getItem(`bws-session-${key}`);
      let sessionLog: ExerciseLog | null = null;
      if (sessionRaw) {
        try { const p = JSON.parse(sessionRaw); sessionLog = p.log !== undefined ? p.log : p; } catch { /* skip */ }
      }
      const raw = archived || (sessionLog ? JSON.stringify(sessionLog) : null);
      if (raw) {
        try {
          const parsed: ExerciseLog = JSON.parse(raw);
          const hasData = Object.values(parsed).some(sets => sets.some(s => s.weight && s.weight.trim() !== ""));
          if (hasData) history[key] = parsed;
        } catch { /* skip */ }
      }
    }
    setHistoryData(history);

    // Load dated workout log
    try {
      const logRaw = getItem(DATED_LOG_KEY);
      if (logRaw) {
        const log: WorkoutSession[] = JSON.parse(logRaw);
        setDatedLog(log.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
      }
    } catch { /* skip */ }
  }, []);

  const addWeight = () => {
    const val = parseFloat(newWeight);
    if (isNaN(val) || val < 50 || val > 500) return;
    const existing = weightEntries.filter(e => e.date !== todayKey);
    const updated  = [...existing, { date: todayKey, weight: val }].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    setWeightEntries(updated);
    saveDay(toIso(new Date()), { weightKg: val });
    setNewWeight("");
  };

  const removeWeight = (date: string) => {
    const updated = weightEntries.filter(e => e.date !== date);
    setWeightEntries(updated);
    const d = new Date(date);
    if (!isNaN(d.getTime())) saveDay(toIso(d), { weightKg: undefined });
  };

  // ── Log editing ────────────────────────────────────────────────────────────
  function startEdit(session: WorkoutSession) {
    setEditingLog(`${session.date}|${session.key}`);
    setEditBuffer(JSON.parse(JSON.stringify(session.log))); // deep copy
  }

  function saveEdit(session: WorkoutSession) {
    const updated = datedLog.map(s =>
      s.date === session.date && s.key === session.key ? { ...s, log: editBuffer } : s
    );
    setDatedLog(updated);
    setItem(DATED_LOG_KEY, JSON.stringify(updated));
    // Also update bws-history if this is the most recent session for that workout
    const mostRecent = datedLog.filter(s => s.key === session.key).sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    )[0];
    if (mostRecent?.date === session.date) {
      setItem(`bws-history-${session.key}`, JSON.stringify(editBuffer));
      setHistoryData(prev => ({ ...prev, [session.key]: editBuffer }));
    }
    setEditingLog(null);
    setEditBuffer({});
  }

  function cancelEdit() { setEditingLog(null); setEditBuffer({}); }

  function updateEditSet(exName: string, setIdx: number, field: "weight" | "reps", val: string) {
    setEditBuffer(prev => {
      const sets = [...(prev[exName] ?? [])];
      sets[setIdx] = { ...sets[setIdx], [field]: val };
      return { ...prev, [exName]: sets };
    });
  }

  const last7 = getLast7Days();

  // Body composition, read from the same store the Body tab writes.
  const bodyScans      = scanList();
  const latestBodyScan = bodyScans.length ? bodyScans[bodyScans.length - 1] : null;
  const firstBodyScan  = bodyScans[0] ?? null;
  const prevBodyScan   = bodyScans.length > 1 ? bodyScans[bodyScans.length - 2] : null;

  /**
   * Both of these used to treat Sunday and Wednesday as automatic rest days,
   * left over from the old fixed weekly split. The rotation is flexible now, so
   * that just credited you with two workouts a week you hadn't done — the
   * Overview read "2/7" on a week with zero training. Count only real sessions,
   * and let one rest day pass without breaking a streak.
   */
  const workoutStreak = (() => {
    let streak = 0, gap = 0;
    for (let i = 0; i < 60; i++) {
      const key = getDateKey(i);
      const done = dailyLogs.find(l => l.date === key)?.workoutDone
        || datedLog.some(sesh => sesh.date === key);
      if (done) { streak += 1 + gap; gap = 0; continue; }
      if (i === 0) continue;          // today isn't over yet
      if (gap === 0) { gap = 1; continue; }  // one rest day is allowed
      break;
    }
    return streak;
  })();

  const weeklyWorkouts = last7.filter(d =>
    dailyLogs.find(l => l.date === d)?.workoutDone || datedLog.some(sesh => sesh.date === d),
  ).length;

  // Water tracking was removed from the Today tab, so the old "avg glasses"
  // tile could only ever read zero. Nutrition-logging consistency is the
  // number that actually predicts whether this works.
  // Which of the last 14 days have a complete nutrition entry, keyed the same
  // way the grid keys its cells.
  const loggedDates = (() => {
    const daily = getDaily();
    const set = new Set<string>();
    for (let i = 0; i < 14; i++) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const e = daily[toIso(d)];
      if (e?.weightKg != null) set.add(d.toDateString());
    }
    return set;
  })();

  const daysLoggedLast7 = (() => {
    const daily = getDaily();
    let n = 0;
    for (let i = 0; i < 7; i++) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const e = daily[toIso(d)];
      if (e?.weightKg != null) n++;
    }
    return n;
  })();

  const startWeight   = weightEntries.length > 0 ? weightEntries[0].weight : null;
  const currentWeight = weightEntries.length > 0 ? weightEntries[weightEntries.length - 1].weight : null;
  const weightChange  = startWeight && currentWeight ? +(currentWeight - startWeight).toFixed(1) : null;

  const last7Weights = weightEntries.slice(-7);
  const minW = last7Weights.length > 0 ? Math.min(...last7Weights.map(e => e.weight)) - 2 : 100;
  const maxW = last7Weights.length > 0 ? Math.max(...last7Weights.map(e => e.weight)) + 2 : 200;

  const sections = [
    { id: "overview",  label: "Overview"  },
    { id: "weight",    label: "Weight"    },
    { id: "strength",  label: "Strength"  },
    { id: "log",       label: "Log"       },
    { id: "body",      label: "Body"      },
    { id: "streak",    label: "Streak"    },
  ] as const;

  const selectedMyWorkout  = myWorkouts.find(w => w.key === selectedWorkout);
  const workoutExercises   = selectedMyWorkout?.exercises ?? workouts[selectedWorkout]?.exercises ?? [];
  const lastSession        = historyData[selectedWorkout] ?? {};
  const allKeys            = [...workoutRotation, ...myWorkouts.map(w => w.key)];
  const hasAnyHistory      = allKeys.some(k => historyData[k] && Object.keys(historyData[k]).length > 0);

  return (
    <div className="px-4 py-4 space-y-4">
      {/* Section Tabs */}
      <div className="flex bg-gray-900 rounded-xl p-1 gap-0.5">
        {sections.map(s => (
          <button key={s.id} onClick={() => setActiveSection(s.id)}
            className={`flex-1 py-3 text-[10px] font-semibold rounded-lg transition-all ${
              activeSection === s.id ? "bg-yellow-400 text-on-accent" : "text-gray-400 active:text-gray-300"
            }`}>
            {s.label}
          </button>
        ))}
      </div>

      {/* ── OVERVIEW ── */}
      {activeSection === "overview" && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <StatBox label="Workout Streak" value={`${workoutStreak}`} unit="days"     emoji="🔥" color="orange" />
            <StatBox label="This Week"       value={`${weeklyWorkouts}/7`} unit="days" emoji="💪" color="yellow" />
            <StatBox label="Weigh-ins"        value={`${daysLoggedLast7}`} unit="of last 7" emoji="⚖️" color="blue" />
            <StatBox
              label="Weight Change"
              value={weightChange !== null ? (weightChange <= 0 ? `${weightChange}` : `+${weightChange}`) : "—"}
              unit={weightChange !== null ? weightUnit : "no data"}
              emoji={weightChange !== null && weightChange < 0 ? "📉" : "📊"}
              color={weightChange !== null && weightChange < 0 ? "green" : "gray"}
            />
          </div>

          {latestBodyScan && (
            <div className="bg-card border border-gray-800 rounded-2xl p-4">
              <div className="flex items-baseline justify-between mb-3">
                <h3 className="font-bold text-gray-200 text-sm">Body composition</h3>
                <span className="text-[10px] text-gray-500">
                  {new Date(latestBodyScan.date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                </span>
              </div>
              <div className="grid grid-cols-3 gap-2">
                <MiniStat label="Body fat" value={latestBodyScan.bodyFatPct?.toFixed(1) ?? "—"} unit="%" tone="yellow" />
                <MiniStat label="Fat mass" value={latestBodyScan.fatMassKg?.toFixed(1) ?? "—"} unit="kg" tone="red" />
                <MiniStat label="Muscle"   value={latestBodyScan.muscleMassKg?.toFixed(1) ?? "—"} unit="kg" tone="green" />
              </div>
              {prevBodyScan && (
                <div className="mt-3 pt-3 border-t border-gray-800 space-y-2">
                  <p className="text-[10px] text-gray-500 uppercase tracking-wide">
                    Since {new Date(prevBodyScan.date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                  </p>
                  <ScanDelta label="Fat mass" from={prevBodyScan.fatMassKg} to={latestBodyScan.fatMassKg} goodDown />
                  <ScanDelta label="Muscle"   from={prevBodyScan.muscleMassKg} to={latestBodyScan.muscleMassKg} />
                </div>
              )}
            </div>
          )}

          <div className="bg-card border border-gray-800 rounded-2xl p-4">
            <h3 className="font-bold text-gray-200 text-sm mb-3">Last 7 Days</h3>
            <div className="flex justify-between gap-1">
              {last7.map((dateKey) => {
                const log      = dailyLogs.find(l => l.date === dateKey);
                const isToday  = dateKey === todayKey;
                const dayOfWk  = new Date(dateKey).getDay();
                const isRest   = dayOfWk === 0 || dayOfWk === 3;
                const hasWork  = isRest || log?.workoutDone;
                const logged   = loggedDates.has(dateKey);
                const d        = new Date(dateKey);
                return (
                  <div key={dateKey} className="flex-1 flex flex-col items-center gap-1">
                    <div className="text-[9px] text-gray-500 font-semibold">
                      {d.toLocaleDateString("en-US", { weekday: "short" }).slice(0, 1)}
                    </div>
                    <div className={`w-full aspect-square rounded-lg flex items-center justify-center text-sm ${
                      !log && !isToday ? "bg-gray-900 text-gray-600" :
                      isRest          ? "bg-purple-500/20 text-alt" :
                      hasWork         ? "bg-green-500/20 text-good" :
                                        "bg-red-500/10 text-gray-600"
                    }`}>
                      {!log && !isToday ? "·" : isRest ? "🛌" : hasWork ? "✓" : "○"}
                    </div>
                    <div className="w-full h-1 bg-gray-800 rounded-full overflow-hidden" title={logged ? "Weighed in" : "No weigh-in"}>
                      {logged && <div className="h-full w-full bg-blue-400 rounded-full" />}
                    </div>
                    {isToday && <div className="w-1 h-1 rounded-full bg-yellow-400" />}
                  </div>
                );
              })}
            </div>
            <div className="flex items-center gap-4 mt-3 text-[10px] text-gray-600">
              <span>✓ workout</span>
              <span className="text-info">— weighed</span>
              <span>🛌 rest</span>
            </div>
          </div>
        </>
      )}

      {/* ── WEIGHT LOG ── */}
      {activeSection === "weight" && (
        <>
          <div className="bg-card border border-gray-800 rounded-2xl p-4">
            <h3 className="font-bold text-gray-200 text-sm mb-3">Log Today&apos;s Weight</h3>
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <input type="number" step="0.1" min="50" max="500" placeholder="e.g. 185.5"
                  value={newWeight} onChange={e => setNewWeight(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && addWeight()}
                  className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-3 text-sm text-gray-200 placeholder-gray-600 outline-none focus:border-yellow-500/50" />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs">{weightUnit}</span>
              </div>
              <button onClick={addWeight}
                className="bg-yellow-400 text-on-accent font-bold px-4 py-3 rounded-xl text-sm hover:bg-yellow-300">
                Log
              </button>
            </div>
          </div>

          {last7Weights.length > 1 && (
            <div className="bg-card border border-gray-800 rounded-2xl p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-bold text-gray-200 text-sm">Weight Trend</h3>
                {weightChange !== null && (
                  <span className={`text-xs font-bold px-2 py-1 rounded-lg ${
                    weightChange < 0 ? "bg-green-500/10 text-good" : "bg-red-500/10 text-bad"
                  }`}>
                    {weightChange <= 0 ? weightChange : `+${weightChange}`} {weightUnit} total
                  </span>
                )}
              </div>
              <div className="relative h-24">
                <svg className="w-full h-full" viewBox="0 0 300 96" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="weightGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  {(() => {
                    const pts  = last7Weights.map((e, i) => {
                      const x = (i / (last7Weights.length - 1)) * 290 + 5;
                      const y = 88 - ((e.weight - minW) / (maxW - minW)) * 80;
                      return `${x},${y}`;
                    });
                    const pathD = `M${pts.join(" L")}`;
                    const areaD = `${pathD} L${(last7Weights.length - 1) / (last7Weights.length - 1) * 290 + 5},96 L5,96 Z`;
                    return (
                      <>
                        <path d={areaD} fill="url(#weightGrad)" />
                        <path d={pathD} fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        {last7Weights.map((e, i) => {
                          const x = (i / (last7Weights.length - 1)) * 290 + 5;
                          const y = 88 - ((e.weight - minW) / (maxW - minW)) * 80;
                          return (
                            <g key={i}>
                              <circle cx={x} cy={y} r="4" fill="var(--page)" stroke="#f59e0b" strokeWidth="2" />
                              <text x={x} y={y - 8} textAnchor="middle" fill="#9ca3af" fontSize="8">{e.weight}</text>
                            </g>
                          );
                        })}
                      </>
                    );
                  })()}
                </svg>
              </div>
              <div className="flex justify-between text-[10px] text-gray-600 mt-1">
                <span>{formatDate(last7Weights[0].date)}</span>
                <span>{formatDate(last7Weights[last7Weights.length - 1].date)}</span>
              </div>
            </div>
          )}

          <div className="bg-card border border-gray-800 rounded-2xl overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-800">
              <h3 className="font-bold text-gray-200 text-sm">Weight History</h3>
            </div>
            {weightEntries.length === 0 ? (
              <div className="px-4 py-8 text-center text-gray-600 text-sm">No entries yet. Start logging!</div>
            ) : (
              <div className="divide-y divide-gray-800/50">
                {[...weightEntries].reverse().map((entry, idx, arr) => {
                  const isToday = entry.date === todayKey;
                  const prev    = arr[idx + 1];
                  const delta   = prev ? +(entry.weight - prev.weight).toFixed(1) : null;
                  return (
                    <div key={entry.date} className="flex items-center justify-between px-4 py-3">
                      <div>
                        <p className="text-sm font-semibold text-gray-200">
                          {entry.weight} <span className="text-gray-500 font-normal text-xs">{weightUnit}</span>
                          {delta !== null && (
                            <span className={`ml-2 text-xs ${delta < 0 ? "text-good" : delta > 0 ? "text-bad" : "text-gray-600"}`}>
                              {delta < 0 ? delta : delta > 0 ? `+${delta}` : "→"}
                            </span>
                          )}
                        </p>
                        <p className="text-xs text-gray-500">{formatDate(entry.date)}{isToday && " · Today"}</p>
                      </div>
                      <button onClick={() => removeWeight(entry.date)} className="text-gray-600 hover:text-bad text-sm px-2 py-1">✕</button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {/* ── STRENGTH ── */}
      {activeSection === "strength" && (
        <>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {workoutRotation.map(key => {
              const w       = workouts[key];
              const hasData = !!historyData[key] && Object.keys(historyData[key]).length > 0;
              return (
                <button key={key} onClick={() => setSelectedWorkout(key)}
                  className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                    selectedWorkout === key
                      ? "bg-yellow-400 text-on-accent border-yellow-400"
                      : "bg-gray-900 text-gray-400 border-gray-800"
                  }`}>
                  {w.emoji} {key}
                  {hasData && selectedWorkout !== key && <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />}
                </button>
              );
            })}
            {myWorkouts.map(w => {
              const hasData = !!historyData[w.key] && Object.keys(historyData[w.key]).length > 0;
              return (
                <button key={w.key} onClick={() => setSelectedWorkout(w.key)}
                  className={`flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold border transition-all ${
                    selectedWorkout === w.key
                      ? "bg-yellow-400 text-on-accent border-yellow-400"
                      : "bg-purple-900/40 text-alt border-purple-700/50"
                  }`}>
                  {w.emoji} {w.name.split(" ")[0]}
                  {hasData && selectedWorkout !== w.key && <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />}
                </button>
              );
            })}
          </div>

          {!hasAnyHistory ? (
            <div className="bg-card border border-gray-800 rounded-2xl p-6 text-center">
              <p className="text-3xl mb-2">🏋️</p>
              <p className="text-gray-200 font-semibold text-sm">No workout data yet</p>
              <p className="text-gray-500 text-xs mt-1">Complete a workout and log your weights — they&apos;ll show up here.</p>
            </div>
          ) : (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <p className="text-xs text-gray-500 font-semibold uppercase tracking-wide">
                  {selectedMyWorkout?.name ?? workouts[selectedWorkout]?.name}
                </p>
                {!historyData[selectedWorkout] && <p className="text-xs text-gray-600">No data yet</p>}
              </div>

              {workoutExercises.map(ex => {
                const sets     = lastSession[ex.name] ?? [];
                const best     = getBestSet(sets);
                const doneSets = sets.filter(s => s.done && s.weight);
                return (
                  <div key={ex.name} className={`bg-card border rounded-2xl p-4 transition-all ${
                    doneSets.length === 0 ? "border-gray-800 opacity-50" : "border-gray-700"
                  }`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-200 truncate">{ex.name}</p>
                        <p className="text-[11px] text-gray-500">{ex.sets} sets · {ex.reps} reps</p>
                      </div>
                      {best ? (
                        <div className="text-right flex-shrink-0">
                          <p className="text-lg font-black text-accent">{best.weight}<span className="text-xs text-gray-500 font-normal"> {weightUnit}</span></p>
                          <p className="text-[11px] text-gray-500">{best.reps} reps</p>
                        </div>
                      ) : <p className="text-xs text-gray-600 flex-shrink-0">—</p>}
                    </div>
                    {doneSets.length > 0 && (
                      <div className="mt-3 flex gap-1.5 flex-wrap">
                        {sets.map((s, i) => s.done && s.weight ? (
                          <div key={i} className={`px-2 py-1 rounded-lg text-[11px] font-semibold ${
                            s === best
                              ? "bg-yellow-400/20 text-accent border border-yellow-500/30"
                              : "bg-gray-800 text-gray-400"
                          }`}>
                            {s.weight}×{s.reps}{s === best && <span className="ml-1 text-[9px]">★</span>}
                          </div>
                        ) : null)}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ── LOG ── */}
      {activeSection === "log" && (
        <>
          {datedLog.length === 0 ? (
            <div className="bg-card border border-gray-800 rounded-2xl p-8 text-center">
              <p className="text-3xl mb-2">📋</p>
              <p className="text-gray-200 font-semibold text-sm">No workout log yet</p>
              <p className="text-gray-500 text-xs mt-1">Log weights during your next workout — each session will appear here.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {datedLog.map(session => {
                const id        = `${session.date}|${session.key}`;
                const isExpanded = expandedLog === id;
                const isEditing  = editingLog === id;
                const logData    = isEditing ? editBuffer : session.log;
                const exercises  = Object.entries(logData).filter(([, sets]) =>
                  sets.some(s => s.weight && s.weight.trim() !== "")
                );

                return (
                  <div key={id} className="bg-card border border-gray-800 rounded-2xl overflow-hidden">
                    {/* Session header — tap to expand */}
                    <button
                      onClick={() => {
                        if (isEditing) return;
                        setExpandedLog(isExpanded ? null : id);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-left"
                    >
                      <span className="text-2xl">{session.emoji}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold text-gray-200">{session.name}</p>
                        <p className="text-xs text-gray-500">{friendlyDate(session.date)}</p>
                      </div>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className="text-xs text-gray-600">{exercises.length} exercises</span>
                        <span className="text-gray-600 text-xs">{isExpanded || isEditing ? "▲" : "▼"}</span>
                      </div>
                    </button>

                    {/* Expanded content */}
                    {(isExpanded || isEditing) && (
                      <div className="border-t border-gray-800/60 px-4 pb-4 pt-3 space-y-3">
                        {exercises.length === 0 ? (
                          <p className="text-xs text-gray-600 text-center py-2">No weights logged for this session.</p>
                        ) : (
                          exercises.map(([exName, sets]) => (
                            <div key={exName}>
                              <p className="text-xs font-semibold text-gray-400 mb-1.5">{exName}</p>
                              <div className="flex flex-wrap gap-2">
                                {sets.map((s, i) => {
                                  if (!s.weight) return null;
                                  const best = getBestSet(sets);
                                  if (isEditing) {
                                    return (
                                      <div key={i} className="flex items-center gap-1 bg-gray-900 border border-gray-700 rounded-lg px-2 py-1.5">
                                        <input
                                          type="number" inputMode="decimal"
                                          value={editBuffer[exName]?.[i]?.weight ?? s.weight}
                                          onChange={e => updateEditSet(exName, i, "weight", e.target.value)}
                                          className="w-14 bg-transparent text-accent text-xs font-bold text-center outline-none border-b border-yellow-500/30"
                                        />
                                        <span className="text-gray-600 text-xs">{weightUnit}×</span>
                                        <input
                                          type="number" inputMode="numeric"
                                          value={editBuffer[exName]?.[i]?.reps ?? s.reps}
                                          onChange={e => updateEditSet(exName, i, "reps", e.target.value)}
                                          className="w-10 bg-transparent text-gray-300 text-xs text-center outline-none border-b border-gray-600"
                                        />
                                      </div>
                                    );
                                  }
                                  return (
                                    <div key={i} className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold ${
                                      s === best
                                        ? "bg-yellow-400/20 text-accent border border-yellow-500/30"
                                        : "bg-gray-800 text-gray-400"
                                    }`}>
                                      {s.weight}{weightUnit}×{s.reps}
                                      {s === best && <span className="ml-1 text-[9px]">★</span>}
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          ))
                        )}

                        {/* Edit / Save / Cancel buttons */}
                        {!isEditing ? (
                          <button
                            onClick={() => startEdit(session)}
                            className="mt-1 text-xs text-gray-500 hover:text-accent border border-gray-700 hover:border-yellow-500/40 px-3 py-1.5 rounded-lg transition-all"
                          >
                            ✏️ Edit weights
                          </button>
                        ) : (
                          <div className="flex gap-2 mt-1">
                            <button
                              onClick={() => saveEdit(session)}
                              className="flex-1 py-2 rounded-xl bg-yellow-400 text-on-accent text-xs font-bold hover:bg-yellow-300"
                            >
                              Save changes
                            </button>
                            <button
                              onClick={cancelEdit}
                              className="py-2 px-4 rounded-xl bg-gray-800 text-gray-400 text-xs hover:bg-gray-700"
                            >
                              Cancel
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ── STREAK ── */}
      {activeSection === "body" && (
        <>
          {bodyScans.length === 0 ? (
            <div className="bg-card border border-gray-800 rounded-2xl p-4">
              <p className="text-xs text-gray-400">No Tanita scans yet. Add one on the Body tab.</p>
            </div>
          ) : (
            <>
              <div className="bg-card border border-gray-800 rounded-2xl p-4">
                <h3 className="font-bold text-gray-200 text-sm mb-1">Latest scan</h3>
                <p className="text-xs text-gray-500 mb-3">
                  {new Date(latestBodyScan!.date).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
                </p>
                <div className="grid grid-cols-3 gap-2">
                  <MiniStat label="Weight"  value={latestBodyScan!.weightKg.toFixed(1)} unit="kg" />
                  <MiniStat label="Body fat" value={latestBodyScan!.bodyFatPct?.toFixed(1) ?? "—"} unit="%" tone="yellow" />
                  <MiniStat label="Fat mass" value={latestBodyScan!.fatMassKg?.toFixed(1) ?? "—"} unit="kg" tone="red" />
                  <MiniStat label="Muscle"  value={latestBodyScan!.muscleMassKg?.toFixed(1) ?? "—"} unit="kg" tone="green" />
                  <MiniStat label="Water"   value={latestBodyScan!.bodyWaterPct?.toFixed(1) ?? "—"} unit="%" tone="blue" />
                  <MiniStat label="Visceral" value={latestBodyScan!.visceralFat ?? "—"} tone="green" />
                </div>
              </div>

              {firstBodyScan && firstBodyScan !== latestBodyScan && (
                <div className="bg-card border border-gray-800 rounded-2xl p-4">
                  <h3 className="font-bold text-gray-200 text-sm mb-3">
                    Since {new Date(firstBodyScan.date).toLocaleDateString("en-GB", { month: "short", year: "2-digit" })}
                  </h3>
                  <div className="space-y-2">
                    <ScanDelta label="Fat mass" from={firstBodyScan.fatMassKg} to={latestBodyScan!.fatMassKg} goodDown />
                    <ScanDelta label="Muscle"   from={firstBodyScan.muscleMassKg} to={latestBodyScan!.muscleMassKg} />
                    <ScanDelta label="Weight"   from={firstBodyScan.weightKg} to={latestBodyScan!.weightKg} goodDown />
                    <ScanDelta label="Body fat %" from={firstBodyScan.bodyFatPct} to={latestBodyScan!.bodyFatPct} goodDown unit="%" />
                  </div>
                </div>
              )}

              <div className="bg-card border border-gray-800 rounded-2xl p-4">
                <h3 className="font-bold text-gray-200 text-sm mb-3">All scans</h3>
                <div className="space-y-1.5">
                  {[...bodyScans].reverse().map(sc => (
                    <div key={sc.date} className="flex items-center gap-2 text-sm py-0.5">
                      <span className="text-gray-400 text-xs w-20 shrink-0">
                        {new Date(sc.date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "2-digit" })}
                      </span>
                      <span className="text-gray-200 tabular-nums w-14 text-right">{sc.weightKg.toFixed(1)}</span>
                      <span className="text-accent tabular-nums w-14 text-right text-xs">{sc.bodyFatPct?.toFixed(1) ?? "—"}%</span>
                      <span className="text-good tabular-nums w-14 text-right text-xs">{sc.muscleMassKg?.toFixed(1) ?? "—"}</span>
                    </div>
                  ))}
                </div>
                <p className="text-[10px] text-gray-600 mt-2">date · weight · body fat · muscle</p>
              </div>
            </>
          )}
        </>
      )}

      {activeSection === "streak" && (
        <>
          <div className="bg-gradient-to-br from-orange-500/10 to-yellow-500/5 border border-orange-500/20 rounded-2xl p-5 text-center">
            <p className="text-5xl mb-2">🔥</p>
            <p className="text-4xl font-black text-gray-200">{workoutStreak}</p>
            <p className="text-sm text-gray-400 mt-1">Day Streak</p>
          </div>

          <div className="bg-card border border-gray-800 rounded-2xl p-4">
            <h3 className="font-bold text-gray-200 text-sm mb-3">Achievements</h3>
            <div className="space-y-3">
              <Achievement emoji="🌱" title="First Workout" desc="Log your first workout"       unlocked={dailyLogs.some(l => l.workoutDone)} />
              <Achievement emoji="🔥" title="3-Day Streak"  desc="Work out 3 days in a row"    unlocked={workoutStreak >= 3} />
              <Achievement emoji="⚡" title="7-Day Streak"  desc="Work out 7 days in a row"    unlocked={workoutStreak >= 7} />
              <Achievement emoji="⚖️" title="Week of Data"   desc="Weigh in 7 days running" unlocked={daysLoggedLast7 >= 7} />
              <Achievement emoji="🏆" title="2-Week Warrior" desc="14-day streak"              unlocked={workoutStreak >= 14} />
              <Achievement emoji="📉" title="First Drop"    desc="Lose your first pound"       unlocked={weightChange !== null && weightChange < -1} />
              <Achievement emoji="💪" title="Getting Stronger" desc="Log weights on 3 workouts" unlocked={allKeys.filter(k => historyData[k] && Object.keys(historyData[k]).length > 0).length >= 3} />
              <Achievement emoji="📋" title="Consistent Logger" desc="Log 10+ workout sessions" unlocked={datedLog.length >= 10} />
            </div>
          </div>

          <div className="bg-card border border-gray-800 rounded-2xl p-4">
            <h3 className="font-bold text-gray-200 text-sm mb-3">This Week</h3>
            <div className="space-y-2">
              <ProgressRow
                label="Workouts Completed"
                value={last7.filter(d => {
                  const log = dailyLogs.find(l => l.date === d);
                  const dow = new Date(d).getDay();
                  return (dow === 0 || dow === 3) ? true : log?.workoutDone;
                }).length}
                max={7} color="yellow"
              />
              <ProgressRow
                label="Weigh-ins"
                value={daysLoggedLast7}
                max={7} color="blue"
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function StatBox({ label, value, unit, emoji, color }: { label: string; value: string; unit: string; emoji: string; color: string }) {
  const colorMap: Record<string, string> = {
    orange: "text-warn border-orange-500/20 bg-orange-400/5",
    yellow: "text-accent border-yellow-500/20 bg-yellow-400/5",
    blue:   "text-info border-blue-500/20 bg-blue-400/5",
    green:  "text-good border-green-500/20 bg-green-400/5",
    gray:   "text-gray-400 border-gray-700 bg-gray-800/30",
  };
  return (
    <div className={`rounded-2xl p-4 border ${colorMap[color] || colorMap.gray}`}>
      <div className="flex items-center gap-2 mb-1">
        <span className="text-lg">{emoji}</span>
        <p className="text-xs text-gray-500">{label}</p>
      </div>
      <p className="text-2xl font-black">{value}</p>
      <p className="text-xs text-gray-600">{unit}</p>
    </div>
  );
}

function Achievement({ emoji, title, desc, unlocked }: { emoji: string; title: string; desc: string; unlocked: boolean }) {
  return (
    <div className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${unlocked ? "bg-yellow-400/5 border-yellow-500/20" : "opacity-40 border-gray-800"}`}>
      <span className={`text-2xl ${!unlocked && "grayscale"}`}>{emoji}</span>
      <div>
        <p className={`text-sm font-semibold ${unlocked ? "text-gray-200" : "text-gray-500"}`}>{title}</p>
        <p className="text-xs text-gray-600">{desc}</p>
      </div>
      {unlocked && <span className="ml-auto text-accent text-sm">✓</span>}
    </div>
  );
}

function ProgressRow({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct      = Math.round((value / max) * 100);
  const colorMap: Record<string, string> = { yellow: "bg-yellow-400", blue: "bg-blue-400", green: "bg-green-400" };
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-gray-400">{label}</span>
        <span className="text-gray-200 font-semibold">{value}/{max}</span>
      </div>
      <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${colorMap[color]} transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function MiniStat({ label, value, unit, tone = "gray" }: {
  label: string; value: string | number; unit?: string;
  tone?: "gray" | "green" | "yellow" | "red" | "blue";
}) {
  const tones: Record<string, string> = {
    gray:   "text-gray-300 bg-gray-800/50 border-gray-700/40",
    green:  "text-good bg-green-400/10 border-green-500/25",
    yellow: "text-accent bg-yellow-400/10 border-yellow-500/25",
    red:    "text-bad bg-red-400/10 border-red-500/25",
    blue:   "text-info bg-blue-400/10 border-blue-500/25",
  };
  return (
    <div className={`rounded-xl p-3 border text-center ${tones[tone]}`}>
      <p className="text-lg font-black leading-tight tabular-nums">
        {value}{unit && <span className="text-[11px] font-medium opacity-70 ml-0.5">{unit}</span>}
      </p>
      <p className="text-[9px] text-gray-400 mt-1 uppercase tracking-wide">{label}</p>
    </div>
  );
}

function ScanDelta({ label, from, to, goodDown = false, unit = "kg" }: {
  label: string; from?: number; to?: number; goodDown?: boolean; unit?: string;
}) {
  if (typeof from !== "number" || typeof to !== "number") return null;
  const d = Math.round((to - from) * 10) / 10;
  const good = goodDown ? d < 0 : d > 0;
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-gray-400">{label}</span>
      <span className={`font-bold tabular-nums ${Math.abs(d) < 0.05 ? "text-gray-500" : good ? "text-good" : "text-bad"}`}>
        {d > 0 ? "+" : ""}{d} {unit}
      </span>
    </div>
  );
}
