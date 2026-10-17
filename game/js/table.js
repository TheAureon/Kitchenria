// table.js — the kitchen table: placing, dragging and combining items.
//
// Every thing on the table is a "chip" (a <button> with a doodle and a name).
// Chips are positioned by their centre point (x, y) in table pixels.
//
// Ways to combine (all do the same thing):
//   * drag one chip and drop it onto another (mouse or touch)
//   * tap/click one chip to pick it up, then tap another one
//   * keyboard: Tab to a chip, press Enter, Tab to another, press Enter
//   * with a chip picked up, tap/Enter an item on the shelf

import { items, combineIds, isTool } from './data.js';
import { state, save, discover } from './state.js';
import { renderArt } from './doodle.js';
import { play } from './audio.js';
import { t } from './i18n.js';
import { sparkleBurst, toast, bounce, esc } from './effects.js';
import { shelfRect } from './shelf.js';

let CHIP = 84;            // chip size in px (read from --chip in the CSS)
const SNAP = 52;          // how close (px) two chips must be to combine
let tableEl, layerEl, hintEl;
let onChange = () => {};
const chips = new Set();
let selected = null;      // chip picked up by tap/keyboard
let drag = null;          // the drag in progress, if any

export function initTable(opts) {
  tableEl = document.getElementById('table');
  layerEl = document.getElementById('drag-layer');
  hintEl = document.getElementById('table-hint');
  onChange = opts.onChange || onChange;

  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);
  window.addEventListener('pointercancel', onUp);
  const readSize = () => { CHIP = parseFloat(getComputedStyle(tableEl).getPropertyValue('--chip')) || 84; };
  readSize();
  window.addEventListener('resize', () => { readSize(); for (const c of chips) place(c, c._x, c._y); });
  tableEl.addEventListener('keydown', onKey);
  // clicking empty table space puts down whatever was picked up
  tableEl.addEventListener('click', (e) => { if (e.target === tableEl) select(null); });

  // bring back what was on the table last time
  const r = tableEl.getBoundingClientRect();
  for (const c of state.table) if (items.has(c.id)) addChip(c.id, c.x * r.width, c.y * r.height);
  updateHint();
}

// ---------- chips ----------

/** Builds the chip element (not yet on the table). */
function makeChipEl(id) {
  const it = items.get(id);
  const el = document.createElement('button');
  el.type = 'button';
  el.className = `chip type-${it.type}`;
  el.dataset.id = id;
  el.setAttribute('aria-label', t(it.type === 'tool' ? 'chip.labelTool' : 'chip.label', { name: it.name }));
  el.innerHTML = `<span class="chip-art">${renderArt(it)}</span><span class="chip-name">${esc(it.name)}</span>`;
  el.dataset.newLabel = t('shelf.new');
  el.style.setProperty('--blink', `${(-Math.random() * 6).toFixed(2)}s`); // so faces don't all blink together
  return el;
}

/** Makes a chip live: draggable, clickable, and known to the table. */
function wireChip(el) {
  el.addEventListener('pointerdown', onChipDown);
  el.addEventListener('click', onChipClick);
  el.addEventListener('dblclick', () => { // double-click makes a copy
    select(null);
    addChip(el.dataset.id, el._x + 28, el._y + 22, 'pop');
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

/** Positions a chip, keeping it fully on the table. */
function place(el, x, y) {
  const w = tableEl.clientWidth, h = tableEl.clientHeight;
  const half = CHIP / 2;
  el._x = Math.min(Math.max(x, half), Math.max(half, w - half));
  el._y = Math.min(Math.max(y, half), Math.max(half, h - half - 10));
  el.style.left = `${el._x}px`;
  el.style.top = `${el._y}px`;
}

function removeChip(el, anim = true) {
  chips.delete(el);
  if (selected === el) selected = null;
  if (!anim) { el.remove(); updateHint(); return; }
  el.classList.add('vanish');
  el.style.pointerEvents = 'none';
  setTimeout(() => el.remove(), 260);
  updateHint();
}

function updateHint() {
  hintEl.hidden = chips.size > 0;
}

/** Saves the table layout as fractions so it survives window resizing. */
function persist() {
  const w = tableEl.clientWidth || 1, h = tableEl.clientHeight || 1;
  state.table = [...chips].map((c) => ({ id: c.dataset.id, x: +(c._x / w).toFixed(4), y: +(c._y / h).toFixed(4) }));
  save();
}

/** Finds a roomy free spot on the table (used when tapping shelf items). */
function freeSpot(near) {
  const w = tableEl.clientWidth, h = tableEl.clientHeight;
  let best = null, bestScore = -1;
  for (let i = 0; i < 24; i++) {
    const x = near ? near._x + (Math.random() - 0.5) * 220 : w * (0.2 + Math.random() * 0.6);
    const y = near ? near._y + (Math.random() - 0.5) * 180 : h * (0.25 + Math.random() * 0.55);
    let d = 400;
    for (const c of chips) d = Math.min(d, Math.hypot(c._x - x, c._y - y));
    if (near) d = Math.min(d, 400 - Math.hypot(near._x - x, near._y - y) * 0.5);
    if (d > bestScore) { bestScore = d; best = [x, y]; }
  }
  return best;
}

/** Put an item from the shelf on the table (tap / Enter on a shelf tile). */
export function placeFromShelf(id) {
  const [x, y] = freeSpot(selected);
  const el = addChip(id, x, y, 'pop');
  play('drop');
  if (selected) {
    const other = selected;
    select(null);
    setTimeout(() => combine(el, other), 180);
  } else {
    persist();
  }
  return el;
}

export function clearTable() {
  select(null);
  for (const c of [...chips]) removeChip(c);
  play('poof');
  persist();
  toast({ body: t('toast.cleared'), kind: 'soft', ms: 1600 });
}

// ---------- tap / keyboard selection ----------

function select(el) {
  if (selected) selected.classList.remove('selected');
  selected = el;
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
  combine(other, el);
}

function onKey(e) {
  const el = e.target.closest?.('.chip');
  if (!el) return;
  if (e.key === 'Escape') { select(null); }
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
// While dragging, a floating copy (the "ghost") follows the pointer in a layer
// above everything, so it can pass over the shelf. The real chip waits, invisible,
// and moves to the drop spot at the end. (Moving the touched element itself
// would confuse touch screens.)

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

/** Called by the shelf once the player starts pulling a tile out. */
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

/** Converts a screen position to table coordinates. */
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
  const [x, y, inside] = toTable(e.clientX - drag.offX, e.clientY - drag.offY);
  setHover(inside ? nearestChip(x, y, drag.src) : null);
}

function onUp(e) {
  if (!drag || e.pointerId !== drag.pointerId) return;
  const d = drag; drag = null;
  if (!d.started) return; // it was a tap: the click handler deals with it
  setHover(null);
  d.ghost.remove();
  if (d.src) {
    d.src.classList.remove('lifted');
    d.src._justDragged = true; // so the click that follows a drag is ignored
    setTimeout(() => { if (d.src) d.src._justDragged = false; }, 60);
  }

  const cancelled = e.type === 'pointercancel';
  const [x, y, inside] = toTable(e.clientX - d.offX, e.clientY - d.offY);
  const sr = shelfRect();
  const overShelf = e.clientX >= sr.left && e.clientX <= sr.right && e.clientY >= sr.top && e.clientY <= sr.bottom;

  if (cancelled && d.src) return; // leave it where it was
  if (overShelf || !inside || cancelled) {
    if (d.src && !overShelf) { bounce(d.src, 'squash'); return; } // dropped outside: stays put
    if (d.src) removeChip(d.src);
    play('poof');
    persist();
    return;
  }

  const el = d.src || addChip(d.id, x, y);
  place(el, x, y);
  const target = nearestChip(el._x, el._y, el);
  if (target) combine(el, target);
  else { bounce(el, 'squash'); play('drop'); persist(); }
}

// ---------- combining ----------

/**
 * Combines two chips. "moving" is the one that was dropped, "target" the one below.
 * Tools are never used up: the item turns into something new next to the tool.
 */
function combine(moving, target) {
  const a = moving.dataset.id, b = target.dataset.id;
  const result = combineIds(a, b);
  const A = items.get(a), B = items.get(b);

  if (!result) {
    // Nothing happens (yet): a gentle wiggle, and the moving chip hops aside.
    bounce(target, 'wiggle');
    bounce(moving, 'wiggle');
    const ang = Math.atan2(moving._y - target._y, moving._x - target._x) || Math.random() * 6;
    place(moving, target._x + Math.cos(ang) * (CHIP * 0.95), target._y + Math.sin(ang) * (CHIP * 0.95));
    play('nope');
    toast({ body: t('toast.nothing', { a: esc(A.name), b: esc(B.name) }), kind: 'soft', ms: 2200 });
    persist();
    return;
  }

  const aTool = isTool(a), bTool = isTool(b);
  let x = target._x, y = target._y;
  if (aTool || bTool) {
    // keep the tool, and pop the result out just below it (or above if there's no room)
    const tool = aTool ? moving : target;
    x = tool._x + (Math.random() - 0.5) * 30;
    y = tool._y + CHIP * 1.3;
    if (y > tableEl.clientHeight - CHIP / 2 - 10) y = tool._y - CHIP * 1.3;
    if (aTool) place(moving, moving._x, moving._y);
  }
  if (!aTool) removeChip(moving);
  if (!bTool) removeChip(target);

  const R = items.get(result);
  const el = addChip(result, x, y, 'pop');
  play('combine');

  const isNew = discover(result, [a, b]);
  if (isNew) {
    setTimeout(() => {
      const r = el.getBoundingClientRect();
      sparkleBurst(r.left + r.width / 2, r.top + r.height / 2.6);
      play('discover');
      el.classList.add('is-new');
      setTimeout(() => el.classList.remove('is-new'), 4000);
    }, 160);
    toast({
      kind: 'new',
      art: renderArt(R),
      title: `${t('toast.new')} ${esc(R.name)}`,
      body: esc(R.desc),
      ms: 4200,
    });
  }
  persist();
  onChange({ result, isNew });
}
