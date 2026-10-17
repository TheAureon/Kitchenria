// appliances.js — the big cooking tools along the back of the counter.
//
// Drop food (or a whole stack) into the pot, pan, oven… and it cooks straight away;
// the result pops out onto the counter below. The plate is different: it collects
// up to four things, and its Serve button calls the critic.

import { db, getItem, toolById } from './data.js';
import { state, save } from './state.js';
import { renderArt, renderArtRaw } from './doodle.js';
import { t } from './i18n.js';
import { play } from './audio.js';
import { bounce, toast, esc } from './effects.js';

let stripEl;
let hooks = {};
const busy = new Set();
const SOUND = { boil: 'bubble', fry: 'sizzle', bake: 'ding', blend: 'whirr', grill: 'sizzle', steam: 'bubble', freeze: 'freeze', marinate: 'stir', age: 'ding', plate: 'drop' };

/**
 * @param {object} h  hooks from main.js:
 *   takeSelected() → ids of the food picked up on the counter (and removes it), or null
 *   cook(applianceId, op, items) cooks and shows the result
 *   serve(ids)                   plates and calls the critic
 *   returnToCounter(applianceId, id)
 */
export function initAppliances(h) {
  hooks = h;
  stripEl = document.getElementById('appliances');
  render();
}

export function render() {
  stripEl.replaceChildren(...db.appliances.map(build));
}

function build(tool) {
  const el = document.createElement('div');
  el.className = `appliance op-${tool.op}`;
  el.dataset.tool = tool.id;
  const name = t(`tool.${tool.id}`);
  const isPlate = tool.op === 'plate';
  const items = isPlate ? state.plate : [];
  const slots = isPlate ? Array.from({ length: tool.slots }, (_, i) => {
    const it = items[i] && getItem(items[i]);
    return it
      ? `<button type="button" class="slot full" data-index="${i}" aria-label="${esc(t('tool.slotLabel', { name: it.name, tool: name }))}" title="${esc(it.name)}">${renderArt(it)}</button>`
      : '<span class="slot" aria-hidden="true"></span>';
  }).join('') : '';
  el.innerHTML = `
    <button type="button" class="appliance-drop" aria-label="${esc(t(isPlate ? 'plate.label' : 'appliance.label', { tool: name, verb: t('verb.' + tool.op), n: items.length, max: tool.slots || 0 }))}">
      <span class="appliance-art">${renderArtRaw(tool.art, tool.id, 'tool')}</span><span class="appliance-name">${esc(name)}</span>
    </button>
    ${isPlate ? `<div class="plate-slots">${slots}</div><button type="button" class="serve-btn" ${items.length ? '' : 'disabled'}>${esc(t('verb.plate'))}!</button>`
      : `<span class="appliance-verb">${esc(t('verb.' + tool.op))}</span>`}`;

  el.querySelector('.appliance-drop').addEventListener('click', () => {
    const ids = hooks.takeSelected?.();
    if (ids) drop(tool.id, ids);
    else { bounce(el, 'wiggle'); toast({ body: t('appliance.hint', { tool: name }), kind: 'soft', ms: 1800 }); }
  });
  el.querySelectorAll('.slot.full').forEach((b) => b.addEventListener('click', () => {
    const [id] = state.plate.splice(+b.dataset.index, 1);
    save();
    play('pick');
    hooks.returnToCounter?.(tool.id, id);
    refresh(tool.id);
  }));
  el.querySelector('.serve-btn')?.addEventListener('click', () => {
    const ids = state.plate.splice(0);
    save();
    play('serve');
    refresh(tool.id);
    hooks.serve?.(ids);
  });
  return el;
}

function refresh(toolId) {
  const old = stripEl.querySelector(`[data-tool="${toolId}"]`);
  const focusSel = old?.contains(document.activeElement) ? '.appliance-drop' : null;
  const el = build(toolById(toolId));
  old?.replaceWith(el);
  if (focusSel) el.querySelector(focusSel)?.focus();
  return el;
}

/** Food dropped into an appliance. Returns false if it can't go in. */
export function drop(toolId, ids) {
  const tool = toolById(toolId);
  if (!tool || busy.has(toolId)) return false;
  if (tool.op === 'plate') {
    if (state.plate.length + ids.length > tool.slots) {
      bounce(stripEl.querySelector(`[data-tool="${toolId}"]`), 'wiggle');
      play('nope');
      toast({ body: t('plate.full'), kind: 'soft', ms: 1800 });
      return false;
    }
    state.plate.push(...ids);
    save();
    play('drop');
    bounce(refresh(toolId), 'squash');
    return true;
  }
  // everything else cooks right away (hold on to the food itself while it cooks)
  const items = ids.map(getItem).filter(Boolean);
  busy.add(toolId);
  const el = stripEl.querySelector(`[data-tool="${toolId}"]`);
  el.classList.add('cooking');
  play(SOUND[tool.op] || 'combine');
  setTimeout(() => {
    busy.delete(toolId);
    el.classList.remove('cooking');
    hooks.cook?.(toolId, tool.op, items);
  }, 850);
  return true;
}

/** Which appliance is under a screen position (for drag and drop)? */
export function applianceAt(x, y) {
  const strip = stripEl.getBoundingClientRect();
  if (x < strip.left || x > strip.right || y < strip.top || y > strip.bottom) return null;
  for (const el of stripEl.querySelectorAll('.appliance')) {
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

export function applianceRect(toolId) {
  return stripEl.querySelector(`[data-tool="${toolId}"]`)?.getBoundingClientRect();
}
