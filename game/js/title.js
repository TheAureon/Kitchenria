// title.js — the title screen: a cosy kitchen window whose sky follows the real time of day,
// a bouncy logo, floating ingredients, dishes on the counter, Madame Purrline peeking in,
// and the buttons to start. Pressing Start slides it away like a curtain.

import { db } from './data.js';
import { state } from './state.js';
import { renderArt, renderArtRaw } from './doodle.js';
import { criticFace } from './review.js';
import { t } from './i18n.js';
import { esc } from './effects.js';
import { play } from './audio.js';
import { wireSoundButton } from './sound-ui.js';

/** Morning, day, evening or night, from the player's own clock. */
function timeOfDay(d = new Date()) {
  const h = d.getHours();
  return h >= 5 && h < 9 ? 'morning' : h >= 9 && h < 17 ? 'day' : h >= 17 && h < 21 ? 'evening' : 'night';
}

// where the floating ingredients hover: around the edges, never over the logo or buttons
const SPOTS = [[4, 12], [13, 30], [5, 48], [15, 64], [86, 13], [93, 31], [84, 49], [92, 65], [27, 7], [70, 6]];

/** A few dishes made by the real food engine, so the title shows food from the game. */
function dishes() {
  const E = db.engine;
  const B = (id) => E.baseItem(id);
  const C = (op, ...xs) => E.cook(op, xs.map((x) => (typeof x === 'string' ? B(x) : x)));
  try {
    const dough = C('squish', 'flour', 'water');
    return [
      C('fry', C('mix', 'flour', 'egg', 'milk')),                                  // pancakes
      C('bake', C('mix', 'flour', 'butter'), C('chop', 'apple'), 'sugar'),          // apple pie
      C('bake', dough),                                                            // bread
      C('bake', C('roll', dough), C('boil', C('chop', 'tomato')), C('grate', 'cheese'), 'herbs'), // pizza
      C('boil', 'tomato', 'onion', 'water'),                                        // tomato soup
    ];
  } catch { return []; }
}

/**
 * Shows the title screen. Resolves when the player presses Start.
 * @param {object} h  hooks: openBook(), openAi()
 */
export function showTitle(h = {}) {
  return new Promise((resolve) => {
    const el = document.getElementById('title');
    const tod = timeOfDay();
    const hasProgress = Object.keys(state.dishes).length > 0 || state.table.length > 0;
    const floaters = ['tomato', 'lemon', 'strawberry', 'egg', 'carrot', 'mushroom', 'apple', 'cheese', 'herbs', 'banana', 'onion', 'blueberry']
      .filter((id) => db.engine.ING.has(id));
    const word = t('app.title');
    const pot = db.appliances.find((a) => a.id === 'pot');
    const stars = tod === 'night' ? Array.from({ length: 14 }, (_, i) => `<span class="t-star" style="--x:${(i * 37) % 100}%;--y:${(i * 53) % 70}%;--d:${(i % 5) * 0.6}s"></span>`).join('') : '';

    el.className = `title tod-${tod}`;
    el.innerHTML = `
      <div class="t-wall" aria-hidden="true">
        <div class="t-window">
          <div class="t-sky">
            ${stars}
            <span class="t-sun"></span>
            <span class="t-cloud c1"></span><span class="t-cloud c2"></span><span class="t-cloud c3"></span>
          </div>
          <span class="t-pane"></span>
        </div>
        <span class="t-curtain left"></span><span class="t-curtain right"></span>
        <svg class="t-lights" viewBox="0 0 1000 60" preserveAspectRatio="none">
          <path d="M0 8 Q250 52 500 18 Q750 52 1000 8" fill="none" stroke="#4a3426" stroke-width="2.5"/>
          ${Array.from({ length: 13 }, (_, i) => { const x = 40 + i * 76; const y = 8 + Math.sin((x / 1000) * Math.PI * 2 - 0.2) * 0 + (i % 2 ? 30 : 24) - Math.abs(500 - x) * 0.016; return `<circle class="t-bulb" style="--i:${i}" cx="${x}" cy="${y.toFixed(1)}" r="7"/>`; }).join('')}
        </svg>
        <div class="t-plant left">${renderArt(db.engine.baseItem('herbs'))}</div>
        <div class="t-plant right">${renderArt(db.engine.baseItem('mint'))}</div>
      </div>
      <div class="t-floaters" aria-hidden="true">
        ${floaters.slice(0, SPOTS.length).map((id, i) => `<span class="t-float" style="--x:${SPOTS[i][0]}%;--y:${SPOTS[i][1]}%;--d:${(i % 6) * -1.3}s;--s:${0.75 + (i % 3) * 0.2};--r:${(i % 2 ? 1 : -1) * (8 + i)}deg">${renderArt(db.engine.baseItem(id))}</span>`).join('')}
      </div>

      <div class="t-center">
        <div class="t-logo-wrap">
          <div class="t-pot" aria-hidden="true">${pot ? renderArtRaw(pot.art, 'title-pot', 'tool') : ''}
            <span class="t-steam s1"></span><span class="t-steam s2"></span><span class="t-steam s3"></span>
          </div>
          <h1 class="t-logo" aria-label="${esc(word)}">${[...word].map((ch, i) => `<span style="--i:${i}" aria-hidden="true">${esc(ch)}</span>`).join('')}</h1>
          <p class="t-tagline">${esc(t('app.tagline'))}</p>
        </div>
        <div class="t-buttons">
          <button type="button" class="t-start" data-a="start">${esc(t(hasProgress ? 'title.continue' : 'title.start'))}</button>
          <div class="t-row">
            <button type="button" class="t-small" data-a="book">📖 ${esc(t('top.book'))}</button>
            <button type="button" class="t-small" data-a="ai">✨ ${esc(t('ai.title'))}</button>
          </div>
        </div>
      </div>

      <div class="t-counter" aria-hidden="true">
        <div class="t-dishes">${dishes().map((d, i) => `<span class="t-dish" style="--i:${i}">${renderArt(d)}</span>`).join('')}</div>
      </div>
      <div class="t-critic" aria-hidden="true">${criticFace(5)}</div>
      <p class="t-credits">${esc(t('title.credits'))}</p>
      <button type="button" class="t-sound icon-btn" data-sound-menu aria-haspopup="dialog" aria-expanded="false">
        <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 18 V6 l10 -2 v12" stroke-width="2"/><circle cx="6.5" cy="18" r="2.6" stroke-width="2"/><circle cx="16.5" cy="16" r="2.6" stroke-width="2"/></svg>
      </button>`;
    el.hidden = false;
    wireSoundButton(el.querySelector('.t-sound'));
    document.body.classList.add('on-title');

    const start = () => {
      play('rankup');
      el.classList.add('leaving');
      document.body.classList.remove('on-title');
      const done = () => { el.hidden = true; el.classList.remove('leaving'); el.innerHTML = ''; resolve(); };
      const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (reduced) done(); else setTimeout(done, 750);
    };
    el.querySelector('[data-a="start"]').addEventListener('click', start, { once: true });
    el.querySelector('[data-a="book"]').addEventListener('click', () => { play('click'); h.openBook?.(); });
    el.querySelector('[data-a="ai"]').addEventListener('click', () => { play('click'); h.openAi?.(); });
    el.querySelector('[data-a="start"]').focus({ preventScroll: true });
  });
}
