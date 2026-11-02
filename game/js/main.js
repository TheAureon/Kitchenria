// main.js — starts the game: loads text, ingredients and tools, restores the save,
// then wires the pantry, the counter, the hand tools, the appliances, the critic
// and the top bar together.

import { loadLanguage, applyToPage, t } from './i18n.js';
import { loadData, toolById, db, getItem } from './data.js';
import { state, loadSave, saveNow } from './state.js';
import { cook as cookItems, serve as serveItems, renameFood, updateReview } from './kitchen.js';
import { ai, loadSavedTexts, nameFood, reviewDish } from './ai.js';
import { initAiUi, scheduleOffer, openAiPanel } from './ai-ui.js';
import { showTitle } from './title.js';
import { initShelf } from './shelf.js';
import { initTable, beginShelfDrag, beginToolDrag, useOnSelected, placeFromShelf, placeBelow, clearTable, takeSelected, refreshFood, markThinking } from './table.js';
import { initRack } from './rack.js';
import { initAppliances, drop as dropInAppliance, applianceAt, highlight, applianceRect } from './appliances.js';
import { showReview } from './review.js';
import { openBook, bookSummary } from './book.js';
import { renderArt } from './doodle.js';
import { play } from './audio.js';
import { initSound } from './sound-ui.js';
import { sparkleBurst, toast, bounce, esc } from './effects.js';

async function boot() {
  await Promise.all([loadLanguage('en'), loadData()]);
  applyToPage();
  loadSave();
  await loadSavedTexts(); // names and reviews the AI wrote before (works offline)

  initShelf({
    onTileDragStart: (id, e) => beginShelfDrag(id, e),
    onTileActivate: (id) => placeFromShelf(id),
  });
  initTable({
    useTool: (toolId, ids, op) => {
      play(HAND_SOUND[op] || TOOL_SOUND[toolId] || 'stir');
      return cookItems(op || toolById(toolId).op, ids);
    },
    handActions: (ids) => db.engine.handActions(ids.map(getItem).filter(Boolean)),
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
      // with the AI on, Madame Purrline writes her own review (the stars are already decided)
      const pending = !r.aiDone && ai.status === 'ready'
        ? reviewDish(r.dish, r.score).then((v) => { if (v) updateReview(r.dish.id, v); return v; })
        : null;
      await showReview(r, pending);
      updateTop();
    },
  });

  // --- top bar ---
  document.getElementById('btn-clear').addEventListener('click', () => clearTable());
  document.getElementById('btn-book').addEventListener('click', () => { play('click'); openBook(); });
  initSound();

  // On phones the pantry can be folded away to make room for the counter.
  document.getElementById('shelf-toggle').addEventListener('click', () => {
    const shelf = document.getElementById('shelf');
    const open = shelf.classList.toggle('folded') === false;
    document.getElementById('shelf-toggle').setAttribute('aria-expanded', String(open));
  });

  initAiUi();
  updateTop();
  window.addEventListener('pagehide', saveNow);
  document.body.classList.add('ready');

  // the title screen, then into the kitchen
  await showTitle({ openBook, openAi: openAiPanel });
  scheduleOffer();
}

const HAND_SOUND = { squeeze: 'stir', peel: 'pick', crack: 'chop', tear: 'poof', shape: 'grind', toss: 'stir', season: 'freeze', crumble: 'grind' };
const TOOL_SOUND = { hands: 'grind', knife: 'chop', whisk: 'whirr', spoon: 'stir', pin: 'grind', masher: 'grind', grater: 'chop', mortar: 'grind' };

/** With the AI on, new food gets a creative name a moment after it appears. */
function askAIName(res) {
  const it = res.item;
  if (!it || it.aiNamed || it.sig || it.kind !== 'creation' || ai.status !== 'ready') return false;
  markThinking(it.id, true);
  nameFood(it, res.inputs || [], db.engine.ING).then((named) => {
    markThinking(it.id, false);
    if (!named) return;
    renameFood(it.id, named);
    refreshFood(it.id, 'pop');
    play('discover');
    toast({ kind: 'soft', body: `✨ <b>${esc(named.name)}</b> · ${esc(named.desc)}`, ms: 3200 });
  });
  return true;
}

/** A little sparkle the first time you make something this visit; a big one for classic dishes. */
function celebrate(res, el) {
  if (!res || !el) return;
  const aiNaming = askAIName(res);
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
    if (!aiNaming) toast({ kind: 'soft', body: `<b>${esc(res.item.name)}</b> · ${esc(res.item.desc)}`, ms: 2600 });
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
