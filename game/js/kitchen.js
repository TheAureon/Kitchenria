// kitchen.js — cooking and serving: asks the food engine for a result and remembers it.
// No drawing happens here; the counter, tools and review card show the results.

import { db, getItem } from './data.js';
import { state, save } from './state.js';
import { scoreDish } from './critic.js';
import { t, pick } from './i18n.js';

const seenKeys = new Set(); // recipes made during this visit, for the "New!" sparkle

function noteSignature(sigId) {
  if (!sigId || state.signatures.includes(sigId)) return false;
  state.signatures.push(sigId);
  return true;
}

/**
 * Uses a tool (knead, chop, boil, fry…) on some food (ids, or the food items themselves).
 * @returns {{ item, isNew, isNewSig }}
 */
export function cook(op, foods) {
  const items = foods.map((f) => (typeof f === 'string' ? getItem(f) : f)).filter(Boolean);
  if (!items.length) return null;
  const item = db.engine.cook(op, items);
  state.creations[item.id] = item;
  const isNew = !seenKeys.has(item.name);
  seenKeys.add(item.name);
  const isNewSig = noteSignature(item.sig);
  save();
  return { item, isNew, isNewSig };
}

/**
 * Plates food and lets the critic taste it. The dish goes into the Recipe Book.
 * @returns {{ dish, score, firstTime, isNewSig }}
 */
export function serve(ids) {
  const items = ids.map(getItem).filter(Boolean);
  if (!items.length) return null;
  const dish = db.engine.plate(items);
  const score = scoreDish(dish, { t, pick, ING: db.engine.ING });
  const firstTime = !state.dishes[dish.id];
  const isNewSig = noteSignature(dish.sig) || noteSignature(dish.mainSig);
  const rec = state.dishes[dish.id] || { dish, stars: score.stars, review: score.review, times: 0, first: Date.now() };
  rec.times++; rec.last = Date.now();
  state.dishes[dish.id] = rec;
  save();
  return { dish, score, firstTime, isNewSig };
}
