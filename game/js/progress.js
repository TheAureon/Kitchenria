// progress.js — chef points, the 10 chef ranks, unlocks and badges.
//
// Points: a new creation, a newly discovered classic dish, and every first serve
// (10 points per star) all count. Ranks unlock new tools and pantry packs
// (see data/kitchen.json). Every function returns a list of "events" for the
// screen to celebrate: { type: 'points' | 'rank' | 'badge', … }.

import { db, packIngredients } from './data.js';
import { state, save, addToPantry } from './state.js';

export const rankCount = () => db.kitchen.ranks.length;
export const rankPoints = (r) => db.kitchen.ranks[r - 1]?.points ?? Infinity;

/** The rank that a number of points earns. */
export function rankFor(points) {
  let r = 1;
  db.kitchen.ranks.forEach((rk, i) => { if (points >= rk.points) r = i + 1; });
  return r;
}

export function isToolUnlocked(tool) { return (tool.rank || 1) <= state.rank; }

/** Gives the starter pantry and everything unlocked up to the current rank (safe to call any time). */
export function ensureUnlocks() {
  for (const id of packIngredients('starter')) addToPantry(id, { markFresh: false });
  for (let r = 2; r <= state.rank; r++) applyRank(r, false);
}
function applyRank(r, fresh = true) {
  const unlocked = [];
  for (const u of db.kitchen.ranks[r - 1]?.unlock || []) {
    const [kind, id] = u.split(':');
    if (kind === 'pack') for (const g of packIngredients(id)) addToPantry(g, { markFresh: fresh });
    unlocked.push({ kind, id });
  }
  return unlocked;
}

/** Adds points and handles ranking up. */
export function addPoints(p) {
  const events = [];
  if (!p) return events;
  state.points += p;
  events.push({ type: 'points', p });
  const newRank = rankFor(state.points);
  while (state.rank < newRank) {
    state.rank++;
    events.push({ type: 'rank', rank: state.rank, unlocked: applyRank(state.rank) });
  }
  save();
  return events;
}

/** Called whenever something is cooked. */
export function recordMade(item, { isNew, isNewSig }) {
  const st = state.stats;
  st.made[item.arch] = (st.made[item.arch] || 0) + 1;
  const op = item.from?.op;
  if (op) st.ops[op] = (st.ops[op] || 0) + 1;
  if (item.burnt) st.burnt++;
  const pts = db.kitchen.points;
  const events = addPoints((isNew ? pts.newCreation : 0) + (isNewSig ? pts.newSignature : 0));
  return events.concat(checkBadges());
}

/** Called when a dish is served to the critic. */
export function recordServe(dish, score, { firstTime }) {
  const st = state.stats;
  if (dish.arch === 'lonely') st.servedRaw++;
  if (firstTime && score.stars >= 4) st.goodServes++;
  st.bestStars = Math.max(st.bestStars, score.stars);
  const pts = db.kitchen.points;
  const earned = firstTime ? Math.round(score.stars * pts.servePerStar) : pts.serveAgain;
  return { earned, events: addPoints(earned).concat(checkBadges()) };
}

/** Checks every badge rule (see "when" in kitchen.json). */
function badgeEarned(when) {
  const st = state.stats;
  const creations = Object.values(state.creations).filter((c) => c.kind === 'creation').length;
  let m;
  if ((m = when.match(/^served>=(\d+)$/))) return Object.keys(state.served).length >= +m[1];
  if ((m = when.match(/^stars>=([\d.]+)$/))) return st.bestStars >= +m[1];
  if (when === 'served-raw') return st.servedRaw > 0;
  if (when === 'made-burnt') return st.burnt > 0;
  if ((m = when.match(/^made:(.+)$/))) return m[1].split('|').some((a) => st.made[a] > 0);
  if ((m = when.match(/^op:(.+)$/))) return st.ops[m[1]] > 0;
  if ((m = when.match(/^creations>=(\d+)$/))) return creations >= +m[1];
  if ((m = when.match(/^signatures>=(\d+)$/))) return state.signatures.length >= +m[1];
  if ((m = when.match(/^good-serves>=(\d+)$/))) return st.goodServes >= +m[1];
  return false;
}
export function checkBadges() {
  const events = [];
  for (const b of db.kitchen.badges) {
    if (!state.badges.includes(b.id) && badgeEarned(b.when)) {
      state.badges.push(b.id);
      events.push({ type: 'badge', id: b.id, icon: b.icon });
    }
  }
  if (events.length) save();
  return events;
}
