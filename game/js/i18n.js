// i18n.js — all on-screen words come from lang/<language>.json.
// t('toast.points', { p: 5 }) → "+5 chef points"
// pick('desc.soup', 'some-seed', { x: 'Tomato' }) → one of several variants, always the same for the same seed.

import { loadJSON } from './load.js';

let strings = {};

export async function loadLanguage(code = 'en') {
  setStrings(await loadJSON(`lang/${code}.json`));
  if (typeof document !== 'undefined') document.documentElement.lang = code;
}
/** Used by tests and tools that load the language file themselves. */
export function setStrings(s) { strings = s; }

const fill = (s, vars) => s.replace(/\{(\w+)\}/g, (_, k) => (vars[k] ?? `{${k}}`));

export function t(key, vars = {}) {
  let s = strings[key] ?? key;
  if (Array.isArray(s)) s = s[0];
  return fill(s, vars);
}

/** Picks one variant from a [list] of texts, chosen by the seed so it's stable. */
export function pick(key, seed = '', vars = {}) {
  const s = strings[key];
  if (s == null) return key;
  if (!Array.isArray(s)) return fill(s, vars);
  let h = 7;
  for (const ch of `${seed}|${key}`) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return fill(s[h % s.length], vars);
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
