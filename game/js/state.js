// state.js — everything the game remembers, saved automatically in the browser
// (localStorage) a moment after every change.
//
// Only finished dishes are kept for good (in the Recipe Book). Things you make along
// the way (dough, chopped tomato…) only live on the counter until you use them.

const SAVE_KEY = 'kitchenria.save.v3';

export const state = {
  version: 3,
  creations: {},      // id -> item, for food currently on the counter or the plate
  table: [],          // [{ ids: [...], x, y }] food on the counter (several ids = a stack); x/y are 0..1 fractions
  plate: [],          // ids of food on the serving plate
  dishes: {},         // dish id -> { dish, stars, review, times, first, last } (the Recipe Book)
  signatures: [],     // classic dish ids found
  settings: { muted: false, section: 'all' },
};

export function loadSave() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      Object.assign(state, data, { settings: { ...state.settings, ...(data.settings || {}) } });
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
  // forget in-between food that is no longer on the counter or the plate
  const used = new Set([...state.table.flatMap((c) => c.ids), ...state.plate]);
  for (const id of Object.keys(state.creations)) if (!used.has(id)) delete state.creations[id];
  try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch (e) { console.warn('[Kitchenria] Save failed', e); }
}
