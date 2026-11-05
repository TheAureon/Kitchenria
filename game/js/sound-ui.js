// sound-ui.js — the little sound menu: music volume, sound-effects volume and mute.
// The music starts on the player's first click or key press (browsers don't allow sound before that).

import { state, save } from './state.js';
import { setMuted, setSfxVolume, setMusicVolume, play } from './audio.js';
import { startMusic, stopMusic, changeTrack, currentTrack, trackIds, setStayOnTrack, onTrackChange, chooseFirstTrack } from './music.js';
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
  // the first song suits the time of day, unless the player chose to stay on one
  const h = new Date().getHours();
  const byTime = h >= 5 && h < 11 ? 'toast' : h >= 11 && h < 17 ? 'market' : h >= 17 && h < 21 ? 'tea' : 'bakery';
  setStayOnTrack(!!S().musicStay);
  chooseFirstTrack(S().musicStay && S().musicTrack ? S().musicTrack : byTime);
  onTrackChange((id) => {
    S().musicTrack = id; save();
    const label = menu?.querySelector('.now-playing strong');
    if (label) label.textContent = t(`music.${id}`);
  });
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
    <div class="now-playing" aria-live="polite">
      <span>${esc(t('sound.nowPlaying'))}</span>
      <div class="np-row">
        <button type="button" class="np-btn" data-k="prev" aria-label="${esc(t('sound.prev'))}">◀</button>
        <strong>${esc(t(`music.${S().musicTrack || currentTrack() || trackIds()[0]}`))}</strong>
        <button type="button" class="np-btn" data-k="next" aria-label="${esc(t('sound.next'))}">▶</button>
      </div>
      <label class="np-stay"><input type="checkbox" data-k="stay" ${S().musicStay ? 'checked' : ''}> ${esc(t('sound.stay'))}</label>
    </div>
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
  const skip = (dir) => {
    if (S().musicVol === 0) { S().musicVol = 0.5; setMusicVolume(0.5); menu.querySelector('[data-k="music"]').value = 50; }
    const ids = trackIds();
    const cur = S().musicTrack || currentTrack() || ids[0];
    const next = ids[(ids.indexOf(cur) + dir + ids.length) % ids.length];
    S().musicTrack = next; save();
    changeTrack(next); // the music crossfades to it in a moment
    if (!S().muted) startMusic();
    menu.querySelector('.now-playing strong').textContent = t(`music.${next}`);
  };
  menu.querySelector('[data-k="prev"]').addEventListener('click', () => skip(-1));
  menu.querySelector('[data-k="next"]').addEventListener('click', () => skip(1));
  menu.querySelector('[data-k="stay"]').addEventListener('change', (e) => {
    S().musicStay = e.target.checked; setStayOnTrack(e.target.checked); save();
  });
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
