export type Recipe = {
  name: string;
  category: "breakfast" | "lunch" | "dinner" | "snack";
  type: "shred" | "build" | "both";
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  prepTime: string;
  cookTime: string;
  ingredients: string[];
  steps: string[];
};

export const recipes: Recipe[] = [
  // ── BREAKFAST ──────────────────────────────────────
  {
    name: "Greek Yogurt Bowl",
    category: "breakfast",
    type: "shred",
    calories: 180,
    protein: 18,
    carbs: 20,
    fat: 3,
    prepTime: "2 min",
    cookTime: "0 min",
    ingredients: [
      "200g yogur griego natural (Greek yogurt — Milbona/Lidl or Hacendado/Mercadona)",
      "50g frutos rojos frescos o congelados (fresh or frozen berries)",
      "Optional: 1 tsp miel (honey)",
    ],
    steps: [
      "Spoon yogurt into a bowl.",
      "Top with berries.",
      "Optional drizzle of honey.",
    ],
  },
  {
    name: "Protein Smoothie",
    category: "breakfast",
    type: "shred",
    calories: 310,
    protein: 30,
    carbs: 36,
    fat: 4,
    prepTime: "3 min",
    cookTime: "0 min",
    ingredients: [
      "1 scoop proteína de suero en polvo / whey protein (vanilla or chocolate)",
      "1 plátano maduro (ripe banana)",
      "200ml leche de avena o almendras (Alpro or Oatly — Mercadona/Carrefour)",
      "50g frutos rojos congelados (frozen berries — Lidl freezer section)",
      "Handful espinacas baby (optional — tasteless, adds nutrients)",
    ],
    steps: [
      "Add all ingredients to blender.",
      "Blend 30–45 seconds until smooth.",
      "Add a couple of ice cubes if desired.",
    ],
  },
  {
    name: "Spinach Feta Wrap",
    category: "breakfast",
    type: "shred",
    calories: 265,
    protein: 36,
    carbs: 24,
    fat: 3,
    prepTime: "5 min",
    cookTime: "10 min",
    ingredients: [
      "1 wholegrain flatbread / wrap integral",
      "1 tbsp aceite de oliva virgen extra (extra-virgin olive oil)",
      "1 cup claras de huevo (egg whites)",
      "1 cup espinacas frescas (fresh spinach)",
      "1 porciones La Vaca que Ríe (Laughing Cow white cheddar triangle — available in Spain)",
      "Sal y pimienta negra (salt and black pepper)",
    ],
    steps: [
      "Heat olive oil in a non-stick skillet over medium-high. Add spinach, sauté 2–4 min until soft.",
      "Add egg whites, scramble with spinach over medium-low until fully cooked.",
      "Toast the flatbread lightly, spread the cheese on it.",
      "Add spinach & eggs, roll tightly, cut in half.",
    ],
  },
  {
    name: "Protein French Toast",
    category: "breakfast",
    type: "shred",
    calories: 275,
    protein: 20,
    carbs: 41,
    fat: 5,
    prepTime: "5 min",
    cookTime: "10 min",
    ingredients: [
      "2 slices pan de molde integral (wholegrain sandwich bread)",
      "1.5 cups leche de avena / almendras sin azúcar (unsweetened oat/almond milk)",
      "1 scoop proteína de vainilla (vanilla protein powder)",
      "Optional: 50g arándanos, 50g fresas, nata montada sin azúcar (blueberries, strawberries, whipped cream)",
    ],
    steps: [
      "Whisk oat milk and protein powder together in a shallow dish.",
      "Soak bread slices thoroughly on both sides.",
      "Cook on a medium non-stick skillet 2–3 min per side until golden.",
      "Serve with optional berry toppings.",
    ],
  },
  {
    name: "Vanilla Protein Pancakes",
    category: "breakfast",
    type: "shred",
    calories: 250,
    protein: 25,
    carbs: 28,
    fat: 3,
    prepTime: "5 min",
    cookTime: "10 min",
    ingredients: [
      "1/3 cup copos de avena (rolled oats — Quaker or Hacendado)",
      "3/4 cup claras de huevo (egg whites)",
      "1 tsp levadura en polvo (baking powder)",
      "1 tsp extracto de vainilla (vanilla extract)",
      "Optional: café negro, sirope de arándanos sin calorías (black coffee, zero-cal blueberry syrup)",
    ],
    steps: [
      "Blend oats, egg whites, baking powder, and vanilla on low until smooth batter.",
      "Heat a non-stick griddle or pan on medium for 2 min.",
      "Pour batter, cook 3–4 min until bubbles form, flip, cook 2–3 min more.",
      "Remove and serve with toppings of choice.",
    ],
  },
  {
    name: "PB Protein Muffins",
    category: "breakfast",
    type: "both",
    calories: 440,
    protein: 30,
    carbs: 54,
    fat: 12,
    prepTime: "5 min",
    cookTime: "15 min",
    ingredients: [
      "1 cup Kodiak Protein Pancake Mix (or: 100g copos de avena + 1 scoop proteína + 1 tsp levadura)",
      "1 huevo grande (large egg)",
      "250 mL leche de almendras (almond milk)",
      "1/3 cup pepitas de chocolate (chocolate chips)",
      "Optional: 1 plátano para decorar, mantequilla de cacahuete (peanut butter)",
    ],
    steps: [
      "Preheat oven to 180°C (350°F).",
      "Mix oat/pancake mix, almond milk, egg, and chocolate chips in a bowl.",
      "Pour evenly into a muffin tin lined with paper cases.",
      "Bake 13–15 min until golden. Cool 5–7 min before topping.",
    ],
  },

  // ── LUNCH ──────────────────────────────────────────
  {
    name: "Rod's Poke Bowl",
    category: "lunch",
    type: "shred",
    calories: 400,
    protein: 32,
    carbs: 42,
    fat: 11,
    prepTime: "5 min",
    cookTime: "15 min",
    ingredients: [
      "115g (4 oz.) atún rojo crudo / bonito del norte (raw ahi tuna or bonito — La Boqueria or fish market)",
      "50g arroz jazmín / arroz de sushi (jasmine rice — Asian supermarkets in BCN)",
      "1 tsp aceite de sésamo tostado (toasted sesame oil)",
      "Semillas de sésamo tostadas (toasted sesame seeds)",
      "1 tsp salsa de soja (soy sauce)",
      "Escamas de guindilla / pimiento rojo (crushed red pepper flakes)",
    ],
    steps: [
      "Cut tuna into 1-inch cubes.",
      "Mix sesame oil, soy sauce, and chili flakes in a small bowl.",
      "Add marinade to tuna, massage in. Marinate overnight or eat immediately.",
      "Cook rice. Plate rice, top with marinated tuna and sesame seeds.",
    ],
  },
  {
    name: "Flat Out Protein Wrap",
    category: "lunch",
    type: "shred",
    calories: 300,
    protein: 42,
    carbs: 31,
    fat: 3,
    prepTime: "5 min",
    cookTime: "15 min",
    ingredients: [
      "1 wrap integral (wholegrain tortilla wrap — Mercadona or Lidl)",
      "100g (3.5 oz.) pechuga de pollo (chicken breast)",
      "1/4 cup espinacas frescas (fresh spinach)",
      "1/2 cup alubias negras en conserva (canned black beans — Mercadona)",
      "1 tbsp salsa (tomato salsa)",
      "Sal y pimienta (salt and pepper)",
    ],
    steps: [
      "Preheat oven to 180°C. Season chicken, bake 10–15 min.",
      "Warm tortilla in microwave 30 sec.",
      "Add chicken, spinach, black beans, and salsa to wrap. Roll up and enjoy.",
    ],
  },
  {
    name: "Baked Salmon Bowl",
    category: "lunch",
    type: "shred",
    calories: 470,
    protein: 30,
    carbs: 60,
    fat: 12,
    prepTime: "5 min",
    cookTime: "40 min",
    ingredients: [
      "115g (4 oz.) salmón salvaje (wild salmon — any supermarket fish counter)",
      "2 tbsp zumo de limón (lemon juice)",
      "1 cup espinacas frescas (raw spinach)",
      "1 tomate entero (whole tomato, chopped)",
      "1.5 cups arroz integral cocido (cooked brown rice)",
      "1 tsp cúrcuma molida (ground turmeric — Mercadona spice aisle)",
    ],
    steps: [
      "Preheat oven to 190°C. Place salmon on foil, add salt, pepper, lemon. Bake 15–20 min.",
      "Cook brown rice with 1 tbsp turmeric (~30 min). Drain.",
      "Chop tomato, combine with spinach. Plate rice, salmon, and fresh veggies.",
    ],
  },
  {
    name: "Baked Chicken Stir Fry Bowl",
    category: "lunch",
    type: "build",
    calories: 500,
    protein: 38,
    carbs: 80,
    fat: 5,
    prepTime: "5 min",
    cookTime: "30 min",
    ingredients: [
      "115g (4 oz.) pechuga de pollo al horno (baked chicken breast)",
      "2 cups arroz blanco cocido (cooked white rice)",
      "100g cebolla (onion)",
      "100g espinacas (spinach)",
      "100g brócoli (broccoli)",
      "1 tbsp salsa de soja (soy sauce)",
      "Spray de aceite de cocina (cooking spray / Pam)",
    ],
    steps: [
      "Heat skillet, spray oil. Add onion, stir fry 2 min, add veggies + soy sauce, cook 5–7 min.",
      "Season chicken and bake at 180°C for 15–20 min. Cook rice.",
      "Plate rice, chicken, and stir-fried vegetables.",
    ],
  },

  // ── DINNER ─────────────────────────────────────────
  {
    name: "Chicken & Cottage Cheese Bowl",
    category: "dinner",
    type: "shred",
    calories: 450,
    protein: 44,
    carbs: 57,
    fat: 3,
    prepTime: "5 min",
    cookTime: "35 min",
    ingredients: [
      "100g (3.5 oz.) pechuga de pollo (chicken breast)",
      "100g requesón desnatado o queso fresco batido (cottage cheese sub — Mercadona/Lidl)",
      "1.5 cups arroz integral cocido (cooked brown rice)",
      "1 tbsp cúrcuma molida (ground turmeric)",
      "1/2 cup espinacas frescas (raw spinach)",
      "Optional: salsa picante (hot sauce)",
    ],
    steps: [
      "Cook brown rice with turmeric (~30 min). Drain.",
      "Season chicken with salt & pepper, bake at 180°C 15–20 min. Slice.",
      "Layer spinach, rice, sliced chicken, and requesón in bowl. Add hot sauce if desired.",
    ],
  },
  {
    name: "Korean Beef Bowl",
    category: "dinner",
    type: "shred",
    calories: 426,
    protein: 35,
    carbs: 36,
    fat: 15,
    prepTime: "5 min",
    cookTime: "15 min",
    ingredients: [
      "115g (4 oz.) carne picada magra de ternera (lean ground beef)",
      "1/2 cup arroz jazmín cocido (cooked jasmine rice)",
      "1 huevo cocido (boiled egg)",
      "1 calabacín (zucchini)",
      "1/3 cup azúcar moreno, 1/4 cup salsa de soja baja en sodio",
      "1 tbsp jengibre fresco rallado, 2 tsp aceite de sésamo, 1/2 tsp sriracha",
    ],
    steps: [
      "Mix sauce: brown sugar, soy sauce, ginger, sesame oil, sriracha.",
      "Sauté 2 cloves minced garlic with cooking spray. Add beef, brown.",
      "Drain excess fat. Return to pan, add sauce, simmer until coated.",
      "Cook rice, boil egg, sauté zucchini. Plate and top with green onion.",
    ],
  },
  {
    name: "Chicken Fajita Bowl",
    category: "dinner",
    type: "shred",
    calories: 236,
    protein: 25,
    carbs: 28,
    fat: 3,
    prepTime: "5 min",
    cookTime: "20 min",
    ingredients: [
      "115g (4 oz.) pechuga de pollo (chicken breast — with fajita seasoning)",
      "1/2 cup arroz jazmín cocido (cooked jasmine rice)",
      "Pimiento rojo y amarillo en tiras (sliced bell peppers)",
      "Cebolla amarilla en tiras (sliced yellow onion)",
      "Condimento para fajitas o: comino + pimentón + ajo en polvo (fajita spice mix)",
    ],
    steps: [
      "Season chicken with fajita spices. Grill or pan-fry until cooked through.",
      "Cook jasmine rice. Spray oil in hot pan, sauté peppers and onion until tender.",
      "Plate chicken, rice, and veggies together.",
    ],
  },
  {
    name: "Seasoned Pork Loin",
    category: "dinner",
    type: "shred",
    calories: 250,
    protein: 27,
    carbs: 29,
    fat: 2,
    prepTime: "5 min",
    cookTime: "30 min",
    ingredients: [
      "115g (4 oz.) lomo de cerdo (pork loin — widely available in Spain, superb quality)",
      "1/2 cup arroz jazmín cocido (cooked jasmine rice)",
      "Verduras al vapor: zanahoria, judías verdes (steamed veggies: carrots, green beans)",
      "Condimentos al gusto (seasonings: sal, pimienta, pimentón ahumado)",
    ],
    steps: [
      "Season pork loin as desired.",
      "Grill or bake at 180°C until cooked through (~20–25 min).",
      "Cook rice. Steam or sauté veggies. Plate and serve.",
    ],
  },
];

export const mealPlan = {
  shred: {
    // Daily breakfast staples — both every day
    breakfast: ["Greek Yogurt Bowl", "Protein Smoothie"],
    // 5 meal-prep friendly lunch options (rotate across the week)
    lunch: [
      "Chicken & Cottage Cheese Bowl",
      "Seasoned Pork Loin",
      "Flat Out Protein Wrap",
      "Baked Salmon Bowl",
      "Chicken Fajita Bowl",
    ],
    // Dinner suggestions for wife — all shred-friendly from BWS
    dinner: [
      "Chicken & Cottage Cheese Bowl",
      "Korean Beef Bowl",
      "Chicken Fajita Bowl",
      "Seasoned Pork Loin",
    ],
  },
};

// ── BARCELONA SHOPPING LIST ────────────────────────────────────────────────
export type ShoppingItem = { name: string; note?: string };
export type ShoppingCategory = { title: string; items: ShoppingItem[] };

export const barcelonaShoppingList: ShoppingCategory[] = [
  {
    title: "Proteínas",
    items: [
      { name: "Pechuga de pollo — 900g", note: "for lunches + dinners" },
      { name: "Lomo de cerdo — 300g", note: "for 2 lunch containers" },
      { name: "Carne picada magra de ternera — 250g", note: "for Korean Beef Bowl" },
      { name: "Salmón salvaje — 200g", note: "for 1 lunch bowl; fish counter or super" },
      { name: "Proteína de suero en polvo (whey)", note: "Decathlon Aptonia, or Amazon.es" },
    ],
  },
  {
    title: "Lácteos & Frescos",
    items: [
      { name: "Yogur griego natural — 2 × 500g", note: "Milbona (Lidl) or Hacendado (Mercadona)" },
      { name: "Requesón desnatado — 400g", note: "replaces cottage cheese; all supermarkets" },
      { name: "Huevos — 6 uds", note: "for dinners + optional breakfasts" },
      { name: "La Vaca que Ríe — 1 pack", note: "for Spinach Feta Wrap" },
    ],
  },
  {
    title: "Cereales & Carbohidratos",
    items: [
      { name: "Arroz integral — 1kg" },
      { name: "Arroz jazmín — 500g", note: "Asian supermarkets in BCN, or El Corte Inglés" },
      { name: "Wrap integral — 1 pack (6 uds)", note: "Mercadona or Lidl" },
      { name: "Plátanos — 7", note: "for daily smoothies" },
    ],
  },
  {
    title: "Verduras & Frescos",
    items: [
      { name: "Espinacas baby — 400g (bolsa)" },
      { name: "Tomates — 4" },
      { name: "Pimientos mixtos — 3", note: "red, yellow, green" },
      { name: "Cebolla — 3" },
      { name: "Calabacín — 1", note: "for Korean Beef Bowl" },
      { name: "Limones — 2" },
    ],
  },
  {
    title: "Congelados",
    items: [
      { name: "Frutos rojos congelados — 400g", note: "Lidl freezer section, great quality" },
    ],
  },
  {
    title: "Bebidas",
    items: [
      { name: "Leche de avena Alpro — 2 × 1L", note: "Mercadona / Carrefour" },
      { name: "Vermut — 1 botella", note: "Weekend treat — try Yzaguirre (Reus) or Zarzaparilla" },
      { name: "Café (beans or ground)", note: "daily, not tracked in macros" },
    ],
  },
  {
    title: "Despensa (Pantry Staples)",
    items: [
      { name: "Aceite de oliva virgen extra — 1 botella" },
      { name: "Cúrcuma molida", note: "Mercadona spice aisle" },
      { name: "Condimento para fajitas", note: "or mix: comino + pimentón + ajo en polvo" },
      { name: "Salsa de soja baja en sodio" },
      { name: "Aceite de sésamo tostado", note: "Asian supermarkets in BCN" },
      { name: "Salsa picante (hot sauce)" },
      { name: "Alubias negras en conserva — 1 lata", note: "for Protein Wraps" },
      { name: "Sal, pimienta negra, pimentón ahumado" },
    ],
  },
];
