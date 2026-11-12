// decorate.js — makes the kitchen yours: themes (each with its own view from the window),
// wallpaper, counter top, a hanging plant or lamp, something on the window sill, a picture
// on the wall and string lights. Bought with hearts ♥ and kept for good.

import { state, save } from './state.js';
import { db } from './data.js';
import { hearts, spendHearts, onCozyChange } from './cozy.js';
import { windowSvg, decorSvg } from './decor-art.js';
import { t } from './i18n.js';
import { play } from './audio.js';
import { esc, toast } from './effects.js';

const SLOTS = ['wallpaper', 'counter', 'hang', 'sill', 'frame', 'lights'];
const DEFAULTS = { theme: 'cottage', wallpaper: 'stripes', counter: 'oak', hang: 'fern', sill: 'none', frame: 'noframe', lights: 'nolights' };
let tab = 'themes';

const decorById = (id) => db.cozy.decor.find((d) => d.id === id);
const themeById = (id) => db.cozy.themes.find((d) => d.id === id);
const current = () => ({ ...DEFAULTS, ...(state.decor || {}) });

/** Free things and things you bought or were given. */
export function owns(id) {
  const d = decorById(id) || themeById(id);
  return !!d && ((d.price === 0 && !d.giftFrom) || (state.owned || []).includes(id));
}

// the sky outside follows the time of day
function sky() {
  const h = new Date().getHours();
  if (h >= 21 || h < 5) return ['#2b3a67', '#5a5f8f'];
  if (h < 8) return ['#f6c6a8', '#fbe9cf'];
  if (h >= 18) return ['#f2a07a', '#f8d6a8'];
  return ['#bfe3f2', '#fbe9cf'];
}

/** Draws the chosen decorations into the kitchen. */
export function applyDecor() {
  const c = current();
  const body = document.body;
  body.className = body.className.replace(/\b(wp|ct|th)-[\w-]+\b/g, '').trim();
  body.classList.add(`wp-${c.wallpaper}`, `ct-${c.counter}`, `th-${c.theme}`);
  const theme = themeById(c.theme) || db.cozy.themes[0];
  const [top, bottom] = sky();
  document.getElementById('window-slot').innerHTML = windowSvg(theme.view, top, bottom);
  for (const slot of ['hang', 'sill', 'frame', 'lights']) {
    const el = document.getElementById(`decor-${slot}`);
    if (el) el.innerHTML = decorSvg(slot, c[slot]);
  }
}


export function initDecor() {
  applyDecor();
  setInterval(() => { if (!document.hidden) applyDecor(); }, 60000); // clocks and the sky keep time
  const btn = document.getElementById('btn-hearts');
  btn.addEventListener('click', () => { play('click'); openDecorate(); });
  const show = () => {
    document.getElementById('hearts-count').textContent = hearts();
    btn.setAttribute('aria-label', t('hearts.label', { n: hearts() }));
  };
  onCozyChange(show);
  show();
}

// ---------- the shop ----------
function preview(slot, id) {
  if (slot === 'themes') return windowSvg(themeById(id).view);
  if (slot === 'wallpaper') return `<span class="swatch wall-swatch wp-${id}"></span>`;
  if (slot === 'counter') return `<span class="swatch counter-swatch ct-${id}"></span>`;
  return decorSvg(slot, id) || '<span class="swatch empty-swatch">∅</span>';
}

function card(slot, d) {
  const id = d.id;
  const c = current();
  const inUse = slot === 'themes' ? c.theme === id : c[slot] === id;
  const have = owns(id);
  const name = t(slot === 'themes' ? `theme.${id}` : `decor.${id}`);
  let action;
  if (inUse) action = `<span class="shop-inuse">${esc(t('decorate.inUse'))}</span>`;
  else if (have) action = `<button type="button" class="shop-btn" data-use="${id}">${esc(t('decorate.use'))}</button>`;
  else if (d.giftFrom) action = `<span class="shop-gift">${esc(t('decorate.giftOnly', { name: t(`visitor.${d.giftFrom}`) }))}</span>`;
  else action = `<button type="button" class="shop-btn buy" data-buy="${id}" ${hearts() < d.price ? 'aria-disabled="true"' : ''}>${esc(t('decorate.buy', { n: d.price }))}</button>`;
  return `<div class="shop-card${inUse ? ' in-use' : ''}${!have && d.giftFrom ? ' locked' : ''}" data-id="${id}">
    <span class="shop-art">${preview(slot, id)}</span><span class="shop-name">${esc(name)}</span>${action}</div>`;
}

export function openDecorate() {
  const dlg = document.getElementById('decorate');
  const list = tab === 'themes' ? db.cozy.themes : db.cozy.decor.filter((d) => d.slot === tab);
  dlg.innerHTML = `
    <div class="book shop">
      <header class="book-head">
        <h2 id="decorate-title">${esc(t('decorate.title'))}</h2>
        <span class="hearts-pill big">♥ ${hearts()}</span>
        <form method="dialog"><button class="icon-btn" value="close" aria-label="${esc(t('decorate.close'))}">✕</button></form>
      </header>
      <p class="shop-intro">${esc(t('decorate.intro'))}</p>
      <div class="book-tabs" role="tablist">
        ${['themes', ...SLOTS].map((k) => `<button role="tab" type="button" data-tab="${k}" aria-selected="${tab === k}">${esc(t(`decorate.${k}`))}</button>`).join('')}
      </div>
      <div class="book-body shop-grid" role="tabpanel">${list.map((d) => card(tab, d)).join('')}</div>
    </div>`;
  dlg.setAttribute('aria-labelledby', 'decorate-title');
  dlg.querySelectorAll('[data-tab]').forEach((b) => b.addEventListener('click', () => { tab = b.dataset.tab; openDecorate(); dlg.querySelector(`[data-tab="${tab}"]`)?.focus(); }));
  dlg.querySelectorAll('[data-use]').forEach((b) => b.addEventListener('click', () => use(tab, b.dataset.use)));
  dlg.querySelectorAll('[data-buy]').forEach((b) => b.addEventListener('click', () => buy(tab, b.dataset.buy)));
  if (!dlg.open) dlg.showModal();
}

function use(slot, id) {
  state.decor = current();
  if (slot === 'themes') {
    const th = themeById(id);
    Object.assign(state.decor, { theme: id, wallpaper: th.wallpaper, counter: th.counter });
  } else state.decor[slot] = id;
  save();
  play('pick');
  applyDecor();
  openDecorate();
}

function buy(slot, id) {
  const d = slot === 'themes' ? themeById(id) : decorById(id);
  if (!d) return;
  if (!spendHearts(d.price)) {
    play('nope');
    toast({ kind: 'soft', body: esc(t('decorate.need', { n: d.price - hearts() })), ms: 2200 });
    return;
  }
  (state.owned ||= []).push(id);
  // a theme comes with its own wallpaper and counter
  if (slot === 'themes') for (const x of [d.wallpaper, d.counter]) if (!state.owned.includes(x)) state.owned.push(x);
  play('coin');
  toast({ kind: 'soft', body: esc(t('decorate.bought', { name: t(slot === 'themes' ? `theme.${id}` : `decor.${id}`) })), ms: 2000 });
  use(slot, id);
}
