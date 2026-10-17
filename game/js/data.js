// data.js — loads the pantry, kitchen tools and classic dishes, and sets up the food engine.
// Mistakes in the JSON files are reported in the browser console and skipped,
// so a typo never breaks the game.

import { loadJSON } from './load.js';
import { createEngine } from './engine.js';
import { t, pick } from './i18n.js';
import { state } from './state.js';

/** Everything loaded, in one place: db.engine, db.kitchen, db.tools, db.signatures */
export const db = { engine: null, kitchen: null, tools: [], signatures: [] };

export async function loadData() {
  const [ing, kitchen, sig] = await Promise.all([
    loadJSON('data/ingredients.json'),
    loadJSON('data/kitchen.json'),
    loadJSON('data/signatures.json'),
  ]);
  const seen = new Set();
  const ingredients = ing.ingredients.filter((g) => {
    const ok = g.id && !seen.has(g.id) && g.name && g.art;
    if (!ok) console.warn('[Kitchenria] Skipping ingredient with a missing or duplicate id/name/art:', g);
    seen.add(g.id);
    return ok;
  });
  db.engine = createEngine({ ingredients, signatures: sig.signatures, t, pick });
  db.kitchen = kitchen;
  db.tools = kitchen.tools;
  db.signatures = sig.signatures;
}

const baseCache = new Map();
/** Any item by id: a pantry ingredient, or something you cooked. */
export function getItem(id) {
  if (db.engine.ING.has(id)) {
    if (!baseCache.has(id)) baseCache.set(id, db.engine.baseItem(id));
    return baseCache.get(id);
  }
  return state.creations[id] || null;
}

export const toolById = (id) => db.tools.find((tl) => tl.id === id);
export const packIngredients = (pack) => [...db.engine.ING.values()].filter((g) => (g.pack || 'starter') === pack).map((g) => g.id);
