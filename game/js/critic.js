// critic.js — Madame Purrline, the food critic, tastes a plated dish.
//
// She gives 0.0 to 5.0 stars and writes a short review. Her opinion is built from:
//   * is it cooked? (raw flour, egg, potato… lose points)  * is it burnt?
//   * famous classic dishes get a bonus  * how many techniques were used
//   * ingredients that are good friends (tomato + herbs) or bad friends (fish + chocolate)
//   * balance of tastes: too salty, too bitter, too plain, sweet-and-salty…
//   * served warm, refreshingly cold, nicely plated with a side
// The same dish always gets the same review. Pure logic: no page access here.

const PAIRS = [
  ['tomato', 'herbs'], ['tomato', 'cheese'], ['tomato', 'onion'], ['tomato', 'garlic'], ['apple', 'sugar'], ['apple', 'cinnamon'],
  ['potato', 'butter'], ['potato', 'cheese'], ['egg', 'cheese'], ['egg', 'herbs'], ['egg', 'bacon'], ['lemon', 'sugar'],
  ['lemon', 'fish'], ['onion', 'cheese'], ['chocolate', 'milk'], ['chocolate', 'banana'], ['strawberry', 'cream'],
  ['garlic', 'butter'], ['garlic', 'herbs'], ['rice', 'egg'], ['chicken', 'lemon'], ['chicken', 'herbs'], ['mushroom', 'butter'],
  ['mushroom', 'garlic'], ['honey', 'yogurt'], ['carrot', 'ginger'], ['cream', 'sugar'], ['spinach', 'cheese'], ['corn', 'butter'],
  ['fish', 'herbs'], ['avocado', 'lemon'], ['coconut_milk', 'curry_powder'], ['soy_sauce', 'ginger'], ['mint', 'lemon'],
  ['tea_leaves', 'milk'], ['coffee', 'milk'], ['peach', 'cream'], ['blueberry', 'lemon'], ['oats', 'honey'], ['nuts', 'honey'],
  ['vanilla', 'cream'], ['bacon', 'tomato'], ['cheese', 'herbs'], ['butter', 'flour'], ['milk', 'egg'], ['banana', 'honey'],
  ['oil', 'herbs'], ['oil', 'tomato'], ['beans', 'tomato'], ['chili', 'beans'], ['cinnamon', 'sugar'], ['strawberry', 'sugar'],
];
const CLASHES = [
  ['fish', 'chocolate'], ['fish', 'strawberry'], ['garlic', 'chocolate'], ['onion', 'chocolate'], ['vinegar', 'milk'],
  ['soy_sauce', 'chocolate'], ['fish', 'banana'], ['curry_powder', 'strawberry'], ['coffee', 'tomato'], ['chili', 'cream'],
  ['bacon', 'strawberry'], ['onion', 'banana'], ['garlic', 'strawberry'], ['lemon', 'milk'], ['mint', 'cheese'], ['fish', 'cheese'],
];

function hash(s) { let h = 2166136261; for (const c of s) { h ^= c.charCodeAt(0); h = Math.imul(h, 16777619); } return h >>> 0; }

/**
 * @param {object} dish  a plated dish from engine.plate()
 * @param {object} ctx   { t, pick, ING }
 * @returns {{ stars:number, review:string, good:string[], bad:string[] }}
 */
export function scoreDish(dish, { t, pick, ING }) {
  const seed = dish.key;
  const parts = dish.parts;
  const name = (id) => ING.get(id)?.name || id;
  const ids = Object.keys(parts).filter((id) => !ING.get(id)?.flags?.includes('medium'));
  const total = Object.values(parts).reduce((a, b) => a + b, 0) || 1;
  const taste = dish.taste;
  let score = 2.3;
  const good = [], bad = []; // [factor, weight, vars]

  // --- cooking ---
  const rawFrac = dish.rawW / total;
  if (dish.rawW > 0.15) {
    const rawId = ids.find((id) => ING.get(id)?.flags?.includes('raw')) || ids[0];
    const pen = 1.7 * Math.min(1, rawFrac * 1.6 + 0.35);
    score -= pen; bad.push(['raw', pen, { a: name(rawId).toLowerCase() }]);
  }
  if (dish.burnt) { const pen = dish.burnt >= 2 ? 2.8 : 1.9; score -= pen; bad.push(['burnt', pen]); }
  if (dish.arch === 'lonely') { score -= 0.9; bad.push(['lonely', 1.5]); }

  // --- classics ---
  const sigName = dish.sig ? dish.name : dish.mainSig ? dish.components?.[0]?.name : null;
  if (dish.sig || dish.mainSig) { score += 1.0; good.push(['signature', 1.2, { name: sigName }]); }

  // --- technique & complexity ---
  const ops = new Set(dish.states.filter((s) => !s.startsWith('arch:') && s !== 'plate'));
  score += Math.min(0.9, ops.size * 0.3);
  if (ops.size >= 3) good.push(['technique', ops.size * 0.2]);
  const distinct = ids.length;
  if (distinct >= 2) score += Math.min(0.7, (distinct - 1) * 0.15);
  if (distinct >= 4 && dish.depth >= 3) good.push(['complex', 0.4]);
  if (distinct > 8) { score -= 0.6; bad.push(['busy', 0.6]); }

  // --- ingredient friendships ---
  let pairBonus = 0;
  for (const [a, b] of PAIRS) {
    if (parts[a] && parts[b] && pairBonus < 0.6) { pairBonus += 0.2; if (!good.some((g) => g[0] === 'pairing')) good.push(['pairing', 0.5, { a: name(a), b: name(b) }]); }
  }
  score += pairBonus;
  for (const [a, b] of CLASHES) {
    if (parts[a] && parts[b]) { score -= 0.5; bad.push(['clash', 0.7, { a: name(a), b: name(b) }]); break; }
  }

  // --- taste balance ---
  if (taste.salty > 2.4) { score -= 1; bad.push(['salty', 1]); }
  if (taste.bitter > 1.8 && !dish.burnt) { score -= 0.8; bad.push(['bitter', 0.8]); }
  if (taste.sour > 2.4) { score -= 0.6; bad.push(['sour', 0.6]); }
  if (taste.spicy > 2.6) { score -= 0.4; bad.push(['spicy', 0.4]); }
  const intensity = taste.sweet + taste.salty + taste.umami + taste.rich + taste.fresh + (taste.sour + taste.spicy) * 0.5;
  if (intensity < 2.2 && !dish.burnt && dish.arch !== 'lonely') { score -= 0.6; bad.push(['bland', 0.6]); }
  if (taste.sweet >= 1.4 && taste.salty >= 0.6 && taste.salty <= 1.8) { score += 0.3; good.push(['sweetSalty', 0.4]); }
  const balanced = ['sweet', 'salty', 'sour', 'umami', 'rich', 'fresh'].filter((k) => taste[k] >= 0.7 && taste[k] <= 2.4).length;
  if (balanced >= 3) { score += 0.4; good.push(['balance', 0.5]); }
  if (taste.sweet >= 2 && taste.umami < 1) { score += 0.3; good.push(['sweet', 0.3]); }
  if (taste.fresh >= 2 && !dish.hot) { score += 0.2; good.push(['fresh', 0.3]); }
  if (taste.rich >= 2) { score += 0.2; good.push(['rich', 0.3]); }
  if (taste.sweet >= 1.6 && taste.umami >= 1.6 && !dish.sig) { score -= 0.4; bad.push(['weird', 0.4]); }

  // --- temperature & plating ---
  if (dish.hot && !dish.burnt) { score += 0.3; good.push(['warm', 0.35]); }
  if (dish.frozen) { if (taste.sweet >= 1.2) { score += 0.3; good.push(['cool', 0.3]); } else { score -= 0.5; bad.push(['weird', 0.5]); } }
  if ((dish.components?.length || 1) >= 2) { score += 0.3; good.push(['plated', 0.25]); }

  // a pinch of personality: the same dish always gets the same nudge
  score += ((hash(seed) % 1000) / 1000 - 0.5) * 0.5;
  const stars = Math.round(Math.max(0, Math.min(5, score)) * 10) / 10;

  // --- the written review ---
  const band = stars >= 4.75 ? 5 : Math.floor(stars);
  good.sort((a, b) => b[1] - a[1]); bad.sort((a, b) => b[1] - a[1]);
  const lines = [pick(`critic.open.${band}`, seed)];
  const goods = stars >= 2.5 ? good.slice(0, 2) : good.slice(0, 1);
  const bads = stars >= 4 ? bad.slice(0, 0) : bad.slice(0, stars < 2 ? 2 : 1);
  for (const [f, , vars] of goods) lines.push(pick(`critic.good.${f}`, seed + f, vars || {}));
  for (const [f, , vars] of bads) lines.push(pick(`critic.bad.${f}`, seed + f, vars || {}));
  lines.push(pick(`critic.verdict.${band}`, seed));
  return { stars, review: lines.join(' '), good: good.map((g) => g[0]), bad: bad.map((b) => b[0]) };
}
