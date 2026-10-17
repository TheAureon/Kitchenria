// cookbook.js — the Cookbook: every dish you served (with the critic's review),
// the classic dishes collection, and your chef rank and badges.

import { db, getItem, toolById } from './data.js';
import { state } from './state.js';
import { rankPoints, rankCount } from './progress.js';
import { renderArt, renderArtRaw } from './doodle.js';
import { t } from './i18n.js';
import { esc } from './effects.js';
import { criticFace } from './review.js';

let tab = 'dishes';

export function openCookbook() {
  const dlg = document.getElementById('cookbook');
  dlg.innerHTML = `
    <div class="book">
      <header class="book-head">
        <h2 id="book-title">${esc(t('book.title'))}</h2>
        <form method="dialog"><button class="icon-btn" value="close" aria-label="${esc(t('book.close'))}">✕</button></form>
      </header>
      <div class="book-tabs" role="tablist">
        ${['dishes', 'classics', 'ranks'].map((k) => `<button role="tab" type="button" data-tab="${k}" aria-selected="${tab === k}">${esc(t(`book.${k}`))}</button>`).join('')}
      </div>
      <div class="book-body" role="tabpanel"></div>
    </div>`;
  dlg.setAttribute('aria-labelledby', 'book-title');
  dlg.querySelectorAll('[data-tab]').forEach((b) => b.addEventListener('click', () => { tab = b.dataset.tab; openTab(dlg); }));
  openTab(dlg);
  if (!dlg.open) dlg.showModal();
}

function openTab(dlg) {
  dlg.querySelectorAll('[data-tab]').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.tab === tab)));
  const body = dlg.querySelector('.book-body');
  body.innerHTML = tab === 'dishes' ? dishes() : tab === 'classics' ? classics() : ranks();
  body.querySelectorAll('.dish-card').forEach((c) => c.addEventListener('click', () => {
    const open = c.classList.toggle('open');
    c.setAttribute('aria-expanded', String(open));
  }));
}

const starsText = (s) => '★'.repeat(Math.round(s)) + '☆'.repeat(5 - Math.round(s));

function dishes() {
  const list = Object.entries(state.served).map(([id, rec]) => ({ dish: getItem(id), rec })).filter((d) => d.dish)
    .sort((a, b) => b.rec.last - a.rec.last);
  if (!list.length) return `<p class="book-empty">${criticFace(3)}<span>${esc(t('book.empty'))}</span></p>`;
  return `<div class="dish-grid">${list.map(({ dish, rec }) => `
    <button type="button" class="dish-card" aria-expanded="false">
      <span class="dish-art">${renderArt(dish)}</span>
      <span class="dish-name">${esc(dish.name)}</span>
      <span class="dish-stars" aria-label="${esc(t('review.stars', { s: rec.stars.toFixed(1) }))}">${starsText(rec.stars)} <b>${rec.stars.toFixed(1)}</b></span>
      <span class="dish-more">
        <span class="dish-review">“${esc(rec.review)}”</span>
        <span class="dish-with">${esc(t('book.madeWith', { list: (dish.components || []).map((c) => c.name).join(', ') }))}</span>
      </span>
    </button>`).join('')}</div>`;
}

function classics() {
  const total = db.signatures.length, n = state.signatures.length;
  const pct = Math.round((n / total) * 100);
  return `<p class="book-progress">${esc(t('book.classicsCount', { n, total, pct }))}</p>
    <div class="progress-track"><span style="width:${pct}%"></span></div>
    <div class="classic-grid">${db.signatures.map((s) => {
      const found = state.signatures.includes(s.id);
      // undiscovered classics show only their first letters as a hint: "M_________ P____"
      const hint = s.name.replace(/\p{L}+/gu, (w) => w[0] + '_'.repeat(w.length - 1));
      return `<div class="classic ${found ? 'found' : ''}"><span class="classic-name" ${found ? '' : `aria-label="${esc(t('book.hidden'))}"`}>${esc(found ? s.name : hint)}</span>${found ? `<span class="classic-desc">${esc(s.desc || '')}</span>` : ''}</div>`;
    }).join('')}</div>`;
}

function ranks() {
  const next = state.rank < rankCount() ? rankPoints(state.rank + 1) : null;
  const rows = db.kitchen.ranks.map((rk, i) => {
    const r = i + 1;
    const unlocks = rk.unlock.map((u) => {
      const [kind, id] = u.split(':');
      return kind === 'tool' ? `<span class="unlock">${renderArtRaw(toolById(id).art, id, 'tool')}${esc(t(`tool.${id}`))}</span>` : `<span class="unlock">🧺 ${esc(t(`pack.${id}`))}</span>`;
    }).join('');
    return `<li class="rank-row ${r <= state.rank ? 'reached' : ''} ${r === state.rank ? 'current' : ''}">
      <span class="rank-num">${r}</span><span class="rank-name">${esc(t(`rank.${r}`))}</span><span class="rank-pts">${rk.points}</span>
      <span class="rank-unlocks">${unlocks}</span></li>`;
  }).join('');
  const badges = db.kitchen.badges.map((b) => {
    const got = state.badges.includes(b.id);
    return `<div class="badge ${got ? 'got' : ''}" title="${esc(t(`badge.${b.id}.desc`))}"><span class="badge-icon" aria-hidden="true">${got ? b.icon : '?'}</span>
      <span class="badge-name">${esc(t(`badge.${b.id}`))}</span><span class="badge-desc">${esc(t(`badge.${b.id}.desc`))}</span></div>`;
  }).join('');
  return `<div class="rank-now"><span>${esc(t('book.rankNow'))}</span><strong>${esc(t(`rank.${state.rank}`))}</strong>
      <span>${esc(next ? t('book.nextRank', { rank: t(`rank.${state.rank + 1}`), p: next }) : t('top.pointsMax', { p: state.points }))}</span></div>
    <ol class="rank-list">${rows}</ol>
    <h3>${esc(t('book.badgesCount', { n: state.badges.length, total: db.kitchen.badges.length }))}</h3>
    <div class="badge-grid">${badges}</div>`;
}
