// ai-ui.js — the screens for the optional Kitchen Helper AI:
//   * a small status button in the top bar (✨ AI off / 45% / on)
//   * the AI panel: what it is, which model, download size, progress bar, turn off, delete
//   * a one-time friendly offer, so the player is asked once and can say no

import { ai, onAiChange, checkSupport, enableAI, startAI, turnOffAI, deleteModel, isDownloaded, markAsked, aiSettings } from './ai.js';
import { t } from './i18n.js';
import { esc, toast } from './effects.js';
import { play } from './audio.js';

let dlg, btn, statusEl;
let support = null;
let downloaded = false;

export function initAiUi() {
  dlg = document.getElementById('ai-panel');
  btn = document.getElementById('btn-ai');
  statusEl = document.getElementById('ai-status');
  btn.addEventListener('click', () => { play('click'); openPanel(); });
  onAiChange(() => { updateButton(); if (dlg.open) render(); });
  updateButton();

  // turn the AI back on if the player had it on last time (it loads from the device, no download)
  const s = aiSettings();
  if (s.on) startAI();
  else if (!s.asked) setTimeout(showOffer, 2500);
}

function updateButton() {
  const label = ai.status === 'ready' ? t('ai.statusOn') : ai.status === 'loading' ? `${Math.round(ai.progress * 100)}%` : ai.status === 'error' ? t('ai.statusError') : t('ai.statusOff');
  statusEl.textContent = label;
  btn.classList.toggle('on', ai.status === 'ready');
  btn.classList.toggle('busy', ai.status === 'loading');
  btn.setAttribute('aria-label', `${t('ai.title')}: ${label}`);
}

function showOffer() {
  if (aiSettings().asked || document.querySelector('.ai-offer')) return;
  const card = document.createElement('div');
  card.className = 'ai-offer';
  card.setAttribute('role', 'dialog');
  card.setAttribute('aria-label', t('ai.title'));
  card.innerHTML = `<p><strong>✨ ${esc(t('ai.offerTitle'))}</strong><span>${esc(t('ai.offerText'))}</span></p>
    <div><button type="button" class="big-btn small" data-a="more">${esc(t('ai.offerMore'))}</button>
    <button type="button" class="plain-btn" data-a="no">${esc(t('ai.offerNo'))}</button></div>`;
  card.addEventListener('click', (e) => {
    const a = e.target.closest('[data-a]')?.dataset.a;
    if (!a) return;
    markAsked();
    card.remove();
    if (a === 'more') openPanel();
  });
  document.querySelector('.scene').appendChild(card);
}

async function openPanel() {
  markAsked();
  document.querySelector('.ai-offer')?.remove();
  render();
  if (!dlg.open) dlg.showModal();
  support = await checkSupport();
  downloaded = await isDownloaded(aiSettings().choice);
  render();
}

function render() {
  const s = aiSettings();
  const choice = s.choice || 'qwen4b';
  const options = [
    { id: 'qwen4b', name: t('ai.qwen4b'), size: t('ai.qwen4bSize'), note: t('ai.recommended') },
    { id: 'qwen2b', name: t('ai.qwen2b'), size: t('ai.qwen2bSize'), note: t('ai.lighter') },
  ];
  if (support && support.chrome !== 'unavailable') options.push({ id: 'chrome', name: t('ai.chrome'), size: t('ai.chromeSize'), note: t('ai.noDownload') });
  const deviceLine = !support ? t('ai.checking')
    : support.webgpu ? t('ai.deviceOk') : t('ai.deviceNo');
  const busy = ai.status === 'loading';
  const pct = Math.round(ai.progress * 100);
  let statusHtml = '';
  if (ai.status === 'loading') statusHtml = `<div class="ai-progress"><div class="progress-track"><span style="width:${pct}%"></span></div>
      <p>${esc(t(downloaded || choice === 'chrome' ? 'ai.loading' : 'ai.downloading', { pct }))}</p><p class="ai-detail">${esc(ai.detail || '')}</p></div>`;
  else if (ai.status === 'ready') statusHtml = `<p class="ai-ok">✓ ${esc(t('ai.ready'))}</p>`;
  else if (ai.status === 'error') statusHtml = `<p class="ai-err">${esc(t(`ai.error.${ai.error}`) || t('ai.error.other'))}</p>`;

  dlg.innerHTML = `
    <div class="book ai-box">
      <header class="book-head">
        <h2 id="ai-title">✨ ${esc(t('ai.title'))}</h2>
        <form method="dialog"><button class="icon-btn" value="close" aria-label="${esc(t('book.close'))}">✕</button></form>
      </header>
      <p>${esc(t('ai.intro'))}</p>
      <ul class="ai-facts">${['ai.fact1', 'ai.fact2', 'ai.fact3', 'ai.fact4'].map((k) => `<li>${esc(t(k))}</li>`).join('')}</ul>
      <p class="ai-device">${esc(deviceLine)}</p>
      <fieldset class="ai-choices" ${busy || ai.status === 'ready' ? 'disabled' : ''}>
        <legend>${esc(t('ai.choose'))}</legend>
        ${options.map((o) => `<label class="ai-choice"><input type="radio" name="ai-model" value="${o.id}" ${o.id === choice ? 'checked' : ''}>
          <span><strong>${esc(o.name)}</strong> <em>${esc(o.note)}</em><small>${esc(o.size)}</small></span></label>`).join('')}
      </fieldset>
      ${statusHtml}
      <div class="ai-buttons">
        ${ai.status === 'ready' ? `<button type="button" class="big-btn" data-a="off">${esc(t('ai.turnOff'))}</button>`
          : `<button type="button" class="big-btn" data-a="on" ${busy || (support && !support.webgpu && choice !== 'chrome') ? 'disabled' : ''}>${esc(t(downloaded || choice === 'chrome' ? 'ai.turnOn' : 'ai.download'))}</button>`}
        ${downloaded && !busy ? `<button type="button" class="plain-btn" data-a="delete">${esc(t('ai.delete'))}</button>` : ''}
      </div>
      <p class="ai-credits">${esc(t('ai.credits'))}</p>
    </div>`;
  dlg.setAttribute('aria-labelledby', 'ai-title');
  dlg.querySelectorAll('input[name="ai-model"]').forEach((r) => r.addEventListener('change', async () => {
    aiSettings().choice = r.value;
    downloaded = await isDownloaded(r.value);
    render();
  }));
  dlg.querySelector('[data-a="on"]')?.addEventListener('click', async () => {
    const picked = dlg.querySelector('input[name="ai-model"]:checked')?.value || choice;
    const ok = await enableAI(picked);
    if (ok) { downloaded = true; play('discover'); toast({ kind: 'soft', body: esc(t('ai.readyToast')), ms: 3000 }); }
    render();
  });
  dlg.querySelector('[data-a="off"]')?.addEventListener('click', async () => { await turnOffAI(); render(); });
  dlg.querySelector('[data-a="delete"]')?.addEventListener('click', async () => {
    if (!confirm(t('ai.deleteConfirm'))) return;
    await deleteModel(aiSettings().choice);
    downloaded = false;
    toast({ kind: 'soft', body: esc(t('ai.deleted')), ms: 2500 });
    render();
  });
}
