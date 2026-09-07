"use client";

import { useEffect, useRef, useState } from "react";
import { Card, NumberField, Pill } from "./ui";
import { useStoreRevision } from "./AppBoot";
import { getProfile, saveProfile, getDaily, scanList, getSessions } from "../lib/data";
import { persistenceStatus } from "../lib/store";
import { isStandalone, type PersistenceStatus } from "../lib/db";
import {
  syncConfigured, currentSession, signIn, signOut, push, pull,
  downloadExport, importFromFile, lastSyncError,
} from "../lib/sync";
import type { MainGoal, Phase, TrainingExperience, WeightUnit } from "../lib/types";
import { THEMES, getTheme, setTheme, type ThemeId } from "../lib/theme";

export default function SettingsSheet({ onClose }: { onClose: () => void }) {
  useStoreRevision();
  const profile = getProfile();
  const [persist, setPersist] = useState<PersistenceStatus | null>(null);
  const [email, setEmail] = useState("");
  const [signedInAs, setSignedInAs] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [theme, setThemeState] = useState<ThemeId>(getTheme());
  const fileInput = useRef<HTMLInputElement>(null);

  useEffect(() => {
    void persistenceStatus(true).then(setPersist);
    void currentSession().then(s => setSignedInAs(s?.user.email ?? null));
  }, []);

  const daily = getDaily();
  const dayCount = Object.keys(daily).length;
  const scanCount = scanList().length;
  const sessionCount = getSessions().length;

  const usageMb = persist?.usage != null ? (persist.usage / 1_048_576).toFixed(1) : null;
  const quotaMb = persist?.quota != null ? (persist.quota / 1_048_576).toFixed(0) : null;

  const doSignIn = async () => {
    if (!email.includes("@")) { setMsg("Enter a valid email address."); return; }
    setBusy(true);
    const { error } = await signIn(email);
    setBusy(false);
    setMsg(error ?? "Check your email — the link signs this device in.");
  };

  const doImport = async (file: File) => {
    setBusy(true);
    const { error, keys } = await importFromFile(file);
    setBusy(false);
    setMsg(error ?? `Restored ${keys} records.`);
  };

  return (
    <div className="fixed inset-0 z-50 bg-scrim backdrop-blur-sm overflow-y-auto">
      <div className="max-w-md mx-auto min-h-full px-4 py-5 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-200">Settings</h2>
          <button onClick={onClose}
            className="px-3 py-1.5 rounded-lg bg-gray-800 text-gray-300 text-sm font-semibold">Done</button>
        </div>

        {/* ── Appearance ── */}
        <Card title="Appearance" subtitle="Applies instantly, stored on this device">
          <div className="space-y-2">
            {THEMES.map(t => {
              const active = theme === t.id;
              return (
                <button key={t.id} onClick={() => { setTheme(t.id); setThemeState(t.id); }}
                  className={`w-full flex items-center gap-3 p-2.5 rounded-xl border text-left transition-all ${
                    active ? "border-yellow-400 bg-yellow-400/10" : "border-gray-700 bg-gray-900 active:border-gray-600"
                  }`}>
                  <div className="flex shrink-0 rounded-lg overflow-hidden border border-gray-700">
                    {t.swatch.map(c => (
                      <span key={c} className="w-5 h-8 block" style={{ backgroundColor: c }} />
                    ))}
                  </div>
                  <div className="min-w-0">
                    <p className={`text-xs font-bold ${active ? "text-accent" : "text-gray-200"}`}>{t.name}</p>
                    <p className="text-[11px] text-gray-500 leading-snug mt-0.5">{t.blurb}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </Card>

        {/* ── Data safety, first, because it's the reason this rebuild happened ── */}
        <Card title="Data safety" subtitle="Three independent layers">
          <Layer
            ok={persist?.standalone ?? isStandalone()}
            title="Installed to home screen"
            good="Installed. Safari's 7-day storage wipe does not apply."
            bad="Not installed. In a Safari tab, iOS deletes all app data after 7 days without a visit. Open the share sheet and choose Add to Home Screen — this is the single most important thing on this page."
          />
          <Layer
            ok={persist?.persisted ?? false}
            title="Persistent storage granted"
            good="Granted. Data is only removed if you clear it deliberately."
            bad="Not yet granted. Browsers award this based on engagement, so it usually flips on after a few days of real use. Installing to the home screen makes it far more likely."
          />
          <Layer
            ok={Boolean(signedInAs)}
            title="Cloud backup"
            good={`Backed up as ${signedInAs}. Survives losing this phone.`}
            bad={syncConfigured
              ? "Not signed in. Everything still works, but a lost or wiped phone loses the log."
              : "Not configured in this build. Use the JSON export below as your backup."}
          />

          {usageMb && (
            <p className="text-[11px] text-gray-600 mt-3">
              Using {usageMb} MB{quotaMb ? ` of about ${quotaMb} MB available` : ""}.
              For reference, the old localStorage-only version capped out at 5 MB and failed silently.
            </p>
          )}
        </Card>

        {/* ── Cloud sync ── */}
        {syncConfigured && (
          <Card title="Cloud backup" subtitle="One row, last write wins. Works offline.">
            {signedInAs ? (
              <div className="space-y-2">
                <p className="text-xs text-gray-300">Signed in as <span className="text-gray-200 font-semibold">{signedInAs}</span></p>
                {lastSyncError() && <p className="text-[11px] text-bad">Last sync error: {lastSyncError()}</p>}
                <div className="flex gap-2">
                  <button disabled={busy} onClick={async () => { setBusy(true); const r = await push(); setBusy(false); setMsg(r.error ?? "Backed up."); }}
                    className="flex-1 py-2.5 rounded-xl bg-gray-800 text-gray-200 text-xs font-semibold">Back up now</button>
                  <button disabled={busy} onClick={async () => { setBusy(true); const r = await pull(); setBusy(false); setMsg(r ? "Restored newer cloud copy." : "Local copy is already current."); }}
                    className="flex-1 py-2.5 rounded-xl bg-gray-800 text-gray-200 text-xs font-semibold">Restore</button>
                </div>
                <button onClick={async () => { await signOut(); setSignedInAs(null); }}
                  className="w-full py-2 text-[11px] text-gray-500">Sign out</button>
              </div>
            ) : (
              <div className="space-y-2">
                <input type="email" inputMode="email" placeholder="you@example.com"
                  value={email} onChange={e => setEmail(e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 rounded-xl px-3 py-2.5 text-sm text-gray-200 placeholder-gray-600 outline-none focus:border-yellow-500/60" />
                <button disabled={busy} onClick={doSignIn}
                  className="w-full py-2.5 rounded-xl bg-yellow-400 text-on-accent text-sm font-bold active:bg-yellow-300 disabled:opacity-50">
                  Send magic link
                </button>
                <p className="text-[11px] text-gray-600 leading-relaxed">
                  No password. One tap in the email authorises this device, and it stays signed in.
                </p>
              </div>
            )}
          </Card>
        )}

        {/* ── Manual backup ── */}
        <Card title="Manual backup" subtitle="A file you control, independent of everything above">
          <div className="flex gap-2">
            <button onClick={downloadExport}
              className="flex-1 py-2.5 rounded-xl bg-gray-800 text-gray-200 text-xs font-semibold">Export JSON</button>
            <button onClick={() => fileInput.current?.click()} disabled={busy}
              className="flex-1 py-2.5 rounded-xl bg-gray-800 text-gray-200 text-xs font-semibold">Import JSON</button>
          </div>
          <input ref={fileInput} type="file" accept="application/json,.json" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) void doImport(f); e.target.value = ""; }} />
          <p className="text-[11px] text-gray-600 mt-2 leading-relaxed">
            Importing replaces everything currently in the app. Export first if you are unsure.
          </p>
          <p className="text-[11px] text-gray-600 mt-2">
            {dayCount} logged days · {scanCount} scans · {sessionCount} workout sessions
          </p>
        </Card>

        {/* ── Profile ── */}
        <Card title="Profile" subtitle="Drives every calorie and macro number">
          <div className="space-y-4">
            <Row label="Units">
              <div className="flex gap-2">
                {(["kg", "lbs"] as WeightUnit[]).map(u => (
                  <Pill key={u} active={profile.unit === u} onClick={() => saveProfile({ unit: u })}>{u}</Pill>
                ))}
              </div>
            </Row>

            <Row label="Height">
              <NumberField value={profile.heightCm} onChange={v => saveProfile({ heightCm: v ?? 0 })}
                step={1} min={100} max={250} unit="cm" />
            </Row>

            <Row label="Training experience">
              <div className="flex gap-2 flex-wrap">
                {(["beginner", "intermediate", "advanced"] as TrainingExperience[]).map(e => (
                  <Pill key={e} active={profile.experience === e} onClick={() => saveProfile({ experience: e })}>
                    {e}
                  </Pill>
                ))}
              </div>
            </Row>

            <Row label="Main goal">
              <div className="flex gap-2 flex-wrap">
                {([["lose-fat", "Lose fat"], ["build-muscle", "Build muscle"], ["maintain", "Maintain"]] as [MainGoal, string][]).map(([g, l]) => (
                  <Pill key={g} active={profile.mainGoal === g} onClick={() => saveProfile({ mainGoal: g })}>{l}</Pill>
                ))}
              </div>
            </Row>

            <Row label="Phase">
              <div className="space-y-2">
                <div className="flex gap-2">
                  <Pill active={profile.autoGoalChange} onClick={() => saveProfile({ autoGoalChange: true })} tone="green">
                    Auto
                  </Pill>
                  {([["cut", "Cut"], ["bulk", "Bulk"], ["maintain", "Maintain"]] as [Phase, string][]).map(([p, l]) => (
                    <Pill key={p} active={!profile.autoGoalChange && profile.phase === p}
                      onClick={() => saveProfile({ autoGoalChange: false, phase: p })}>{l}</Pill>
                  ))}
                </div>
                <p className="text-[11px] text-gray-600 leading-relaxed">
                  On Auto the app picks the phase and rate from your measured body fat and your goal,
                  and recalculates after every scan.
                </p>
              </div>
            </Row>

            <div className="pt-2 border-t border-gray-800">
              <p className="text-[10px] text-gray-500 uppercase tracking-wide mb-2">
                Tape measurements — only used if there is no Tanita scan
              </p>
              <div className="space-y-3">
                <Row label="Waist">
                  <NumberField value={profile.waistCm} onChange={v => saveProfile({ waistCm: v })}
                    step={0.5} decimals={1} min={40} max={200} unit="cm" placeholder="—" />
                </Row>
                <Row label="Neck">
                  <NumberField value={profile.neckCm} onChange={v => saveProfile({ neckCm: v })}
                    step={0.5} decimals={1} min={20} max={80} unit="cm" placeholder="—" />
                </Row>
              </div>
            </div>
          </div>
        </Card>

        {msg && (
          <div className="bg-gray-800/70 border border-gray-700 rounded-xl p-3">
            <p className="text-xs text-gray-200">{msg}</p>
          </div>
        )}

        <div className="h-4" />
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-[11px] text-gray-400 uppercase tracking-wide block mb-1.5">{label}</label>
      {children}
    </div>
  );
}

function Layer({ ok, title, good, bad }: { ok: boolean; title: string; good: string; bad: string }) {
  return (
    <div className="flex gap-2.5 py-2 border-b border-gray-800/60 last:border-0">
      <span className={`mt-0.5 w-4 h-4 shrink-0 rounded-full flex items-center justify-center text-[10px] font-bold ${
        ok ? "bg-green-400/20 text-good" : "bg-yellow-400/20 text-accent"
      }`}>{ok ? "✓" : "!"}</span>
      <div>
        <p className="text-xs font-semibold text-gray-200">{title}</p>
        <p className="text-[11px] text-gray-400 leading-relaxed mt-0.5">{ok ? good : bad}</p>
      </div>
    </div>
  );
}
