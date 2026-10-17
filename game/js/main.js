// main.js — starts the game: loads text, ingredients and tools, restores the save,
// then wires the pantry, the counter, the hand tools, the appliances, the critic
// and the top bar together.

import { loadLanguage, applyToPage, t } from './i18n.js';
import { loadData, toolById } from './data.js';
import { state, loadSave, saveNow } from './state.js';
import { cook as cookItems, serve as serveItems } from './kitchen.js';
import { initShelf } from './shelf.js';
import { initTable, beginShelfDrag, beginToolDrag, useOnSelected, placeFromShelf, placeBelow, clearTable, takeSelected } from './table.js';
import { initRack } from './rack.js';
import { initAppliances, drop as dropInAppliance, applianceAt, highlight, applianceRect } from './appliances.js';
import { showReview } from './review.js';
import { openBook, bookSummary } from './book.js';
import { renderArt } from './doodle.js';
import { setMuted, play } from './audio.js';
import { sparkleBurst, toast, bounce, esc } from './effects.js';

async function boot() {
  await Promise.all([loadLanguage('en'), loadData()]);
  applyToPage();
  loadSave();

  initShelf({
    onTileDragStart: (id, e) => beginShelfDrag(id, e),
    onTileActivate: (id) => placeFromShelf(id),
  });
  initTable({
    useTool: (toolId, ids) => {
      play(TOOL_SOUND[toolId] || 'stir');
      return cookItems(toolById(toolId).op, ids);
    },
    celebrate,
    applianceAt,
    dropInAppliance,
    highlightAppliance: highlight,
  });
  initRack({ beginToolDrag, useOnSelected });
  initAppliances({
    takeSelected,
    returnToCounter: (applianceId, id) => placeBelow(applianceRect(applianceId), [id], 'squash'),
    cook: (applianceId, op, items) => {
      const res = cookItems(op, items);
      if (!res) return;
      const el = placeBelow(applianceRect(applianceId), [res.item.id]);
      celebrate(res, el);
    },
    serve: async (ids) => {
      const r = serveItems(ids);
      if (!r) return;
      await showReview(r);
      updateTop();
    },
  });

  // --- top bar ---
  document.getElementById('btn-clear').addEventListener('click', () => clearTable());
  document.getElementById('btn-book').addEventListener('click', () => { play('click'); openBook(); });
  const soundBtn = document.getElementById('btn-sound');
  const syncSound = () => {
    setMuted(state.settings.muted);
    soundBtn.setAttribute('aria-pressed', String(!state.settings.muted));
    soundBtn.title = t(state.settings.muted ? 'top.muted' : 'top.sound');
    soundBtn.classList.toggle('off', state.settings.muted);
  };
  soundBtn.addEventListener('click', () => { state.settings.muted = !state.settings.muted; syncSound(); saveNow(); play('click'); });
  syncSound();

  // On phones the pantry can be folded away to make room for the counter.
  document.getElementById('shelf-toggle').addEventListener('click', () => {
    const shelf = document.getElementById('shelf');
    const open = shelf.classList.toggle('folded') === false;
    document.getElementById('shelf-toggle').setAttribute('aria-expanded', String(open));
  });

  updateTop();
  window.addEventListener('pagehide', saveNow);
  document.body.classList.add('ready');
}

const TOOL_SOUND = { hands: 'grind', knife: 'chop', whisk: 'whirr', spoon: 'stir', pin: 'grind', masher: 'grind', grater: 'chop', mortar: 'grind' };

/** A little sparkle the first time you make something this visit; a big one for classic dishes. */
function celebrate(res, el) {
  if (!res || !el) return;
  if (res.isNewSig) {
    setTimeout(() => {
      const r = el.getBoundingClientRect();
      sparkleBurst(r.left + r.width / 2, r.top + r.height / 2.6, 24);
      play('discover');
    }, 160);
    toast({ kind: 'sig', art: renderArt(res.item), title: `${t('toast.newSig')} ${esc(res.item.name)}`, body: esc(res.item.desc), ms: 4200 });
  } else if (res.isNew) {
    setTimeout(() => {
      const r = el.getBoundingClientRect();
      sparkleBurst(r.left + r.width / 2, r.top + r.height / 2.6, 8);
    }, 160);
    toast({ kind: 'soft', body: `<b>${esc(res.item.name)}</b> · ${esc(res.item.desc)}`, ms: 2600 });
  } else {
    bounce(el, 'squash');
  }
}

function updateTop() {
  const { count, avg } = bookSummary();
  document.getElementById('book-summary').textContent = count ? t(count === 1 ? 'top.summaryOne' : 'top.summary', { n: count, avg: avg.toFixed(1) }) : t('top.noDishes');
}

boot().catch((err) => {
  console.error(err);
  document.getElementById('boot-error').hidden = false;
});
