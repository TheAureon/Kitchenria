// cozy.js — the gentle goals: hearts (the kitchen's thank-you currency), what the visiting
// friends wish for, the daily recipe card, and Madame Purrline's favourite flavour of the week.
// Nothing here draws anything; visitors.js, decorate.js and daily.js show it.

import { state, save } from './state.js';
import { db } from './data.js';

const listeners = new Set();
export const onCozyChange = (fn) => listeners.add(fn);
const changed = () => listeners.forEach((f) => f());

function hash(s) { let h = 2166136261; for (const c of String(s)) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }
const todayKey = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
function weekKey(d = new Date()) {
  const t = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = t.getUTCDay() || 7;
  t.setUTCDate(t.getUTCDate() + 4 - day);
  const y0 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1));
  return `${t.getUTCFullYear()}-w${Math.ceil(((t - y0) / 86400000 + 1) / 7)}`;
}

// ---------- hearts ----------
export const hearts = () => state.hearts || 0;
export function addHearts(n) { state.hearts = hearts() + n; save(); changed(); }
export function spendHearts(n) {
  if (hearts() < n) return false;
  state.hearts = hearts() - n; save(); changed();
  return true;
}

// ---------- what a dish is like ----------
const CRUNCHY = new Set(['toast', 'crackers', 'popcorn', 'granola', 'croutons', 'hashBrowns', 'fries', 'flavFries', 'cookies', 'flavCookies', 'biscuits', 'crumbs', 'crumble', 'grilledCheese']);
const BREAKFAST = new Set(['friedEgg', 'omelette', 'flavOmelette', 'pancakes', 'flavPancakes', 'toast', 'frenchToast', 'porridge', 'boiledEgg', 'hashBrowns', 'granola', 'muffins']);

/** Does this food fit a wish like 'warm', 'sweet' or 'with:apple'? */
export function fits(wish, item) {
  if (!item) return false;
  const ING = db.engine.ING;
  const t = item.taste || {};
  const parts = item.parts || {};
  if (wish.startsWith('with:')) return parts[wish.slice(5)] > 0;
  const total = Object.values(parts).reduce((a, b) => a + b, 0) || 1;
  const catShare = (c) => Object.entries(parts).filter(([id]) => ING.get(id)?.cat === c).reduce((s, [, w]) => s + w, 0) / total;
  switch (wish) {
    case 'warm': return !!item.hot && !item.burnt;
    case 'cold': return !!item.frozen;
    case 'sweet': return t.sweet >= 1.6;
    case 'savory': return t.umami + t.salty >= 2 && t.sweet < 1.6;
    case 'crunchy': return CRUNCHY.has(item.arch) || ['crumbs', 'fries', 'cookie'].includes(item.form) || (item.states || []).includes('fry') && !['soup', 'drink', 'sauce'].includes(item.form);
    case 'baked': return (item.states || []).includes('bake');
    case 'soup': return item.form === 'soup';
    case 'drink': return item.form === 'drink';
    case 'fresh': return t.fresh >= 1.6 && !item.hot && !item.burnt;
    case 'cheesy': return parts.cheese > 0;
    case 'fruity': return catShare('fruit') >= 0.35;
    case 'spicy': return t.spicy >= 1.4;
    case 'breakfast': return BREAKFAST.has(item.arch) || (parts.egg > 0 && item.heat > 0);
    case 'classic': return !!item.sig;
    default: return false;
  }
}

// ---------- visitors ----------
export const visitorById = (id) => db.cozy.visitors.find((v) => v.id === id);
const rand = (a, b) => a + Math.random() * (b - a);

/** Picks the next friend to visit (not the same one twice in a row) and their wish. */
export function newVisit(force = {}) {
  const list = db.cozy.visitors;
  const options = list.filter((v) => v.id !== state.lastVisitor);
  const v = force.id ? visitorById(force.id) : options[Math.floor(Math.random() * options.length)];
  const wish = force.wish || v.wishes[Math.floor(Math.random() * v.wishes.length)];
  state.visitor = { id: v.id, wish, since: Date.now() };
  save(); changed();
  return state.visitor;
}

/** Counts play time; returns true when it's time for a friend to knock. */
export function tick(seconds) {
  if (state.visitor) return false;
  state.playTime = (state.playTime || 0) + seconds;
  if (state.nextVisitAt == null) state.nextVisitAt = db.cozy.firstVisitSeconds;
  return state.playTime >= state.nextVisitAt;
}

/** A friend received a fitting dish. Returns what they gave. */
export function visitHappy(item) {
  const v = state.visitor;
  const cfg = db.cozy.hearts;
  const f = (state.friends ||= {})[v.id] ||= { visits: 0 };
  f.visits++;
  f.last = item.name;
  let gift = cfg.visitor + (item.sig ? cfg.classicBonus : 0);
  let decor = null;
  const giftId = visitorById(v.id).gift;
  if (f.visits >= cfg.giftAfterVisits && giftId && !(state.owned || []).includes(giftId)) {
    (state.owned ||= []).push(giftId);
    decor = giftId;
  }
  state.lastVisitor = v.id;
  state.visitor = null;
  const [lo, hi] = db.cozy.visitEverySeconds;
  state.nextVisitAt = (state.playTime || 0) + rand(lo, hi);
  addHearts(gift);
  return { hearts: gift, decor };
}

// ---------- the daily recipe card ----------
/** Today's card (the same all day, a new one tomorrow). */
export function dailyCard() {
  const key = todayKey();
  if (state.daily?.date === key) return state.daily;
  const h = hash(key);
  const kinds = db.cozy.daily;
  const kind = kinds[h % kinds.length];
  const param = kind.params ? kind.params[(h >>> 8) % kind.params.length] : null;
  state.daily = { date: key, id: kind.id, param, done: false };
  save();
  return state.daily;
}

/**
 * Tells the daily card what just happened. Returns true if that finished it.
 * ev: { type: 'cook', item, tool } | { type: 'serve', dish, stars } | { type: 'visitor' }
 */
export function dailyEvent(ev) {
  const c = dailyCard();
  if (c.done) return false;
  const food = ev.item || ev.dish;
  const ok = {
    with: () => food && food.parts?.[c.param] > 0 && food.kind !== 'ingredient',
    stars4: () => ev.type === 'serve' && ev.stars >= 4,
    tool: () => ev.type === 'cook' && ev.tool === c.param,
    classic: () => food && (food.sig || food.mainSig),
    visitor: () => ev.type === 'visitor',
    plate3: () => ev.type === 'serve' && (food.components?.length || 0) >= 3,
    wish: () => ev.type === 'cook' && fits(c.param, food),
  }[c.id]?.();
  if (!ok) return false;
  c.done = true;
  addHearts(db.cozy.hearts.daily);
  return true;
}

// ---------- Madame Purrline's favourite flavour this week ----------
const FLAVOURS = ['sweet', 'salty', 'sour', 'rich', 'fresh', 'spicy', 'umami'];
export const weeklyFavourite = () => FLAVOURS[hash(weekKey()) % FLAVOURS.length];
export const favouriteFound = () => !!state.favSeen?.[weekKey()];
export function markFavouriteFound() { (state.favSeen ||= {})[weekKey()] = true; save(); }
