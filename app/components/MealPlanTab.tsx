"use client";

import { useState } from "react";
import { recipes, mealPlan, barcelonaShoppingList } from "../data/recipes";

const DAYS_OF_WEEK = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

// Rotate meals across the week
function buildWeeklyPlan() {
  const { breakfast, lunch, dinner } = mealPlan.shred;
  return DAYS_OF_WEEK.map((day, i) => ({
    day,
    breakfast: breakfast[i % breakfast.length],
    lunch: lunch[i % lunch.length],
    dinner: dinner[i % dinner.length],
  }));
}

const weeklyPlan = buildWeeklyPlan();

function getMacros(name: string) {
  return recipes.find(r => r.name === name);
}

function getDayTotals(day: typeof weeklyPlan[0]) {
  const b = getMacros(day.breakfast);
  const l = getMacros(day.lunch);
  const d = getMacros(day.dinner);
  return {
    calories: (b?.calories ?? 0) + (l?.calories ?? 0) + (d?.calories ?? 0),
    protein: (b?.protein ?? 0) + (l?.protein ?? 0) + (d?.protein ?? 0),
    carbs: (b?.carbs ?? 0) + (l?.carbs ?? 0) + (d?.carbs ?? 0),
    fat: (b?.fat ?? 0) + (l?.fat ?? 0) + (d?.fat ?? 0),
  };
}

// The 5 glass containers, one per lunch recipe in order
const MEAL_PREP_CONTAINERS = [
  {
    container: 1,
    meal: "Chicken & Cottage Cheese Bowl",
    color: "blue",
    prep: "Cook 180g chicken breast (sliced), mix with 120g requesón, add cherry tomatoes and black pepper. Store cold.",
  },
  {
    container: 2,
    meal: "Seasoned Pork Loin",
    color: "green",
    prep: "Slice 120g lomo de cerdo, season with smoked paprika + garlic powder. Pan-sear 4 min/side. Serve with brown rice (60g dry) and steamed spinach.",
  },
  {
    container: 3,
    meal: "Flat Out Protein Wrap",
    color: "orange",
    prep: "Lay wrap flat, layer with 100g shredded chicken, 60g requesón, black beans (drained), hot sauce. Roll tight and wrap in foil. Store upright.",
  },
  {
    container: 4,
    meal: "Baked Salmon Bowl",
    color: "purple",
    prep: "Bake 200g salmón at 200°C for 15 min with olive oil + lemon. Serve over jasmine rice (60g dry) with wilted spinach and a squeeze of lemon.",
  },
  {
    container: 5,
    meal: "Chicken Fajita Bowl",
    color: "red",
    prep: "Sauté sliced chicken + peppers + onion in fajita seasoning. Serve over rice or in a wrap. Add salsa and hot sauce.",
  },
];

const containerColors: Record<string, string> = {
  blue:   "text-blue-400 bg-blue-400/10 border-blue-500/30",
  green:  "text-green-400 bg-green-400/10 border-green-500/30",
  orange: "text-orange-400 bg-orange-400/10 border-orange-500/30",
  purple: "text-purple-400 bg-purple-400/10 border-purple-500/30",
  red:    "text-red-400 bg-red-400/10 border-red-500/30",
};

const categoryIcons: Record<string, string> = {
  "Proteínas": "◈",
  "Lácteos & Frescos": "◉",
  "Cereales & Carbohidratos": "◫",
  "Verduras & Frescos": "◍",
  "Congelados": "◻",
  "Bebidas": "◎",
  "Despensa (Pantry Staples)": "◧",
};

export default function MealPlanTab() {
  const [selectedDay, setSelectedDay] = useState<string>(
    DAYS_OF_WEEK[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1]
  );
  const [view, setView] = useState<"daily" | "prep" | "shopping">("daily");
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});
  const [expandedContainer, setExpandedContainer] = useState<number | null>(null);

  const todayIdx = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;
  const todayName = DAYS_OF_WEEK[todayIdx];
  const selectedPlan = weeklyPlan.find(d => d.day === selectedDay)!;
  const totals = getDayTotals(selectedPlan);

  const toggleItem = (key: string) => {
    setCheckedItems(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const checkedCount = Object.values(checkedItems).filter(Boolean).length;
  const totalItems = barcelonaShoppingList.reduce((acc, cat) => acc + cat.items.length, 0);

  return (
    <div className="px-4 py-4 space-y-4">
      {/* Header */}
      <div>
        <h2 className="text-lg font-bold text-white">Meal Plan</h2>
        <p className="text-xs text-gray-500">Shred protocol · ~1,300–1,500 cal/day</p>
      </div>

      {/* View Toggle — 3 tabs */}
      <div className="flex bg-gray-900 rounded-xl p-1 gap-1">
        {(["daily", "prep", "shopping"] as const).map(v => (
          <button
            key={v}
            onClick={() => setView(v)}
            className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all capitalize ${
              view === v ? "bg-yellow-400 text-black" : "text-gray-400 hover:text-gray-300"
            }`}
          >
            {v === "daily" ? "Daily" : v === "prep" ? "Prep Guide" : "Shopping"}
          </button>
        ))}
      </div>

      {/* ── DAILY VIEW ── */}
      {view === "daily" && (
        <>
          {/* Day Selector */}
          <div className="flex gap-1.5 overflow-x-auto pb-1">
            {DAYS_OF_WEEK.map((day) => (
              <button
                key={day}
                onClick={() => setSelectedDay(day)}
                className={`flex-shrink-0 px-3 py-2 rounded-xl border text-xs font-semibold transition-all ${
                  selectedDay === day
                    ? "bg-yellow-400 text-black border-yellow-400"
                    : day === todayName
                    ? "bg-yellow-400/10 text-yellow-300 border-yellow-500/30"
                    : "bg-gray-900/50 text-gray-500 border-gray-800 hover:border-gray-600"
                }`}
              >
                {day.slice(0, 3).toUpperCase()}
              </button>
            ))}
          </div>

          {/* Macro Summary */}
          <div className="bg-gradient-to-r from-yellow-500/10 to-orange-500/5 border border-yellow-500/20 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-bold text-white text-sm">{selectedDay}&apos;s Totals</h3>
              {selectedDay === todayName && (
                <span className="text-xs bg-yellow-400/20 text-yellow-300 px-2 py-0.5 rounded-full">Today</span>
              )}
            </div>
            <div className="grid grid-cols-4 gap-2">
              <MacroStat label="Cal" value={totals.calories.toString()} unit="" color="yellow" />
              <MacroStat label="Protein" value={totals.protein.toString()} unit="g" color="blue" />
              <MacroStat label="Carbs" value={totals.carbs.toString()} unit="g" color="green" />
              <MacroStat label="Fat" value={totals.fat.toString()} unit="g" color="orange" />
            </div>
          </div>

          {/* Meals */}
          <div className="space-y-3">
            <MealCard label="Breakfast" mealName={selectedPlan.breakfast} labelColor="yellow" />
            <MealCard label="Lunch" mealName={selectedPlan.lunch} labelColor="blue" />
            <MealCard label="Dinner" mealName={selectedPlan.dinner} labelColor="purple" />
          </div>
        </>
      )}

      {/* ── MEAL PREP GUIDE ── */}
      {view === "prep" && (
        <div className="space-y-4">
          {/* Intro card */}
          <div className="bg-yellow-400/5 border border-yellow-500/20 rounded-2xl p-4">
            <p className="text-sm font-bold text-yellow-400 mb-1">Sunday Prep Session</p>
            <p className="text-xs text-gray-400 leading-relaxed">
              Fill all 5 glass containers in one 45-min cook. Each container = one lunch for the week.
              Refrigerate 1–4, freeze container 5 if needed.
            </p>
          </div>

          {/* Breakfast — daily routine */}
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">Breakfast (daily, ~5 min)</p>
            <div className="bg-[#0f0f1a] border border-gray-800 rounded-2xl p-4 space-y-3">
              <div className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-md bg-gray-800 flex items-center justify-center text-xs text-yellow-400 flex-shrink-0 mt-0.5">1</span>
                <div>
                  <p className="text-sm font-semibold text-white">Café solo / cortado</p>
                  <p className="text-xs text-gray-500">Not tracked. Just make it strong.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-md bg-gray-800 flex items-center justify-center text-xs text-yellow-400 flex-shrink-0 mt-0.5">2</span>
                <div>
                  <p className="text-sm font-semibold text-white">Greek Yogurt Bowl</p>
                  <p className="text-xs text-gray-500">200g yogur griego + frutos rojos + optional miel. 180 cal · 18g protein</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <span className="w-6 h-6 rounded-md bg-gray-800 flex items-center justify-center text-xs text-yellow-400 flex-shrink-0 mt-0.5">3</span>
                <div>
                  <p className="text-sm font-semibold text-white">Protein Smoothie</p>
                  <p className="text-xs text-gray-500">1 scoop whey + plátano + leche avena + frutos rojos. 310 cal · 30g protein</p>
                </div>
              </div>
            </div>
          </div>

          {/* 5 Containers */}
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider mb-2">5 Glass Containers — Lunch Prep</p>
            <div className="space-y-2">
              {MEAL_PREP_CONTAINERS.map((c) => {
                const recipe = getMacros(c.meal);
                const isExpanded = expandedContainer === c.container;
                const colorClass = containerColors[c.color];

                return (
                  <div
                    key={c.container}
                    className={`rounded-2xl border overflow-hidden transition-all ${colorClass}`}
                  >
                    <button
                      onClick={() => setExpandedContainer(isExpanded ? null : c.container)}
                      className="w-full flex items-center gap-3 p-4 text-left"
                    >
                      <span className="w-8 h-8 rounded-lg bg-current/10 flex items-center justify-center text-sm font-bold flex-shrink-0">
                        {c.container}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate">{c.meal}</p>
                        {recipe && (
                          <p className="text-xs opacity-60 mt-0.5">
                            {recipe.calories} cal · {recipe.protein}g protein
                          </p>
                        )}
                      </div>
                      <span className="text-xs opacity-50">{isExpanded ? "▲" : "▼"}</span>
                    </button>

                    {isExpanded && (
                      <div className="px-4 pb-4 border-t border-current/20 pt-3 space-y-3">
                        <p className="text-xs opacity-80 leading-relaxed">{c.prep}</p>
                        {recipe && recipe.ingredients.length > 0 && (
                          <div>
                            <p className="text-xs opacity-50 mb-1.5">Ingredients</p>
                            <ul className="space-y-1">
                              {recipe.ingredients.map((ing, i) => (
                                <li key={i} className="text-xs opacity-70 flex items-start gap-1.5">
                                  <span className="opacity-60 mt-0.5">·</span>
                                  <span>{ing}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Dinner note */}
          <div className="bg-purple-400/5 border border-purple-500/20 rounded-2xl p-4">
            <p className="text-xs font-bold text-purple-400 mb-1">Dinner</p>
            <p className="text-xs text-gray-400 leading-relaxed">
              Your wife handles dinner — all the BWS recipes work perfectly. Show her the Recipes tab for step-by-step guides.
              Korean Beef Bowl and Chicken Fajita Bowl are crowd-pleasers.
            </p>
          </div>

          {/* Weekend note */}
          <div className="bg-gray-900/50 border border-gray-700 rounded-2xl p-4">
            <p className="text-xs font-bold text-gray-300 mb-1">Weekend</p>
            <p className="text-xs text-gray-500 leading-relaxed">
              1–2 glasses of vermouth allowed, no guilt. Try Yzaguirre (made in Reus, Catalonia) or a Zarzaparilla.
              Roughly 140–280 cal total — just log it and move on.
            </p>
          </div>
        </div>
      )}

      {/* ── BARCELONA SHOPPING LIST ── */}
      {view === "shopping" && (
        <div className="space-y-4">
          {/* Progress bar */}
          <div className="bg-[#0f0f1a] border border-gray-800 rounded-2xl p-4">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-bold text-white">Lista de la Compra</p>
              <p className="text-xs text-gray-500">{checkedCount}/{totalItems} ticked</p>
            </div>
            <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-yellow-400 rounded-full transition-all duration-300"
                style={{ width: `${totalItems > 0 ? (checkedCount / totalItems) * 100 : 0}%` }}
              />
            </div>
            {checkedCount > 0 && (
              <button
                onClick={() => setCheckedItems({})}
                className="text-xs text-gray-600 hover:text-gray-400 mt-2"
              >
                Clear all
              </button>
            )}
          </div>

          <p className="text-xs text-gray-500">
            Barcelona-adapted. Main stops: Mercadona, Lidl, and one Asian supermarket (for sesame oil + jasmine rice).
          </p>

          {barcelonaShoppingList.map((category) => (
            <div key={category.title}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-yellow-500 text-sm">{categoryIcons[category.title] ?? "·"}</span>
                <p className="text-xs font-bold text-yellow-400 uppercase tracking-wider">{category.title}</p>
              </div>
              <div className="bg-[#0f0f1a] border border-gray-800 rounded-2xl overflow-hidden">
                {category.items.map((item, idx) => {
                  const key = `${category.title}-${idx}`;
                  const checked = checkedItems[key] || false;
                  return (
                    <button
                      key={key}
                      onClick={() => toggleItem(key)}
                      className={`w-full flex items-start gap-3 px-4 py-3 text-left transition-all ${
                        idx < category.items.length - 1 ? "border-b border-gray-800/60" : ""
                      } ${checked ? "opacity-40" : "hover:bg-gray-900/50"}`}
                    >
                      <span className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 mt-0.5 text-xs ${
                        checked ? "bg-green-500 text-white" : "bg-gray-800 text-gray-600"
                      }`}>
                        {checked ? "✓" : ""}
                      </span>
                      <div className="flex-1 min-w-0">
                        <p className={`text-sm ${checked ? "line-through text-gray-500" : "text-white"}`}>
                          {item.name}
                        </p>
                        {item.note && (
                          <p className="text-xs text-gray-500 mt-0.5">{item.note}</p>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function MealCard({
  label,
  mealName,
  labelColor,
}: {
  label: string;
  mealName: string;
  labelColor: string;
}) {
  const r = getMacros(mealName);
  const colorMap: Record<string, string> = {
    yellow: "text-yellow-400",
    blue: "text-blue-400",
    purple: "text-purple-400",
    green: "text-green-400",
  };

  return (
    <div className="bg-[#0f0f1a] border border-gray-800 rounded-2xl p-4">
      <p className={`text-xs font-bold uppercase tracking-wider mb-2 ${colorMap[labelColor]}`}>{label}</p>
      <p className="text-white font-semibold text-sm">{mealName}</p>
      {r && (
        <div className="flex gap-3 mt-2">
          <span className="text-xs text-gray-500">{r.calories} cal</span>
          <span className="text-xs text-blue-400/80">{r.protein}g protein</span>
          <span className="text-xs text-green-400/80">{r.carbs}g carbs</span>
          <span className="text-xs text-orange-400/80">{r.fat}g fat</span>
        </div>
      )}
      {r && (
        <div className="mt-3 pt-3 border-t border-gray-800/50">
          <p className="text-xs text-gray-500 mb-1.5">Ingredients</p>
          <ul className="space-y-1">
            {r.ingredients.slice(0, 4).map((ing, i) => (
              <li key={i} className="text-xs text-gray-400 flex items-start gap-1.5">
                <span className="text-yellow-500 mt-0.5">·</span>
                <span>{ing}</span>
              </li>
            ))}
            {r.ingredients.length > 4 && (
              <li className="text-xs text-gray-600">+ {r.ingredients.length - 4} more</li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

function MacroStat({
  label,
  value,
  unit,
  color,
}: {
  label: string;
  value: string;
  unit: string;
  color: string;
}) {
  const colorMap: Record<string, string> = {
    yellow: "text-yellow-400",
    blue: "text-blue-400",
    green: "text-green-400",
    orange: "text-orange-400",
  };
  return (
    <div className="text-center">
      <p className={`text-base font-bold ${colorMap[color]}`}>{value}<span className="text-xs">{unit}</span></p>
      <p className="text-[10px] text-gray-500">{label}</p>
    </div>
  );
}
