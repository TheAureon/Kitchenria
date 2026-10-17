// load.js — reads a JSON file of the game (recipes, items, text).
// The one-file version (index.html in the main Kitchenria folder) carries copies of
// these files inside itself, because browsers won't let a page opened straight from
// the disk read other files. Everywhere else they are fetched normally.

export async function loadJSON(path) {
  const packed = window.KITCHENRIA_PACKED?.[path];
  if (packed) return structuredClone(packed);
  const res = await fetch(path);
  if (!res.ok) throw new Error(`Could not load ${path} (${res.status})`);
  return res.json();
}
