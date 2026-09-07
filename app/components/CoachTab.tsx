"use client";

import { useEffect, useRef, useState } from "react";
import { Card, Stat } from "./ui";
import { useStoreRevision } from "./AppBoot";
import {
  buildDigest, fetchBriefing, getBriefing, getBriefingHistory,
  isBriefingStale, localBriefing, saveBriefing,
  type Briefing, type CoachDigest,
} from "../lib/coach";
import { toDisplayWeight } from "../lib/types";

/**
 * The coach briefing.
 *
 * Deliberately short. A long readout after a workout gets skimmed once and
 * never again; four lines and one instruction gets read. The numbers behind it
 * sit underneath, so nothing the model says is unverifiable.
 */
export default function CoachTab() {
  useStoreRevision();
  const [briefing, setBriefing] = useState<Briefing | null>(null);
  const [busy, setBusy] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const autoRan = useRef(false);

  const digest = buildDigest();
  const stale = isBriefingStale(digest);

  const run = async (dg: CoachDigest) => {
    setBusy(true);
    const b = await fetchBriefing(dg);
    saveBriefing(b);
    setBriefing(b);
    setBusy(false);
  };

  useEffect(() => {
    const existing = getBriefing();
    if (existing) setBriefing(existing);
    // Refresh automatically the first time the tab opens after the numbers
    // have moved — which, in practice, is right after a logged workout.
    if (!autoRan.current && (!existing || stale)) {
      autoRan.current = true;
      void run(digest);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dg = briefing?.digest ?? digest;
  const u = dg.unit;
  const disp = (kg: number | null, dp = 1) =>
    kg == null ? "—" : toDisplayWeight(kg, u).toFixed(dp);

  const hist = getBriefingHistory().filter(h => h.generatedAt !== briefing?.generatedAt);

  return (
    <div className="px-4 py-4 space-y-5">

      {/* ── The briefing ── */}
      <Card
        title={briefing ? briefing.headline : "Coach"}
        subtitle={briefing
          ? `${new Date(briefing.generatedAt).toLocaleString("en-GB", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}${briefing.source === "local" ? " · offline read" : ""}`
          : "Reading your numbers…"}
        right={
          <button onClick={() => run(digest)} disabled={busy}
            className="text-xs text-on-accent bg-yellow-400 font-bold px-3.5 py-2.5 rounded-lg active:bg-yellow-300 disabled:opacity-50">
            {busy ? "…" : "Refresh"}
          </button>
        }
      >
        {busy && !briefing ? (
          <div className="py-6 text-center">
            <div className="inline-block w-5 h-5 border-2 border-yellow-500/30 border-t-yellow-400 rounded-full animate-spin" />
          </div>
        ) : briefing ? (
          <div className="space-y-3">
            <Line label="Lifting" text={briefing.lifting} tone="yellow" />
            <Line label="Diet"    text={briefing.diet}    tone="blue" />
            <Line label="Body"    text={briefing.body}    tone="green" />

            <div className="mt-1 pt-3 border-t border-gray-800">
              <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-1">Do this next</p>
              <p className="text-sm text-gray-200 font-semibold leading-snug">{briefing.nextAction}</p>
            </div>
          </div>
        ) : (
          <p className="text-xs text-gray-400">No briefing yet. Tap Refresh.</p>
        )}

        {stale && briefing && !busy && (
          <p className="text-[11px] text-accent mt-3">
            New data since this was written. Refresh for an updated read.
          </p>
        )}
      </Card>

      {/* ── The numbers behind it ── */}
      <Card title="What it read" subtitle="Every figure above comes from these, computed by the app rather than the model">
        <div className="grid grid-cols-3 gap-2">
          <Stat label="Sessions / 7d" value={dg.training.sessionsLast7} tone={dg.training.sessionsLast7 >= 3 ? "green" : "gray"} />
          <Stat label="Weigh-ins" value={`${dg.nutrition.daysWeighedLast7}/7`} tone={dg.nutrition.daysWeighedLast7 >= 5 ? "green" : dg.nutrition.daysWeighedLast7 >= 3 ? "yellow" : "red"} />
          <Stat label="Since lift" value={dg.training.daysSinceLast ?? "—"} unit="d" tone={(dg.training.daysSinceLast ?? 99) <= 3 ? "green" : "yellow"} />

          <Stat label="Target kcal" value={dg.nutrition.targetCalories} tone="gray" />
          <Stat label="Target protein" value={dg.nutrition.targetProtein} unit="g" tone="gray" />
          <Stat label="Wt / week"
            value={dg.weight.weeklyChange == null ? "—" : `${dg.weight.weeklyChange > 0 ? "+" : ""}${disp(dg.weight.weeklyChange, 2)}`}
            unit={u}
            tone={dg.weight.onTrack === "on-track" ? "green" : dg.weight.onTrack === "unknown" ? "gray" : "yellow"}
            hint={dg.weight.onTrack} />
        </div>

        {dg.bodyComp.latestDate && (
          <div className="grid grid-cols-3 gap-2 mt-2">
            <Stat label="Body fat" value={dg.bodyComp.bodyFatPct ?? "—"} unit="%" tone="yellow" />
            <Stat label="Δ fat" value={dg.bodyComp.dFat == null ? "—" : `${dg.bodyComp.dFat > 0 ? "+" : ""}${disp(dg.bodyComp.dFat)}`} unit={u}
              tone={dg.bodyComp.dFat == null ? "gray" : dg.bodyComp.dFat < 0 ? "green" : "red"} />
            <Stat label="Δ muscle" value={dg.bodyComp.dMuscle == null ? "—" : `${dg.bodyComp.dMuscle > 0 ? "+" : ""}${disp(dg.bodyComp.dMuscle)}`} unit={u}
              tone={dg.bodyComp.dMuscle == null ? "gray" : dg.bodyComp.dMuscle >= -0.2 ? "green" : "red"} />
          </div>
        )}

        {dg.nutrition.suggestedDeltaKcal != null ? (
          <p className="text-[11px] text-accent mt-3 leading-relaxed">
            Your weight trend suggests {dg.nutrition.suggestedDeltaKcal > 0 ? "raising" : "lowering"} the
            calorie target by about {Math.abs(dg.nutrition.suggestedDeltaKcal)} a day. See the Fuel tab.
          </p>
        ) : (
          <p className="text-[11px] text-gray-500 mt-3 leading-relaxed">
            Food intake is not tracked in this app, so the coach reads adherence from the scale
            alone. Two weeks of regular weigh-ins lets it tell you when the target is wrong.
          </p>
        )}
      </Card>

      {/* ── Last session's lifts ── */}
      {dg.training.moves.length > 0 && (
        <Card
          title="Last session"
          subtitle={dg.training.lastSessionName ?? undefined}
        >
          <div className="space-y-1.5">
            {dg.training.moves.map(m => {
              const delta = m.prevWeight == null ? null : m.topWeight - m.prevWeight;
              return (
                <div key={m.name} className="flex items-center gap-2 text-sm">
                  <span className="flex-1 min-w-0 truncate text-gray-300">{m.name}</span>
                  <span className="text-gray-200 tabular-nums text-xs font-semibold">
                    {m.topWeight} × {m.topReps}
                  </span>
                  <span className={`text-[11px] tabular-nums w-12 text-right ${
                    delta == null ? "text-gray-600" : delta > 0 ? "text-good" : delta < 0 ? "text-bad" : "text-gray-500"
                  }`}>
                    {delta == null ? "new" : delta === 0 ? "=" : `${delta > 0 ? "+" : ""}${delta}`}
                  </span>
                </div>
              );
            })}
          </div>
          {dg.training.lastVolume != null && (
            <p className="text-[11px] text-gray-500 mt-3">
              Session tonnage {dg.training.lastVolume.toLocaleString()}
              {dg.training.prevVolume != null && ` vs ${dg.training.prevVolume.toLocaleString()} last time`}.
              Weight units follow whatever you logged, so only compare like with like.
            </p>
          )}
        </Card>
      )}

      {/* ── History ── */}
      {hist.length > 0 && (
        <Card
          title="Earlier briefings"
          right={
            <button onClick={() => setShowHistory(v => !v)}
              className="text-[11px] text-gray-500 px-3 py-2.5">
              {showHistory ? "Hide" : `Show ${hist.length}`}
            </button>
          }
        >
          {showHistory && (
            <div className="space-y-3">
              {hist.map(h => (
                <div key={h.generatedAt} className="pb-3 border-b border-gray-800 last:border-0 last:pb-0">
                  <p className="text-[10px] text-gray-500 uppercase tracking-wide">
                    {new Date(h.generatedAt).toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" })}
                  </p>
                  <p className="text-sm text-gray-200 font-semibold mt-0.5">{h.headline}</p>
                  <p className="text-[11px] text-gray-400 mt-1 leading-relaxed">{h.nextAction}</p>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {briefing?.source === "local" && (
        <div className="bg-yellow-400/8 border border-yellow-500/25 rounded-2xl p-3 space-y-2">
          <p className="text-[11px] text-gray-400 leading-relaxed">
            Generated on-device from the rules engine, not the model. The numbers are identical
            either way; only the wording is blunter.
          </p>
          {briefing.fallbackReason && (
            <p className="text-[11px] text-accent font-mono leading-relaxed break-words">
              {briefing.fallbackReason}
            </p>
          )}
          {briefing.fallbackReason?.includes("not-configured") && (
            <p className="text-[11px] text-gray-500 leading-relaxed">
              The key is missing from the running build. If you have already added it, redeploy —
              environment variables only apply to builds created after they were saved.
            </p>
          )}
          {briefing.fallbackReason?.includes("authentication") && (
            <p className="text-[11px] text-gray-500 leading-relaxed">
              The key reached Anthropic and was rejected. Check it was copied whole, and that the
              account has API credits.
            </p>
          )}
        </div>
      )}
    </div>
  );
}

function Line({ label, text, tone }: { label: string; text: string; tone: "yellow" | "blue" | "green" }) {
  if (!text) return null;
  const bar: Record<string, string> = {
    yellow: "bg-yellow-400", blue: "bg-blue-400", green: "bg-green-400",
  };
  return (
    <div className="flex gap-2.5">
      <span className={`w-0.5 shrink-0 rounded-full ${bar[tone]}`} />
      <div className="min-w-0">
        <p className="text-[10px] text-gray-500 uppercase tracking-wide">{label}</p>
        <p className="text-sm text-gray-300 leading-snug mt-0.5">{text}</p>
      </div>
    </div>
  );
}
