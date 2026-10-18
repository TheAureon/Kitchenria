// table.js — the kitchen counter, where you prepare food.
//
// Every thing on the counter is a "chip": one piece of food, or a STACK of several
// (drop food onto food to pile it up — nothing happens to it yet). Then:
//   * drag a hand tool from the wall rail onto the food or stack (knead, chop, whisk…)
//   * or drag the food or stack into an appliance (pot, pan, oven…) or onto the plate
//   * tap instead of drag: tap food to pick it up, then tap a tool, an appliance or more food
//   * double-click a stack to spread it out again; double-click single food to copy it
//   * drag food back onto the pantry to put it away; keyboard: Enter, arrows, Delete, Escape

import { getItem, db } from './data.js';
import { state, save } from './state.js';
import { renderArt, renderArtRaw } from './doodle.js';
import { play } from './audio.js';
import { t } from './i18n.js';
import { toast, bounce, esc } from './effects.js';
import { shelfRect } from './shelf.js';

let CHIP = 96;            // chip size in px (read from --chip in the CSS)
const SNAP = 56;          // how close (px) food must be dropped to stack
const TOOL_SNAP = 70;     // how close a hand tool must be dropped to use it
let tableEl, layerEl, hintEl;
let hooks = {};
const chips = new Set();
let selected = null;      // chip picked up by tap/keyboard
let drag = null;          // the drag in progress, if any

/**
 * @param {object} h  hooks from main.js:
 *   useTool(toolId, ids, op) → cooking result     handActions(ids) → hand actions that make sense
 *   celebrate(result, chipEl)
 *   applianceAt(x, y) → id     dropInAppliance(id, ids) → bool     highlightAppliance(id)
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
  for (const c of state.table) {
    const ids = (c.ids || [c.id]).filter((id) => getItem(id));
    if (ids.length) addChip(ids, c.x * r.width, c.y * r.height);
  }
  updateHint();
}

// ---------- chips ----------

const idsOf = (el) => el._ids;
const nameOf = (ids) => ids.map((id) => getItem(id).name).join(' + ');

function stackArt(ids) {
  // up to four pieces of food piled on top of each other
  const show = ids.slice(-4);
  return `<span class="stack-art">${show.map((id, i) => `<span class="stack-layer" style="--i:${i};--n:${show.length}">${renderArt(getItem(id))}</span>`).join('')}</span>`;
}

function makeChipEl(ids) {
  const el = document.createElement('button');
  el.type = 'button';
  el._ids = ids;
  const one = ids.length === 1 ? getItem(ids[0]) : null;
  el.className = `chip${one ? ` kind-${one.kind}${one.sig ? ' is-sig' : ''}` : ' is-stack'}`;
  el.dataset.id = ids.join(',');
  const name = one ? one.name : nameOf(ids);
  el.setAttribute('aria-label', t(one ? 'chip.label' : 'chip.stackLabel', { name }));
  el.title = one ? `${one.name} — ${one.desc}` : name;
  el.innerHTML = `<span class="chip-art">${one ? renderArt(one) : stackArt(ids)}</span><span class="chip-name">${esc(one ? name : t('chip.stackName', { n: ids.length }))}</span>`
    + (one ? '' : `<span class="stack-list">${ids.map((id) => `<span>${esc(getItem(id).name)}</span>`).join('')}</span>`);
  el.dataset.newLabel = t('shelf.new');
  el.style.setProperty('--blink', `${(-Math.random() * 6).toFixed(2)}s`); // faces don't all blink together
  return el;
}

function wireChip(el) {
  el.addEventListener('pointerdown', onChipDown);
  el.addEventListener('click', onChipClick);
  el.addEventListener('dblclick', () => {
    select(null);
    const ids = idsOf(el);
    if (ids.length > 1) { // spread a stack out again
      const { _x: x, _y: y } = el;
      removeChip(el, false);
      ids.forEach((id, i) => addChip([id], x + (i - (ids.length - 1) / 2) * CHIP * 0.9, y + (i % 2) * 20, 'pop'));
      play('poof');
    } else {
      addChip(ids, el._x + 30, el._y + 24, 'pop');
      play('pick');
    }
    persist();
  });
  tableEl.appendChild(el);
  chips.add(el);
}

function addChip(ids, x, y, anim = '') {
  const el = makeChipEl(ids);
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
  state.table = [...chips].map((c) => ({ ids: idsOf(c), x: +(c._x / w).toFixed(4), y: +(c._y / h).toFixed(4) }));
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

/** Puts an ingredient from the pantry on the counter (tap / Enter on a pantry tile). */
export function placeFromShelf(id) {
  if (selected) { // tapping an ingredient while holding food stacks it on top
    const target = selected;
    select(null);
    stackOnto(target, [id]);
    return target;
  }
  const [x, y] = freeSpot();
  const el = addChip([id], x, y, 'pop');
  play('drop');
  persist();
  return el;
}

/** Puts food on the counter just below a screen rectangle (an appliance), e.g. a fresh result. */
export function placeBelow(rect, ids, anim = 'pop') {
  const tr = tableEl.getBoundingClientRect();
  const cx = rect ? rect.left + rect.width / 2 - tr.left : tr.width / 2;
  const [x, y] = freeSpot(cx, CHIP * 0.65);
  const el = addChip(ids, x, y, anim);
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

/** Hands over the picked-up food (for tapping an appliance after tapping food). */
export function takeSelected() {
  if (!selected) return null;
  const el = selected;
  select(null);
  removeChip(el);
  persist();
  return idsOf(el);
}

// ---------- stacking ----------

function stackOnto(target, ids) {
  const merged = [...idsOf(target), ...ids];
  const limit = db.kitchen.stackLimit || 6;
  if (merged.length > limit) {
    bounce(target, 'wiggle');
    play('nope');
    toast({ body: t('toast.stackFull', { n: limit }), kind: 'soft', ms: 1800 });
    return false;
  }
  const { _x: x, _y: y } = target;
  removeChip(target, false);
  const el = addChip(merged, x, y, 'squash');
  play('drop');
  persist();
  return el;
}

// ---------- using a hand tool on food ----------

function useToolOn(toolId, chip) {
  const tool = db.handTools.find((x) => x.id === toolId);
  if (tool?.menu) {
    // the hands can do lots of things: offer the ones that make sense for this food
    const actions = hooks.handActions?.(idsOf(chip)) || [tool.op];
    if (actions.length === 1) return applyTool(toolId, chip, actions[0]);
    return showHandMenu(toolId, chip, actions);
  }
  applyTool(toolId, chip, tool.op);
}

function applyTool(toolId, chip, op) {
  if (!chips.has(chip)) return;
  const res = hooks.useTool?.(toolId, idsOf(chip), op);
  if (!res) return;
  const { _x: x, _y: y } = chip;
  removeChip(chip, false);
  const el = addChip([res.item.id], x, y, 'pop');
  persist();
  hooks.celebrate?.(res, el);
}

let menuEl = null;
function closeHandMenu() {
  if (!menuEl) return;
  menuEl.remove();
  menuEl = null;
  window.removeEventListener('pointerdown', onOutside, true);
}
function onOutside(e) { if (menuEl && !menuEl.contains(e.target)) closeHandMenu(); }

/** A little bubble next to the food with the hand actions to choose from. */
function showHandMenu(toolId, chip, actions) {
  closeHandMenu();
  menuEl = document.createElement('div');
  menuEl.className = 'hand-menu';
  menuEl.setAttribute('role', 'menu');
  menuEl.setAttribute('aria-label', t('hand.title'));
  menuEl.innerHTML = `<p class="hand-menu-title">${esc(t('hand.title'))}</p>`
    + actions.map((op) => `<button type="button" role="menuitem" data-op="${op}">${esc(t(`hand.${op}`))}</button>`).join('')
    + `<button type="button" role="menuitem" class="hand-cancel" data-op="">${esc(t('hand.cancel'))}</button>`;
  // place it beside the food, flipped to the left near the right edge
  const flip = chip._x > tableEl.clientWidth - 220;
  menuEl.style.left = `${flip ? chip._x - CHIP * 0.55 : chip._x + CHIP * 0.55}px`;
  menuEl.style.top = `${Math.max(8, chip._y - CHIP * 0.6)}px`;
  if (flip) menuEl.classList.add('flip');
  menuEl.addEventListener('click', (e) => {
    const b = e.target.closest('[data-op]');
    if (!b) return;
    const op = b.dataset.op;
    closeHandMenu();
    if (op) applyTool(toolId, chip, op); else chip.focus();
  });
  menuEl.addEventListener('keydown', (e) => {
    const items = [...menuEl.querySelectorAll('button')];
    const i = items.indexOf(document.activeElement);
    if (e.key === 'Escape') { e.preventDefault(); closeHandMenu(); chip.focus(); }
    else if (e.key === 'ArrowDown') { e.preventDefault(); items[(i + 1) % items.length].focus(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); items[(i - 1 + items.length) % items.length].focus(); }
  });
  tableEl.appendChild(menuEl);
  play('pick');
  menuEl.querySelector('button').focus({ preventScroll: true });
  setTimeout(() => window.addEventListener('pointerdown', onOutside, true), 0);
}

/** Tapping a hand tool on the rail: uses it on the picked-up food. */
export function useOnSelected(toolId, btn) {
  if (!selected) {
    if (btn) bounce(btn, 'wiggle');
    toast({ body: t('handtool.hint', { tool: t(`tool.${toolId}`) }), kind: 'soft', ms: 2200 });
    return;
  }
  const chip = selected;
  select(null);
  useToolOn(toolId, chip);
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
  if (stackOnto(el, idsOf(other))) { removeChip(other, false); persist(); }
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
// everything. The real chip waits, faded, and moves at the end. Three kinds of drag:
// food from the counter, an ingredient from the pantry, and a hand tool from the rail.

function onChipDown(e) {
  if (e.button > 0) return;
  closeHandMenu();
  const el = e.currentTarget;
  el._justDragged = false;
  const r = el.getBoundingClientRect();
  drag = {
    kind: 'food', src: el, ids: idsOf(el), ghost: null, started: false,
    startX: e.clientX, startY: e.clientY, pointerId: e.pointerId,
    offX: e.clientX - (r.left + r.width / 2), offY: e.clientY - (r.top + r.height / 2),
  };
}

/** Called by the pantry once the player starts pulling an ingredient out. */
export function beginShelfDrag(id, e) {
  if (selected) select(null);
  drag = { kind: 'food', src: null, ids: [id], ghost: makeGhost([id]), started: true, pointerId: e.pointerId, offX: 0, offY: 0 };
  moveGhost(e.clientX, e.clientY);
  play('pick');
}

/** Called by the wall rail once the player starts pulling a hand tool down. */
export function beginToolDrag(toolId, e, onDone) {
  const tool = db.handTools.find((x) => x.id === toolId);
  const g = document.createElement('div');
  g.className = 'tool-ghost';
  g.innerHTML = renderArtRaw(tool.art, tool.id, 'tool');
  layerEl.appendChild(g);
  drag = { kind: 'tool', toolId, ghost: g, started: true, pointerId: e.pointerId, offX: 0, offY: 0, onDone };
  moveGhost(e.clientX, e.clientY);
  play('pick');
}

function makeGhost(ids) {
  const g = makeChipEl(ids);
  g.classList.add('dragging');
  g.tabIndex = -1;
  g.setAttribute('aria-hidden', 'true');
  layerEl.appendChild(g);
  return g;
}

function startDrag() {
  drag.started = true;
  if (selected) select(null);
  drag.ghost = makeGhost(drag.ids);
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

function nearestChip(x, y, except, radius = SNAP) {
  let best = null, bestD = radius;
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
  if (drag.kind === 'tool') {
    // the business end of a tool is roughly where the pointer is
    const [x, y, inside] = toTable(e.clientX, e.clientY);
    setHover(inside ? nearestChip(x, y, null, TOOL_SNAP) : null);
    return;
  }
  const appliance = hooks.applianceAt?.(e.clientX, e.clientY);
  hooks.highlightAppliance?.(appliance);
  const [x, y, inside] = toTable(e.clientX - drag.offX, e.clientY - drag.offY);
  setHover(!appliance && inside ? nearestChip(x, y, drag.src) : null);
}

function onUp(e) {
  if (!drag || e.pointerId !== drag.pointerId) return;
  const d = drag; drag = null;
  if (!d.started) return; // it was a tap: the click handler deals with it
  setHover(null);
  hooks.highlightAppliance?.(null);
  d.ghost.remove();
  if (d.kind === 'tool') { d.onDone?.(); return dropTool(d, e); }
  if (d.src) {
    d.src.classList.remove('lifted');
    d.src._justDragged = true; // so the click that follows a drag is ignored
    setTimeout(() => { if (d.src) d.src._justDragged = false; }, 60);
  }
  if (e.type === 'pointercancel') return;

  // 1. into an appliance (or onto the plate)?
  const appliance = hooks.applianceAt?.(e.clientX, e.clientY);
  if (appliance) {
    if (hooks.dropInAppliance?.(appliance, d.ids)) { if (d.src) { removeChip(d.src, false); persist(); } }
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

  // 3. onto other food: stack it. Otherwise just put it down.
  const target = nearestChip(x, y, d.src);
  if (target) {
    if (stackOnto(target, d.ids) && d.src) { removeChip(d.src, false); persist(); }
    else if (d.src) bounce(d.src, 'wiggle');
    return;
  }
  const el = d.src || addChip(d.ids, x, y);
  place(el, x, y);
  bounce(el, 'squash');
  play('drop');
  persist();
}

function dropTool(d, e) {
  if (e.type === 'pointercancel') return;
  const [x, y, inside] = toTable(e.clientX, e.clientY);
  const target = inside ? nearestChip(x, y, null, TOOL_SNAP) : null;
  if (!target) { play('poof'); return; } // the tool just goes back on its hook
  useToolOn(d.toolId, target);
}
