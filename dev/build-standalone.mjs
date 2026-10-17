// Packs the whole game into ONE file: Kitchenria/index.html
// That file can be double-clicked and played without a web server or Terminal.
//
//   node dev/build-standalone.mjs           → (re)builds index.html
//   node dev/build-standalone.mjs --check   → only checks index.html is up to date
//
// What it does:
//   * puts css/main.css inside a <style> tag, with the font file embedded
//   * joins all js/*.js modules into one script (each keeps its own private scope)
//   * embeds data/*.json and lang/en.json, which the game reads through js/load.js
//   * embeds any custom pictures from art/ that items.json points to
// The files in game/ stay the "source"; never edit the built index.html by hand.

import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, extname } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const GAME = join(ROOT, 'game');
const OUT = join(ROOT, 'index.html');
const read = (p) => readFileSync(join(GAME, p), 'utf8');
const MIME = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.svg': 'image/svg+xml', '.gif': 'image/gif', '.woff2': 'font/woff2' };
const dataUri = (p) => `data:${MIME[extname(p).toLowerCase()]};base64,${readFileSync(join(GAME, p)).toString('base64')}`;

// ---------- JavaScript: a tiny module joiner ----------
const IMPORT_RE = /^import\s*\{([^}]*)\}\s*from\s*'\.\/([\w-]+)\.js';\s*$/gm;
const order = [];
function visit(name, seen = new Set()) {
  if (order.includes(name)) return;
  if (seen.has(name)) throw new Error(`Circular import involving ${name}`);
  seen.add(name);
  for (const m of read(`js/${name}.js`).matchAll(IMPORT_RE)) visit(m[2], seen);
  order.push(name);
}
visit('main');

function wrapModule(name) {
  let src = read(`js/${name}.js`);
  const exported = [];
  src = src.replace(IMPORT_RE, (_, names, from) =>
    `const { ${names.split(',').map((n) => n.trim()).filter(Boolean).map((n) => n.replace(/\s+as\s+/, ': ')).join(', ')} } = __mods['${from}'];`);
  src = src.replace(/^export\s+((?:async\s+)?function\s*\*?\s*(\w+)|const\s+(\w+)|let\s+(\w+)|class\s+(\w+))/gm, (_, decl, f, c, l, k) => {
    exported.push(f || c || l || k);
    return decl;
  });
  if (/^\s*export\s/m.test(src) || /^\s*import\s/m.test(src)) throw new Error(`Unsupported import/export form in js/${name}.js`);
  return `// ===== js/${name}.js =====\n__mods['${name}'] = (() => {\n${src}\nreturn { ${exported.join(', ')} };\n})();\n`;
}
// "</script" inside the code would end the script tag early, so escape it.
const js = `'use strict';\nconst __mods = {};\n${order.map(wrapModule).join('\n')}`.replace(/<\/script/gi, '<\\/script');

// ---------- data ----------
// any custom pictures that ingredients or tools point to get packed inside as well
const embedImages = (list) => {
  for (const it of list) {
    const img = it.art?.image;
    if (img && !img.startsWith('data:')) {
      if (existsSync(join(GAME, img))) it.art.image = dataUri(img);
      else console.warn(`Picture not found for "${it.id}": game/${img} (the doodle will be used)`), delete it.art.image;
    }
  }
};
const ingredients = JSON.parse(read('data/ingredients.json'));
const kitchen = JSON.parse(read('data/kitchen.json'));
embedImages(ingredients.ingredients);
embedImages(kitchen.handTools);
embedImages(kitchen.appliances);
const packed = {
  'data/ingredients.json': ingredients,
  'data/kitchen.json': kitchen,
  'data/signatures.json': JSON.parse(read('data/signatures.json')),
  'lang/en.json': JSON.parse(read('lang/en.json')),
};
const packedJs = `window.KITCHENRIA_PACKED = ${JSON.stringify(packed)};`.replace(/<\/script/gi, '<\\/script').replace(/<!--/g, '<\\!--');

// ---------- CSS ----------
const css = read('css/main.css').replace(/url\('\.\.\/(fonts\/[\w.-]+)'\)/g, (_, p) => `url('${dataUri(p)}')`);

// ---------- HTML ----------
let html = read('index.html');
const swap = (from, to) => {
  if (!html.includes(from)) throw new Error(`Could not find in game/index.html: ${from}`);
  html = html.replace(from, () => to);
};
swap('<link rel="stylesheet" href="css/main.css">', `<style>\n${css}\n</style>`);
swap('<script type="module" src="js/main.js"></script>\n', '');
html = html.replace(/\s*<script data-web-only>[\s\S]*?<\/script>/, '');
swap('</body>', `<script>\n${packedJs}\n</script>\n<script>\n${js}\n</script>\n</body>`);
html = html.replace('<!doctype html>', '<!doctype html>\n<!--\n  Kitchenria — the one-file version. Double-click to play, no Terminal needed.\n  This file is BUILT from the game/ folder by dev/build-standalone.mjs.\n  Don\'t edit it by hand: change the files in game/ and rebuild instead.\n-->');

if (process.argv.includes('--check')) {
  const same = existsSync(OUT) && readFileSync(OUT, 'utf8') === html;
  console.log(same ? 'index.html is up to date.' : 'index.html is OUT OF DATE: run  node dev/build-standalone.mjs');
  process.exit(same ? 0 : 1);
}
writeFileSync(OUT, html);
console.log(`Built index.html (${(html.length / 1024).toFixed(0)} KB) from ${order.length} modules: ${order.join(', ')}`);
