// Prints what the food engine makes for many combinations, so names can be checked by eye.
// Run:  node dev/engine-sample.mjs            (a list of sample recipes)
//       node dev/engine-sample.mjs random 300 (300 random combinations; finds odd names)
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createEngine } from '../game/js/engine.js';
import { setStrings, t, pick } from '../game/js/i18n.js';
import { scoreDish } from '../game/js/critic.js';

const G = join(dirname(fileURLToPath(import.meta.url)), '..', 'game');
const json = (p) => JSON.parse(readFileSync(join(G, p), 'utf8'));
setStrings(json('lang/en.json'));
const E = createEngine({ ingredients: json('data/ingredients.json').ingredients, signatures: json('data/signatures.json').signatures, t, pick });

const B = (id) => E.baseItem(id);
const show = (it) => `${it.name}${it.sig ? ' ★' : ''}  [${it.arch}/${it.form}${it.burnt ? ' burnt' : ''}${it.frozen ? ' frozen' : ''}]`;
export const cook = (op, ...items) => E.cook(op, items.map((i) => (typeof i === 'string' ? B(i) : i)));

if (process.argv[2] === 'random') {
  const ids = [...E.ING.keys()];
  const ops = ['chop', 'boil', 'fry', 'bake', 'mix', 'blend', 'grind', 'freeze', 'grill', 'marinate', 'steam', 'age'];
  let s = 12345; const rnd = () => ((s = (s * 1103515245 + 12345) % 2147483648) / 2147483648);
  const pool = ids.map(B);
  const names = new Map();
  for (let i = 0; i < +(process.argv[3] || 200); i++) {
    const op = ops[Math.floor(rnd() * ops.length)];
    const n = op === 'chop' ? 1 : 1 + Math.floor(rnd() * 3);
    const ins = Array.from({ length: n }, () => pool[Math.floor(rnd() * pool.length)]);
    try {
      const r = E.cook(op, ins);
      pool.push(r);
      names.set(r.name, `${op}(${ins.map((x) => x.name).join(' + ')})`);
      if (/undefined|\{|\}|NaN|  |^ | $/.test(r.name) || r.name.length > 42) console.log('ODD NAME:', r.name, '<=', op, ins.map((x) => x.name).join(' + '));
    } catch (e) { console.log('ERROR', op, ins.map((x) => x.name), e.message); throw e; }
  }
  for (const [n, how] of [...names].slice(0, +(process.argv[4] || 120))) console.log(n.padEnd(40), how);
  console.log(`\n${names.size} different names from ${process.argv[3] || 200} random cooks`);
} else {
  const dough = cook('mix', 'flour', 'water');
  const pasta = cook('boil', cook('chop', cook('mix', 'flour', 'egg')), 'water');
  const sauce = cook('boil', cook('chop', 'tomato'), 'onion', 'herbs');
  const bread = cook('bake', dough);
  const toast = cook('fry', cook('chop', bread));
  const samples = [
    ['chop tomato', cook('chop', 'tomato')],
    ['chop apple', cook('chop', 'apple')],
    ['chop egg', cook('chop', 'egg')],
    ['chop water', cook('chop', 'water')],
    ['mix flour+water', dough],
    ['bake dough', bread],
    ['chop bread', cook('chop', bread)],
    ['fry bread slices', toast],
    ['fry egg', cook('fry', 'egg')],
    ['boil egg+water', cook('boil', 'egg', 'water')],
    ['mix flour+egg', cook('mix', 'flour', 'egg')],
    ['pasta', pasta],
    ['tomato sauce', sauce],
    ['pasta + sauce', cook('mix', pasta, sauce)],
    ['pasta + sauce + cheese', cook('mix', pasta, sauce, cook('chop', 'cheese'))],
    ['fries', cook('fry', cook('chop', 'potato'), 'oil')],
    ['fries twice', cook('fry', cook('fry', cook('fry', cook('chop', 'potato'), 'oil')))],
    ['burnt then fry again', cook('fry', cook('fry', cook('fry', cook('fry', 'potato'))))],
    ['boiled potato', cook('boil', 'potato', 'water')],
    ['mash', cook('mix', cook('boil', 'potato', 'water'), 'butter')],
    ['baked potato', cook('bake', 'potato')],
    ['tomato soup', cook('boil', 'tomato', 'onion', 'water')],
    ['creamy soup', cook('boil', 'potato', 'onion', 'milk')],
    ['pancake batter', cook('mix', 'flour', 'egg', 'milk')],
    ['pancakes', cook('fry', cook('mix', 'flour', 'egg', 'milk'))],
    ['apple pancakes', cook('fry', cook('mix', 'flour', 'egg', 'milk'), cook('chop', 'apple'))],
    ['cake batter', cook('mix', 'flour', 'sugar', 'butter', 'egg')],
    ['bake cake batter', cook('bake', cook('mix', 'flour', 'sugar', 'butter', 'egg'), 'milk')],
    ['pastry', cook('mix', 'flour', 'butter')],
    ['apple pie', cook('bake', cook('mix', 'flour', 'butter'), cook('chop', 'apple'), 'sugar')],
    ['cookies', cook('bake', cook('mix', 'flour', 'butter', 'sugar', 'egg'))],
    ['pizza', cook('bake', dough, sauce, cook('chop', 'cheese'))],
    ['omelette', cook('fry', cook('mix', 'egg', 'cheese', 'herbs'))],
    ['salad', cook('mix', cook('chop', 'tomato'), cook('chop', 'onion'), 'herbs')],
    ['caprese', cook('mix', cook('chop', 'tomato'), cook('chop', 'cheese'), 'herbs', 'oil')],
    ['fruit salad', cook('mix', cook('chop', 'apple'), cook('chop', 'lemon'))],
    ['apple juice', cook('blend', 'apple')],
    ['lemonade', cook('mix', 'lemon', 'water', 'sugar')],
    ['warm milk', cook('boil', 'milk')],
    ['herb tea', cook('boil', 'herbs', 'water')],
    ['caramel', cook('boil', 'sugar')],
    ['caramel apple', cook('mix', cook('boil', 'sugar'), 'apple')],
    ['rice', cook('boil', 'rice', 'water')],
    ['rice pudding', cook('boil', 'rice', 'milk', 'sugar')],
    ['fried rice', cook('fry', cook('boil', 'rice', 'water'), 'egg', 'onion')],
    ['risotto', cook('boil', 'rice', 'water', 'cheese', 'onion')],
    ['ice', cook('freeze', 'water')],
    ['ice cream', cook('freeze', 'milk', 'sugar')],
    ['apple ice pop', cook('freeze', cook('blend', 'apple'))],
    ['frozen tomato', cook('freeze', 'tomato')],
    ['pickled onion', cook('marinate', cook('chop', 'onion'), 'lemon', 'salt')],
    ['aged milk', cook('age', 'milk')],
    ['aged cheese', cook('age', 'cheese')],
    ['apple vinegar', cook('age', cook('blend', 'apple'))],
    ['grilled tomato', cook('grill', 'tomato')],
    ['skewers', cook('grill', cook('chop', 'tomato'), cook('chop', 'onion'))],
    ['grilled cheese', cook('grill', cook('chop', bread), 'cheese')],
    ['french toast', cook('fry', cook('chop', bread), cook('mix', 'egg', 'milk', 'sugar'))],
    ['bruschetta', cook('mix', toast, cook('chop', 'tomato'), 'herbs')],
    ['herb butter', cook('mix', 'butter', 'herbs')],
    ['pesto', cook('grind', 'herbs', 'oil', 'cheese')],
    ['pesto pasta', cook('mix', pasta, cook('grind', 'herbs', 'oil', 'cheese'))],
    ['powdered sugar', cook('grind', 'sugar')],
    ['rice flour', cook('grind', 'rice')],
    ['gnocchi', cook('boil', cook('chop', cook('mix', cook('boil', 'potato', 'water'), 'flour')), 'water')],
    ['steam puff', cook('fry', 'water')],
    ['hot air', cook('bake', 'water')],
    ['scorched flour', cook('boil', 'flour')],
    ['sautéed onion', cook('fry', cook('chop', 'onion'), 'butter')],
    ['roast veg', cook('bake', cook('chop', 'potato'), cook('chop', 'onion'), cook('chop', 'tomato'))],
    ['mayo', cook('blend', 'egg', 'oil', 'lemon')],
    ['dressing', cook('mix', 'oil', 'lemon', 'salt')],
    ['gazpacho', cook('blend', 'tomato', 'onion', 'water', 'oil')],
    ['sweet milk', cook('mix', 'milk', 'sugar')],
  ];
  for (const [label, it] of samples) {
    const s = scoreDish(E.plate([it]), { t, pick, ING: E.ING });
    console.log(label.padEnd(24), show(it).padEnd(56), `${s.stars.toFixed(1)}★`, '·', it.desc);
  }
  const plated = E.plate([cook('fry', 'egg'), toast, cook('fry', 'tomato')]);
  const s = scoreDish(plated, { t, pick, ING: E.ING });
  console.log('\nPLATE:', plated.name, `${s.stars}★`, '\n ', s.review);
  const lonely = E.plate([B('potato')]);
  const s2 = scoreDish(lonely, { t, pick, ING: E.ING });
  console.log('PLATE:', lonely.name, `${s2.stars}★`, '\n ', s2.review);
}
