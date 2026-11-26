// book.js — the Recipe Book: every finished dish you served, with the critic's
// stars and review, plus the collection of classic dishes you've cooked.

import { db } from './data.js';
import { state, save } from './state.js';
import { renderArt } from './doodle.js';
import { t } from './i18n.js';
import { esc } from './effects.js';
import { criticFace } from './review.js';
import { animalFace, animalSilhouette } from './animals.js';
import { weeklyFavourite, favouriteFound } from './cozy.js';
import { cookHow, howSummary } from './recipes.js';
import { play } from './audio.js';

let tab = 'dishes';
let sort = 'newest';
let classicFilter = 'all';
const sketchCache = new Map(); // classic id -> the dish its recipe makes (for the pencil sketch)

export function openBook() {
  const dlg = document.getElementById('book');
  dlg.innerHTML = `
    <div class="book">
      <header class="book-head">
        <h2 id="book-title">${esc(t('book.title'))}</h2>
        <form method="dialog"><button class="icon-btn" value="close" aria-label="${esc(t('book.close'))}">✕</button></form>
      </header>
      <div class="book-tabs" role="tablist">
        ${['dishes', 'classics', 'friends'].map((k) => `<button role="tab" type="button" data-tab="${k}" aria-selected="${tab === k}">${esc(t(`book.${k}`))}</button>`).join('')}
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
  body.innerHTML = tab === 'dishes' ? dishes() : tab === 'classics' ? classics() : friends();
  body.querySelectorAll('.dish-card').forEach((c) => c.addEventListener('click', () => {
    const open = c.classList.toggle('open');
    c.setAttribute('aria-expanded', String(open));
  }));
  body.querySelectorAll('[data-sort]').forEach((b) => b.addEventListener('click', () => { sort = b.dataset.sort; openTab(dlg); }));
  body.querySelectorAll('[data-cfilter]').forEach((b) => b.addEventListener('click', () => { classicFilter = b.dataset.cfilter; openTab(dlg); }));
  body.querySelectorAll('[data-hint]').forEach((b) => b.addEventListener('click', () => {
    const id = b.dataset.hint;
    state.hints = state.hints || {};
    state.hints[id] = Math.min(2, (state.hints[id] || 0) + 1);
    save();
    play('pick');
    openTab(dlg);
    dlg.querySelector(`[data-hint="${id}"]`)?.focus({ preventScroll: true });
  }));
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
  const fav = favouriteFound() ? t(`flavour.${weeklyFavourite()}`) : '???';
  const favLine = `<p class="book-fav">${criticFace(4)}<span>${esc(t('book.favourite', { flavour: fav }))}</span></p>`;
  if (!recs.length) return `${favLine}<p class="book-empty">${criticFace(3)}<span>${esc(t('book.empty'))}</span></p>`;
  recs.sort((a, b) => (sort === 'best' ? b.stars - a.stars : b.last - a.last));
  const { count, avg } = bookSummary();
  return `${favLine}
    <div class="book-bar"><span>${esc(t(count === 1 ? 'book.summaryOne' : 'book.summary', { n: count, avg: avg.toFixed(1) }))}</span>
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

/** The dish a classic's recipe makes, cooked once and remembered (for its sketch). */
function sketchOf(sig) {
  if (!sig.how) return null;
  if (!sketchCache.has(sig.id)) {
    try { sketchCache.set(sig.id, cookHow(db.engine, sig.how)); } catch { sketchCache.set(sig.id, null); }
  }
  return sketchCache.get(sig.id);
}

/** Who does the last step of a recipe: "the Oven", "your Hands"… */
function toolFor(op) {
  if (op === 'plate') return t('tool.plate');
  const tool = db.handTools.find((h) => h.op === op && !h.menu) || db.appliances.find((a) => a.op === op);
  return tool ? t(`tool.${tool.id}`) : t('tool.hands');
}

function classicCard(s) {
  const found = state.signatures.includes(s.id);
  const dish = sketchOf(s);
  const art = dish ? `<span class="classic-art${found ? '' : ' sketch'}" aria-hidden="true">${renderArt(dish)}</span>` : '';
  if (found) return `<div class="classic found">${art}<span class="classic-name">${esc(s.name)}</span><span class="classic-desc">${esc(s.desc || '')}</span></div>`;
  // undiscovered classics show only their first letters as a hint: "M_________ P____"
  const hint = s.name.replace(/\p{L}+/gu, (w) => w[0] + '_'.repeat(w.length - 1));
  const level = state.hints?.[s.id] || 0;
  let tips = '';
  if (s.how && level >= 1) {
    const { op, ingredients } = howSummary(s.how);
    tips += `<span class="classic-tip">${esc(t('book.hintTool', { tool: toolFor(op) }))}</span>`;
    if (level >= 2) tips += `<span class="classic-tip">${esc(t('book.hintIngredients', { list: ingredients.map((id) => db.engine.ING.get(id)?.name || id).join(', ') }))}</span>`;
  }
  const more = s.how && level < 2
    ? `<button type="button" class="hint-btn" data-hint="${s.id}" aria-label="${esc(t('book.hintLabel', { name: hint }))}">${esc(t(level ? 'book.hintMore' : 'book.hintFirst'))}</button>` : '';
  return `<div class="classic">${art}<span class="classic-name" aria-label="${esc(t('book.hidden'))}">${esc(hint)}</span>${s.season ? `<span class="classic-season">${esc(t('book.seasonHint', { season: t(`season.${s.season}`) }))}</span>` : ''}${tips}${more}</div>`;
}

function classics() {
  const total = db.signatures.length, n = state.signatures.length;
  const pct = Math.round((n / total) * 100);
  const list = db.signatures.filter((s) => classicFilter === 'all' || (classicFilter === 'found') === state.signatures.includes(s.id));
  return `<p class="book-progress">${esc(t('book.classicsCount', { n, total, pct }))}</p>
    <div class="progress-track"><span style="width:${pct}%"></span></div>
    <div class="book-bar"><span>${esc(t('book.sketchIntro'))}</span>
      <span class="book-sort">${['all', 'todo', 'found'].map((k) => `<button type="button" data-cfilter="${k}" aria-pressed="${classicFilter === k}">${esc(t(`book.filter.${k}`))}</button>`).join('')}</span></div>
    <div class="classic-grid">${list.map(classicCard).join('')}</div>`;
}

function friends() {
  const cfg = db.cozy.hearts;
  return `<p class="book-progress">${esc(t('book.friendsIntro'))}</p>
    <div class="friend-grid">${db.cozy.visitors.map((v) => {
      const f = state.friends?.[v.id];
      if (!f) return `<div class="friend unknown">${animalSilhouette(v.id)}<span class="friend-name">???</span></div>`;
      const gift = (state.owned || []).includes(v.gift);
      return `<div class="friend">${animalFace(v.id, 'happy')}<span class="friend-name">${esc(t(`visitor.${v.id}`))}</span>
        <span class="friend-visits">${esc(t(f.visits === 1 ? 'book.visitOne' : 'book.visits', { n: f.visits }))}</span>
        ${f.last ? `<span class="friend-last">${esc(t('book.lastAte', { dish: f.last }))}</span>` : ''}
        <span class="friend-gift">${esc(gift ? t('book.giftGot', { gift: t(`decor.${v.gift}`) }) : t('book.giftSoon', { n: Math.max(0, cfg.giftAfterVisits - f.visits) }))}</span></div>`;
    }).join('')}</div>`;
}
