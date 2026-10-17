// table.js — the kitchen counter: food you've taken out of the pantry or just cooked.
//
// Every thing on the counter is a "chip" (a <button> with a doodle and a name),
// positioned by its centre point (x, y) in counter pixels.
//
// What you can do with a chip:
//   * drag it into a cooking tool (or tap it, then tap the tool)
//   * drop it onto another chip to mix the two together (like the mixing bowl)
//   * drag it back onto the pantry to put it away; double-click to copy it
//   * keyboard: Enter picks it up, then Enter on a tool or another chip; arrows move it

import { getItem } from './data.js';
import { state, save } from './state.js';
import { renderArt } from './doodle.js';
import { play } from './audio.js';
import { t } from './i18n.js';
import { toast, bounce, esc } from './effects.js';
import { shelfRect } from './shelf.js';

let CHIP = 96;            // chip size in px (read from --chip in the CSS)
const SNAP = 52;          // how close (px) two chips must be to mix
let tableEl, layerEl, hintEl;
let hooks = {};
const chips = new Set();
let selected = null;      // chip picked up by tap/keyboard
let drag = null;          // the drag in progress, if any

/**
 * @param {object} h  hooks from main.js:
 *   mix(idA, idB) → cooking result for mixing two things
 *   celebrate(result, chipEl)
 *   stationAt(x, y) → tool id under the pointer, addToStation(toolId, itemId) → bool, highlightStation(toolId)
 */
export function initTable(h) {
  hooks = h;
  tableEl = document.getElementById('table');
  layerEl = document.getElementById('drag-layer');
  hintEl = document.getElementById('table-hint');

  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);
  window.addEventListener('pointercancel', onUp);
  const readSize = () => { CHIP = parseFloat(getComputedStyle(tableEl).getPropertyValue('--chip')) || 96; };
  readSize();
  window.addEventListener('resize', () => { readSize(); for (const c of chips) place(c, c._x, c._y); });
  tableEl.addEventListener('keydown', onKey);
  tableEl.addEventListener('click', (e) => { if (e.target === tableEl) select(null); });

  const r = tableEl.getBoundingClientRect();
  for (const c of state.table) if (getItem(c.id)) addChip(c.id, c.x * r.width, c.y * r.height);
  updateHint();
}

// ---------- chips ----------

function makeChipEl(id) {
  const it = getItem(id);
  const el = document.createElement('button');
  el.type = 'button';
  el.className = `chip kind-${it.kind}${it.sig ? ' is-sig' : ''}`;
  el.dataset.id = id;
  el.setAttribute('aria-label', t('chip.label', { name: it.name }));
  el.title = `${it.name} — ${it.desc}`;
  el.innerHTML = `<span class="chip-art">${renderArt(it)}</span><span class="chip-name">${esc(it.name)}</span>`;
  el.dataset.newLabel = t('shelf.new');
  el.style.setProperty('--blink', `${(-Math.random() * 6).toFixed(2)}s`); // faces don't all blink together
  return el;
}

function wireChip(el) {
  el.addEventListener('pointerdown', onChipDown);
  el.addEventListener('click', onChipClick);
  el.addEventListener('dblclick', () => {
    select(null);
    addChip(el.dataset.id, el._x + 30, el._y + 24, 'pop');
    play('pick');
    persist();
  });
  tableEl.appendChild(el);
  chips.add(el);
}

function addChip(id, x, y, anim = '') {
  const el = makeChipEl(id);
  wireChip(el);
  place(el, x, y);
  if (anim) bounce(el, anim);
  updateHint();
  return el;
}

/** Positions a chip, keeping it fully on the counter. */
function place(el, x, y) {
  const w = tableEl.clientWidth, h = tableEl.clientHeight;
  const half = CHIP / 2;
  el._x = Math.min(Math.max(x, half), Math.max(half, w - half));
  el._y = Math.min(Math.max(y, half * 0.9), Math.max(half, h - half - 6));
  el.style.left = `${el._x}px`;
  el.style.top = `${el._y}px`;
}

function removeChip(el, anim = true) {
  chips.delete(el);
  if (selected === el) select(null);
  if (!anim) { el.remove(); updateHint(); return; }
  el.classList.add('vanish');
  el.style.pointerEvents = 'none';
  setTimeout(() => el.remove(), 260);
  updateHint();
}

function updateHint() { hintEl.hidden = chips.size > 0; }

/** Saves the counter layout as fractions so it survives window resizing. */
function persist() {
  const w = tableEl.clientWidth || 1, h = tableEl.clientHeight || 1;
  state.table = [...chips].map((c) => ({ id: c.dataset.id, x: +(c._x / w).toFixed(4), y: +(c._y / h).toFixed(4) }));
  save();
}

/** Finds a roomy free spot, optionally near a point. */
function freeSpot(nx, ny) {
  const w = tableEl.clientWidth, h = tableEl.clientHeight;
  let best = [w / 2, h / 2], bestScore = -Infinity;
  for (let i = 0; i < 30; i++) {
    const x = nx != null ? nx + (Math.random() - 0.5) * 200 : w * (0.15 + Math.random() * 0.7);
    const y = ny != null ? ny + Math.random() * 120 : h * (0.25 + Math.random() * 0.6);
    let d = 300;
    for (const c of chips) d = Math.min(d, Math.hypot(c._x - x, c._y - y));
    const score = Math.min(d, CHIP * 1.2) - (nx != null ? Math.hypot(nx - x, ny - y) * 0.15 : 0);
    if (score > bestScore) { bestScore = score; best = [x, y]; }
  }
  return best;
}

/** Puts an item from the pantry on the counter (tap / Enter on a pantry tile). */
export function placeFromShelf(id) {
  const [x, y] = freeSpot();
  const el = addChip(id, x, y, 'pop');
  play('drop');
  persist();
  return el;
}

/** Puts an item on the counter just below a screen rectangle (a tool), e.g. a fresh result. */
export function placeBelow(rect, id, anim = 'pop') {
  const tr = tableEl.getBoundingClientRect();
  const cx = rect ? rect.left + rect.width / 2 - tr.left : tr.width / 2;
  const [x, y] = freeSpot(cx, CHIP * 0.65);
  const el = addChip(id, x, y, anim);
  persist();
  return el;
}

export function clearTable() {
  select(null);
  for (const c of [...chips]) removeChip(c);
  play('poof');
  persist();
  toast({ body: t('toast.cleared'), kind: 'soft', ms: 1600 });
}

/** Hands over the picked-up chip (for tapping a tool after tapping food). */
export function takeSelected() {
  if (!selected) return null;
  const el = selected;
  select(null);
  removeChip(el);
  persist();
  return el.dataset.id;
}

// ---------- tap / keyboard selection ----------

function select(el) {
  if (selected) selected.classList.remove('selected');
  selected = el;
  document.body.classList.toggle('has-selection', !!el);
  if (el) {
    el.classList.add('selected');
    play('pick');
  }
}

function onChipClick(e) {
  const el = e.currentTarget;
  if (el._justDragged) { el._justDragged = false; return; }
  if (!selected) { select(el); return; }
  if (selected === el) { select(null); return; }
  const other = selected;
  select(null);
  mixChips(other, el);
}

function onKey(e) {
  const el = e.target.closest?.('.chip');
  if (!el) return;
  if (e.key === 'Escape') select(null);
  else if (e.key === 'Delete' || e.key === 'Backspace') {
    e.preventDefault();
    const next = [...chips].find((c) => c !== el);
    removeChip(el); play('poof'); persist();
    (next || document.getElementById('shelf-search')).focus();
  } else if (e.key.startsWith('Arrow')) {
    e.preventDefault();
    const step = e.shiftKey ? 60 : 20;
    const dx = e.key === 'ArrowLeft' ? -step : e.key === 'ArrowRight' ? step : 0;
    const dy = e.key === 'ArrowUp' ? -step : e.key === 'ArrowDown' ? step : 0;
    place(el, el._x + dx, el._y + dy);
    persist();
  }
}

// ---------- dragging ----------
// While dragging, a floating copy (the "ghost") follows the pointer in a layer above
// everything, so it can travel over the tools and the pantry. The real chip waits,
// faded, and moves at the end. (Moving the touched element itself confuses touch screens.)

function onChipDown(e) {
  if (e.button > 0) return;
  const el = e.currentTarget;
  el._justDragged = false;
  const r = el.getBoundingClientRect();
  drag = {
    src: el, id: el.dataset.id, ghost: null, fromShelf: false, started: false,
    startX: e.clientX, startY: e.clientY, pointerId: e.pointerId,
    offX: e.clientX - (r.left + r.width / 2), offY: e.clientY - (r.top + r.height / 2),
  };
}

/** Called by the pantry once the player starts pulling a tile out. */
export function beginShelfDrag(id, e) {
  if (selected) select(null);
  drag = { src: null, id, ghost: makeGhost(id), fromShelf: true, started: true, pointerId: e.pointerId, offX: 0, offY: 0 };
  moveGhost(e.clientX, e.clientY);
  play('pick');
}

function makeGhost(id) {
  const g = makeChipEl(id);
  g.classList.add('dragging');
  g.tabIndex = -1;
  g.setAttribute('aria-hidden', 'true');
  layerEl.appendChild(g);
  return g;
}

function startDrag() {
  drag.started = true;
  if (selected) select(null);
  drag.ghost = makeGhost(drag.id);
  drag.src.classList.add('lifted');
  play('pick');
}

function moveGhost(cx, cy) {
  drag.ghost.style.left = `${cx - drag.offX}px`;
  drag.ghost.style.top = `${cy - drag.offY}px`;
}

function toTable(cx, cy) {
  const r = tableEl.getBoundingClientRect();
  return [cx - r.left, cy - r.top, cx >= r.left && cx <= r.right && cy >= r.top && cy <= r.bottom];
}

function nearestChip(x, y, except) {
  let best = null, bestD = SNAP;
  for (const c of chips) {
    if (c === except) continue;
    const d = Math.hypot(c._x - x, c._y - y);
    if (d < bestD) { bestD = d; best = c; }
  }
  return best;
}

let hoverTarget = null;
function setHover(c) {
  if (hoverTarget === c) return;
  hoverTarget?.classList.remove('target');
  hoverTarget = c;
  c?.classList.add('target');
}

function onMove(e) {
  if (!drag || e.pointerId !== drag.pointerId) return;
  if (!drag.started) {
    if (Math.hypot(e.clientX - drag.startX, e.clientY - drag.startY) < 6) return;
    startDrag();
  }
  e.preventDefault();
  moveGhost(e.clientX, e.clientY);
  const station = hooks.stationAt?.(e.clientX, e.clientY);
  hooks.highlightStation?.(station);
  const [x, y, inside] = toTable(e.clientX - drag.offX, e.clientY - drag.offY);
  setHover(!station && inside ? nearestChip(x, y, drag.src) : null);
}

function onUp(e) {
  if (!drag || e.pointerId !== drag.pointerId) return;
  const d = drag; drag = null;
  if (!d.started) return; // it was a tap: the click handler deals with it
  setHover(null);
  hooks.highlightStation?.(null);
  d.ghost.remove();
  if (d.src) {
    d.src.classList.remove('lifted');
    d.src._justDragged = true; // so the click that follows a drag is ignored
    setTimeout(() => { if (d.src) d.src._justDragged = false; }, 60);
  }
  if (e.type === 'pointercancel') return;

  // 1. into a cooking tool?
  const station = hooks.stationAt?.(e.clientX, e.clientY);
  if (station) {
    if (hooks.addToStation?.(station, d.id)) { if (d.src) { removeChip(d.src, false); persist(); } }
    else if (d.src) bounce(d.src, 'wiggle');
    return;
  }

  // 2. back to the pantry, or dropped somewhere that isn't the counter?
  const [x, y, inside] = toTable(e.clientX - d.offX, e.clientY - d.offY);
  const sr = shelfRect();
  const overShelf = e.clientX >= sr.left && e.clientX <= sr.right && e.clientY >= sr.top && e.clientY <= sr.bottom;
  if (overShelf || !inside) {
    if (d.src && !overShelf) { bounce(d.src, 'squash'); return; } // stays where it was
    if (d.src) removeChip(d.src);
    play('poof');
    persist();
    return;
  }

  // 3. onto the counter (and maybe onto another chip to mix)
  const el = d.src || addChip(d.id, x, y);
  place(el, x, y);
  const target = nearestChip(el._x, el._y, el);
  if (target) mixChips(el, target);
  else { bounce(el, 'squash'); play('drop'); persist(); }
}

// ---------- mixing two chips ----------

function mixChips(moving, target) {
  const res = hooks.mix?.(moving.dataset.id, target.dataset.id);
  if (!res) return;
  const { _x: x, _y: y } = target;
  removeChip(moving);
  removeChip(target);
  play('stir');
  const el = addChip(res.item.id, x, y, 'pop');
  persist();
  hooks.celebrate?.(res, el);
}
