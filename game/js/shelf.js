// shelf.js — the pantry shelf (inventory) with search, sorting and filters.
// Items on the shelf are never used up: dragging one out makes a copy on the counter.
// Everything you cook is added here too, so you can use it again in new recipes.

import { getItem } from './data.js';
import { state, save, clearFresh } from './state.js';
import { renderArt } from './doodle.js';
import { t } from './i18n.js';
import { esc } from './effects.js';

let gridEl, searchEl, sortEl, filterEls, countEl;
let handlers = {};
let query = '';

const KIND_ORDER = { ingredient: 0, creation: 1 };
const filterMatch = (item, f) =>
  f === 'all' ||
  (f === 'ingredient' && item.kind === 'ingredient') ||
  (f === 'creation' && item.kind === 'creation') ||
  (f === 'signature' && !!item.sig);

/**
 * @param {object} h  callbacks: onTileDragStart(id, pointerEvent, tileEl), onTileActivate(id, tileEl)
 */
export function initShelf(h) {
  handlers = h;
  gridEl = document.getElementById('shelf-grid');
  searchEl = document.getElementById('shelf-search');
  sortEl = document.getElementById('shelf-sort');
  countEl = document.getElementById('shelf-count');
  filterEls = [...document.querySelectorAll('[data-filter]')];

  searchEl.addEventListener('input', () => { query = searchEl.value.trim().toLowerCase(); render(); });
  sortEl.value = state.settings.sort;
  sortEl.addEventListener('change', () => { state.settings.sort = sortEl.value; save(); render(); });
  filterEls.forEach((b) => b.addEventListener('click', () => { state.settings.filter = b.dataset.filter; save(); render(); }));

  // --- dragging a tile out of the shelf ---
  // We wait until the pointer has moved a few pixels before starting a drag,
  // so a simple tap still counts as a tap (which places the item on the table).
  let pending = null;
  gridEl.addEventListener('pointerdown', (e) => {
    const tile = e.target.closest('.tile');
    if (!tile || e.button > 0) return;
    delete tile.dataset.dragged;
    pending = { id: tile.dataset.id, x: e.clientX, y: e.clientY, tile, pointerId: e.pointerId };
  });
  window.addEventListener('pointermove', (e) => {
    if (!pending || e.pointerId !== pending.pointerId) return;
    const dx = Math.abs(e.clientX - pending.x), dy = Math.abs(e.clientY - pending.y);
    if (Math.hypot(dx, dy) > 7) {
      // On touch screens the shelf scrolls one way, and pulling the other way drags.
      // (Side shelf: scrolls up/down, pull sideways. Bottom shelf: scrolls sideways, pull up.)
      if (e.pointerType !== 'mouse') {
        const scrollsSideways = getComputedStyle(pending.tile).touchAction.includes('pan-x');
        if (scrollsSideways ? dx > dy : dy > dx) { pending = null; return; } // that's a scroll
      }
      const p = pending; pending = null;
      p.tile.dataset.dragged = '1';
      used(p.id, p.tile);
      handlers.onTileDragStart?.(p.id, e, p.tile);
    }
  });
  const end = () => { pending = null; };
  window.addEventListener('pointerup', end);
  window.addEventListener('pointercancel', end); // the browser decided to scroll instead

  // --- tap / click / Enter places it on the table ---
  gridEl.addEventListener('click', (e) => {
    const tile = e.target.closest('.tile');
    if (!tile) return;
    if (tile.dataset.dragged) { delete tile.dataset.dragged; return; } // it was a drag, not a tap
    used(tile.dataset.id, tile);
    handlers.onTileActivate?.(tile.dataset.id, tile);
  });

  render();
}

/** Removes the "New!" tag once the player has used an item. */
function used(id, tile) {
  if (clearFresh(id)) tile.querySelector('.tag-new')?.remove();
}

export function render() {
  const f = state.settings.filter;
  filterEls.forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.filter === f)));

  let list = state.discovered.map(getItem).filter(Boolean);
  list = list.filter((it) => filterMatch(it, f));
  if (query) list = list.filter((it) => it.name.toLowerCase().includes(query) || it.id.includes(query));

  const order = new Map(state.discovered.map((id, i) => [id, i]));
  const sort = state.settings.sort;
  if (sort === 'found') list.sort((a, b) => order.get(b.id) - order.get(a.id));
  else if (sort === 'oldest') list.sort((a, b) => order.get(a.id) - order.get(b.id));
  else if (sort === 'az') list.sort((a, b) => a.name.localeCompare(b.name));
  else if (sort === 'type') list.sort((a, b) => KIND_ORDER[a.kind] - KIND_ORDER[b.kind] || a.name.localeCompare(b.name));

  const fresh = new Set(state.fresh);
  const frag = document.createDocumentFragment();
  for (const it of list) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = `tile kind-${it.kind}${it.sig ? ' is-sig' : ''}`;
    b.dataset.id = it.id;
    b.title = `${it.name} — ${it.desc}`;
    b.setAttribute('aria-label', t('tile.label', { name: it.name }));
    b.innerHTML = `<span class="tile-art">${renderArt(it)}</span><span class="tile-name">${esc(it.name)}</span>` +
      (fresh.has(it.id) ? `<span class="tag-new">${t('shelf.new')}</span>` : '');
    frag.appendChild(b);
  }
  gridEl.replaceChildren(frag);
  if (!list.length) {
    const p = document.createElement('p');
    p.className = 'shelf-empty';
    p.textContent = t('shelf.empty', { q: searchEl.value });
    gridEl.appendChild(p);
  }
  countEl.textContent = String(list.length);
}

/** Screen rectangle of the shelf, used to detect "dropped back on the shelf". */
export function shelfRect() {
  return document.getElementById('shelf').getBoundingClientRect();
}
