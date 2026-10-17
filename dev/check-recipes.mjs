// Checks game/data/items.json and recipes.json for mistakes.
// Run with:  node dev/check-recipes.mjs
// It reports unknown ids, duplicate pairs, items nobody can make, and
// items that can never be reached from the starter ingredients.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'game', 'data');
const items = JSON.parse(readFileSync(join(root, 'items.json'), 'utf8')).items;
const recipes = JSON.parse(readFileSync(join(root, 'recipes.json'), 'utf8')).recipes;

const problems = [];
const byId = new Map();
for (const it of items) {
  if (byId.has(it.id)) problems.push(`Duplicate item id: ${it.id}`);
  byId.set(it.id, it);
  for (const f of ['name', 'desc', 'type', 'art']) if (!it[f]) problems.push(`Item ${it.id} is missing "${f}"`);
}

const seen = new Map();
for (const [i, r] of recipes.entries()) {
  for (const k of ['a', 'b', 'makes']) {
    if (!byId.has(r[k])) problems.push(`Recipe #${i + 1}: unknown ${k} "${r[k]}"`);
  }
  const key = [r.a, r.b].sort().join(' + ');
  if (seen.has(key)) problems.push(`Recipe #${i + 1}: pair "${key}" already used by recipe #${seen.get(key) + 1}`);
  seen.set(key, i);
  if (byId.get(r.a)?.type === 'tool' && byId.get(r.b)?.type === 'tool') problems.push(`Recipe #${i + 1}: two tools`);
}

// Reachability: repeatedly apply recipes starting from the starters.
const have = new Set(items.filter((i) => i.starter).map((i) => i.id));
let grew = true;
while (grew) {
  grew = false;
  for (const r of recipes) {
    if (have.has(r.a) && have.has(r.b) && !have.has(r.makes)) { have.add(r.makes); grew = true; }
  }
}
for (const it of items) if (!have.has(it.id)) problems.push(`Item "${it.id}" can never be made from the starters`);

const tools = items.filter((i) => i.type === 'tool').length;
console.log(`${items.length} items (${have.size} reachable, ${tools} tools), ${recipes.length} recipes.`);
if (problems.length) { console.log('Problems:\n - ' + problems.join('\n - ')); process.exit(1); }
console.log('All good!');
