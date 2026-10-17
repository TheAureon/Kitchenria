// stations.js — the cooking tools along the back of the counter.
//
// Drop food into a tool. The knife works straight away; the other tools collect up to
// a few things and cook them when you press their button (Boil!, Fry!, Bake!…).
// The plate's button is "Serve", which calls the critic.
// Tools that are still locked show which chef rank opens them.

import { db, getItem, toolById } from './data.js';
import { state, save } from './state.js';
import { isToolUnlocked } from './progress.js';
import { renderArt, renderArtRaw } from './doodle.js';
import { t } from './i18n.js';
import { play } from './audio.js';
import { bounce, toast, esc } from './effects.js';

let stripEl;
let hooks = {};
const busy = new Set();

const SOUND = { chop: 'chop', boil: 'bubble', fry: 'sizzle', bake: 'ding', mix: 'stir', plate: 'serve', blend: 'whirr', grind: 'grind', freeze: 'freeze', grill: 'sizzle', marinate: 'stir', steam: 'bubble', age: 'ding' };

/**
 * @param {object} h  hooks from main.js:
 *   takeSelected() → id of the food picked up on the counter (and removes it), or null
 *   returnToCounter(toolId, itemId)   puts food back on the counter near a tool
 *   cook(toolId, op, ids)             cooks and shows the result
 *   serve(ids)                        plates and calls the critic
 */
export function initStations(h) {
  hooks = h;
  stripEl = document.getElementById('stations');
  render();
}

export function render() {
  stripEl.replaceChildren(...db.tools.map(build));
}

function build(tool) {
  const el = document.createElement('div');
  el.className = `station op-${tool.op}`;
  el.dataset.tool = tool.id;
  const name = t(`tool.${tool.id}`);
  const art = renderArtRaw(tool.art, tool.id, 'tool');
  if (!isToolUnlocked(tool)) {
    el.classList.add('locked');
    el.innerHTML = `<div class="station-drop" aria-hidden="true"><span class="station-art">${art}</span><span class="station-name">${esc(name)}</span></div>
      <span class="station-lock">${esc(t('tool.locked', { n: tool.rank }))}</span>`;
    el.setAttribute('aria-label', `${name}: ${t('tool.locked', { n: tool.rank })}`);
    el.setAttribute('role', 'group');
    return el;
  }
  const items = (state.stations[tool.id] ||= []);
  const slots = Array.from({ length: tool.slots }, (_, i) => {
    const it = items[i] && getItem(items[i]);
    return it
      ? `<button type="button" class="slot full" data-index="${i}" aria-label="${esc(t('tool.slotLabel', { name: it.name, tool: name }))}" title="${esc(it.name)}">${renderArt(it)}</button>`
      : `<span class="slot" aria-hidden="true"></span>`;
  }).join('');
  el.innerHTML = `
    <button type="button" class="station-drop" aria-label="${esc(t('tool.label', { tool: name, n: items.length, max: tool.slots }))}">
      <span class="station-art">${art}</span><span class="station-name">${esc(name)}</span>
    </button>
    ${tool.instant ? '' : `<div class="station-slots">${slots}</div>`}
    ${tool.instant ? `<span class="station-hint">${esc(t('verb.' + tool.op))}!</span>` : `<button type="button" class="station-go" ${items.length ? '' : 'disabled'}>${esc(t('verb.' + tool.op))}!</button>`}`;

  el.querySelector('.station-drop').addEventListener('click', () => {
    const id = hooks.takeSelected?.();
    if (id) add(tool.id, id);
    else { bounce(el, 'wiggle'); toast({ body: t('tool.empty'), kind: 'soft', ms: 1400 }); }
  });
  el.querySelectorAll('.slot.full').forEach((b) => b.addEventListener('click', () => {
    if (busy.has(tool.id)) return;
    const [id] = items.splice(+b.dataset.index, 1);
    save();
    play('pick');
    hooks.returnToCounter?.(tool.id, id);
    refresh(tool.id);
  }));
  el.querySelector('.station-go')?.addEventListener('click', () => run(tool.id));
  return el;
}

function refresh(toolId) {
  const old = stripEl.querySelector(`[data-tool="${toolId}"]`);
  const hadFocus = old?.contains(document.activeElement) ? (document.activeElement.classList.contains('station-go') ? '.station-go' : '.station-drop') : null;
  const el = build(toolById(toolId));
  old?.replaceWith(el);
  if (hadFocus) (el.querySelector(hadFocus) && !el.querySelector(hadFocus).disabled ? el.querySelector(hadFocus) : el.querySelector('.station-drop'))?.focus();
  return el;
}

/** Puts food into a tool. Returns false if it can't go in (locked, full or busy). */
export function add(toolId, itemId) {
  const tool = toolById(toolId);
  const el = stripEl.querySelector(`[data-tool="${toolId}"]`);
  if (!tool || !isToolUnlocked(tool) || busy.has(toolId)) return false;
  const items = (state.stations[toolId] ||= []);
  if (items.length >= tool.slots) {
    bounce(el, 'wiggle');
    play('nope');
    toast({ body: t('tool.full', { tool: t(`tool.${toolId}`) }), kind: 'soft', ms: 1600 });
    return false;
  }
  items.push(itemId);
  save();
  play('drop');
  const fresh = refresh(toolId);
  bounce(fresh, 'squash');
  if (tool.instant) run(toolId);
  return true;
}

/** Cooks whatever is inside a tool. */
export function run(toolId) {
  const tool = toolById(toolId);
  const items = state.stations[toolId] || [];
  if (busy.has(toolId)) return;
  if (!items.length) { toast({ body: t('tool.nothing', { tool: t(`tool.${toolId}`) }), kind: 'soft', ms: 1600 }); return; }
  busy.add(toolId);
  const el = stripEl.querySelector(`[data-tool="${toolId}"]`);
  el.classList.add('cooking');
  el.querySelector('.station-go')?.setAttribute('disabled', '');
  play(SOUND[tool.op] || 'combine');
  setTimeout(() => {
    busy.delete(toolId);
    const ids = items.splice(0);
    save();
    refresh(toolId);
    if (tool.op === 'plate') hooks.serve?.(ids);
    else hooks.cook?.(toolId, tool.op, ids);
  }, tool.instant ? 280 : 850);
}

/** Which unlocked tool is under a screen position (for drag and drop)? */
export function stationAt(x, y) {
  const strip = stripEl.getBoundingClientRect();
  if (x < strip.left || x > strip.right || y < strip.top || y > strip.bottom) return null;
  for (const el of stripEl.querySelectorAll('.station:not(.locked)')) {
    const r = el.getBoundingClientRect();
    if (x >= r.left - 4 && x <= r.right + 4 && y >= r.top - 6 && y <= r.bottom + 6) return el.dataset.tool;
  }
  return null;
}

let hovered = null;
export function highlight(toolId) {
  if (hovered === toolId) return;
  stripEl.querySelector(`[data-tool="${hovered}"]`)?.classList.remove('target');
  hovered = toolId;
  if (toolId) stripEl.querySelector(`[data-tool="${toolId}"]`)?.classList.add('target');
}

/** Screen rectangle of a tool, so results can pop out right below it. */
export function stationRect(toolId) {
  return stripEl.querySelector(`[data-tool="${toolId}"]`)?.getBoundingClientRect();
}
