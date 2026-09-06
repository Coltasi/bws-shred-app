"use client";

import { useState } from "react";
import { Card, Stat, Bar, NumberField, Sparkline, Pill } from "./ui";
import { useStoreRevision } from "./AppBoot";
import { getDaily, getDay, saveDay, getProfile, latestScan } from "../lib/data";
import { buildPlan, bucketByWeek, todayIso, toIso } from "../lib/nutrition";
import { toDisplayWeight, fromDisplayWeight } from "../lib/types";

/**
 * The Nutrition tab: daily logging plus the adaptive TDEE readout.
 *
 * Design constraint that drove everything here — the previous attempt at this
 * (a spreadsheet) was abandoned after seven weeks. So weight and calories are
 * the very first thing on screen, they're steppers rather than forms, and
 * nothing else is allowed above them.
 */

const QUICK_CALS = [200, 400, 600, 800];

export default function NutritionTab() {
  useStoreRevision();
  const [offset, setOffset] = useState(0);   // 0 = today, 1 = yesterday...

  const date = (() => {
    const d = new Date();
    d.setDate(d.getDate() - offset);
    return toIso(d);
  })();

  const profile = getProfile();
  const unit = profile.unit;
  const entry = getDay(date);
  const daily = getDaily();
  const weeks = bucketByWeek(daily);
  const plan = buildPlan(profile, weeks, latestScan());

  const displayWeight = entry.weightKg == null ? null
    : Math.round(toDisplayWeight(entry.weightKg, unit) * 10) / 10;

  const setWeight = (v: number | null) =>
    saveDay(date, { weightKg: v == null ? undefined : Math.round(fromDisplayWeight(v, unit) * 100) / 100 });

  const setCalories = (v: number | null) => saveDay(date, { calories: v ?? undefined });
  const setProtein  = (v: number | null) => saveDay(date, { proteinG: v ?? undefined });

  const cals = entry.calories ?? 0;
  const target = plan.targets.calories;
  const remaining = target - cals;
  const calPct = target > 0 ? (cals / target) * 100 : 0;

  const protein = entry.proteinG ?? 0;
  const proteinTarget = plan.targets.proteinG;
  const proteinPct = proteinTarget > 0 ? (protein / proteinTarget) * 100 : 0;

  // Trend series
  const weightSeries = (() => {
    const rows = Object.values(daily)
      .filter(e => typeof e.weightKg === "number")
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-60);
    return rows.map(e => ({ x: new Date(e.date).getTime(), y: toDisplayWeight(e.weightKg!, unit) }));
  })();

  const recentWeeks = weeks.slice(-8);
  const thisWeek = weeks[weeks.length - 1];

  const loggedLast7 = (() => {
    let n = 0;
    for (let i = 0; i < 7; i++) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const e = daily[toIso(d)];
      if (e?.calories != null && e?.weightKg != null) n++;
    }
    return n;
  })();

  const label = offset === 0 ? "Today" : offset === 1 ? "Yesterday"
    : new Date(date).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });

  return (
    <div className="px-4 py-4 space-y-5">

      {/* ── Log first. Everything else is secondary. ── */}
      <Card
        title={`Log — ${label}`}
        subtitle={offset === 0 ? "Weigh first thing, after the toilet, before food" : "Backfilling a missed day"}
        right={
          <div className="flex gap-1">
            <button onClick={() => setOffset(o => Math.min(o + 1, 30))}
              className="w-8 h-8 rounded-lg bg-gray-800 text-gray-400 text-sm active:bg-gray-700">‹</button>
            <button onClick={() => setOffset(o => Math.max(o - 1, 0))} disabled={offset === 0}
              className="w-8 h-8 rounded-lg bg-gray-800 text-gray-400 text-sm active:bg-gray-700 disabled:opacity-30">›</button>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <div className="flex justify-between items-baseline mb-1.5">
              <span className="text-xs text-gray-400 uppercase tracking-wide">Bodyweight</span>
              <span className="text-[11px] text-gray-600">{unit}</span>
            </div>
            <NumberField value={displayWeight} onChange={setWeight} step={0.1} decimals={1}
              min={30} max={400} unit={unit} placeholder="—" />
          </div>

          <div>
            <div className="flex justify-between items-baseline mb-1.5">
              <span className="text-xs text-gray-400 uppercase tracking-wide">Calories</span>
              <span className={`text-[11px] font-semibold ${remaining < 0 ? "text-bad" : "text-gray-500"}`}>
                {cals > 0 ? (remaining >= 0 ? `${remaining} left` : `${Math.abs(remaining)} over`) : `target ${target}`}
              </span>
            </div>
            <NumberField value={entry.calories ?? null} onChange={setCalories} step={50}
              min={0} max={12000} unit="kcal" placeholder="—" />
            <div className="flex gap-2 mt-2">
              {QUICK_CALS.map(n => (
                <button key={n} onClick={() => setCalories((entry.calories ?? 0) + n)}
                  className="flex-1 py-2 rounded-xl bg-gray-800 text-gray-300 text-xs font-semibold active:bg-gray-700">
                  +{n}
                </button>
              ))}
            </div>
            {cals > 0 && <div className="mt-2"><Bar pct={calPct} tone={calPct > 108 ? "red" : calPct > 92 ? "green" : "yellow"} /></div>}
          </div>

          <div>
            <div className="flex justify-between items-baseline mb-1.5">
              <span className="text-xs text-gray-400 uppercase tracking-wide">Protein</span>
              <span className="text-[11px] text-gray-500">target {proteinTarget} g</span>
            </div>
            <NumberField value={entry.proteinG ?? null} onChange={setProtein} step={10}
              min={0} max={500} unit="g" placeholder="—" />
            {protein > 0 && (
              <div className="mt-2">
                <Bar pct={proteinPct} tone={proteinPct >= 90 ? "green" : "yellow"} />
                <p className="text-[11px] text-gray-500 mt-1">
                  {proteinPct >= 90
                    ? "Good. Protein is the one macro that protects muscle in a deficit."
                    : `${Math.max(0, proteinTarget - protein)} g short. This is the macro that decides whether you lose fat or lose muscle.`}
                </p>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* ── The plan ── */}
      <Card
        title="Your numbers"
        subtitle={plan.tdeeSource === "measured"
          ? `Measured from ${plan.weeksLogged} weeks of your own data`
          : "Estimated — not yet measured from your data"}
        right={
          <span className={`text-[10px] px-2 py-1 rounded-lg font-semibold uppercase tracking-wide ${
            plan.confidence === "high" ? "bg-green-400/15 text-good"
            : plan.confidence === "medium" ? "bg-yellow-400/15 text-accent"
            : "bg-gray-700/40 text-gray-400"
          }`}>{plan.confidence}</span>
        }
      >
        <div className="grid grid-cols-4 gap-2">
          <Stat label="Calories" value={plan.targets.calories} tone="yellow" />
          <Stat label="Protein" value={plan.targets.proteinG} unit="g" tone="green" />
          <Stat label="Fat" value={plan.targets.fatG} unit="g" tone="blue" />
          <Stat label="Carbs" value={plan.targets.carbsG} unit="g" tone="purple" />
        </div>

        <div className="grid grid-cols-3 gap-2 mt-2">
          <Stat label="TDEE" value={plan.tdee} tone="gray" hint={plan.tdeeSource} />
          <Stat label="Daily deficit" value={plan.dailyDelta} tone="gray" />
          <Stat label="Goal / week"
            value={`${plan.goalWeeklyChangeKg > 0 ? "+" : ""}${(unit === "kg"
              ? plan.goalWeeklyChangeKg
              : plan.goalWeeklyChangeKg * 2.2046).toFixed(2)}`}
            unit={unit} tone="gray" />
        </div>

        <p className="text-[11px] text-gray-500 mt-3 leading-relaxed">{plan.confidenceNote}</p>
        <p className="text-[11px] text-gray-500 mt-1.5 leading-relaxed">{plan.phaseReason}</p>

        {plan.tdeeSource === "baseline" && (
          <div className="mt-3 bg-yellow-400/5 border border-yellow-500/20 rounded-xl p-3">
            <p className="text-[11px] text-accent/90 leading-relaxed">
              These are equation numbers, not your numbers. Log weight and calories daily and after
              three weeks the app replaces the equation with arithmetic on your actual results.
              That switch is the entire point of the program.
            </p>
          </div>
        )}
      </Card>

      {/* ── Consistency, because this is what actually failed last time ── */}
      <Card title="Consistency" subtitle="Days fully logged in the last 7">
        <div className="flex items-center gap-3">
          <div className="text-3xl font-black text-gray-200 tabular-nums">{loggedLast7}<span className="text-lg text-gray-600">/7</span></div>
          <div className="flex-1">
            <Bar pct={(loggedLast7 / 7) * 100} tone={loggedLast7 >= 5 ? "green" : loggedLast7 >= 3 ? "yellow" : "red"} />
            <p className="text-[11px] text-gray-500 mt-1.5 leading-relaxed">
              {loggedLast7 >= 5
                ? "Enough to measure your TDEE accurately. Keep it here."
                : loggedLast7 >= 3
                ? "Workable, but four or more days a week is where the maths gets trustworthy."
                : "Below three days a week the adaptive engine can't run. It needs both numbers, most days."}
            </p>
          </div>
        </div>
      </Card>

      {/* ── Trends ── */}
      <Card title="Bodyweight trend" subtitle={`Last ${weightSeries.length} logged days`}>
        <Sparkline points={weightSeries} tone="auto" height={64} />
        {thisWeek?.avgWeightKg != null && (
          <div className="grid grid-cols-3 gap-2 mt-3">
            <Stat label="This week avg" value={toDisplayWeight(thisWeek.avgWeightKg, unit).toFixed(1)} unit={unit} />
            <Stat label="Days weighed" value={`${thisWeek.daysWeightLogged}/7`} />
            <Stat label="Avg intake" value={thisWeek.avgCalories ?? "—"} />
          </div>
        )}
      </Card>

      {recentWeeks.length > 1 && (
        <Card title="Weekly history" subtitle="Average weight and intake per week">
          <div className="space-y-1.5">
            {[...recentWeeks].reverse().map(w => {
              const idx = weeks.indexOf(w);
              const prev = idx > 0 ? weeks[idx - 1] : null;
              const delta = w.avgWeightKg != null && prev?.avgWeightKg != null
                ? w.avgWeightKg - prev.avgWeightKg : null;
              return (
                <div key={w.weekStart} className="flex items-center gap-2 text-sm">
                  <span className="text-gray-500 text-xs w-16 shrink-0">
                    {new Date(w.weekStart).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
                  </span>
                  <span className="text-gray-200 tabular-nums w-16 text-right">
                    {w.avgWeightKg != null ? `${toDisplayWeight(w.avgWeightKg, unit).toFixed(1)}` : "—"}
                  </span>
                  <span className={`text-xs tabular-nums w-14 text-right ${
                    delta == null ? "text-gray-600" : delta < 0 ? "text-good" : "text-bad"
                  }`}>
                    {delta == null ? "—" : `${delta > 0 ? "+" : ""}${(unit === "kg" ? delta : delta * 2.2046).toFixed(2)}`}
                  </span>
                  <span className="text-gray-400 text-xs tabular-nums flex-1 text-right">
                    {w.avgCalories ?? "—"} kcal
                  </span>
                  <span className="text-gray-600 text-[10px] w-8 text-right">{w.daysCaloriesLogged}d</span>
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}
