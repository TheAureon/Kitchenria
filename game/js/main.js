// main.js — starts the game: loads text and recipes, restores the save,
// then wires the shelf, the table and the top bar together.

import { loadLanguage, applyToPage, t } from './i18n.js';
import { loadData, items, starterIds } from './data.js';
import { state, loadSave, saveNow } from './state.js';
import { initShelf, render as renderShelf } from './shelf.js';
import { initTable, beginShelfDrag, placeFromShelf, clearTable } from './table.js';
import { setMuted, play } from './audio.js';

async function boot() {
  await Promise.all([loadLanguage('en'), loadData()]);
  applyToPage();
  loadSave(starterIds());

  initShelf({
    onTileDragStart: (id, e) => beginShelfDrag(id, e),
    onTileActivate: (id) => placeFromShelf(id),
  });
  initTable({
    onChange: ({ isNew }) => { if (isNew) { renderShelf(); updateCounter(); } },
  });

  // --- top bar ---
  document.getElementById('btn-clear').addEventListener('click', () => clearTable());
  const soundBtn = document.getElementById('btn-sound');
  const syncSound = () => {
    setMuted(state.settings.muted);
    soundBtn.setAttribute('aria-pressed', String(!state.settings.muted));
    soundBtn.title = t(state.settings.muted ? 'top.muted' : 'top.sound');
    soundBtn.classList.toggle('off', state.settings.muted);
  };
  soundBtn.addEventListener('click', () => { state.settings.muted = !state.settings.muted; syncSound(); saveNow(); play('click'); });
  syncSound();

  // On phones the shelf can be folded away to make room for the table.
  document.getElementById('shelf-toggle').addEventListener('click', () => {
    const shelf = document.getElementById('shelf');
    const open = shelf.classList.toggle('folded') === false;
    document.getElementById('shelf-toggle').setAttribute('aria-expanded', String(open));
  });

  updateCounter();
  window.addEventListener('pagehide', saveNow);
  document.body.classList.add('ready');
}

function updateCounter() {
  const total = items.size;
  const n = state.discovered.filter((id) => items.has(id)).length;
  document.getElementById('found-text').textContent = t('top.discovered', { n, total });
  document.getElementById('found-bar').style.width = `${Math.round((n / total) * 100)}%`;
}

boot().catch((err) => {
  console.error(err);
  document.getElementById('boot-error').hidden = false;
});
