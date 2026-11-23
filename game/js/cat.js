// cat.js — Mochi, the kitchen cat. She naps, sits, washes her paws and wanders along the
// front of the counter. Tap her for a purr (and a heart, once a day). Give her a cosy treat
// (fish, chicken, milk, cream or cheese) and she's thrilled, but she politely refuses
// things that are bad for cats (chocolate, onion, garlic, grapes…).

import { state, save } from './state.js';
import { getItem } from './data.js';
import { addHearts } from './cozy.js';
import { t } from './i18n.js';
import { play } from './audio.js';
import { esc, toast, bounce } from './effects.js';

const INK = '#4a3426';
const FUR = '#f0a35a', FUR2 = '#d9823a', CREAM = '#fff1dc', PINK = '#f28b8b';
const S = (w = 2.6) => `stroke="${INK}" stroke-width="${w}" stroke-linejoin="round" stroke-linecap="round"`;

const TREATS = ['fish', 'chicken', 'milk', 'cream', 'cheese', 'yogurt', 'egg'];
const BAD = ['chocolate', 'onion', 'garlic', 'coffee', 'chili', 'grape', 'avocado', 'tea_leaves'];

// ---------- drawings (viewBox 0 0 120 90, she faces right) ----------
const eyes = (mood, x = 84, y = 38) => mood === 'sleep' || mood === 'happy'
  ? `<path d="M${x - 9} ${y} q3 ${mood === 'happy' ? -4 : 3} 6 0 M${x + 3} ${y} q3 ${mood === 'happy' ? -4 : 3} 6 0" fill="none" ${S(2.2)}/>`
  : `<ellipse cx="${x - 6}" cy="${y}" rx="2.4" ry="3.4" fill="${INK}" class="cat-eye"/><ellipse cx="${x + 6}" cy="${y}" rx="2.4" ry="3.4" fill="${INK}" class="cat-eye"/>`;
const head = (mood, x = 84, y = 40) => `
  <path d="M${x - 17} ${y - 6} L${x - 15} ${y - 24} L${x - 4} ${y - 15} Z M${x + 17} ${y - 6} L${x + 15} ${y - 24} L${x + 4} ${y - 15} Z" fill="${FUR}" ${S()}/>
  <path d="M${x - 14} ${y - 10} L${x - 13} ${y - 19} L${x - 7} ${y - 14} Z M${x + 14} ${y - 10} L${x + 13} ${y - 19} L${x + 7} ${y - 14} Z" fill="${PINK}"/>
  <ellipse cx="${x}" cy="${y}" rx="19" ry="16" fill="${FUR}" ${S()}/>
  <path d="M${x - 4} ${y - 15} l2 6 M${x + 4} ${y - 15} l-2 6 M${x} ${y - 16} v6" ${S(1.8)}/>
  <ellipse cx="${x}" cy="${y + 7}" rx="9" ry="6" fill="${CREAM}"/>
  ${eyes(mood, x, y - 1)}
  <path d="M${x - 2} ${y + 4} h4 l-2 2.4 z" fill="${PINK}" ${S(1.4)}/>
  <path d="M${x} ${y + 6.4} q-3 3 -5 1 M${x} ${y + 6.4} q3 3 5 1" fill="none" ${S(1.6)}/>
  <path d="M${x - 10} ${y + 4} h-12 M${x - 10} ${y + 7} l-11 3 M${x + 10} ${y + 4} h12 M${x + 10} ${y + 7} l11 3" stroke="${INK}" stroke-width="1.2" stroke-linecap="round"/>
  <ellipse cx="${x - 12}" cy="${y + 5}" rx="3.4" ry="2" fill="${PINK}" opacity=".5"/><ellipse cx="${x + 12}" cy="${y + 5}" rx="3.4" ry="2" fill="${PINK}" opacity=".5"/>`;

const POSES = {
  sit: (m) => `<g class="cat-tail"><path d="M40 78 Q14 80 16 60 Q18 46 28 50" fill="none" stroke="${INK}" stroke-width="9" stroke-linecap="round"/><path d="M40 78 Q14 80 16 60 Q18 46 28 50" fill="none" stroke="${FUR}" stroke-width="5" stroke-linecap="round"/></g>
    <path d="M44 84 Q36 56 58 42 Q82 40 86 60 Q90 84 76 86 Z" fill="${FUR}" ${S()}/>
    <path d="M52 62 q6 -2 10 2 M50 72 q7 -2 12 2" fill="none" stroke="${FUR2}" stroke-width="3" stroke-linecap="round"/>
    <path d="M66 58 Q76 56 78 70 Q76 84 68 84 Q62 74 66 58 Z" fill="${CREAM}"/>
    <ellipse cx="66" cy="85" rx="7" ry="4" fill="${FUR}" ${S(2.2)}/><ellipse cx="80" cy="85" rx="7" ry="4" fill="${FUR}" ${S(2.2)}/>
    <g class="cat-head">${head(m, 76, 36)}</g>`,
  groom: () => `<path d="M40 78 Q14 80 16 62" fill="none" stroke="${INK}" stroke-width="9" stroke-linecap="round"/><path d="M40 78 Q14 80 16 62" fill="none" stroke="${FUR}" stroke-width="5" stroke-linecap="round"/>
    <path d="M44 84 Q36 56 58 42 Q82 40 86 60 Q90 84 76 86 Z" fill="${FUR}" ${S()}/>
    <path d="M66 58 Q76 56 78 70 Q76 84 68 84 Q62 74 66 58 Z" fill="${CREAM}"/>
    <ellipse cx="66" cy="85" rx="7" ry="4" fill="${FUR}" ${S(2.2)}/>
    <g class="cat-head">${head('sleep', 76, 36)}</g>
    <g class="cat-paw"><path d="M80 80 Q90 64 82 50" fill="none" stroke="${INK}" stroke-width="10" stroke-linecap="round"/><path d="M80 80 Q90 64 82 50" fill="none" stroke="${FUR}" stroke-width="6" stroke-linecap="round"/><ellipse cx="82" cy="49" rx="5" ry="4" fill="${CREAM}" ${S(2)}/></g>`,
  sleep: () => `<path d="M20 80 Q8 70 22 64" fill="none" stroke="${INK}" stroke-width="9" stroke-linecap="round"/><path d="M20 80 Q8 70 22 64" fill="none" stroke="${FUR}" stroke-width="5" stroke-linecap="round"/>
    <g class="cat-breathe"><path d="M18 84 Q14 58 46 52 Q80 48 96 66 Q102 84 84 86 Z" fill="${FUR}" ${S()}/>
    <path d="M36 62 q4 6 0 12 M50 58 q4 7 0 14" fill="none" stroke="${FUR2}" stroke-width="3" stroke-linecap="round"/>
    <g transform="translate(-6 30)">${head('sleep', 92, 40)}</g></g>
    <g class="zzz"><text x="104" y="40" font-size="12" fill="${INK}" font-weight="700">z</text><text x="111" y="28" font-size="9" fill="${INK}" font-weight="700">z</text></g>`,
  walk: () => `<g class="cat-tail"><path d="M24 52 Q10 38 18 22" fill="none" stroke="${INK}" stroke-width="9" stroke-linecap="round"/><path d="M24 52 Q10 38 18 22" fill="none" stroke="${FUR}" stroke-width="5" stroke-linecap="round"/></g>
    <g class="leg-a"><path d="M34 66 L32 84 M74 66 L78 84" stroke="${INK}" stroke-width="9" stroke-linecap="round"/><path d="M34 66 L32 84 M74 66 L78 84" stroke="${FUR2}" stroke-width="5" stroke-linecap="round"/></g>
    <g class="leg-b"><path d="M42 66 L46 84 M66 66 L62 84" stroke="${INK}" stroke-width="9" stroke-linecap="round"/><path d="M42 66 L46 84 M66 66 L62 84" stroke="${FUR}" stroke-width="5" stroke-linecap="round"/></g>
    <path d="M22 60 Q24 44 50 46 Q76 44 84 54 Q86 72 60 72 Q30 74 22 60 Z" fill="${FUR}" ${S()}/>
    <path d="M40 50 q3 8 0 14 M54 48 q3 8 0 16" fill="none" stroke="${FUR2}" stroke-width="3" stroke-linecap="round"/>
    <g class="cat-head">${head('wait', 90, 42)}</g>`,
};
POSES.happy = () => POSES.sit('happy');
POSES.hmm = () => POSES.sit('wait');

let el, hooks = {};
let pose = 'sleep', x = 0.2, facing = 1, timer = null, walkTimer = null;

export function initCat(h = {}) {
  hooks = h;
  el = document.createElement('button');
  el.type = 'button';
  el.id = 'cat';
  el.className = 'cat';
  el.setAttribute('aria-label', t('cat.label'));
  document.getElementById('table').prepend(el); // first child: food on the counter sits above her
  el.addEventListener('click', pet);
  x = 0.15 + Math.random() * 0.7;
  setPose(Math.random() < 0.6 ? 'sleep' : 'sit');
  schedule(6000);
  window.addEventListener('resize', place);
}

const lowPower = () => document.body.classList.contains('low-power');

function setPose(p) {
  pose = p;
  el.dataset.pose = p;
  el.innerHTML = `<svg viewBox="0 0 120 90" aria-hidden="true" style="transform: scaleX(${facing})">${POSES[p]('wait')}</svg>`;
  place();
}

function place() {
  const w = el.parentElement?.clientWidth || 600;
  el.style.left = `${Math.round(x * (w - el.offsetWidth))}px`;
}

function schedule(ms) { clearTimeout(timer); timer = setTimeout(next, ms); }

/** What does Mochi feel like doing next? */
function next() {
  if (document.hidden) return schedule(8000);
  if (lowPower()) { setPose('sleep'); return schedule(30000); }
  const r = Math.random();
  if (pose === 'sleep' && r < 0.55) return schedule(12000 + Math.random() * 20000); // keep napping
  if (r < 0.32) walk();
  else if (r < 0.5) { setPose('groom'); schedule(5000); }
  else if (r < 0.75) { setPose('sit'); schedule(7000 + Math.random() * 9000); }
  else { setPose('sleep'); schedule(20000 + Math.random() * 25000); }
}

function walk(to = 0.05 + Math.random() * 0.9) {
  const w = el.parentElement.clientWidth;
  const dist = Math.abs(to - x) * w;
  if (dist < 60) { setPose('sit'); return schedule(6000); }
  facing = to > x ? 1 : -1;
  setPose('walk');
  const secs = Math.max(1.2, dist / 70);
  el.style.transition = `left ${secs}s linear`;
  x = to;
  requestAnimationFrame(place);
  clearTimeout(walkTimer);
  walkTimer = setTimeout(() => { el.style.transition = ''; setPose('sit'); schedule(5000 + Math.random() * 7000); }, secs * 1000);
}

/** Something happened (a knock at the window…): Mochi wakes up and looks. */
export function catNotice() {
  if (!el || pose === 'walk' || lowPower()) return;
  setPose('sit');
  schedule(8000);
}

function react(p, ms = 2600) {
  clearTimeout(walkTimer);
  el.style.transition = '';
  setPose(p);
  bounce(el, 'squash');
  schedule(ms);
}

const today = () => new Date().toDateString();

function pet() {
  const ids = hooks.selectedIds?.();
  if (ids) { if (give(ids)) hooks.removeSelected?.(); return; }
  react('happy');
  play('purr');
  floatHearts(3);
  const cat = (state.cat ||= {});
  cat.pets = (cat.pets || 0) + 1;
  if (cat.petDay !== today()) {
    cat.petDay = today();
    addHearts(1);
    toast({ kind: 'soft', body: esc(t('cat.petHeart')), ms: 2600 });
  } else if (cat.pets % 5 === 0) toast({ kind: 'soft', body: esc(t('cat.purr')), ms: 1800 });
  save();
}

/** Is a screen position over Mochi? (for drag and drop) */
export function catAt(cx, cy) {
  if (!el) return false;
  const r = el.getBoundingClientRect();
  return cx >= r.left + r.width * 0.15 && cx <= r.right - r.width * 0.15 && cy >= r.top + r.height * 0.25 && cy <= r.bottom;
}

/** Offers food to Mochi. Returns true if she ate it. */
export function give(ids) {
  const item = getItem(ids[0]);
  if (!item || ids.length > 1) { react('hmm'); play('nope'); return false; }
  const parts = Object.keys(item.parts || { [item.id]: 1 });
  if (parts.some((p) => BAD.includes(p))) {
    react('hmm', 3000); play('nope');
    toast({ kind: 'soft', body: esc(t('cat.bad')), ms: 3200 });
    return false;
  }
  if (!parts.some((p) => TREATS.includes(p)) || item.burnt || (item.taste?.spicy || 0) >= 1) {
    react('hmm'); play('nope');
    toast({ kind: 'soft', body: esc(t('cat.notInterested')), ms: 2600 });
    return false;
  }
  const cat = (state.cat ||= {});
  react('happy', 4000);
  play('purr');
  floatHearts(6);
  if (cat.treatDay !== today()) {
    cat.treatDay = today();
    addHearts(2);
    toast({ kind: 'sig', title: t('cat.treatTitle'), body: esc(t('cat.treat', { food: item.name })), ms: 3600 });
  } else toast({ kind: 'soft', body: esc(t('cat.treatAgain', { food: item.name })), ms: 2800 });
  save();
  return true;
}

function floatHearts(n) {
  const r = el.getBoundingClientRect();
  const layer = document.getElementById('fx-layer');
  for (let i = 0; i < n; i++) {
    const s = document.createElement('span');
    s.className = 'float-heart small';
    s.textContent = '♥';
    s.style.left = `${r.left + r.width * (0.4 + Math.random() * 0.4)}px`;
    s.style.top = `${r.top + r.height * 0.2}px`;
    s.style.setProperty('--dx', `${(Math.random() - 0.5) * 50}px`);
    s.style.animationDelay = `${i * 0.12}s`;
    s.addEventListener('animationend', () => s.remove());
    layer.appendChild(s);
  }
}
