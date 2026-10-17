// data.js — loads items.json and recipes.json and answers "what do A and B make?".
// Mistakes in the JSON files are reported in the browser console and skipped,
// so a typo never breaks the game.

export const items = new Map();   // id -> item
const recipes = new Map();        // "a|b" (sorted) -> result id

/** Order-independent key, so flour+water and water+flour are the same. */
const pairKey = (a, b) => (a < b ? `${a}|${b}` : `${b}|${a}`);

export async function loadData() {
  const [itemJson, recipeJson] = await Promise.all([
    fetch('data/items.json').then((r) => r.json()),
    fetch('data/recipes.json').then((r) => r.json()),
  ]);
  for (const it of itemJson.items) {
    if (!it.id || items.has(it.id)) { console.warn('[Kitchenria] Skipping item with missing or duplicate id:', it); continue; }
    items.set(it.id, it);
  }
  for (const r of recipeJson.recipes) {
    const bad = ['a', 'b', 'makes'].filter((k) => !items.has(r[k]));
    if (bad.length) { console.warn('[Kitchenria] Skipping recipe with unknown item(s):', r); continue; }
    const key = pairKey(r.a, r.b);
    if (recipes.has(key)) { console.warn('[Kitchenria] Skipping duplicate recipe pair:', r); continue; }
    recipes.set(key, r.makes);
  }
}

/** Returns the id of what a + b make, or null if nothing is known (yet). */
export function combineIds(a, b) {
  return recipes.get(pairKey(a, b)) ?? null;
}

export const isTool = (id) => items.get(id)?.type === 'tool';
export const starterIds = () => [...items.values()].filter((i) => i.starter).map((i) => i.id);
export const recipeCount = () => recipes.size;
