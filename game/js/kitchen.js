// kitchen.js — cooking and serving: asks the food engine for a result, remembers it,
// and hands out points. No drawing happens here; the stations and the counter show the results.

import { db, getItem } from './data.js';
import { state, save, addToPantry } from './state.js';
import { recordMade, recordServe } from './progress.js';
import { scoreDish } from './critic.js';
import { t, pick } from './i18n.js';

/** Stores a new result, or finds the same thing you already made (same recipe or same name). */
function remember(result) {
  const known = state.keyIndex[result.key] || state.nameIndex[result.name.toLowerCase()];
  if (known && getItem(known)) {
    state.keyIndex[result.key] = known;
    return { item: getItem(known), isNew: false };
  }
  state.creations[result.id] = result;
  state.keyIndex[result.key] = result.id;
  state.nameIndex[result.name.toLowerCase()] = result.id;
  return { item: result, isNew: true };
}

function noteSignature(sigId) {
  if (!sigId || state.signatures.includes(sigId)) return false;
  state.signatures.push(sigId);
  return true;
}

/**
 * Cooks the given item ids with a tool action (chop, boil, mix…).
 * @returns {{ item, isNew, isNewSig, events }}
 */
export function cook(op, ids) {
  const items = ids.map(getItem).filter(Boolean);
  if (!items.length) return null;
  const { item, isNew } = remember(db.engine.cook(op, items));
  if (isNew) addToPantry(item.id);
  const isNewSig = noteSignature(item.sig);
  const events = recordMade(item, { isNew, isNewSig });
  save();
  return { item, isNew, isNewSig, events };
}

/**
 * Plates the given items and lets the critic taste them.
 * @returns {{ dish, score, firstTime, isNewSig, earned, events }}
 */
export function serve(ids) {
  const items = ids.map(getItem).filter(Boolean);
  if (!items.length) return null;
  const { item: dish } = remember(db.engine.plate(items));
  const score = scoreDish(dish, { t, pick, ING: db.engine.ING });
  const firstTime = !state.served[dish.id];
  const isNewSig = noteSignature(dish.sig);
  const rec = state.served[dish.id] || { stars: score.stars, review: score.review, times: 0, first: Date.now() };
  rec.times++; rec.last = Date.now();
  state.served[dish.id] = rec;
  const { earned, events } = recordServe(dish, score, { firstTime });
  const sigEvents = isNewSig ? recordMade(dish, { isNew: false, isNewSig }) : [];
  save();
  return { dish, score, firstTime, isNewSig, earned, events: events.concat(sigEvents) };
}
