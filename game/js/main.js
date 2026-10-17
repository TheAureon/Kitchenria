// main.js — starts the game: loads text, ingredients and tools, restores the save,
// then wires the pantry, the counter, the cooking tools, the critic and the top bar together.

import { loadLanguage, applyToPage, t } from './i18n.js';
import { loadData, getItem } from './data.js';
import { state, loadSave, saveNow } from './state.js';
import { ensureUnlocks, rankPoints, rankCount } from './progress.js';
import { cook as cookItems, serve as serveItems } from './kitchen.js';
import { initShelf, render as renderShelf } from './shelf.js';
import { initTable, beginShelfDrag, placeFromShelf, placeBelow, clearTable, takeSelected } from './table.js';
import { initStations, render as renderStations, add as addToStation, stationAt, highlight, stationRect } from './stations.js';
import { showReview } from './review.js';
import { openCookbook } from './cookbook.js';
import { renderArt } from './doodle.js';
import { setMuted, play } from './audio.js';
import { sparkleBurst, toast, bounce, esc } from './effects.js';

async function boot() {
  await Promise.all([loadLanguage('en'), loadData()]);
  applyToPage();
  loadSave();
  ensureUnlocks();

  initShelf({
    onTileDragStart: (id, e) => beginShelfDrag(id, e),
    onTileActivate: (id) => placeFromShelf(id),
  });
  initTable({
    mix: (a, b) => afterCook(cookItems('mix', [a, b])),
    celebrate,
    stationAt,
    addToStation,
    highlightStation: highlight,
  });
  initStations({
    takeSelected,
    returnToCounter: (toolId, id) => placeBelow(stationRect(toolId), id, 'squash'),
    cook: (toolId, op, ids) => {
      const res = afterCook(cookItems(op, ids));
      if (!res) return;
      const el = placeBelow(stationRect(toolId), res.item.id);
      celebrate(res, el);
    },
    serve: async (ids) => {
      const r = serveItems(ids);
      if (!r) return;
      await showReview(r);
      handleEvents(r.events);
      updateTop();
    },
  });

  // --- top bar ---
  document.getElementById('btn-clear').addEventListener('click', () => clearTable());
  document.getElementById('btn-book').addEventListener('click', () => { play('click'); openCookbook(); });
  document.getElementById('btn-rank').addEventListener('click', () => { play('click'); openCookbook(); });
  const soundBtn = document.getElementById('btn-sound');
  const syncSound = () => {
    setMuted(state.settings.muted);
    soundBtn.setAttribute('aria-pressed', String(!state.settings.muted));
    soundBtn.title = t(state.settings.muted ? 'top.muted' : 'top.sound');
    soundBtn.classList.toggle('off', state.settings.muted);
  };
  soundBtn.addEventListener('click', () => { state.settings.muted = !state.settings.muted; syncSound(); saveNow(); play('click'); });
  syncSound();

  // On phones the pantry can be folded away to make room for the counter.
  document.getElementById('shelf-toggle').addEventListener('click', () => {
    const shelf = document.getElementById('shelf');
    const open = shelf.classList.toggle('folded') === false;
    document.getElementById('shelf-toggle').setAttribute('aria-expanded', String(open));
  });

  updateTop();
  window.addEventListener('pagehide', saveNow);
  document.body.classList.add('ready');
}

/** After anything is cooked: refresh the pantry if it's new, and celebrate points/ranks/badges. */
function afterCook(res) {
  if (!res) return null;
  if (res.isNew) renderShelf();
  handleEvents(res.events);
  return res;
}

/** Sparkles and a message for brand-new creations and classic dishes. */
function celebrate(res, el) {
  if (!res || !el) return;
  if (res.isNew || res.isNewSig) {
    setTimeout(() => {
      const r = el.getBoundingClientRect();
      sparkleBurst(r.left + r.width / 2, r.top + r.height / 2.6, res.isNewSig ? 24 : 14);
      play('discover');
      el.classList.add('is-new');
      setTimeout(() => el.classList.remove('is-new'), 4000);
    }, 160);
    toast({
      kind: res.isNewSig ? 'sig' : 'new',
      art: renderArt(res.item),
      title: `${t(res.isNewSig ? 'toast.newSig' : 'toast.new')} ${esc(res.item.name)}`,
      body: esc(res.item.desc),
      ms: 4200,
    });
  } else {
    bounce(el, 'squash');
  }
}

/** Shows points, rank-ups and badges. */
function handleEvents(events = []) {
  let pts = 0;
  for (const ev of events) {
    if (ev.type === 'points') pts += ev.p;
    if (ev.type === 'rank') {
      play('rankup');
      const list = ev.unlocked.map((u) => (u.kind === 'tool' ? t(`tool.${u.id}`) : t(`pack.${u.id}`))).join(', ');
      toast({ kind: 'sig', title: t('toast.rankUp', { rank: t(`rank.${ev.rank}`) }), body: list ? t('toast.unlocked', { list }) : '', ms: 6000 });
      renderStations();
      renderShelf();
      const r = document.getElementById('btn-rank').getBoundingClientRect();
      sparkleBurst(r.left + r.width / 2, r.top + r.height / 2, 26);
    }
    if (ev.type === 'badge') toast({ kind: 'info', art: `<span class="badge-icon big">${ev.icon}</span>`, title: t('toast.badge', { name: t(`badge.${ev.id}`) }), body: t(`badge.${ev.id}.desc`), ms: 4200 });
  }
  if (pts) floatPoints(pts);
  updateTop();
}

/** A little "+5" that floats up from the rank badge. */
function floatPoints(p) {
  const btn = document.getElementById('btn-rank');
  const r = btn.getBoundingClientRect();
  const s = document.createElement('span');
  s.className = 'float-points';
  s.textContent = `+${p}`;
  s.style.left = `${r.left + r.width / 2}px`;
  s.style.top = `${r.bottom}px`;
  document.getElementById('fx-layer').appendChild(s);
  s.addEventListener('animationend', () => s.remove());
  bounce(btn, 'squash');
}

function updateTop() {
  const creations = state.discovered.filter((id) => getItem(id)?.kind === 'creation').length;
  document.getElementById('creations-text').textContent = t('top.creations', { n: creations });
  document.getElementById('rank-name').textContent = t(`rank.${state.rank}`);
  const lo = rankPoints(state.rank), hi = state.rank < rankCount() ? rankPoints(state.rank + 1) : null;
  document.getElementById('rank-points').textContent = hi ? t('top.points', { p: state.points, next: hi }) : t('top.pointsMax', { p: state.points });
  document.getElementById('rank-bar').style.width = `${hi ? Math.round(((state.points - lo) / (hi - lo)) * 100) : 100}%`;
}

boot().catch((err) => {
  console.error(err);
  document.getElementById('boot-error').hidden = false;
});
