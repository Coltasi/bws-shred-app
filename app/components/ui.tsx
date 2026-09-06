"use client";

import { useState } from "react";

/** Shared primitives so the new tabs match the existing dark/amber styling. */

export function Card({ title, subtitle, right, children, className = "" }: {
  title?: string; subtitle?: string; right?: React.ReactNode;
  children: React.ReactNode; className?: string;
}) {
  return (
    <div className={`bg-card border border-gray-800 rounded-2xl p-4 ${className}`}>
      {(title || right) && (
        <div className="flex items-start justify-between mb-3">
          <div>
            {title && <h3 className="font-bold text-gray-200 text-sm">{title}</h3>}
            {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
          </div>
          {right}
        </div>
      )}
      {children}
    </div>
  );
}

export function Stat({ label, value, unit, tone = "gray", hint }: {
  label: string; value: string | number; unit?: string;
  tone?: "gray" | "green" | "yellow" | "red" | "blue" | "purple"; hint?: string;
}) {
  const tones: Record<string, string> = {
    gray:   "text-gray-300 bg-gray-800/50 border-gray-700/40",
    green:  "text-good bg-green-400/10 border-green-500/25",
    yellow: "text-accent bg-yellow-400/10 border-yellow-500/25",
    red:    "text-bad bg-red-400/10 border-red-500/25",
    blue:   "text-info bg-blue-400/10 border-blue-500/25",
    purple: "text-alt bg-purple-400/10 border-purple-500/25",
  };
  return (
    <div className={`rounded-xl p-3 border text-center ${tones[tone]}`}>
      <p className="text-lg font-black leading-tight tabular-nums">
        {value}{unit && <span className="text-[11px] font-medium opacity-70 ml-0.5">{unit}</span>}
      </p>
      <p className="text-[9px] text-gray-400 mt-1 uppercase tracking-wide">{label}</p>
      {hint && <p className="text-[9px] text-gray-600 mt-0.5">{hint}</p>}
    </div>
  );
}

export function Bar({ pct, tone = "yellow", height = "h-2" }: {
  pct: number; tone?: "yellow" | "green" | "red" | "blue"; height?: string;
}) {
  const tones: Record<string, string> = {
    yellow: "bg-yellow-400", green: "bg-green-400", red: "bg-red-400", blue: "bg-blue-400",
  };
  return (
    <div className={`${height} bg-gray-800 rounded-full overflow-hidden`}>
      <div className={`h-full rounded-full transition-all duration-500 ${tones[tone]}`}
        style={{ width: `${Math.max(0, Math.min(100, pct))}%` }} />
    </div>
  );
}

/**
 * Numeric stepper with a tap-to-type field. Built for logging mid-workout with
 * one thumb: big targets, no dropdowns, no date pickers.
 */
export function NumberField({
  value, onChange, step = 1, min = 0, max = 99999, unit, placeholder, decimals = 0, autoFocus,
}: {
  value: number | null; onChange: (v: number | null) => void;
  step?: number; min?: number; max?: number; unit?: string;
  placeholder?: string; decimals?: number; autoFocus?: boolean;
}) {
  // `draft` is null whenever the field is showing the committed value, and a
  // string while the user is mid-edit. That lets someone type "9." or clear the
  // box without the parsed value fighting the caret, with no effect and no
  // derived-state sync to get wrong.
  const [draft, setDraft] = useState<string | null>(null);
  const text = draft ?? (value == null ? "" : String(value));

  const commit = (raw: string) => {
    const trimmed = raw.trim();
    if (trimmed === "") { onChange(null); return; }
    const n = parseFloat(trimmed.replace(",", "."));
    if (isNaN(n)) { onChange(null); return; }
    onChange(clampRound(n, min, max, decimals));
  };

  const bump = (delta: number) => {
    const base = value ?? 0;
    const next = clampRound(base + delta, min, max, decimals);
    setDraft(null);
    onChange(next);
  };

  return (
    <div className="flex items-center gap-2">
      <button type="button" onClick={() => bump(-step)} aria-label="decrease"
        className="w-11 h-11 shrink-0 rounded-xl bg-gray-800 text-gray-300 text-xl font-bold active:bg-gray-700 flex items-center justify-center">−</button>
      <div className="relative flex-1">
        <input
          type="text" inputMode="decimal" autoFocus={autoFocus}
          value={text} placeholder={placeholder}
          onBlur={() => { commit(text); setDraft(null); }}
          onChange={e => { setDraft(e.target.value); commit(e.target.value); }}
          className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2.5 text-center text-lg font-bold text-gray-200 tabular-nums placeholder-gray-600 outline-none focus:border-yellow-500/60"
        />
        {unit && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-500 pointer-events-none">{unit}</span>}
      </div>
      <button type="button" onClick={() => bump(step)} aria-label="increase"
        className="w-11 h-11 shrink-0 rounded-xl bg-gray-800 text-gray-300 text-xl font-bold active:bg-gray-700 flex items-center justify-center">+</button>
    </div>
  );
}

function clampRound(n: number, min: number, max: number, decimals: number) {
  const f = Math.pow(10, decimals);
  return Math.min(max, Math.max(min, Math.round(n * f) / f));
}

export function Pill({ active, onClick, children, tone = "yellow" }: {
  active: boolean; onClick: () => void; children: React.ReactNode; tone?: "yellow" | "green" | "blue";
}) {
  const activeTones: Record<string, string> = {
    yellow: "bg-yellow-400 text-on-accent border-yellow-400",
    green:  "bg-green-400 text-on-accent border-green-400",
    blue:   "bg-blue-400 text-on-accent border-blue-400",
  };
  return (
    <button type="button" onClick={onClick}
      className={`px-3 py-2 rounded-xl border text-xs font-semibold transition-all ${
        active ? activeTones[tone] : "bg-gray-900 text-gray-400 border-gray-700 active:border-gray-500"
      }`}>{children}</button>
  );
}

/**
 * Tiny inline sparkline. Deliberately dependency-free — pulling a charting
 * library into a PWA for five line charts is not a trade worth making.
 */
export function Sparkline({ points, tone = "#facc15", height = 48, invertGood = false }: {
  points: { x: number; y: number }[]; tone?: string; height?: number; invertGood?: boolean;
}) {
  if (points.length < 2) {
    return <div className="text-xs text-gray-600 py-4 text-center">Not enough data yet</div>;
  }
  const xs = points.map(p => p.x), ys = points.map(p => p.y);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const padY = (maxY - minY) * 0.15 || 1;
  const lo = minY - padY, hi = maxY + padY;
  const W = 300, H = height;

  const sx = (x: number) => maxX === minX ? W / 2 : ((x - minX) / (maxX - minX)) * (W - 8) + 4;
  const sy = (y: number) => H - 4 - ((y - lo) / (hi - lo)) * (H - 8);
  const d = points.map((p, i) => `${i === 0 ? "M" : "L"}${sx(p.x).toFixed(1)},${sy(p.y).toFixed(1)}`).join(" ");

  const first = points[0].y, last = points[points.length - 1].y;
  const improving = invertGood ? last > first : last < first;
  const stroke = tone === "auto" ? (improving ? "#4ade80" : "#f87171") : tone;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height }} role="img" aria-label="trend">
      <path d={d} fill="none" stroke={stroke} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      {points.map((p, i) => (
        <circle key={i} cx={sx(p.x)} cy={sy(p.y)} r={i === points.length - 1 ? 3.5 : 2} fill={stroke} />
      ))}
    </svg>
  );
}
