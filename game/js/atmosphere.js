// atmosphere.js — the mood of the kitchen:
//   * rain: grey sky, raindrops on the window and a soft patter (switch it on whenever you like)
//   * lighting effects: sunlight through the window that follows the real time of day,
//     a warm lamp glow in the evening, steam over hot food
//   * Low Power mode: switches off moving decorations and lighting to save battery
// The switches live in Decorate → "Weather & light".

import { state, save } from './state.js';
import { audioParts, play } from './audio.js';
import { applyDecor, addShopTab, isNight } from './decorate.js';
import { currentSeason } from './season.js';
import { render as renderShelf } from './shelf.js';
import { t } from './i18n.js';
import { esc } from './effects.js';

const S = () => state.settings;
let lightEl;
let rainSound = null;

export function initAtmosphere() {
  if (S().lighting == null) S().lighting = true; // lighting on, rain off, Low Power off to begin with
  lightEl = document.createElement('div');
  lightEl.id = 'lighting';
  lightEl.className = 'lighting';
  lightEl.setAttribute('aria-hidden', 'true');
  lightEl.innerHTML = '<div class="sunbeam"></div><div class="lamp-glow"></div><div class="dusk"></div><div class="rain-tint"></div>';
  document.querySelector('.scene').appendChild(lightEl);
  apply();
  setInterval(() => { if (!document.hidden) updateLight(); }, 60000);
  window.addEventListener('resize', updateLight);
  // the rain sound needs a click or key press first (browsers rule)
  const wake = () => { if (S().rain) startRainSound(); };
  window.addEventListener('pointerdown', wake, { once: true });
  window.addEventListener('keydown', wake, { once: true });
  addShopTab('weather', renderPanel);
}

/** Applies all switches to the page. */
export function apply() {
  const body = document.body;
  body.classList.toggle('low-power', !!S().lowPower);
  body.classList.toggle('lighting-on', !!S().lighting && !S().lowPower);
  body.classList.toggle('raining', !!S().rain);
  body.dataset.season = currentSeason();
  applyDecor();
  updateLight();
  if (S().rain) startRainSound(); else stopRainSound();
}

/** Moves the sunbeam and dims the room to match the clock. */
function updateLight() {
  if (!lightEl) return;
  const now = new Date();
  const h = now.getHours() + now.getMinutes() / 60;
  // sunlight: slanting in through the window, swinging as the sun moves across the sky
  const day = h >= 6 && h <= 19.5;
  const sunA = S().rain || !day ? 0 : Math.max(0, Math.sin(((h - 6) / 13.5) * Math.PI)) * 0.55 + 0.1;
  const slant = day ? (h - 12.75) * 4 : 0;
  // dusk & night: the room gets dim and the lamp glows
  const dusk = isNight() ? 0.6 : h >= 18 ? 0.18 + (h - 18) * 0.08 : h < 7 ? 0.25 : S().rain ? 0.12 : 0;
  const lamp = dusk > 0.1 || S().rain ? 1 : 0;
  const win = document.querySelector('.window-wrap');
  const scene = document.querySelector('.scene').getBoundingClientRect();
  const wr = win?.offsetParent ? win.getBoundingClientRect() : null;
  const st = lightEl.style;
  st.setProperty('--sun-a', sunA.toFixed(2));
  st.setProperty('--sun-x', `${wr ? wr.left - scene.left + wr.width / 2 : scene.width * 0.15}px`);
  st.setProperty('--sun-w', `${wr ? wr.width * 1.1 : 160}px`);
  st.setProperty('--slant', `${slant.toFixed(1)}deg`);
  st.setProperty('--dusk', dusk.toFixed(2));
  st.setProperty('--lamp', lamp);
  // the glow comes from a hanging lamp if there is one, otherwise from the middle of the room
  const lampHung = ['lantern', 'mushroom_lamp', 'honey_lantern'].includes(state.decor?.hang);
  const hang = lampHung ? document.getElementById('decor-hang')?.getBoundingClientRect() : null;
  st.setProperty('--lamp-x', `${hang && hang.width ? hang.left - scene.left + hang.width / 2 : scene.width * 0.5}px`);
  // shadows lean away from the sun
  document.body.style.setProperty('--shadow-x', `${(-slant / 6).toFixed(1)}px`);
}

// ---------- the sound of rain (soft filtered noise, made on the spot) ----------
function startRainSound() {
  if (rainSound) return;
  const parts = audioParts();
  if (!parts || parts.ctx.state !== 'running') return;
  const { ctx, musicBus } = parts;
  const len = ctx.sampleRate * 2;
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
  const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 500;
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 3200;
  const g = ctx.createGain(); g.gain.value = 0.0001;
  src.connect(hp).connect(lp).connect(g).connect(musicBus);
  src.start();
  g.gain.setTargetAtTime(0.05, ctx.currentTime, 1.2);
  // a gentle drip now and then
  const drips = setInterval(() => {
    if (document.hidden) return;
    const o = ctx.createOscillator(), dg = ctx.createGain(), at = ctx.currentTime + Math.random() * 0.5;
    o.frequency.setValueAtTime(1400 + Math.random() * 900, at); o.frequency.exponentialRampToValueAtTime(500, at + 0.08);
    dg.gain.setValueAtTime(0.02, at); dg.gain.exponentialRampToValueAtTime(0.0001, at + 0.1);
    o.connect(dg).connect(musicBus); o.start(at); o.stop(at + 0.12);
  }, 1700);
  rainSound = { stop: () => { g.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.6); src.stop(ctx.currentTime + 3); clearInterval(drips); } };
}
function stopRainSound() { rainSound?.stop(); rainSound = null; }

// ---------- Decorate → Weather & light ----------
function renderPanel(box, reopen) {
  const sw = (key, on, hint = '') => `<label class="switch-row">
      <span><strong>${esc(t(`atmo.${key}`))}</strong>${hint ? `<small>${esc(hint)}</small>` : ''}</span>
      <input type="checkbox" role="switch" data-set="${key}" ${on ? 'checked' : ''}><span class="switch" aria-hidden="true"></span></label>`;
  box.innerHTML = `
    <p class="season-now">${esc(t('atmo.seasonNow', { season: t(`season.${currentSeason()}`) }))}</p>
    ${sw('rain', S().rain, t('atmo.rainHint'))}
    ${sw('lighting', S().lighting, t('atmo.lightingHint'))}
    ${sw('lowPower', S().lowPower, t('atmo.lowPowerHint'))}
    ${sw('south', S().hemisphere === 'south', t('atmo.southHint'))}`;
  box.querySelectorAll('[data-set]').forEach((input) => input.addEventListener('change', () => {
    const k = input.dataset.set;
    if (k === 'south') S().hemisphere = input.checked ? 'south' : 'north';
    else S()[k] = input.checked;
    save();
    play('click');
    apply();
    if (k === 'south') { renderShelf(); reopen(); }
  }));
}
