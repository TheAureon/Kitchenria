// review.js — the critic's review card that pops up after you press Serve.
// Shows the dish portrait, its name, stars filling up one by one, and Madame Purrline's words.

import { renderArt } from './doodle.js';
import { t } from './i18n.js';
import { play } from './audio.js';
import { esc, sparkleBurst } from './effects.js';

/** Madame Purrline, drawn in code. Her face changes with the stars. */
export function criticFace(stars = 3) {
  const mood = stars >= 4 ? 'happy' : stars >= 2 ? 'hmm' : 'sad';
  const eyes = mood === 'happy'
    ? '<path d="M33 50 q5 -6 10 0 M57 50 q5 -6 10 0" fill="none" stroke="#4a3426" stroke-width="3" stroke-linecap="round"/>'
    : '<ellipse cx="38" cy="50" rx="3.2" ry="4.4" fill="#4a3426"/><ellipse cx="62" cy="50" rx="3.2" ry="4.4" fill="#4a3426"/>';
  const mouth = mood === 'happy' ? '<path d="M44 62 q6 7 12 0" fill="#f28b8b" stroke="#4a3426" stroke-width="2.4" stroke-linejoin="round"/>'
    : mood === 'hmm' ? '<path d="M45 64 h10" stroke="#4a3426" stroke-width="2.4" stroke-linecap="round"/>'
      : '<path d="M44 67 q6 -6 12 0" fill="none" stroke="#4a3426" stroke-width="2.4" stroke-linecap="round"/><path d="M74 38 q4 6 0 9 q-4 -3 0 -9z" fill="#9fd3ea" stroke="#4a3426" stroke-width="1.5"/>';
  return `<svg class="critic-face" viewBox="0 0 100 100" aria-hidden="true">
    <path d="M20 40 L16 12 L40 28 Z M80 40 L84 12 L60 28 Z" fill="#c9c2bb" stroke="#4a3426" stroke-width="3" stroke-linejoin="round"/>
    <path d="M22 34 L20 18 L34 28 Z M78 34 L80 18 L66 28 Z" fill="#f2b8c0"/>
    <ellipse cx="50" cy="56" rx="34" ry="30" fill="#ddd6cf" stroke="#4a3426" stroke-width="3"/>
    <ellipse cx="50" cy="66" rx="16" ry="11" fill="#f6f1ec"/>
    ${eyes}
    <path d="M47 57 h6 l-3 3 z" fill="#e88a95" stroke="#4a3426" stroke-width="1.5" stroke-linejoin="round"/>
    ${mouth}
    <path d="M24 60 h-14 M24 65 l-13 4 M76 60 h14 M76 65 l13 4" stroke="#4a3426" stroke-width="1.6" stroke-linecap="round"/>
    <ellipse cx="38" cy="58" rx="5" ry="2.6" fill="#f28b8b" opacity=".5"/><ellipse cx="62" cy="58" rx="5" ry="2.6" fill="#f28b8b" opacity=".5"/>
    <path d="M22 30 q14 -22 50 -10 q8 4 2 10 q-26 -8 -52 0z" fill="#d9412e" stroke="#4a3426" stroke-width="2.6" stroke-linejoin="round"/>
    <circle cx="50" cy="15" r="3.4" fill="#d9412e" stroke="#4a3426" stroke-width="2"/>
  </svg>`;
}

const starSvg = (fill, i) => `<span class="star" style="--fill:${fill}%; --i:${i}"><svg viewBox="0 0 24 24" aria-hidden="true">
  <defs><clipPath id="sc${i}"><rect x="0" y="0" width="${(24 * fill) / 100}" height="24"/></clipPath></defs>
  <path class="star-bg" d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6L2.5 9.4l6.6-.8z"/>
  <path class="star-fg" clip-path="url(#sc${i})" d="M12 2.5l2.9 6.1 6.6.8-4.9 4.6 1.3 6.6L12 17.3l-5.9 3.3 1.3-6.6L2.5 9.4l6.6-.8z"/></svg></span>`;

/**
 * Opens the review card. Resolves when the player closes it.
 * @param {object} r  result from kitchen.serve(): { dish, score, firstTime, isNewSig, earned }
 */
export function showReview(r) {
  return new Promise((resolve) => {
    const dlg = document.getElementById('review');
    const { dish, score } = r;
    const stars = Array.from({ length: 5 }, (_, i) => starSvg(Math.round(Math.max(0, Math.min(1, score.stars - i)) * 100), i)).join('');
    dlg.innerHTML = `
      <form method="dialog" class="review-card">
        <p class="review-title">${esc(t('review.title'))}</p>
        <div class="review-portrait">${renderArt(dish)}</div>
        <h2 class="review-dish" id="review-dish">${esc(dish.name)}
          ${r.firstTime ? `<span class="pill pill-new">${esc(t('review.new'))}</span>` : ''}
          ${dish.sig || r.isNewSig ? `<span class="pill pill-sig">${esc(t('shelf.filter.signature'))}</span>` : ''}</h2>
        <p class="review-desc">${esc(dish.desc)}</p>
        <div class="review-stars" role="img" aria-label="${esc(t('review.stars', { s: score.stars.toFixed(1) }))}">${stars}<span class="review-score">${score.stars.toFixed(1)}</span></div>
        <div class="review-critic">
          ${criticFace(score.stars)}
          <blockquote>“${esc(score.review)}”<cite>${esc(t('review.critic'))} · ${esc(t('review.criticRole'))}</cite></blockquote>
        </div>
        ${r.firstTime ? '' : `<p class="review-again">${esc(t('review.again'))}</p>`}
        <p class="review-points">${esc(t('toast.points', { p: r.earned }))}</p>
        <button class="big-btn" value="close" autofocus>${esc(t('review.keep'))}</button>
      </form>`;
    dlg.setAttribute('aria-labelledby', 'review-dish');
    dlg.addEventListener('close', () => resolve(), { once: true });
    dlg.showModal();
    // stars light up one after another
    const full = Math.ceil(score.stars);
    for (let i = 0; i < full; i++) setTimeout(() => play('star'), 450 + i * 220);
    setTimeout(() => {
      if (score.stars >= 4) {
        play('discover');
        const rect = dlg.querySelector('.review-portrait').getBoundingClientRect();
        sparkleBurst(rect.left + rect.width / 2, rect.top + rect.height / 2, 22);
      } else if (score.stars < 2) play('nope');
    }, 450 + full * 220);
  });
}
