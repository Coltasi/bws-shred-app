"use client";

import { useState, useSyncExternalStore } from "react";
import TodayTab from "./components/TodayTab";
import WorkoutTab from "./components/WorkoutTab";
import ProgressTab from "./components/ProgressTab";
import NutritionTab from "./components/NutritionTab";
import BodyTab from "./components/BodyTab";
import SettingsSheet from "./components/SettingsSheet";
import { useStoreReady } from "./components/AppBoot";
import { getItem, setItem, subscribe } from "./lib/store";

type Tab = "today" | "workout" | "nutrition" | "body" | "progress";

const tabs: { id: Tab; label: string }[] = [
  { id: "today",     label: "Today"  },
  { id: "workout",   label: "Train"  },
  { id: "nutrition", label: "Fuel"   },
  { id: "body",      label: "Body"   },
  { id: "progress",  label: "Stats"  },
];

const TAB_KEY = "bws-active-tab";

function NavIcon({ id, active }: { id: Tab; active: boolean }) {
  const s = `w-5 h-5 transition-colors ${active ? "text-accent" : "text-gray-500"}`;
  const sw = "1.7";
  const common = { className: s, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor",
    strokeWidth: sw, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

  if (id === "today") return (
    <svg {...common}>
      <rect x="3" y="4" width="18" height="18" rx="2.5" />
      <path d="M16 2v4M8 2v4M3 10h18" />
      <circle cx="8" cy="15" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="12" cy="15" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="16" cy="15" r="1.2" fill="currentColor" stroke="none" />
    </svg>
  );

  if (id === "workout") return (
    <svg {...common}>
      <rect x="4.5" y="5" width="3" height="14" rx="1.5" />
      <rect x="16.5" y="5" width="3" height="14" rx="1.5" />
      <line x1="7.5" y1="8.5" x2="16.5" y2="8.5" />
      <line x1="7.5" y1="15.5" x2="16.5" y2="15.5" />
      <line x1="2" y1="10" x2="4.5" y2="10" />
      <line x1="2" y1="14" x2="4.5" y2="14" />
      <line x1="19.5" y1="10" x2="22" y2="10" />
      <line x1="19.5" y1="14" x2="22" y2="14" />
    </svg>
  );

  // Fuel — a flame
  if (id === "nutrition") return (
    <svg {...common}>
      <path d="M12 2.5c.6 3.2-1.4 4.4-2.8 6.1-1.3 1.6-2.2 3-2.2 5.1a7 7 0 0 0 14 0c0-3.3-1.9-5.4-3.6-7.2-1.3-1.4-2-2.6-2-4z" />
      <path d="M12 21a3.2 3.2 0 0 0 3.2-3.2c0-1.6-1.1-2.6-1.9-3.5-.6-.7-1-1.3-1-2.1-1.1 1.2-3.5 2.7-3.5 5.6A3.2 3.2 0 0 0 12 21z" />
    </svg>
  );

  // Body — a figure
  if (id === "body") return (
    <svg {...common}>
      <circle cx="12" cy="4.5" r="2.3" />
      <path d="M12 6.8v7.4" />
      <path d="M6.5 9.5 12 8l5.5 1.5" />
      <path d="m9.5 21.5 1.4-7.3M14.5 21.5 13.1 14.2" />
    </svg>
  );

  // Stats — a trend line
  return (
    <svg {...common}>
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17" />
      <polyline points="16 7 22 7 22 13" />
    </svg>
  );
}

export default function Home() {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { ready } = useStoreReady();

  // The store is the source of truth for the open tab, so there is no local
  // copy to keep in sync and no restore-on-mount effect. Server snapshot is
  // "today" because storage does not exist during prerender.
  const stored = useSyncExternalStore(subscribe, () => getItem(TAB_KEY), () => null);
  const activeTab: Tab = tabs.some(t => t.id === stored) ? (stored as Tab) : "today";

  const handleTabChange = (tab: Tab) => setItem(TAB_KEY, tab);

  return (
    <div className="flex flex-col min-h-screen bg-page max-w-md mx-auto relative">
      <header className="sticky top-0 z-20 bg-page/95 backdrop-blur border-b border-yellow-500/20 px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-accent tracking-tight">BWS SHRED</h1>
            <p className="text-xs text-gray-400">Colin&apos;s Program</p>
          </div>
          <button
            onClick={() => setSettingsOpen(true)}
            aria-label="Settings"
            className="w-9 h-9 rounded-xl bg-gray-800/70 border border-gray-700 flex items-center justify-center active:bg-gray-700"
          >
            <svg className="w-4.5 h-4.5 text-gray-300" style={{ width: 18, height: 18 }}
              viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
              strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="3" />
              <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9v0a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
            </svg>
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto pb-24">
        {!ready ? (
          <div className="px-4 py-16 text-center">
            <div className="inline-block w-6 h-6 border-2 border-yellow-500/30 border-t-yellow-400 rounded-full animate-spin" />
            <p className="text-xs text-gray-600 mt-3">Loading your data…</p>
          </div>
        ) : (
          <>
            {activeTab === "today"     && <TodayTab onNavigate={handleTabChange} />}
            {activeTab === "workout"   && <WorkoutTab />}
            {activeTab === "nutrition" && <NutritionTab />}
            {activeTab === "body"      && <BodyTab />}
            {activeTab === "progress"  && <ProgressTab />}
          </>
        )}
      </main>

      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-card/95 backdrop-blur border-t border-yellow-500/20 z-20 pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-center justify-around py-2 px-1">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-all ${
                activeTab === tab.id ? "bg-yellow-400/10" : "active:bg-gray-800/50"
              }`}
            >
              <NavIcon id={tab.id} active={activeTab === tab.id} />
              <span className={`text-[10px] font-medium transition-colors ${
                activeTab === tab.id ? "text-accent" : "text-gray-500"
              }`}>{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>

      {settingsOpen && <SettingsSheet onClose={() => setSettingsOpen(false)} />}
    </div>
  );
}
