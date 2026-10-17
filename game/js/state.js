// state.js — remembers what the player has discovered and what is on the table.
// Saved automatically in the browser (localStorage) a moment after every change.

const SAVE_KEY = 'kitchenria.save.v1';

export const state = {
  version: 1,
  discovered: [],     // item ids in the order they were found
  firstMade: {},      // id -> [a, b]  how it was first made (for the recipe book)
  fresh: [],          // ids still showing the "New!" tag
  table: [],          // [{ id, x, y }] with x/y as 0..1 fractions of the table size
  settings: { muted: false, sort: 'found', filter: 'all' },
};

export function loadSave(starters) {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      Object.assign(state, data, { settings: { ...state.settings, ...(data.settings || {}) } });
    }
  } catch (e) { console.warn('[Kitchenria] Could not read the save, starting fresh.', e); }
  // Starters are always known, even if the item list grows in an update.
  for (const id of starters) if (!state.discovered.includes(id)) state.discovered.push(id);
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

/** Records a discovery. Returns true if it was brand new. */
export function discover(id, from) {
  if (isDiscovered(id)) return false;
  state.discovered.push(id);
  state.firstMade[id] = from;
  state.fresh.push(id);
  save();
  return true;
}

export function clearFresh(id) {
  const i = state.fresh.indexOf(id);
  if (i >= 0) { state.fresh.splice(i, 1); save(); return true; }
  return false;
}
