"use client";

import { useState } from "react";
import { Card, Stat, Sparkline, NumberField, Pill } from "./ui";
import { useStoreRevision } from "./AppBoot";
import { scanList, saveScan, deleteScan, latestScan, daysSinceScan, getProfile } from "../lib/data";
import { todayIso } from "../lib/nutrition";
import type { BodyScan } from "../lib/types";

/**
 * Body composition from the Tanita MC-780MA-N.
 *
 * The scale weight is the noisiest number you own and the least informative.
 * This tab exists so the question is always "where did the change come from",
 * not "what did the scale say". Losing 1.3 kg looks like progress until you
 * see it was 1.7 kg of muscle and half a kilo of fat gained.
 */

type Metric = "bodyFatPct" | "fatMassKg" | "muscleMassKg" | "weightKg" | "visceralFat" | "bodyWaterPct";

const METRICS: { key: Metric; label: string; unit: string; goodDown: boolean; note: string }[] = [
  { key: "fatMassKg",    label: "Fat mass",   unit: "kg", goodDown: true,  note: "The number the whole cut is actually about." },
  { key: "muscleMassKg", label: "Muscle",     unit: "kg", goodDown: false, note: "Hold this flat in a deficit and you're winning. Includes glycogen and its bound water, so it swings with training." },
  { key: "bodyFatPct",   label: "Body fat",   unit: "%",  goodDown: true,  note: "Ratio, so it moves when either fat or muscle moves. Read it alongside fat mass, never alone." },
  { key: "weightKg",     label: "Weight",     unit: "kg", goodDown: true,  note: "The least useful line on this page." },
  { key: "visceralFat",  label: "Visceral",   unit: "",   goodDown: true,  note: "Coarse integer scale, but it's the one your doctor cares about. Under 10 is the target." },
  { key: "bodyWaterPct", label: "Body water", unit: "%",  goodDown: false, note: "Rises as body fat falls. Sudden drops usually mean dehydration, not fat loss — rescan." },
];

const emptyScan = (): Partial<BodyScan> => ({ date: todayIso(), source: "tanita" });

export default function BodyTab() {
  useStoreRevision();
  const [metric, setMetric] = useState<Metric>("fatMassKg");
  const [draft, setDraft] = useState<Partial<BodyScan> | null>(null);

  const scans = scanList();
  const latest = latestScan();
  const previous = scans.length > 1 ? scans[scans.length - 2] : null;
  const first = scans[0] ?? null;
  const sinceScan = daysSinceScan();
  const profile = getProfile();

  const series = scans
    .filter(s => typeof s[metric] === "number")
    .map(s => ({ x: new Date(s.date).getTime(), y: s[metric] as number }));

  const activeMetric = METRICS.find(m => m.key === metric)!;

  const delta = (key: Metric, from: BodyScan | null, to: BodyScan | null) => {
    if (!from || !to) return null;
    const a = from[key], b = to[key];
    if (typeof a !== "number" || typeof b !== "number") return null;
    return b - a;
  };

  const saveDraft = () => {
    if (!draft?.date || typeof draft.weightKg !== "number") return;
    saveScan({ ...draft, date: draft.date, weightKg: draft.weightKg } as BodyScan);
    setDraft(null);
  };

  return (
    <div className="px-4 py-4 space-y-5">

      {sinceScan != null && sinceScan > 30 && (
        <div className="bg-yellow-400/8 border border-yellow-500/25 rounded-2xl p-3">
          <p className="text-xs text-accent font-semibold">
            Last scan was {sinceScan} days ago
          </p>
          <p className="text-[11px] text-gray-400 mt-0.5 leading-relaxed">
            Every calorie and macro target in the app is anchored to your body fat percentage.
            Once a month keeps it honest.
          </p>
        </div>
      )}

      {latest && (
        <Card
          title="Latest scan"
          subtitle={new Date(latest.date).toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" })}
          right={
            <button onClick={() => setDraft(emptyScan())}
              className="text-xs text-on-accent bg-yellow-400 font-bold px-3 py-1.5 rounded-lg active:bg-yellow-300">
              + Scan
            </button>
          }
        >
          <div className="grid grid-cols-3 gap-2">
            <Stat label="Weight" value={latest.weightKg.toFixed(1)} unit="kg" />
            <Stat label="Body fat" value={latest.bodyFatPct?.toFixed(1) ?? "—"} unit="%" tone="yellow" />
            <Stat label="Fat mass" value={latest.fatMassKg?.toFixed(1) ?? "—"} unit="kg" tone="red" />
            <Stat label="Muscle" value={latest.muscleMassKg?.toFixed(1) ?? "—"} unit="kg" tone="green" />
            <Stat label="Water" value={latest.bodyWaterPct?.toFixed(1) ?? "—"} unit="%" tone="blue" />
            <Stat label="Visceral" value={latest.visceralFat ?? "—"} tone={
              latest.visceralFat != null && latest.visceralFat >= 13 ? "red"
              : latest.visceralFat != null && latest.visceralFat >= 10 ? "yellow" : "green"} />
          </div>

          {previous && (
            <div className="mt-3 pt-3 border-t border-gray-800">
              <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-2">
                Since {new Date(previous.date).toLocaleDateString("en-GB", { day: "numeric", month: "short" })}
              </p>
              <div className="space-y-1">
                <DeltaRow label="Fat mass"  value={delta("fatMassKg", previous, latest)}    unit="kg" goodDown />
                <DeltaRow label="Muscle"    value={delta("muscleMassKg", previous, latest)} unit="kg" />
                <DeltaRow label="Weight"    value={delta("weightKg", previous, latest)}     unit="kg" goodDown />
                <DeltaRow label="Visceral"  value={delta("visceralFat", previous, latest)}  unit=""   goodDown />
              </div>
              <Verdict previous={previous} latest={latest} />
            </div>
          )}

          {first && first !== latest && (
            <div className="mt-3 pt-3 border-t border-gray-800">
              <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-2">
                Since first scan ({new Date(first.date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "2-digit" })})
              </p>
              <div className="space-y-1">
                <DeltaRow label="Fat mass" value={delta("fatMassKg", first, latest)} unit="kg" goodDown />
                <DeltaRow label="Muscle"   value={delta("muscleMassKg", first, latest)} unit="kg" />
                <DeltaRow label="Weight"   value={delta("weightKg", first, latest)} unit="kg" goodDown />
              </div>
            </div>
          )}
        </Card>
      )}

      {!latest && (
        <Card title="No scans yet">
          <p className="text-xs text-gray-400 leading-relaxed mb-3">
            Add a Tanita reading and the app will anchor your calorie and macro targets to measured
            body fat rather than an estimate from a tape measure.
          </p>
          <button onClick={() => setDraft(emptyScan())}
            className="w-full py-3 rounded-xl bg-yellow-400 text-on-accent font-bold text-sm active:bg-yellow-300">
            Add first scan
          </button>
        </Card>
      )}

      {/* ── Trend ── */}
      <Card title="Trend" subtitle={activeMetric.note}>
        <div className="flex gap-1.5 overflow-x-auto pb-2 -mx-1 px-1">
          {METRICS.map(m => (
            <div key={m.key} className="shrink-0">
              <Pill active={metric === m.key} onClick={() => setMetric(m.key)}>{m.label}</Pill>
            </div>
          ))}
        </div>
        <Sparkline points={series} tone="auto" height={72} invertGood={!activeMetric.goodDown} />
        <div className="flex justify-between text-[10px] text-gray-600 mt-1">
          <span>{scans[0] ? new Date(scans[0].date).toLocaleDateString("en-GB", { month: "short", year: "2-digit" }) : ""}</span>
          <span>{latest ? new Date(latest.date).toLocaleDateString("en-GB", { month: "short", year: "2-digit" }) : ""}</span>
        </div>
      </Card>

      {/* ── Segmental ── */}
      {latest?.segMuscle && (
        <Card title="Segmental muscle" subtitle="Left/right asymmetry above ~5% is worth addressing with unilateral work">
          <SegmentalGrid reading={latest.segMuscle} unit="kg" />
        </Card>
      )}
      {latest?.segFat && (
        <Card title="Segmental body fat" subtitle="Trunk runs highest for most men and is the last to come down">
          <SegmentalGrid reading={latest.segFat} unit="%" />
        </Card>
      )}

      {/* ── History ── */}
      {scans.length > 0 && (
        <Card title="All scans" subtitle={`${scans.length} recorded`}>
          <div className="space-y-1.5">
            {[...scans].reverse().map(s => (
              <div key={s.date} className="flex items-center gap-2 text-sm py-1">
                <span className="text-gray-400 text-xs w-20 shrink-0">
                  {new Date(s.date).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "2-digit" })}
                </span>
                <span className="text-gray-200 tabular-nums w-14 text-right">{s.weightKg.toFixed(1)}</span>
                <span className="text-accent tabular-nums w-14 text-right text-xs">{s.bodyFatPct?.toFixed(1) ?? "—"}%</span>
                <span className="text-good tabular-nums w-14 text-right text-xs">{s.muscleMassKg?.toFixed(1) ?? "—"}</span>
                <button onClick={() => setDraft({ ...s })}
                  className="ml-auto text-[11px] text-gray-500 px-2 py-1 active:text-gray-300">edit</button>
              </div>
            ))}
          </div>
        </Card>
      )}

      {draft && (
        <ScanEditor
          draft={draft}
          onChange={setDraft}
          onSave={saveDraft}
          onCancel={() => setDraft(null)}
          onDelete={draft.date && scans.some(s => s.date === draft.date)
            ? () => { deleteScan(draft.date!); setDraft(null); } : undefined}
        />
      )}
    </div>
  );
}

function DeltaRow({ label, value, unit, goodDown = false }: {
  label: string; value: number | null; unit: string; goodDown?: boolean;
}) {
  if (value == null) return null;
  const good = goodDown ? value < 0 : value > 0;
  const neutral = Math.abs(value) < 0.05;
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-gray-400">{label}</span>
      <span className={`font-bold tabular-nums ${neutral ? "text-gray-500" : good ? "text-good" : "text-bad"}`}>
        {value > 0 ? "+" : ""}{value.toFixed(unit === "" ? 0 : 1)}{unit && ` ${unit}`}
      </span>
    </div>
  );
}

/**
 * The interpretation the raw numbers don't give you: whether a change in scale
 * weight was fat or muscle. This is the whole reason to own a body-comp scale.
 */
function Verdict({ previous, latest }: { previous: BodyScan; latest: BodyScan }) {
  const dFat = latest.fatMassKg != null && previous.fatMassKg != null ? latest.fatMassKg - previous.fatMassKg : null;
  const dMus = latest.muscleMassKg != null && previous.muscleMassKg != null ? latest.muscleMassKg - previous.muscleMassKg : null;
  if (dFat == null || dMus == null) return null;

  let text: string, tone: string;
  if (dFat < -0.2 && dMus > -0.3) {
    text = "Fat down, muscle held. This is exactly what a cut is supposed to look like.";
    tone = "text-good";
  } else if (dFat < -0.2 && dMus <= -0.3) {
    text = "Fat down but muscle went with it. Push protein toward the top of the range and make sure you're training hard enough to justify keeping it.";
    tone = "text-accent";
  } else if (dFat >= -0.2 && dMus > 0.2) {
    text = "Muscle up, fat roughly flat. Recomposition — rare and good.";
    tone = "text-good";
  } else if (dFat > 0.2 && dMus < -0.3) {
    text = "Muscle down and fat up. That's the detraining pattern: not enough training stimulus, calories above expenditure. Both fixable, and the muscle comes back faster than it left.";
    tone = "text-bad";
  } else {
    text = "Broadly flat. Either the deficit isn't real or there hasn't been enough time between scans.";
    tone = "text-gray-400";
  }

  return <p className={`text-[11px] mt-2.5 leading-relaxed ${tone}`}>{text}</p>;
}

function SegmentalGrid({ reading, unit }: { reading: NonNullable<BodyScan["segMuscle"]>; unit: string }) {
  const cell = (label: string, v?: number) => (
    <div className="bg-gray-900/60 border border-gray-800 rounded-lg p-2 text-center">
      <p className="text-sm font-bold text-gray-200 tabular-nums">{v?.toFixed(1) ?? "—"}<span className="text-[9px] text-gray-500 ml-0.5">{unit}</span></p>
      <p className="text-[9px] text-gray-500 uppercase tracking-wide mt-0.5">{label}</p>
    </div>
  );
  const armGap = reading.armL != null && reading.armR != null
    ? Math.abs(reading.armL - reading.armR) / Math.max(reading.armL, reading.armR) * 100 : null;
  const legGap = reading.legL != null && reading.legR != null
    ? Math.abs(reading.legL - reading.legR) / Math.max(reading.legL, reading.legR) * 100 : null;

  return (
    <>
      <div className="grid grid-cols-3 gap-2">
        {cell("L arm", reading.armL)}
        {cell("Trunk", reading.trunk)}
        {cell("R arm", reading.armR)}
        {cell("L leg", reading.legL)}
        <div />
        {cell("R leg", reading.legR)}
      </div>
      {(armGap != null || legGap != null) && (
        <p className="text-[11px] text-gray-500 mt-2.5">
          Asymmetry: arms {armGap?.toFixed(1) ?? "—"}%, legs {legGap?.toFixed(1) ?? "—"}%.
          {(armGap ?? 0) > 5 || (legGap ?? 0) > 5
            ? " Above 5% — worth prioritising single-arm and single-leg work."
            : " Within normal range."}
        </p>
      )}
    </>
  );
}

function ScanEditor({ draft, onChange, onSave, onCancel, onDelete }: {
  draft: Partial<BodyScan>;
  onChange: (d: Partial<BodyScan>) => void;
  onSave: () => void; onCancel: () => void; onDelete?: () => void;
}) {
  const set = (k: keyof BodyScan, v: number | null) =>
    onChange({ ...draft, [k]: v ?? undefined });

  const field = (label: string, key: keyof BodyScan, step: number, decimals: number, unit: string, max = 500) => (
    <div>
      <label className="text-[11px] text-gray-400 uppercase tracking-wide block mb-1">{label}</label>
      <NumberField value={(draft[key] as number | undefined) ?? null}
        onChange={v => set(key, v)} step={step} decimals={decimals} unit={unit} min={0} max={max} placeholder="—" />
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="max-w-md mx-auto min-h-full px-4 py-6">
        <div className="bg-card border border-gray-700 rounded-2xl p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-gray-200">Tanita scan</h3>
            <button onClick={onCancel} className="text-gray-500 text-sm px-2 py-1">Cancel</button>
          </div>

          <p className="text-[11px] text-gray-500 leading-relaxed">
            Cycle the FAT / Muscle / Water / Visceral / BMR buttons on the machine and type each
            reading in. Only weight is required — leave anything you didn&apos;t photograph blank
            rather than guessing.
          </p>

          <div>
            <label className="text-[11px] text-gray-400 uppercase tracking-wide block mb-1">Date</label>
            <input type="date" value={draft.date ?? todayIso()}
              onChange={e => onChange({ ...draft, date: e.target.value })}
              className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2.5 text-gray-200 text-sm outline-none focus:border-yellow-500/60" />
          </div>

          {field("Weight (required)", "weightKg", 0.1, 1, "kg", 300)}
          {field("Body fat", "bodyFatPct", 0.1, 1, "%", 70)}
          {field("Fat mass", "fatMassKg", 0.1, 1, "kg", 200)}
          {field("Muscle mass", "muscleMassKg", 0.1, 1, "kg", 200)}
          {field("Body water", "bodyWaterPct", 0.1, 1, "%", 90)}
          {field("Visceral fat", "visceralFat", 1, 0, "", 60)}
          {field("BMR", "bmrKcal", 10, 0, "kcal", 6000)}

          <div className="flex gap-2 pt-1">
            <button onClick={onSave}
              disabled={typeof draft.weightKg !== "number"}
              className="flex-1 py-3 rounded-xl bg-yellow-400 text-on-accent font-bold text-sm active:bg-yellow-300 disabled:opacity-40">
              Save scan
            </button>
            {onDelete && (
              <button onClick={onDelete}
                className="px-4 py-3 rounded-xl bg-red-500/15 text-bad border border-red-500/30 text-sm font-semibold">
                Delete
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
