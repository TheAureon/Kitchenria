// visitors.js — friends who knock at the window every few minutes and ask for something
// ("Something warm, please!"). Drag a dish onto them (or tap the dish, then tap them).
// If it fits they're delighted and leave hearts (and, after a few visits, a special
// decoration). If not, they just give a gentle hint. They wait as long as you like.

import { state } from './state.js';
import { db, getItem } from './data.js';
import { tick, newVisit, fits, visitHappy, dailyEvent } from './cozy.js';
import { animalFace } from './animals.js';
import { t } from './i18n.js';
import { play } from './audio.js';
import { esc, toast, bounce } from './effects.js';

let el;
let hooks = {};
let mood = 'wait';
let say = null;          // a temporary line instead of the wish
let sayTimer = null;

const nameOf = (id) => t(`visitor.${id}`);
export function wishText(wish) {
  if (wish.startsWith('with:')) return t('wish.with', { x: db.engine.ING.get(wish.slice(5))?.name.toLowerCase() || wish.slice(5) });
  return t(`wish.${wish}`);
}

/**
 * @param {object} h  hooks: selectedIds() → ids of the food picked up, removeSelected(),
 *                    isPaused() → true while the title screen shows, onHappy(result), onDaily()
 */
export function initVisitors(h) {
  hooks = h;
  el = document.getElementById('visitor');
  render();
  setInterval(() => {
    if (document.hidden || hooks.isPaused?.()) return;
    if (tick(5)) arrive();
  }, 5000);
  window.addEventListener('resize', position);
  // test helper: ?visitnow (or ?visitnow=warm) brings a friend straight away
  const m = location.search.match(/[?&]visitnow(?:=([\w:]+))?/);
  if (m) setTimeout(() => { if (!state.visitor) arrive({ id: 'hedgehog', wish: m[1] || 'warm' }); }, 1200);
}

function arrive(force) {
  newVisit(force);
  mood = 'wait'; say = null;
  render();
  play('knock');
  bounce(el, 'pop');
  toast({ kind: 'soft', body: esc(t('visitor.arrived', { name: nameOf(state.visitor.id) })), ms: 3000 });
}

function render() {
  const v = state.visitor;
  if (!v) { el.hidden = true; el.innerHTML = ''; return; }
  el.hidden = false;
  el.innerHTML = `
    <button type="button" class="visitor-btn" aria-label="${esc(t('visitor.label', { name: nameOf(v.id), wish: wishText(v.wish) }))}">
      <span class="visitor-face">${animalFace(v.id, mood)}</span>
    </button>
    <div class="visitor-bubble" aria-live="polite"><strong>${esc(nameOf(v.id))}</strong><span>${esc(say || wishText(v.wish))}</span></div>`;
  el.querySelector('.visitor-btn').addEventListener('click', () => {
    const ids = hooks.selectedIds?.();
    if (!ids) { speak(t('visitor.howTo'), 'wait', 3200); return; }
    if (give(ids)) hooks.removeSelected?.();
  });
  position();
}

/** Peeks in through the kitchen window; on phones (no window) sits at the corner of the counter. */
function position() {
  if (!state.visitor) return;
  const scene = document.querySelector('.scene').getBoundingClientRect();
  const win = document.querySelector('.window-wrap');
  const wr = win && win.offsetParent ? win.getBoundingClientRect() : null;
  if (wr && wr.width > 40) {
    el.classList.remove('corner');
    el.style.left = `${wr.left - scene.left + wr.width * 0.08}px`;
    el.style.top = `${wr.top - scene.top + wr.height * 0.08}px`;
    el.style.setProperty('--face', `${Math.round(wr.height * 0.78)}px`);
  } else {
    el.classList.add('corner');
    const table = document.getElementById('table').getBoundingClientRect();
    el.style.left = '10px';
    el.style.top = `${table.top - scene.top + 8}px`;
    el.style.setProperty('--face', '64px');
  }
}

function speak(text, m, ms) {
  say = text; mood = m;
  render();
  clearTimeout(sayTimer);
  sayTimer = setTimeout(() => { say = null; mood = 'wait'; render(); }, ms);
}

/** Is a screen position over the visiting friend? (for drag and drop) */
export function visitorAt(x, y) {
  if (!state.visitor || el.hidden) return false;
  const r = el.querySelector('.visitor-btn')?.getBoundingClientRect();
  return !!r && x >= r.left - 10 && x <= r.right + 10 && y >= r.top - 10 && y <= r.bottom + 10;
}

/** Offers food to the friend. Returns true if they took it. */
export function give(ids) {
  const v = state.visitor;
  if (!v) return false;
  if (ids.length > 1) { play('nope'); speak(t('visitor.oneThing'), 'hmm', 3000); return false; }
  const item = getItem(ids[0]);
  if (!item) return false;
  if (item.kind === 'ingredient') { play('nope'); speak(t('visitor.cookFirst'), 'hmm', 3200); return false; }
  if (!fits(v.wish, item)) {
    play('nope');
    const base = v.wish.startsWith('with:') ? 'with' : v.wish;
    speak(t(`hint.${base}`, { x: v.wish.startsWith('with:') ? db.engine.ING.get(v.wish.slice(5))?.name.toLowerCase() : '' }), 'hmm', 3800);
    return false;
  }
  // a happy friend!
  const name = nameOf(v.id);
  const res = visitHappy(item);
  clearTimeout(sayTimer);
  state.visitor = v; // keep them on screen for their thank-you
  say = t('visitor.thanks', { dish: item.name }); mood = 'happy';
  render();
  state.visitor = null;
  play('discover');
  hearts();
  toast({ kind: 'sig', title: t('visitor.gotHearts', { n: res.hearts }), body: esc(t('visitor.gotHeartsFrom', { name })), ms: 3600 });
  if (res.decor) setTimeout(() => toast({ kind: 'sig', title: t('visitor.gift', { name }), body: esc(t(`decor.${res.decor}`)), ms: 5200 }), 900);
  if (dailyEvent({ type: 'visitor' })) hooks.onDaily?.();
  hooks.onHappy?.(res);
  setTimeout(() => { el.classList.add('leaving'); setTimeout(() => { el.classList.remove('leaving'); render(); }, 600); }, 3200);
  return true;
}

function hearts() {
  const r = el.getBoundingClientRect();
  const layer = document.getElementById('fx-layer');
  for (let i = 0; i < 7; i++) {
    const s = document.createElement('span');
    s.className = 'float-heart';
    s.textContent = '♥';
    s.style.left = `${r.left + r.width * (0.2 + Math.random() * 0.6)}px`;
    s.style.top = `${r.top + r.height * 0.4}px`;
    s.style.setProperty('--dx', `${(Math.random() - 0.5) * 80}px`);
    s.style.animationDelay = `${i * 0.08}s`;
    s.addEventListener('animationend', () => s.remove());
    layer.appendChild(s);
  }
}

export const isVisiting = () => !!state.visitor;
