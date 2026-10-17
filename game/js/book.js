// book.js — the Recipe Book: every finished dish you served, with the critic's
// stars and review, plus the collection of classic dishes you've cooked.

import { db } from './data.js';
import { state } from './state.js';
import { renderArt } from './doodle.js';
import { t } from './i18n.js';
import { esc } from './effects.js';
import { criticFace } from './review.js';

let tab = 'dishes';
let sort = 'newest';

export function openBook() {
  const dlg = document.getElementById('book');
  dlg.innerHTML = `
    <div class="book">
      <header class="book-head">
        <h2 id="book-title">${esc(t('book.title'))}</h2>
        <form method="dialog"><button class="icon-btn" value="close" aria-label="${esc(t('book.close'))}">✕</button></form>
      </header>
      <div class="book-tabs" role="tablist">
        ${['dishes', 'classics'].map((k) => `<button role="tab" type="button" data-tab="${k}" aria-selected="${tab === k}">${esc(t(`book.${k}`))}</button>`).join('')}
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
  body.innerHTML = tab === 'dishes' ? dishes() : classics();
  body.querySelectorAll('.dish-card').forEach((c) => c.addEventListener('click', () => {
    const open = c.classList.toggle('open');
    c.setAttribute('aria-expanded', String(open));
  }));
  body.querySelectorAll('[data-sort]').forEach((b) => b.addEventListener('click', () => { sort = b.dataset.sort; openTab(dlg); }));
}

const starsText = (s) => '★'.repeat(Math.round(s)) + '☆'.repeat(5 - Math.round(s));

/** Average stars of everything served (for the top bar too). */
export function bookSummary() {
  const recs = Object.values(state.dishes);
  const avg = recs.length ? recs.reduce((s, r) => s + r.stars, 0) / recs.length : 0;
  return { count: recs.length, avg };
}

function dishes() {
  const recs = Object.values(state.dishes);
  if (!recs.length) return `<p class="book-empty">${criticFace(3)}<span>${esc(t('book.empty'))}</span></p>`;
  recs.sort((a, b) => (sort === 'best' ? b.stars - a.stars : b.last - a.last));
  const { count, avg } = bookSummary();
  return `<div class="book-bar"><span>${esc(t(count === 1 ? 'book.summaryOne' : 'book.summary', { n: count, avg: avg.toFixed(1) }))}</span>
      <span class="book-sort">${['newest', 'best'].map((k) => `<button type="button" data-sort="${k}" aria-pressed="${sort === k}">${esc(t(`book.sort.${k}`))}</button>`).join('')}</span></div>
    <div class="dish-grid">${recs.map(({ dish, stars, review }) => `
    <button type="button" class="dish-card" aria-expanded="false">
      <span class="dish-art">${renderArt(dish)}</span>
      <span class="dish-name">${esc(dish.name)}</span>
      <span class="dish-stars" aria-label="${esc(t('review.stars', { s: stars.toFixed(1) }))}">${starsText(stars)} <b>${stars.toFixed(1)}</b></span>
      <span class="dish-more">
        <span class="dish-review">“${esc(review)}”</span>
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
