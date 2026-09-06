"use client";

import { useState } from "react";
import { recipes, type Recipe } from "../data/recipes";

type Filter = "all" | "breakfast" | "lunch" | "dinner" | "shred";

const CATEGORY_EMOJI: Record<string, string> = {
  breakfast: "🍳",
  lunch: "🥗",
  dinner: "🍽️",
  snack: "🍌",
};

export default function RecipesTab() {
  const [filter, setFilter] = useState<Filter>("all");
  const [search, setSearch] = useState("");
  const [openRecipe, setOpenRecipe] = useState<string | null>(null);

  const filtered = recipes.filter(r => {
    if (filter === "shred" && r.type !== "shred") return false;
    if (filter === "breakfast" && r.category !== "breakfast") return false;
    if (filter === "lunch" && r.category !== "lunch") return false;
    if (filter === "dinner" && r.category !== "dinner") return false;
    if (search && !r.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const filters: { id: Filter; label: string }[] = [
    { id: "all", label: "All" },
    { id: "shred", label: "🔥 Shred" },
    { id: "breakfast", label: "🍳 Breakfast" },
    { id: "lunch", label: "🥗 Lunch" },
    { id: "dinner", label: "🍽️ Dinner" },
  ];

  return (
    <div className="px-4 py-4 space-y-4">
      {/* Search */}
      <div className="relative">
        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm">🔍</span>
        <input
          type="text"
          placeholder="Search recipes..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="w-full bg-card border border-gray-800 rounded-xl pl-9 pr-4 py-3 text-sm text-gray-200 placeholder-gray-600 outline-none focus:border-yellow-500/50"
        />
      </div>

      {/* Filter Pills */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {filters.map(f => (
          <button
            key={f.id}
            onClick={() => setFilter(f.id)}
            className={`flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${
              filter === f.id
                ? "bg-yellow-400 text-on-accent border-yellow-400"
                : "bg-gray-900 text-gray-400 border-gray-800 hover:border-gray-600"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Count */}
      <p className="text-xs text-gray-600">{filtered.length} recipe{filtered.length !== 1 ? "s" : ""}</p>

      {/* Recipe List */}
      <div className="space-y-3">
        {filtered.length === 0 && (
          <div className="text-center py-10 text-gray-600">
            <p className="text-3xl mb-2">🥺</p>
            <p className="text-sm">No recipes found</p>
          </div>
        )}
        {filtered.map(recipe => (
          <RecipeCard
            key={recipe.name}
            recipe={recipe}
            isOpen={openRecipe === recipe.name}
            onToggle={() => setOpenRecipe(openRecipe === recipe.name ? null : recipe.name)}
          />
        ))}
      </div>
    </div>
  );
}

function MacroPill({ label, value, unit, color }: { label: string; value: number; unit: string; color: string }) {
  const colorMap: Record<string, string> = {
    yellow: "bg-yellow-400/10 text-accent",
    blue: "bg-blue-400/10 text-info",
    green: "bg-green-400/10 text-good",
    orange: "bg-orange-400/10 text-warn",
    red: "bg-red-400/10 text-bad",
  };
  return (
    <span className={`inline-flex items-center gap-0.5 px-2 py-1 rounded-lg text-xs font-semibold ${colorMap[color]}`}>
      {value}{unit} <span className="font-normal opacity-70">{label}</span>
    </span>
  );
}

function RecipeCard({ recipe, isOpen, onToggle }: { recipe: Recipe; isOpen: boolean; onToggle: () => void }) {
  return (
    <div className={`bg-card border rounded-2xl overflow-hidden transition-all ${
      isOpen ? "border-yellow-500/30" : "border-gray-800"
    }`}>
      {/* Card Header */}
      <button onClick={onToggle} className="w-full p-4 text-left">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-lg">{CATEGORY_EMOJI[recipe.category]}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${
                recipe.type === "shred"
                  ? "bg-orange-500/20 text-warn"
                  : recipe.type === "build"
                  ? "bg-blue-500/20 text-info"
                  : "bg-purple-500/20 text-alt"
              }`}>
                {recipe.type === "both" ? "Shred + Build" : recipe.type.charAt(0).toUpperCase() + recipe.type.slice(1)}
              </span>
            </div>
            <h3 className="font-bold text-gray-200 text-sm">{recipe.name}</h3>
            <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
              <span>⏱ {recipe.prepTime} prep</span>
              <span>🔥 {recipe.cookTime} cook</span>
            </div>
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-lg font-bold text-accent">{recipe.calories}</p>
            <p className="text-[10px] text-gray-500">calories</p>
            <p className="text-xs text-info font-semibold mt-0.5">{recipe.protein}g protein</p>
          </div>
        </div>

        {/* Macro Pills */}
        <div className="flex flex-wrap gap-1.5 mt-3">
          <MacroPill label="cal" value={recipe.calories} unit="" color="yellow" />
          <MacroPill label="protein" value={recipe.protein} unit="g" color="blue" />
          <MacroPill label="carbs" value={recipe.carbs} unit="g" color="green" />
          <MacroPill label="fat" value={recipe.fat} unit="g" color="orange" />
        </div>

        <div className="flex items-center justify-end mt-2">
          <span className="text-xs text-gray-600">{isOpen ? "▲ Less" : "▼ Recipe"}</span>
        </div>
      </button>

      {/* Expanded Content */}
      {isOpen && (
        <div className="border-t border-gray-800/50 px-4 pb-4 pt-3 space-y-4">
          {/* Ingredients */}
          <div>
            <h4 className="text-xs font-bold text-accent uppercase tracking-wider mb-2">Ingredients</h4>
            <ul className="space-y-1.5">
              {recipe.ingredients.map((ing, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-gray-300">
                  <span className="text-accent/60 mt-1 text-xs">•</span>
                  <span>{ing}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Steps */}
          <div>
            <h4 className="text-xs font-bold text-info uppercase tracking-wider mb-2">Instructions</h4>
            <ol className="space-y-2.5">
              {recipe.steps.map((step, i) => (
                <li key={i} className="flex items-start gap-3">
                  <span className="w-5 h-5 rounded-full bg-blue-500/20 text-info text-xs flex items-center justify-center flex-shrink-0 mt-0.5 font-bold">
                    {i + 1}
                  </span>
                  <p className="text-sm text-gray-300 leading-relaxed">{step}</p>
                </li>
              ))}
            </ol>
          </div>

          {/* Macro Bar */}
          <div>
            <h4 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Macro Breakdown</h4>
            <MacroBar protein={recipe.protein} carbs={recipe.carbs} fat={recipe.fat} />
          </div>
        </div>
      )}
    </div>
  );
}

function MacroBar({ protein, carbs, fat }: { protein: number; carbs: number; fat: number }) {
  const total = protein * 4 + carbs * 4 + fat * 9;
  const pPct = total > 0 ? Math.round((protein * 4 / total) * 100) : 0;
  const cPct = total > 0 ? Math.round((carbs * 4 / total) * 100) : 0;
  const fPct = total > 0 ? 100 - pPct - cPct : 0;

  return (
    <div>
      <div className="flex h-3 rounded-full overflow-hidden gap-0.5">
        <div className="bg-blue-400 rounded-l-full" style={{ width: `${pPct}%` }} />
        <div className="bg-green-400" style={{ width: `${cPct}%` }} />
        <div className="bg-orange-400 rounded-r-full" style={{ width: `${fPct}%` }} />
      </div>
      <div className="flex justify-between mt-1.5 text-[10px] text-gray-500">
        <span className="text-info">{pPct}% protein</span>
        <span className="text-good">{cPct}% carbs</span>
        <span className="text-warn">{fPct}% fat</span>
      </div>
    </div>
  );
}
