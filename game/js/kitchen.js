// kitchen.js — cooking and serving: asks the food engine for a result and remembers it.
// No drawing happens here; the counter, tools and review card show the results.

import { db, getItem } from './data.js';
import { state, save } from './state.js';
import { scoreDish } from './critic.js';
import { t, pick } from './i18n.js';
import { savedName, savedReview } from './ai.js';

const seenKeys = new Set(); // recipes made during this visit, for the "New!" sparkle

function noteSignature(sigId) {
  if (!sigId || state.signatures.includes(sigId)) return false;
  state.signatures.push(sigId);
  return true;
}

/**
 * Uses a tool (squish, chop, boil, fry…) on some food (ids, or the food items themselves).
 * @returns {{ item, isNew, isNewSig }}
 */
export function cook(op, foods) {
  const items = foods.map((f) => (typeof f === 'string' ? getItem(f) : f)).filter(Boolean);
  if (!items.length) return null;
  let item = db.engine.cook(op, items);
  const named = savedName(item.key); // a name the AI gave this recipe before
  if (named) item = { ...item, name: named.name, desc: named.desc, aiNamed: true, noun: true, subject: named.name };
  state.creations[item.id] = item;
  const isNew = !seenKeys.has(item.name);
  seenKeys.add(item.name);
  const isNewSig = noteSignature(item.sig);
  save();
  return { item, isNew, isNewSig, inputs: items };
}

/**
 * Plates food and lets the critic taste it. The dish goes into the Recipe Book.
 * @returns {{ dish, score, firstTime, isNewSig }}
 */
export function serve(ids) {
  const items = ids.map(getItem).filter(Boolean);
  if (!items.length) return null;
  let dish = db.engine.plate(items);
  const reviewed = savedReview(dish.key);
  if (reviewed && reviewed.dishName && !dish.sig) dish = { ...dish, name: reviewed.dishName };
  const score = scoreDish(dish, { t, pick, ING: db.engine.ING });
  const firstTime = !state.dishes[dish.id];
  const isNewSig = noteSignature(dish.sig) || noteSignature(dish.mainSig);
  if (reviewed) score.review = reviewed.review;
  const rec = state.dishes[dish.id] || { dish, stars: score.stars, review: score.review, times: 0, first: Date.now() };
  rec.times++; rec.last = Date.now();
  state.dishes[dish.id] = rec;
  save();
  return { dish, score, firstTime, isNewSig, aiDone: !!reviewed };
}

/** Puts an AI-written name on something you made (and on everything on the counter that is it). */
export function renameFood(id, { name, desc }) {
  const it = state.creations[id];
  if (!it) return null;
  state.creations[id] = { ...it, name, desc, aiNamed: true, noun: true, subject: name }; // the AI's name is used everywhere from now on
  save();
  return state.creations[id];
}

/** Stores an AI-written review (and plate name) in the Recipe Book. */
export function updateReview(dishId, { review, dishName }) {
  const rec = state.dishes[dishId];
  if (!rec) return;
  rec.review = review;
  if (dishName && !rec.dish.sig) rec.dish = { ...rec.dish, name: dishName };
  save();
}
