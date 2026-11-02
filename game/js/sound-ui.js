// sound-ui.js — the little sound menu: music volume, sound-effects volume and mute.
// The music starts on the player's first click or key press (browsers don't allow sound before that).

import { state, save } from './state.js';
import { setMuted, setSfxVolume, setMusicVolume, play } from './audio.js';
import { startMusic, stopMusic } from './music.js';
import { t } from './i18n.js';
import { esc } from './effects.js';

let menu = null;
let opener = null;

const S = () => state.settings;
function defaults() {
  if (S().musicVol == null) S().musicVol = 0.5;
  if (S().sfxVol == null) S().sfxVol = 0.8;
}

/** Applies the saved settings, and starts the music on the first click or key. */
export function initSound() {
  defaults();
  setMuted(!!S().muted);
  setSfxVolume(S().sfxVol);
  setMusicVolume(S().musicVol);
  const begin = () => { if (S().musicVol > 0) startMusic(); };
  window.addEventListener('pointerdown', begin, { once: true });
  window.addEventListener('keydown', begin, { once: true });
  document.querySelectorAll('[data-sound-menu]').forEach(wireSoundButton);
}

/** Makes any button with data-sound-menu open the sound menu (the title screen has one too). */
export function wireSoundButton(b) {
  b.addEventListener('click', (e) => { e.stopPropagation(); toggleMenu(b); });
  syncButtons();
}

function syncButtons() {
  document.querySelectorAll('[data-sound-menu]').forEach((b) => {
    b.classList.toggle('off', !!S().muted);
    b.setAttribute('aria-label', t('sound.title'));
    b.title = t(S().muted ? 'top.muted' : 'top.sound');
  });
}

function closeMenu() {
  if (!menu) return;
  menu.remove(); menu = null;
  window.removeEventListener('pointerdown', onOutside, true);
  opener?.setAttribute('aria-expanded', 'false');
  opener?.focus({ preventScroll: true });
}
function onOutside(e) { if (menu && !menu.contains(e.target) && e.target !== opener && !opener?.contains(e.target)) closeMenu(); }

function toggleMenu(btn) {
  if (menu) { closeMenu(); return; }
  opener = btn;
  btn.setAttribute('aria-expanded', 'true');
  const pct = (v) => Math.round(v * 100);
  menu = document.createElement('div');
  menu.className = 'sound-menu';
  menu.setAttribute('role', 'dialog');
  menu.setAttribute('aria-label', t('sound.title'));
  menu.innerHTML = `
    <p class="sound-title">${esc(t('sound.title'))}</p>
    <label class="sound-row"><span>🎵 ${esc(t('sound.music'))}</span><input type="range" min="0" max="100" step="5" value="${pct(S().musicVol)}" data-k="music"></label>
    <label class="sound-row"><span>🔔 ${esc(t('sound.sfx'))}</span><input type="range" min="0" max="100" step="5" value="${pct(S().sfxVol)}" data-k="sfx"></label>
    <button type="button" class="plain-btn sound-mute">${esc(t(S().muted ? 'sound.unmute' : 'sound.mute'))}</button>
    <p class="sound-note">${esc(t('sound.note'))}</p>`;
  const r = btn.getBoundingClientRect();
  menu.style.top = `${r.bottom + 8}px`;
  menu.style.right = `${Math.max(8, window.innerWidth - r.right)}px`;
  document.body.appendChild(menu);

  menu.querySelector('[data-k="music"]').addEventListener('input', (e) => {
    const v = e.target.value / 100;
    S().musicVol = v; setMusicVolume(v); save();
    if (v > 0 && !S().muted) startMusic(); else if (v === 0) stopMusic();
  });
  menu.querySelector('[data-k="sfx"]').addEventListener('input', (e) => {
    S().sfxVol = e.target.value / 100; setSfxVolume(S().sfxVol); save();
  });
  menu.querySelector('[data-k="sfx"]').addEventListener('change', () => play('pick')); // a little sample of the new volume
  menu.querySelector('.sound-mute').addEventListener('click', (e) => {
    S().muted = !S().muted; setMuted(S().muted); save();
    if (!S().muted && S().musicVol > 0) startMusic();
    e.target.textContent = t(S().muted ? 'sound.unmute' : 'sound.mute');
    syncButtons();
  });
  menu.addEventListener('keydown', (e) => { if (e.key === 'Escape') { e.stopPropagation(); closeMenu(); } });
  setTimeout(() => window.addEventListener('pointerdown', onOutside, true), 0);
  menu.querySelector('input').focus({ preventScroll: true });
}
