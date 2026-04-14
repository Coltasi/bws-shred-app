"use client";

import { useState, useEffect } from "react";
import TodayTab from "./components/TodayTab";
import WorkoutTab from "./components/WorkoutTab";
import MealPlanTab from "./components/MealPlanTab";
import RecipesTab from "./components/RecipesTab";
import ProgressTab from "./components/ProgressTab";

type Tab = "today" | "workout" | "meals" | "recipes" | "progress";

const tabs: { id: Tab; label: string }[] = [
  { id: "today",   label: "Today"   },
  { id: "workout", label: "Workout" },
  { id: "meals",   label: "Meals"   },
  { id: "recipes", label: "Recipes" },
  { id: "progress",label: "Progress"},
];

function NavIcon({ id, active }: { id: Tab; active: boolean }) {
  const s = `w-[22px] h-[22px] transition-colors ${active ? "text-yellow-400" : "text-gray-500"}`;
  const sw = "1.6";

  if (id === "today") return (
    <svg className={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2.5"/>
      <path d="M16 2v4M8 2v4M3 10h18"/>
      <circle cx="8" cy="15" r="1.1" fill="currentColor" stroke="none"/>
      <circle cx="12" cy="15" r="1.1" fill="currentColor" stroke="none"/>
      <circle cx="16" cy="15" r="1.1" fill="currentColor" stroke="none"/>
    </svg>
  );

  if (id === "workout") return (
    <svg className={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
      <path d="M6.5 6.5h.01M17.5 6.5h.01M6.5 17.5h.01M17.5 17.5h.01"/>
      <rect x="5" y="5.5" width="3" height="13" rx="1.5"/>
      <rect x="16" y="5.5" width="3" height="13" rx="1.5"/>
      <line x1="8" y1="9" x2="16" y2="9"/>
      <line x1="8" y1="15" x2="16" y2="15"/>
    </svg>
  );

  if (id === "meals") return (
    <svg className={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 002-2V2"/>
      <line x1="7" y1="2" x2="7" y2="22"/>
      <path d="M21 15V2a5 5 0 00-5 5v6c0 1.1.9 2 2 2h3v7"/>
    </svg>
  );

  if (id === "recipes") return (
    <svg className={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/>
      <path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/>
    </svg>
  );

  // progress — trending up chart
  return (
    <svg className={s} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 7 13.5 15.5 8.5 10.5 2 17"/>
      <polyline points="16 7 22 7 22 13"/>
    </svg>
  );
}

export default function Home() {
  const [activeTab, setActiveTab] = useState<Tab>("today");

  useEffect(() => {
    const saved = localStorage.getItem("bws-active-tab") as Tab | null;
    if (saved) setActiveTab(saved);
  }, []);

  const handleTabChange = (tab: Tab) => {
    setActiveTab(tab);
    localStorage.setItem("bws-active-tab", tab);
  };

  return (
    <div className="flex flex-col min-h-screen bg-[#0a0a0f] max-w-md mx-auto relative">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-[#0a0a0f]/95 backdrop-blur border-b border-yellow-500/20 px-4 py-3">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold text-yellow-400 tracking-tight">BWS SHRED</h1>
            <p className="text-xs text-gray-400">Colin&apos;s Program</p>
          </div>
          <div className="text-right">
            <div className="text-xs text-gray-400">Built With Science™</div>
            <div className="text-xs text-yellow-500 font-semibold">Intermediate Male</div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto pb-20">
        {activeTab === "today"    && <TodayTab onNavigate={handleTabChange} />}
        {activeTab === "workout"  && <WorkoutTab />}
        {activeTab === "meals"    && <MealPlanTab />}
        {activeTab === "recipes"  && <RecipesTab />}
        {activeTab === "progress" && <ProgressTab />}
      </main>

      {/* Bottom Navigation */}
      <nav className="fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-md bg-[#0f0f1a]/95 backdrop-blur border-t border-yellow-500/20 z-20">
        <div className="flex items-center justify-around py-2 px-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl transition-all ${
                activeTab === tab.id ? "bg-yellow-400/10" : "hover:bg-gray-800/50"
              }`}
            >
              <NavIcon id={tab.id} active={activeTab === tab.id} />
              <span className={`text-[10px] font-medium transition-colors ${
                activeTab === tab.id ? "text-yellow-400" : "text-gray-500"
              }`}>{tab.label}</span>
            </button>
          ))}
        </div>
      </nav>
    </div>
  );
}

