// Checks that every classic dish in signatures.json can really be cooked:
// it follows each dish's "how" recipe note with the food engine and makes sure the result
// is recognised as that classic (and not stolen by another classic higher up the list).
// Run:  node dev/check-classics.mjs        (add -v to list every dish)
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createEngine } from '../game/js/engine.js';
import { setStrings, t, pick } from '../game/js/i18n.js';
import { cookHow, parseHow } from '../game/js/recipes.js';

const G = join(dirname(fileURLToPath(import.meta.url)), '..', 'game');
const json = (p) => JSON.parse(readFileSync(join(G, p), 'utf8'));
setStrings(json('lang/en.json'));
const sigs = json('data/signatures.json').signatures;
const kitchen = json('data/kitchen.json');
const TOOL_OPS = new Set([...kitchen.handTools.filter((h) => !h.menu).map((h) => h.op), ...kitchen.appliances.map((a) => a.op)]);
const HAND_OPS = new Set(['squish', 'squeeze', 'peel', 'crack', 'tear', 'shape', 'toss', 'season', 'crumble', 'garnish']);
const E = createEngine({ ingredients: json('data/ingredients.json').ingredients, signatures: sigs, t, pick });

let bad = 0;
const ids = new Set();
for (const s of sigs) {
  if (ids.has(s.id)) { console.log(`✗ ${s.id}: the id is used twice`); bad++; }
  ids.add(s.id);
  if (!s.how) { console.log(`✗ ${s.id}: has no "how" recipe note`); bad++; continue; }
  let it;
  try { it = cookHow(E, s.how); } catch (e) { console.log(`✗ ${s.id}: ${e.message}`); bad++; continue; }
  // every step must be something a player can really do in the kitchen
  const problems = [];
  const walk = (n) => {
    if (typeof n === 'string') return E.baseItem(n);
    const items = n.args.map(walk);
    if (n.op === 'plate') { if (items.length > 4) problems.push('more than 4 things on the plate'); return E.plate(items); }
    if (items.length > kitchen.stackLimit) problems.push(`a stack of ${items.length} for ${n.op} (max ${kitchen.stackLimit})`);
    if (!TOOL_OPS.has(n.op)) {
      if (!HAND_OPS.has(n.op)) problems.push(`"${n.op}" is not a tool action`);
      else if (!E.handActions(items).includes(n.op)) problems.push(`the hands don't offer "${n.op}" for ${items.map((i) => i.name).join(' + ')}`);
    }
    return E.cook(n.op, items);
  };
  try { walk(parseHow(s.how)); } catch { /* reported above */ }
  if (problems.length) { console.log(`✗ ${s.id}: ${problems.join('; ')}`); bad++; }
  const got = it.sig || it.mainSig;
  if (got !== s.id) { console.log(`✗ ${s.id}: "${s.how}" makes ${it.name} [${it.arch}]${got ? ` = classic "${got}"` : ''}`); bad++; }
  else if (process.argv.includes('-v')) console.log(`✓ ${s.name.padEnd(28)} ${s.how}`);
  for (const id of Object.keys(it.parts)) { const g = E.ING.get(id); if (g.season && g.season !== s.season) { console.log(`✗ ${s.id}: uses ${id} (${g.season}) but its season is ${s.season || 'not set'}`); bad++; } }
}
console.log(bad ? `\n${bad} problem(s) in ${sigs.length} classics` : `All ${sigs.length} classics can be cooked ✓`);
process.exit(bad ? 1 : 0);
