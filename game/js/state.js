// state.js — everything the game remembers, saved automatically in the browser
// (localStorage) a moment after every change.

const SAVE_KEY = 'kitchenria.save.v2';

export const state = {
  version: 2,
  discovered: [],     // ids of everything in the pantry, in the order it arrived
  creations: {},      // id -> full item for everything you have cooked (and dishes you served)
  keyIndex: {},       // recipe key ("fry(egg)") -> item id, so a recipe always gives the same thing
  nameIndex: {},      // lower-case name -> item id, so two ways to make "Toast" give one Toast
  fresh: [],          // ids still showing the "New!" tag
  table: [],          // [{ id, x, y }] things on the counter, x/y as 0..1 fractions
  stations: {},       // tool id -> [item ids] waiting inside that tool
  points: 0,          // chef points
  rank: 1,            // chef rank 1..10
  served: {},         // dish id -> { stars, review, times, first, last }
  signatures: [],     // classic dish ids found
  badges: [],         // badge ids earned
  stats: { made: {}, ops: {}, burnt: 0, servedRaw: 0, goodServes: 0, bestStars: 0 },
  settings: { muted: false, sort: 'found', filter: 'all' },
};

export function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      Object.assign(state, data, {
        settings: { ...state.settings, ...(data.settings || {}) },
        stats: { ...state.stats, ...(data.stats || {}) },
      });
    }
  } catch (e) { console.warn('[Kitchenria] Could not read the save, starting fresh.', e); }
}

let timer = null;
/** Save soon (many quick changes become one save). */
export function save() {
  clearTimeout(timer);
  timer = setTimeout(saveNow, 300);
}
export function saveNow() {
  clearTimeout(timer);
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch (e) { console.warn('[Kitchenria] Save failed', e); }
}

export const isDiscovered = (id) => state.discovered.includes(id);

/** Adds something to the pantry. Returns true if it was brand new. */
export function addToPantry(id, { markFresh = true } = {}) {
  if (isDiscovered(id)) return false;
  state.discovered.push(id);
  if (markFresh) state.fresh.push(id);
  save();
  return true;
}

export function clearFresh(id) {
  const i = state.fresh.indexOf(id);
  if (i >= 0) { state.fresh.splice(i, 1); save(); return true; }
  return false;
}
