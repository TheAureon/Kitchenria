// daily.js — the little recipe card pinned to the top bar: one gentle goal a day
// ("Cook something with apple", "Use the whisk"…). Finishing it gives hearts ♥.

import { db } from './data.js';
import { dailyCard } from './cozy.js';
import { t } from './i18n.js';
import { play } from './audio.js';
import { esc, toast, sparkleBurst } from './effects.js';

let pop = null;

export function dailyText() {
  const c = dailyCard();
  if (c.id === 'with') return t('daily.with', { x: db.engine.ING.get(c.param)?.name.toLowerCase() || c.param });
  if (c.id === 'tool') return t('daily.tool', { tool: t(`tool.${c.param}`) });
  if (c.id === 'wish') return t('daily.wish', { x: t(`dailyWish.${c.param}`) });
  return t(`daily.${c.id}`);
}

export function initDaily() {
  const btn = document.getElementById('btn-daily');
  btn.addEventListener('click', (e) => { e.stopPropagation(); play('click'); pop ? close() : open(); });
  refresh();
}

function refresh() {
  const btn = document.getElementById('btn-daily');
  const done = dailyCard().done;
  btn.classList.toggle('done', done);
  btn.title = `${t('daily.title')}: ${dailyText()}`;
  btn.setAttribute('aria-label', `${t('daily.title')}: ${dailyText()}${done ? ` — ${t('daily.done')}` : ''}`);
}

function open() {
  const btn = document.getElementById('btn-daily');
  const c = dailyCard();
  pop = document.createElement('div');
  pop.className = 'daily-pop';
  pop.setAttribute('role', 'dialog');
  pop.setAttribute('aria-label', t('daily.title'));
  pop.innerHTML = `<p class="daily-title">${esc(t('daily.title'))}</p><p class="daily-goal">${esc(dailyText())}</p>
    <p class="daily-reward">${esc(c.done ? t('daily.done') : t('daily.reward', { n: db.cozy.hearts.daily }))}</p>`;
  const r = btn.getBoundingClientRect();
  pop.style.top = `${r.bottom + 8}px`;
  pop.style.right = `${Math.max(8, innerWidth - r.right)}px`;
  document.body.appendChild(pop);
  setTimeout(() => window.addEventListener('pointerdown', outside, true), 0);
  window.addEventListener('keydown', esc_);
}
function outside(e) { if (pop && !pop.contains(e.target) && !e.target.closest('#btn-daily')) close(); }
function esc_(e) { if (e.key === 'Escape') close(); }
function close() {
  pop?.remove(); pop = null;
  window.removeEventListener('pointerdown', outside, true);
  window.removeEventListener('keydown', esc_);
}

/** Called when the card was just finished. */
export function dailyDone() {
  refresh();
  const r = document.getElementById('btn-daily').getBoundingClientRect();
  sparkleBurst(r.left + r.width / 2, r.top + r.height / 2, 16);
  play('rankup');
  toast({ kind: 'sig', title: t('daily.finished'), body: esc(t('daily.finishedBody', { n: db.cozy.hearts.daily })), ms: 4200 });
}
