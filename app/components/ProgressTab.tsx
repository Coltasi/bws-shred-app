"use client";

import { useState, useEffect } from "react";

type WeightEntry = { date: string; weight: number };
type DailyLog = { date: string; workoutDone: boolean; mealsCompleted: number; totalMeals: number; waterCount: number };

function getDateKey(offset = 0): string {
  const d = new Date();
  d.setDate(d.getDate() - offset);
  return d.toDateString();
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function getLast7Days(): string[] {
  return Array.from({ length: 7 }, (_, i) => getDateKey(6 - i));
}

export default function ProgressTab() {
  const [weightEntries, setWeightEntries] = useState<WeightEntry[]>([]);
  const [newWeight, setNewWeight] = useState("");
  const [dailyLogs, setDailyLogs] = useState<DailyLog[]>([]);
  const [activeSection, setActiveSection] = useState<"overview" | "weight" | "streak">("overview");

  const todayKey = getDateKey(0);

  useEffect(() => {
    // Load weight entries
    const saved = localStorage.getItem("bws-weight-log");
    if (saved) setWeightEntries(JSON.parse(saved));

    // Build daily logs from last 14 days of today data
    const logs: DailyLog[] = [];
    for (let i = 0; i < 14; i++) {
      const key = getDateKey(i);
      const raw = localStorage.getItem(`bws-today-${key}`);
      if (raw) {
        const parsed = JSON.parse(raw);
        const meals = parsed.meals || {};
        const mealsCompleted = Object.values(meals).filter(Boolean).length;
        logs.push({
          date: key,
          workoutDone: parsed.workoutDone || false,
          mealsCompleted,
          totalMeals: 10, // 3 breakfast + 3 lunch + 4 dinner options
          waterCount: parsed.water || 0,
        });
      }
    }
    setDailyLogs(logs);
  }, []);

  const addWeight = () => {
    const val = parseFloat(newWeight);
    if (isNaN(val) || val < 50 || val > 500) return;
    const existing = weightEntries.filter(e => e.date !== todayKey);
    const updated = [...existing, { date: todayKey, weight: val }].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );
    setWeightEntries(updated);
    localStorage.setItem("bws-weight-log", JSON.stringify(updated));
    setNewWeight("");
  };

  const removeWeight = (date: string) => {
    const updated = weightEntries.filter(e => e.date !== date);
    setWeightEntries(updated);
    localStorage.setItem("bws-weight-log", JSON.stringify(updated));
  };

  // Stats calculations
  const last7 = getLast7Days();
  const workoutStreak = (() => {
    let streak = 0;
    for (let i = 0; i < 30; i++) {
      const key = getDateKey(i);
      const log = dailyLogs.find(l => l.date === key);
      // Skip Sundays (rest days)
      const dayOfWeek = new Date(key).getDay();
      if (dayOfWeek === 0 || dayOfWeek === 3) { // Sun or Wed = rest days
        streak++;
        continue;
      }
      if (log?.workoutDone) streak++;
      else break;
    }
    return streak;
  })();

  const weeklyWorkouts = last7.filter(d => {
    const dayOfWeek = new Date(d).getDay();
    if (dayOfWeek === 0 || dayOfWeek === 3) return true; // rest days count
    return dailyLogs.find(l => l.date === d)?.workoutDone;
  }).length;

  const avgWater = dailyLogs.length > 0
    ? Math.round(dailyLogs.slice(0, 7).reduce((s, l) => s + l.waterCount, 0) / Math.min(dailyLogs.length, 7))
    : 0;

  const startWeight = weightEntries.length > 0 ? weightEntries[0].weight : null;
  const currentWeight = weightEntries.length > 0 ? weightEntries[weightEntries.length - 1].weight : null;
  const weightChange = startWeight && currentWeight ? +(currentWeight - startWeight).toFixed(1) : null;

  // Mini chart data (last 7 weight entries)
  const last7Weights = weightEntries.slice(-7);
  const minW = last7Weights.length > 0 ? Math.min(...last7Weights.map(e => e.weight)) - 1 : 100;
  const maxW = last7Weights.length > 0 ? Math.max(...last7Weights.map(e => e.weight)) + 1 : 200;

  const sections = [
    { id: "overview", label: "Overview" },
    { id: "weight", label: "Weight Log" },
    { id: "streak", label: "Streaks" },
  ] as const;

  return (
    <div className="px-4 py-4 space-y-4">
      {/* Section Tabs */}
      <div className="flex bg-gray-900 rounded-xl p-1">
        {sections.map(s => (
          <button
            key={s.id}
            onClick={() => setActiveSection(s.id)}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${
              activeSection === s.id ? "bg-yellow-400 text-black" : "text-gray-400 hover:text-gray-300"
            }`}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* OVERVIEW */}
      {activeSection === "overview" && (
        <>
          {/* Key Stats */}
          <div className="grid grid-cols-2 gap-3">
            <StatBox
              label="Workout Streak"
              value={`${workoutStreak}`}
              unit="days"
              emoji="🔥"
              color="orange"
            />
            <StatBox
              label="This Week"
              value={`${weeklyWorkouts}/7`}
              unit="days"
              emoji="💪"
              color="yellow"
            />
            <StatBox
              label="Avg Water"
              value={`${avgWater}`}
              unit="glasses/day"
              emoji="💧"
              color="blue"
            />
            <StatBox
              label="Weight Change"
              value={weightChange !== null ? (weightChange <= 0 ? `${weightChange}` : `+${weightChange}`) : "—"}
              unit={weightChange !== null ? "lbs" : "no data"}
              emoji={weightChange !== null && weightChange < 0 ? "📉" : "📊"}
              color={weightChange !== null && weightChange < 0 ? "green" : "gray"}
            />
          </div>

          {/* Last 7 Days Activity */}
          <div className="bg-[#0f0f1a] border border-gray-800 rounded-2xl p-4">
            <h3 className="font-bold text-white text-sm mb-3">Last 7 Days</h3>
            <div className="flex justify-between gap-1">
              {last7.map((dateKey) => {
                const log = dailyLogs.find(l => l.date === dateKey);
                const isToday = dateKey === todayKey;
                const dayOfWeek = new Date(dateKey).getDay();
                const isRest = dayOfWeek === 0 || dayOfWeek === 3;
                const hasWorkout = isRest || log?.workoutDone;
                const waterPct = Math.min((log?.waterCount ?? 0) / 8, 1);
                const d = new Date(dateKey);
                return (
                  <div key={dateKey} className="flex-1 flex flex-col items-center gap-1">
                    <div className="text-[9px] text-gray-500 font-semibold">
                      {d.toLocaleDateString("en-US", { weekday: "short" }).slice(0, 1)}
                    </div>
                    <div className={`w-full aspect-square rounded-lg flex items-center justify-center text-base ${
                      !log && !isToday ? "bg-gray-900 text-gray-700" :
                      isRest ? "bg-purple-500/20 text-purple-400" :
                      hasWorkout ? "bg-green-500/20 text-green-400" :
                      "bg-red-500/10 text-gray-600"
                    }`}>
                      {!log && !isToday ? "·" :
                       isRest ? "🛌" :
                       hasWorkout ? "✓" : "○"}
                    </div>
                    {/* Water bar */}
                    <div className="w-full h-1 bg-gray-800 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-blue-400 rounded-full"
                        style={{ width: `${waterPct * 100}%` }}
                      />
                    </div>
                    {isToday && <div className="w-1 h-1 rounded-full bg-yellow-400" />}
                  </div>
                );
              })}
            </div>
            <div className="flex items-center gap-4 mt-3 text-[10px] text-gray-600">
              <span>✓ = workout done</span>
              <span className="text-blue-400">— = water</span>
              <span>🛌 = rest</span>
            </div>
          </div>
        </>
      )}

      {/* WEIGHT LOG */}
      {activeSection === "weight" && (
        <>
          {/* Add Entry */}
          <div className="bg-[#0f0f1a] border border-gray-800 rounded-2xl p-4">
            <h3 className="font-bold text-white text-sm mb-3">Log Today&apos;s Weight</h3>
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <input
                  type="number"
                  step="0.1"
                  min="50"
                  max="500"
                  placeholder="e.g. 185.5"
                  value={newWeight}
                  onChange={e => setNewWeight(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && addWeight()}
                  className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-3 text-sm text-white placeholder-gray-600 outline-none focus:border-yellow-500/50"
                />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-xs">lbs</span>
              </div>
              <button
                onClick={addWeight}
                className="bg-yellow-400 text-black font-bold px-4 py-3 rounded-xl text-sm hover:bg-yellow-300"
              >
                Log
              </button>
            </div>
          </div>

          {/* Mini Chart */}
          {last7Weights.length > 1 && (
            <div className="bg-[#0f0f1a] border border-gray-800 rounded-2xl p-4">
              <h3 className="font-bold text-white text-sm mb-3">Weight Trend</h3>
              <div className="relative h-20">
                <svg className="w-full h-full" viewBox="0 0 300 80" preserveAspectRatio="none">
                  <defs>
                    <linearGradient id="weightGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.3" />
                      <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
                    </linearGradient>
                  </defs>
                  {last7Weights.length > 1 && (() => {
                    const pts = last7Weights.map((e, i) => {
                      const x = (i / (last7Weights.length - 1)) * 290 + 5;
                      const y = 75 - ((e.weight - minW) / (maxW - minW)) * 70;
                      return `${x},${y}`;
                    });
                    const pathD = `M${pts.join(" L")}`;
                    const areaD = `${pathD} L${(last7Weights.length - 1) / (last7Weights.length - 1) * 290 + 5},80 L5,80 Z`;
                    return (
                      <>
                        <path d={areaD} fill="url(#weightGrad)" />
                        <path d={pathD} fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        {last7Weights.map((e, i) => {
                          const x = (i / (last7Weights.length - 1)) * 290 + 5;
                          const y = 75 - ((e.weight - minW) / (maxW - minW)) * 70;
                          return <circle key={i} cx={x} cy={y} r="3" fill="#f59e0b" />;
                        })}
                      </>
                    );
                  })()}
                </svg>
              </div>
              <div className="flex justify-between text-[10px] text-gray-600 mt-1">
                <span>{formatDate(last7Weights[0].date)}</span>
                <span className={weightChange !== null && weightChange < 0 ? "text-green-400" : "text-red-400"}>
                  {weightChange !== null ? (weightChange <= 0 ? `${weightChange} lbs` : `+${weightChange} lbs`) : ""}
                </span>
                <span>{formatDate(last7Weights[last7Weights.length - 1].date)}</span>
              </div>
            </div>
          )}

          {/* Log Table */}
          <div className="bg-[#0f0f1a] border border-gray-800 rounded-2xl overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-800">
              <h3 className="font-bold text-white text-sm">Weight History</h3>
            </div>
            {weightEntries.length === 0 ? (
              <div className="px-4 py-8 text-center text-gray-600 text-sm">No entries yet. Start logging!</div>
            ) : (
              <div className="divide-y divide-gray-800/50">
                {[...weightEntries].reverse().map((entry) => {
                  const isToday = entry.date === todayKey;
                  return (
                    <div key={entry.date} className="flex items-center justify-between px-4 py-3">
                      <div>
                        <p className="text-sm font-semibold text-white">
                          {entry.weight} <span className="text-gray-500 font-normal text-xs">lbs</span>
                        </p>
                        <p className="text-xs text-gray-500">{formatDate(entry.date)}{isToday && " · Today"}</p>
                      </div>
                      <button
                        onClick={() => removeWeight(entry.date)}
                        className="text-gray-700 hover:text-red-400 text-sm px-2 py-1"
                      >
                        ✕
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </>
      )}

      {/* STREAKS */}
      {activeSection === "streak" && (
        <>
          <div className="bg-gradient-to-br from-orange-500/10 to-yellow-500/5 border border-orange-500/20 rounded-2xl p-5 text-center">
            <p className="text-5xl mb-2">🔥</p>
            <p className="text-4xl font-black text-white">{workoutStreak}</p>
            <p className="text-sm text-gray-400 mt-1">Day Streak</p>
          </div>

          {/* Achievements */}
          <div className="bg-[#0f0f1a] border border-gray-800 rounded-2xl p-4">
            <h3 className="font-bold text-white text-sm mb-3">Achievements</h3>
            <div className="space-y-3">
              <Achievement
                emoji="🌱"
                title="First Workout"
                desc="Log your first workout"
                unlocked={dailyLogs.some(l => l.workoutDone)}
              />
              <Achievement
                emoji="🔥"
                title="3-Day Streak"
                desc="Work out 3 days in a row"
                unlocked={workoutStreak >= 3}
              />
              <Achievement
                emoji="⚡"
                title="7-Day Streak"
                desc="Work out 7 days in a row"
                unlocked={workoutStreak >= 7}
              />
              <Achievement
                emoji="💧"
                title="Hydration Hero"
                desc="Hit 8 glasses in a day"
                unlocked={dailyLogs.some(l => l.waterCount >= 8)}
              />
              <Achievement
                emoji="🏆"
                title="2-Week Warrior"
                desc="14-day streak"
                unlocked={workoutStreak >= 14}
              />
              <Achievement
                emoji="📉"
                title="First Drop"
                desc="Lose your first pound"
                unlocked={weightChange !== null && weightChange < -1}
              />
            </div>
          </div>

          {/* Weekly Summary */}
          <div className="bg-[#0f0f1a] border border-gray-800 rounded-2xl p-4">
            <h3 className="font-bold text-white text-sm mb-3">This Week&apos;s Summary</h3>
            <div className="space-y-2">
              <ProgressRow
                label="Workouts Completed"
                value={last7.filter(d => {
                  const log = dailyLogs.find(l => l.date === d);
                  const dow = new Date(d).getDay();
                  return (dow === 0 || dow === 3) ? true : log?.workoutDone;
                }).length}
                max={7}
                color="yellow"
              />
              <ProgressRow
                label="Days Hydrated (8+ glasses)"
                value={last7.filter(d => (dailyLogs.find(l => l.date === d)?.waterCount ?? 0) >= 8).length}
                max={7}
                color="blue"
              />
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function StatBox({
  label, value, unit, emoji, color
}: {
  label: string; value: string; unit: string; emoji: string; color: string;
}) {
  const colorMap: Record<string, string> = {
    orange: "text-orange-400 border-orange-500/20 bg-orange-400/5",
    yellow: "text-yellow-400 border-yellow-500/20 bg-yellow-400/5",
    blue: "text-blue-400 border-blue-500/20 bg-blue-400/5",
    green: "text-green-400 border-green-500/20 bg-green-400/5",
    gray: "text-gray-400 border-gray-700 bg-gray-800/30",
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
    <div className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
      unlocked ? "bg-yellow-400/5 border-yellow-500/20" : "opacity-40 border-gray-800"
    }`}>
      <span className={`text-2xl ${!unlocked && "grayscale"}`}>{emoji}</span>
      <div>
        <p className={`text-sm font-semibold ${unlocked ? "text-white" : "text-gray-500"}`}>{title}</p>
        <p className="text-xs text-gray-600">{desc}</p>
      </div>
      {unlocked && <span className="ml-auto text-yellow-400 text-sm">✓</span>}
    </div>
  );
}

function ProgressRow({ label, value, max, color }: { label: string; value: number; max: number; color: string }) {
  const pct = Math.round((value / max) * 100);
  const colorMap: Record<string, string> = {
    yellow: "bg-yellow-400",
    blue: "bg-blue-400",
    green: "bg-green-400",
  };
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-gray-400">{label}</span>
        <span className="text-white font-semibold">{value}/{max}</span>
      </div>
      <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${colorMap[color]} transition-all`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
