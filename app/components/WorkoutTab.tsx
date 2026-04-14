"use client";

import { useState, useEffect, useRef } from "react";
import { workouts, workoutRotation, type Exercise } from "../data/workouts";

const ROTATION_KEY = "bws-rotation-index";

function getRotationIndex(): number {
  if (typeof window === "undefined") return 0;
  return parseInt(localStorage.getItem(ROTATION_KEY) || "0", 10) % workoutRotation.length;
}

type SetCheck = Record<string, boolean>;

const colorMap: Record<string, string> = {
  blue:   "text-blue-400 bg-blue-400/10 border-blue-500/30",
  green:  "text-green-400 bg-green-400/10 border-green-500/30",
  orange: "text-orange-400 bg-orange-400/10 border-orange-500/30",
  purple: "text-purple-400 bg-purple-400/10 border-purple-500/30",
  red:    "text-red-400 bg-red-400/10 border-red-500/30",
};

export default function WorkoutTab() {
  const [selectedKey, setSelectedKey] = useState<string>("Upper");
  const [rotationIdx, setRotationIdx] = useState(0);
  const [checkedSets, setCheckedSets]   = useState<SetCheck>({});
  const [timer, setTimer]               = useState<number | null>(null);
  const [timerRunning, setTimerRunning] = useState(false);
  const [expandedExercise, setExpandedExercise] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const idx = getRotationIndex();
    setRotationIdx(idx);
    setSelectedKey(workoutRotation[idx]);
  }, []);

  useEffect(() => {
    if (selectedKey) {
      const saved = localStorage.getItem(`bws-workout-${selectedKey}`);
      setCheckedSets(saved ? JSON.parse(saved) : {});
      setExpandedExercise(null);
    }
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

  const toggleSet = (exerciseName: string, setIndex: number) => {
    const key = `${exerciseName}-set-${setIndex}`;
    const updated = { ...checkedSets, [key]: !checkedSets[key] };
    setCheckedSets(updated);
    localStorage.setItem(`bws-workout-${selectedKey}`, JSON.stringify(updated));
  };

  const resetWorkout = () => {
    setCheckedSets({});
    localStorage.removeItem(`bws-workout-${selectedKey}`);
  };

  const startRestTimer = (seconds: number) => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    setTimer(seconds);
    setTimerRunning(true);
  };

  const stopTimer = () => {
    setTimerRunning(false);
    if (intervalRef.current) clearInterval(intervalRef.current);
    setTimer(null);
  };

  const formatTime = (s: number) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  const getExerciseCompletion = (ex: Exercise) => {
    const setCount = parseInt(ex.sets) || 3;
    const done = Array.from({ length: setCount }).filter((_, i) =>
      checkedSets[`${ex.name}-set-${i}`]
    ).length;
    return { done, total: setCount };
  };

  const totalSets = workout?.exercises.reduce((acc, ex) => acc + (parseInt(ex.sets) || 3), 0) ?? 0;
  const doneSets  = workout?.exercises.reduce((acc, ex) => {
    const setCount = parseInt(ex.sets) || 3;
    return acc + Array.from({ length: setCount }).filter((_, i) =>
      checkedSets[`${ex.name}-set-${i}`]
    ).length;
  }, 0) ?? 0;

  return (
    <div className="px-4 py-4 space-y-4">

      {/* Workout Selector */}
      <div>
        <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Workouts — pick one to start</p>
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {workoutRotation.map((key, idx) => {
            const w = workouts[key];
            const isNext = idx === rotationIdx;
            const isSelected = key === selectedKey;
            return (
              <button
                key={key}
                onClick={() => setSelectedKey(key)}
                className={`flex-shrink-0 flex flex-col items-center px-3 py-2.5 rounded-xl border transition-all min-w-[64px] ${
                  isSelected
                    ? "bg-yellow-400 text-black border-yellow-400 font-bold"
                    : isNext
                    ? "bg-yellow-400/10 text-yellow-300 border-yellow-500/40"
                    : "bg-gray-900/50 text-gray-400 border-gray-800 hover:border-gray-600"
                }`}
              >
                <span className="text-lg">{w.emoji}</span>
                <span className="text-[10px] font-semibold mt-0.5 uppercase tracking-tight">{key}</span>
                {isNext && !isSelected && (
                  <span className="text-[9px] text-yellow-400 mt-0.5">NEXT UP</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Workout Header */}
      {workout && (
        <>
          <div className={`rounded-2xl p-4 border ${colorMap[workout.color] || "text-yellow-400 bg-yellow-400/10 border-yellow-500/30"}`}>
            <div className="flex items-center justify-between">
              <div>
                {selectedKey === workoutRotation[rotationIdx] && (
                  <span className="text-xs font-bold uppercase tracking-widest opacity-60 bg-current/10 px-2 py-0.5 rounded-full">
                    Next Up
                  </span>
                )}
                <h2 className="text-xl font-bold mt-1">{workout.emoji} {workout.name}</h2>
                <p className="text-xs opacity-60 mt-0.5">{workout.exercises.length} exercises</p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold">{doneSets}/{totalSets}</p>
                <p className="text-xs opacity-70">sets done</p>
                {doneSets > 0 && (
                  <button onClick={resetWorkout} className="text-xs opacity-50 hover:opacity-80 mt-1">
                    reset
                  </button>
                )}
              </div>
            </div>
            {totalSets > 0 && (
              <div className="mt-3">
                <div className="h-2 bg-black/30 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-current rounded-full transition-all duration-500"
                    style={{ width: `${(doneSets / totalSets) * 100}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Rest Timer */}
          {timer !== null && (
            <div className={`rounded-2xl p-4 border text-center transition-all ${
              timer === 0
                ? "bg-green-500/10 border-green-500/30 text-green-400"
                : "bg-blue-500/10 border-blue-500/30 text-blue-400"
            }`}>
              {timer === 0 ? (
                <div>
                  <p className="text-2xl font-bold">✓ Rest Complete!</p>
                  <button onClick={stopTimer} className="mt-2 text-xs text-gray-400 hover:text-gray-300">Dismiss</button>
                </div>
              ) : (
                <div>
                  <p className="text-xs text-gray-400 mb-1">Rest Timer</p>
                  <p className="text-4xl font-mono font-bold">{formatTime(timer)}</p>
                  <div className="flex gap-2 justify-center mt-3">
                    <button
                      onClick={() => setTimerRunning(!timerRunning)}
                      className="px-4 py-1.5 rounded-lg bg-blue-500/20 text-blue-300 text-sm hover:bg-blue-500/30"
                    >
                      {timerRunning ? "Pause" : "Resume"}
                    </button>
                    <button
                      onClick={stopTimer}
                      className="px-4 py-1.5 rounded-lg bg-gray-800 text-gray-400 text-sm hover:bg-gray-700"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Exercise List */}
          <div className="space-y-3">
            {workout.exercises.map((ex, exIdx) => {
              const { done, total } = getExerciseCompletion(ex);
              const isComplete = done === total;
              const isExpanded = expandedExercise === ex.name;
              const setCount = parseInt(ex.sets) || 3;

              return (
                <div
                  key={exIdx}
                  className={`bg-[#0f0f1a] border rounded-2xl overflow-hidden transition-all ${
                    isComplete ? "border-green-500/30" : "border-gray-800"
                  }`}
                >
                  <button
                    onClick={() => setExpandedExercise(isExpanded ? null : ex.name)}
                    className="w-full flex items-center gap-3 p-4 text-left"
                  >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                      isComplete ? "bg-green-500 text-white" : "bg-gray-800 text-gray-400"
                    }`}>
                      {isComplete ? "✓" : exIdx + 1}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={`font-semibold text-sm ${isComplete ? "text-gray-500 line-through" : "text-white"}`}>
                        {ex.name}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {ex.sets} sets × {ex.reps}
                        {ex.rest && <span className="ml-2 text-blue-400/70">· {ex.rest} rest</span>}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-xs font-semibold ${isComplete ? "text-green-400" : "text-gray-500"}`}>
                        {done}/{total}
                      </span>
                      <span className="text-gray-600 text-sm">{isExpanded ? "▲" : "▼"}</span>
                    </div>
                  </button>

                  {isExpanded && (
                    <div className="px-4 pb-4 space-y-2 border-t border-gray-800/50 pt-3">
                      {ex.notes && (
                        <p className="text-xs text-yellow-400/80 bg-yellow-400/5 rounded-lg px-3 py-2 mb-3">
                          💡 {ex.notes}
                        </p>
                      )}
                      <div className="grid gap-2">
                        {Array.from({ length: setCount }).map((_, setIdx) => {
                          const key = `${ex.name}-set-${setIdx}`;
                          const checked = checkedSets[key] || false;
                          return (
                            <button
                              key={setIdx}
                              onClick={() => {
                                toggleSet(ex.name, setIdx);
                                if (!checked && ex.rest) {
                                  const restSecs = parseRestTime(ex.rest);
                                  if (restSecs > 0) startRestTimer(restSecs);
                                }
                              }}
                              className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                                checked
                                  ? "bg-green-500/10 border-green-500/20 text-green-400"
                                  : "bg-gray-900/50 border-gray-800 text-gray-300 hover:border-gray-600"
                              }`}
                            >
                              <span className={`w-6 h-6 rounded-md flex items-center justify-center text-xs flex-shrink-0 ${
                                checked ? "bg-green-500 text-white" : "bg-gray-800 text-gray-500"
                              }`}>
                                {checked ? "✓" : setIdx + 1}
                              </span>
                              <span className="text-sm font-medium">
                                Set {setIdx + 1}
                                <span className="text-gray-500 ml-2 font-normal">× {ex.reps}</span>
                              </span>
                              {checked && ex.rest && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    startRestTimer(parseRestTime(ex.rest!));
                                  }}
                                  className="ml-auto text-xs text-blue-400 hover:text-blue-300 bg-blue-400/10 px-2 py-1 rounded-lg"
                                >
                                  ⏱ Rest
                                </button>
                              )}
                            </button>
                          );
                        })}
                      </div>
                      {ex.rest && (
                        <div className="flex gap-2 pt-1">
                          <p className="text-xs text-gray-500 flex-1">Rest: {ex.rest}</p>
                          <button
                            onClick={() => startRestTimer(parseRestTime(ex.rest!))}
                            className="text-xs text-blue-400 hover:text-blue-300"
                          >
                            Start rest timer →
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {doneSets === totalSets && totalSets > 0 && (
            <div className="bg-green-500/10 border border-green-500/30 rounded-2xl p-5 text-center">
              <p className="text-3xl mb-2">🎉</p>
              <p className="text-lg font-bold text-green-400">Workout Complete!</p>
              <p className="text-xs text-gray-400 mt-1">
                All {totalSets} sets crushed. Mark it done on the Today tab to advance your rotation.
              </p>
            </div>
          )}
        </>
      )}
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
