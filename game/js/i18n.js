// i18n.js — all on-screen words come from lang/<language>.json.
// t('toast.made', { a: 'Flour', b: 'Water' }) → "Flour + Water"

import { loadJSON } from './load.js';

let strings = {};

export async function loadLanguage(code = 'en') {
  strings = await loadJSON(`lang/${code}.json`);
  document.documentElement.lang = code;
}

export function t(key, vars = {}) {
  const s = strings[key] ?? key;
  return s.replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? `{${k}}`));
}

/** Fills every element that has data-i18n="key" (text) or data-i18n-attr="attr:key" (attributes). */
export function applyToPage(root = document) {
  root.querySelectorAll('[data-i18n]').forEach((el) => { el.textContent = t(el.dataset.i18n); });
  root.querySelectorAll('[data-i18n-attr]').forEach((el) => {
    for (const pair of el.dataset.i18nAttr.split(';')) {
      const [attr, key] = pair.split(':');
      el.setAttribute(attr.trim(), t(key.trim()));
    }
  });
}
