"use client";

import { useState } from "react";
import { Card, Stat, Bar, NumberField, Sparkline } from "./ui";
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
      if (e?.weightKg != null) n++;
    }
    return n;
  })();

  const label = offset === 0 ? "Today" : offset === 1 ? "Yesterday"
    : new Date(date).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" });

  return (
    <div className="px-4 py-4 space-y-5">

      {/* ── One number a day. That is the whole ask. ── */}
      <Card
        title={`Weigh in — ${label}`}
        subtitle={offset === 0 ? "First thing, after the toilet, before food or water" : "Backfilling a missed day"}
        right={
          <div className="flex gap-1">
            <button onClick={() => setOffset(o => Math.min(o + 1, 30))} aria-label="Previous day"
              className="w-10 h-10 rounded-lg bg-gray-800 text-gray-400 text-sm active:bg-gray-700">‹</button>
            <button onClick={() => setOffset(o => Math.max(o - 1, 0))} disabled={offset === 0} aria-label="Next day"
              className="w-10 h-10 rounded-lg bg-gray-800 text-gray-400 text-sm active:bg-gray-700 disabled:opacity-30">›</button>
          </div>
        }
      >
        <NumberField value={displayWeight} onChange={setWeight} step={0.1} decimals={1}
          min={30} max={400} unit={unit} placeholder="—" autoFocus={false} />
        <p className="text-[11px] text-gray-500 mt-2.5 leading-relaxed">
          Day to day this bounces around with water and food in transit. The weekly average is the
          real signal, and the app only ever adjusts on that.
        </p>
      </Card>

      {/* ── The plan ── */}
      <Card
        title="Your targets"
        subtitle="Hit these. The app does not track whether you did."
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
      <Card title="Consistency" subtitle="Days weighed in the last 7">
        <div className="flex items-center gap-3">
          <div className="text-3xl font-black text-gray-200 tabular-nums">{loggedLast7}<span className="text-lg text-gray-600">/7</span></div>
          <div className="flex-1">
            <Bar pct={(loggedLast7 / 7) * 100} tone={loggedLast7 >= 5 ? "green" : loggedLast7 >= 3 ? "yellow" : "red"} />
            <p className="text-[11px] text-gray-500 mt-1.5 leading-relaxed">
              {loggedLast7 >= 5
                ? "Enough for a trustworthy weekly average. Keep it here."
                : loggedLast7 >= 3
                ? "Workable. Five or more days makes the weekly average solid enough to adjust on."
                : "Below three days a week the average is noise, and the app will not suggest changes."}
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
            <Stat label="Target" value={plan.targets.calories} unit="kcal" />
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
