// rack.js — the hand tools hanging on the wall rail: hands, knife, whisk, spoon,
// rolling pin, masher, grater and mortar.
//
// Drag a hand tool down onto food (or onto a stack of food) to use it. Or tap the
// food first and then tap the tool. Hand tools are never used up.

import { db } from './data.js';
import { renderArtRaw } from './doodle.js';
import { t } from './i18n.js';
import { esc } from './effects.js';

let rackEl;
let hooks = {};

/**
 * @param {object} h  hooks: beginToolDrag(toolId, pointerEvent), useOnSelected(toolId)
 */
export function initRack(h) {
  hooks = h;
  rackEl = document.getElementById('rack');
  rackEl.innerHTML = db.handTools.map((tool) => `
    <button type="button" class="hand-tool" data-tool="${tool.id}" aria-label="${esc(tool.menu ? t('handtool.handsLabel') : t('handtool.label', { tool: t(`tool.${tool.id}`), verb: t(`verb.${tool.op}`) }))}">
      <span class="hook" aria-hidden="true"></span>
      <span class="hand-tool-art">${renderArtRaw(tool.art, tool.id, 'tool')}</span>
      <span class="hand-tool-name">${esc(tool.menu ? t(`tool.${tool.id}`) : t(`verb.${tool.op}`))}</span>
    </button>`).join('');

  // a short move starts a drag; on touch screens the rail scrolls sideways, so only a downward pull drags
  let pending = null;
  rackEl.addEventListener('pointerdown', (e) => {
    const b = e.target.closest('.hand-tool');
    if (!b || e.button > 0) return;
    delete b.dataset.dragged;
    pending = { id: b.dataset.tool, x: e.clientX, y: e.clientY, b, pointerId: e.pointerId };
  });
  window.addEventListener('pointermove', (e) => {
    if (!pending || e.pointerId !== pending.pointerId) return;
    const dx = Math.abs(e.clientX - pending.x), dy = Math.abs(e.clientY - pending.y);
    if (Math.hypot(dx, dy) < 7) return;
    if (e.pointerType !== 'mouse' && dx > dy) { pending = null; return; }
    const p = pending; pending = null;
    p.b.dataset.dragged = '1';
    p.b.classList.add('in-use');
    hooks.beginToolDrag?.(p.id, e, () => {
      p.b.classList.remove('in-use');
      setTimeout(() => delete p.b.dataset.dragged, 60); // only the click right after the drag is ignored
    });
  });
  const end = () => { pending = null; };
  window.addEventListener('pointerup', end);
  window.addEventListener('pointercancel', end);
  rackEl.addEventListener('click', (e) => {
    const b = e.target.closest('.hand-tool');
    if (!b) return;
    if (b.dataset.dragged) { delete b.dataset.dragged; return; }
    hooks.useOnSelected?.(b.dataset.tool, b);
  });
}
