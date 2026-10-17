// shelf.js — the pantry: every ingredient, neatly sorted into sections
// (vegetables, fruit, dairy & eggs…). Nothing to unlock: it's all there from the start.
// Ingredients are never used up: dragging one out puts a fresh one on the counter.

import { db, getItem } from './data.js';
import { state, save } from './state.js';
import { renderArt } from './doodle.js';
import { t } from './i18n.js';
import { esc } from './effects.js';

let gridEl, searchEl, tabsEl;
let handlers = {};
let query = '';

/**
 * @param {object} h  callbacks: onTileDragStart(id, pointerEvent), onTileActivate(id)
 */
export function initShelf(h) {
  handlers = h;
  gridEl = document.getElementById('shelf-grid');
  searchEl = document.getElementById('shelf-search');
  tabsEl = document.getElementById('shelf-tabs');

  tabsEl.innerHTML = ['all', ...db.kitchen.pantry.map((s) => s.id)]
    .map((id) => `<button type="button" data-section="${id}">${esc(t(`pantry.${id}`))}</button>`).join('');
  tabsEl.addEventListener('click', (e) => {
    const b = e.target.closest('[data-section]');
    if (!b) return;
    state.settings.section = b.dataset.section;
    save();
    render();
    gridEl.scrollTo({ top: 0, left: 0 });
  });
  searchEl.addEventListener('input', () => { query = searchEl.value.trim().toLowerCase(); render(); });

  // --- dragging an ingredient out ---
  // Wait until the pointer has moved a few pixels, so a simple tap stays a tap.
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
      // On touch screens the pantry scrolls one way, and pulling the other way drags.
      if (e.pointerType !== 'mouse') {
        const scrollsSideways = getComputedStyle(pending.tile).touchAction.includes('pan-x');
        if (scrollsSideways ? dx > dy : dy > dx) { pending = null; return; }
      }
      const p = pending; pending = null;
      p.tile.dataset.dragged = '1';
      window.addEventListener('pointerup', () => setTimeout(() => delete p.tile.dataset.dragged, 60), { once: true });
      handlers.onTileDragStart?.(p.id, e);
    }
  });
  const end = () => { pending = null; };
  window.addEventListener('pointerup', end);
  window.addEventListener('pointercancel', end);

  // --- tap / click / Enter puts it on the counter ---
  gridEl.addEventListener('click', (e) => {
    const tile = e.target.closest('.tile');
    if (!tile) return;
    if (tile.dataset.dragged) { delete tile.dataset.dragged; return; }
    handlers.onTileActivate?.(tile.dataset.id);
  });

  render();
}

export function render() {
  const current = state.settings.section || 'all';
  tabsEl.querySelectorAll('[data-section]').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.section === current)));
  const sections = db.kitchen.pantry.filter((s) => current === 'all' || query || s.id === current);
  const frag = document.createDocumentFragment();
  let count = 0;
  for (const sec of sections) {
    const list = db.ingredients.filter((g) => sec.cats.includes(g.cat) && (!query || g.name.toLowerCase().includes(query)));
    if (!list.length) continue;
    const head = document.createElement('h3');
    head.className = 'shelf-section';
    head.textContent = t(`pantry.${sec.id}`);
    frag.appendChild(head);
    for (const g of list) {
      const it = getItem(g.id);
      const b = document.createElement('button');
      b.type = 'button';
      b.className = 'tile';
      b.dataset.id = g.id;
      b.title = `${it.name} — ${it.desc}`;
      b.setAttribute('aria-label', t('tile.label', { name: it.name }));
      b.innerHTML = `<span class="tile-art">${renderArt(it)}</span><span class="tile-name">${esc(it.name)}</span>`;
      frag.appendChild(b);
      count++;
    }
  }
  gridEl.replaceChildren(frag);
  if (!count) {
    const p = document.createElement('p');
    p.className = 'shelf-empty';
    p.textContent = t('shelf.empty', { q: searchEl.value });
    gridEl.appendChild(p);
  }
}

/** Screen rectangle of the pantry, used to detect "dropped back in the pantry". */
export function shelfRect() {
  return document.getElementById('shelf').getBoundingClientRect();
}
