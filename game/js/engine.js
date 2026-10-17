// engine.js — the food engine. It decides what you get when you cook ANYTHING.
//
// There is no fixed list of recipes. Instead every ingredient has properties
// (category, taste, juicy, starchy, needs cooking…) in data/ingredients.json, and
// the rules below look at what goes into a tool and work out a sensible result:
// a name, a short description, its form (pieces, soup, cake…), its taste, whether
// it is hot, frozen or burnt, and how its doodle should look.
//
// The same inputs always give exactly the same result, so discoveries are stable.
// Famous dishes (data/signatures.json) are recognised on top and get their real names.
//
// This file never touches the page, so it can be tested on its own (dev/engine-sample.mjs).

const TASTES = ['sweet', 'salty', 'sour', 'bitter', 'umami', 'spicy', 'rich', 'fresh'];
const HEAT_OPS = new Set(['boil', 'fry', 'bake', 'grill', 'steam']);
const LIQUID_FORMS = new Set(['liquid', 'drink', 'soup', 'sauce']);
const PIECE_FORMS = new Set(['pieces', 'wedges', 'slices', 'crumbs']);

// What each form looks like when drawn (see shapes.js). Colours are filled in later.
const FORM_ART = {
  pieces: { shape: 'pieces' }, wedges: { shape: 'wedges' }, crumbs: { shape: 'crumbs' }, slices: { shape: 'slice' },
  noodles: { shape: 'nest' }, dough: { shape: 'blob' }, batter: { shape: 'bowl', top: 'swirl' }, paste: { shape: 'bowl', top: 'mound' },
  sauce: { shape: 'jar' }, soup: { shape: 'bowl' }, salad: { shape: 'bowl', top: 'dots' }, mixbowl: { shape: 'bowl', top: 'dots' },
  loaf: { shape: 'loaf' }, cake: { shape: 'cake' }, pie: { shape: 'pie' }, cookie: { shape: 'cookie' }, stack: { shape: 'stack' },
  flat: { shape: 'flat' }, pizza: { shape: 'pizza' }, eggFried: { shape: 'friedEgg' }, fries: { shape: 'fries' },
  plated: { shape: 'plate', top: 'dots' }, pasta: { shape: 'bowl', top: 'noodles' }, custard: { shape: 'ramekin' },
  icecream: { shape: 'icecream' }, ice: { shape: 'cubes' }, pop: { shape: 'icepop' }, skewer: { shape: 'skewer' },
  sandwich: { shape: 'sandwich' }, wrap: { shape: 'wrap' }, liquid: { shape: 'bowl' }, block: { shape: 'block' },
  powder: { shape: 'mound' }, lump: { shape: 'blob' }, whole: { shape: 'blob' }, drink: { shape: 'glass' }, egg: { shape: 'egg' },
  bun: { shape: 'bun' },
};

/** Small, stable hash → short id like "c3k9x2". */
export function hashKey(s) {
  let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
  for (let i = 0; i < s.length; i++) {
    const c = s.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 2654435761); h2 = Math.imul(h2 ^ c, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return 'c' + (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
}

// ---------- colour mixing ----------
const toRgb = (hex) => { const n = parseInt(hex.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const toHex = (rgb) => '#' + rgb.map((v) => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, '0')).join('');
function mixColors(list) { // [[hex, weight]]
  let tw = 0; const acc = [0, 0, 0];
  for (const [hex, w] of list) { const c = toRgb(hex); for (let i = 0; i < 3; i++) acc[i] += c[i] * w; tw += w; }
  return tw ? toHex(acc.map((v) => v / tw)) : '#e9d3a8';
}
const tint = (hex, toward, amt) => mixColors([[hex, 1 - amt], [toward, amt]]);

/**
 * @param {object} cfg
 *   ingredients: array from ingredients.json
 *   signatures:  array from signatures.json
 *   t(key, vars):           text lookup (names come from lang/en.json "food.*")
 *   pick(key, seed, vars):  picks one of several text variants (descriptions)
 */
export function createEngine({ ingredients, signatures = [], t, pick }) {
  const ING = new Map(ingredients.map((i) => [i.id, i]));
  const order = new Map(ingredients.map((i, n) => [i.id, n]));
  const w = (id) => ING.get(id)?.weight ?? 1;
  const flag = (id, f) => ING.get(id)?.flags?.includes(f);

  // ---------- building blocks ----------

  /** The item for a raw pantry ingredient. */
  function baseItem(id) {
    const g = ING.get(id);
    const taste = Object.fromEntries(TASTES.map((k) => [k, g.taste?.[k] || 0]));
    return {
      id, kind: 'ingredient', name: g.name, desc: g.desc, form: g.form, arch: 'raw',
      parts: { [id]: w(id) }, heat: 0, burnt: 0, frozen: false, rawW: flag(id, 'raw') ? w(id) : 0,
      states: [], taste, color: g.color, art: g.art, noun: true, adj: 0, subject: g.name, sig: null, depth: 0,
    };
  }

  const mergeParts = (items) => {
    const p = {};
    for (const it of items) for (const [k, v] of Object.entries(it.parts)) p[k] = +((p[k] || 0) + v).toFixed(3);
    return p;
  };
  const sortIds = (ids) => [...ids].sort((a, b) => (order.get(a) ?? 999) - (order.get(b) ?? 999) || a.localeCompare(b));

  /** The main ingredients of a mixture, biggest first, skipping water, salt and spices when possible. */
  function mains(parts, { keepSweet = false } = {}) {
    const ids = sortIds(Object.keys(parts)).sort((a, b) => parts[b] - parts[a]);
    const minor = (id) => flag(id, 'medium') || flag(id, 'seasoning') || flag(id, 'leaven') || id === 'oil' || (!keepSweet && flag(id, 'sweetener'));
    const main = ids.filter((id) => !minor(id));
    return main.length ? main : ids.filter((id) => !flag(id, 'medium')).length ? ids.filter((id) => !flag(id, 'medium')) : ids;
  }
  const joinNames = (list) => (list.length <= 1 ? list[0] || '' : t('food.and', { a: list[0], b: list[1] }));
  /** "Tomato & Onion" using each ingredient's short form (for "… Soup"). */
  const mods = (ids, n = 2) => joinNames(ids.slice(0, n).map((id) => ING.get(id).mod));
  /** "Tomato & Onion" using full names (for "Chopped …"). */
  const names = (ids, n = 2) => joinNames(ids.slice(0, n).map((id) => ING.get(id).name));

  /** What to call an item when an adjective is put in front ("Fried ___"). */
  function subj(x) {
    if (x.kind === 'ingredient' || x.noun) return x.name;
    return x.subject; // "Fried Potato" + oven → "Roasted Potato", never "Roasted Fried Potato"
  }
  /** What to call an item inside a compound name ("___ Soup"). */
  function modOf(x) {
    if (x.kind === 'ingredient') return ING.get(x.id).mod;
    if (x.noun) return x.name;
    return mods(mains(x.parts));
  }

  // ---------- describing the inputs ----------
  function context(items) {
    const parts = mergeParts(items);
    const ids = Object.keys(parts);
    const total = ids.reduce((s, id) => s + parts[id], 0) || 1;
    const catW = (c) => ids.filter((id) => ING.get(id).cat === c).reduce((s, id) => s + parts[id], 0);
    const flagW = (f) => ids.filter((id) => flag(id, f)).reduce((s, id) => s + parts[id], 0);
    const taste = mixTaste(items);
    const liquids = items.filter((i) => LIQUID_FORMS.has(i.form));
    const solids = items.filter((i) => !LIQUID_FORMS.has(i.form));
    const isBase = (i, id) => i.kind === 'ingredient' && i.id === id;
    const c = {
      items, parts, ids, total, taste, liquids, solids, n: items.length,
      has: (...list) => list.some((id) => parts[id] > 0),
      all: (...list) => list.every((id) => parts[id] > 0),
      only: (...list) => ids.every((id) => list.includes(id)),
      catW, flagW, isBase,
      item: (pred) => items.find(pred),
      count: (pred) => items.filter(pred).length,
      arch: (...a) => items.find((i) => a.includes(i.arch)),
      base: (id) => items.find((i) => isBase(i, id)),
      sweetish: taste.sweet >= 1.3 && taste.sweet > taste.umami + 0.2 && taste.sweet > taste.salty,
      mains: mains(parts),
      mainsSweet: mains(parts, { keepSweet: true }),
      water: items.some((i) => isBase(i, 'water')),
      onlyWaterLiquid: liquids.every((i) => isBase(i, 'water')),
      dairyLiquid: liquids.some((i) => i.kind === 'ingredient' && flag(i.id, 'dairy')) || items.some((i) => isBase(i, 'coconut_milk')),
      maxHeat: Math.max(0, ...items.map((i) => i.heat)),
      burnt: items.some((i) => i.burnt),
    };
    // the flavour words for a mixture, ignoring the "boring" basics
    c.flavour = (skip = []) => mods(c.mains.filter((id) => !skip.includes(id)));
    return c;
  }

  function mixTaste(items) {
    const out = Object.fromEntries(TASTES.map((k) => [k, 0]));
    let tw = 0;
    for (const it of items) {
      const wt = Object.values(it.parts).reduce((a, b) => a + b, 0) || 1;
      for (const k of TASTES) out[k] += (it.taste[k] || 0) * wt;
      tw += wt;
    }
    for (const k of TASTES) out[k] = +(out[k] / (tw || 1)).toFixed(2);
    // strong seasonings stay strong even in small amounts
    for (const it of items) for (const k of ['salty', 'spicy', 'sour']) out[k] = Math.max(out[k], (it.taste[k] || 0) * 0.6);
    return out;
  }

  // ---------- the rules: one function per kind of tool ----------
  // Each returns { arch, x, y, form, noun, prep } where arch picks the name pattern
  // "food.<arch>" in the language file, x/y fill it in, and form picks the drawing.

  const R = (arch, form, x = '', extra = {}) => ({ arch, form, x, ...extra });
  /** What kind of dough something is, even after it was rolled flat ("Pie Crust" is still pastry). */
  const dk = (i) => i.doughKind || i.arch;

  function burnCheck(c, op) {
    if (!['fry', 'bake', 'grill'].includes(op)) return null;
    if (c.items.some((i) => i.burnt >= 1)) return R('charcoal', 'lump', '', { noun: true, burnt: 2 });
    const hot = c.items.find((i) => i.heat >= 2 && !LIQUID_FORMS.has(i.form));
    if (hot) return R('burnt', hot.form in FORM_ART ? hot.form : 'lump', subj(hot), { burnt: 1 });
    return null;
  }

  const RULES = {
    chop(c) {
      const x = c.items[0];
      if (c.n > 1) return R('chop', 'pieces', names(c.mains), { prep: true });
      if (x.burnt) return R('crumbs', 'crumbs', modOf(x));
      if (x.frozen) return R('shaved', 'crumbs', subj(x), { prep: true });
      if (c.isBase(x, 'egg')) return R('cracked', 'liquid', '', { noun: true });
      if (c.isBase(x, 'cheese')) return R('grated', 'crumbs', x.name, { prep: true });
      if (x.form === 'loaf') return R('slices', 'slices', modOf(x));
      if (x.arch === 'sliceOf' || x.arch === 'bites') return R('bites', 'pieces', x.subject);
      if (['cake', 'pie', 'pizza', 'flat', 'cookie', 'stack', 'custard', 'sandwich', 'wrap'].includes(x.form)) return R('sliceOf', x.form, x.name);
      if (x.form === 'dough') {
        if (dk(x) === 'pastaDough') return R('freshPasta', 'noodles', '', { noun: true });
        if (dk(x) === 'gnocchiDough') return R('gnocchi', 'pieces', '', { noun: true, round: true });
        const fl = mods(mains(x.parts).filter((id) => !['flour', 'egg'].includes(id)));
        return fl ? R('flavNoodles', 'noodles', fl, { noun: true }) : R('noodles', 'noodles', '', { noun: true });
      }
      if (LIQUID_FORMS.has(x.form)) return R('chopLiquid', x.form, subj(x));
      if (PIECE_FORMS.has(x.form) || x.form === 'noodles') {
        const times = x.states.filter((s) => s === 'chop').length;
        return R(times >= 2 ? 'minced' : 'chopFine', 'pieces', subj(x), { prep: true });
      }
      if (x.kind === 'ingredient' && ING.get(x.id).cat === 'fruit') return R('sliced', 'wedges', x.name, { prep: true });
      return R('chop', 'pieces', subj(x), { prep: true });
    },

    grind(c) {
      if (c.has('herbs', 'spinach', 'mint') && c.has('oil')) return R('pesto', 'sauce', c.flavour(['oil', 'cheese', 'nuts', 'garlic', 'salt']) || 'Herb');
      if (c.only('herbs', 'salt', 'black_pepper', 'garlic', 'chili') && c.has('salt') && c.n > 1) return R('herbSalt', 'powder', c.flavour(['salt']));
      if (c.n === 1) {
        const x = c.items[0];
        const g = x.kind === 'ingredient' ? ING.get(x.id) : null;
        if (g?.id === 'sugar') return R('powdered', 'powder', g.name);
        if (g?.id === 'coffee') return R('groundCoffee', 'powder', '', { noun: true });
        if (g?.id === 'nuts') return R('nutButter', 'paste', '', { noun: true });
        if (g && g.cat === 'grain') return R('flourOf', 'powder', g.mod, { noun: true });
        if (g?.id === 'corn') return R('flourOf', 'powder', g.mod, { noun: true });
        if (g && (g.cat === 'spice' || g.form === 'powder')) return R('ground', 'powder', g.name);
        if (['loaf', 'slices', 'cookie', 'cake'].includes(x.form) || x.arch === 'toast') return R(x.form === 'cookie' ? 'cookieCrumbs' : 'crumbs', 'crumbs', modOf(x));
        if (x.heat > 0 && (c.has('potato', 'carrot', 'beans', 'banana', 'avocado') || x.form === 'whole' || PIECE_FORMS.has(x.form))) return R('mash', 'paste', mods(c.mains));
      }
      if (c.has('avocado', 'banana') || (c.maxHeat > 0 && c.has('potato', 'beans', 'carrot'))) return R('mash', 'paste', mods(c.mains));
      return R('paste', 'paste', mods(c.mains));
    },

    // ----- hand tools -----
    knead(c) {
      const hasFlour = c.items.some((i) => c.isBase(i, 'flour') || i.arch === 'flourOf');
      if (hasFlour) return RULES.mix(c);
      if (c.n === 1 && c.items[0].form === 'dough') return R('kneaded', 'dough', c.items[0].name, { noun: true, doughKind: dk(c.items[0]) });
      if (c.items.some((i) => ['rice', 'risotto'].includes(i.arch))) return R('riceBall', 'bun', c.flavour(['rice', 'water', 'salt']), { noun: !c.flavour(['rice', 'water', 'salt']) });
      if (c.catW('protein') > 0) return R('patty', 'flat', mods(c.mains.filter((id) => ING.get(id).cat === 'protein')));
      if (c.maxHeat > 0 && c.has('potato', 'carrot', 'beans', 'banana')) return R('mash', 'paste', mods(c.mains));
      if (c.only('butter', 'herbs', 'garlic', 'honey', 'salt', 'black_pepper', 'chili', 'lemon', 'cinnamon') && c.has('butter')) return RULES.mix(c);
      return R('squished', 'lump', c.n > 1 ? names(c.mains) : subj(c.items[0]));
    },
    whisk(c) {
      if (c.all('egg', 'oil') && c.only('egg', 'oil', 'lemon', 'vinegar', 'salt', 'black_pepper', 'garlic')) return R('mayo', 'sauce', '', { noun: true });
      if (c.only('cream', 'sugar', 'vanilla', 'honey')) return R('whipped', 'paste', ING.get('cream').name);
      if (c.has('egg') || c.has('flour') || (c.has('oil') && c.has('lemon', 'vinegar'))) {
        const r = RULES.mix(c);
        // a whisk turns a stiff dough into a pourable batter only if there's plenty of liquid
        return r;
      }
      if (c.solids.length === 0) return R('frothy', 'drink', c.n > 1 ? mods(c.mainsSweet) : modOf(c.items[0]));
      return R('whiskedThing', 'mixbowl', c.n > 1 ? names(c.mains) : subj(c.items[0]));
    },
    roll(c) {
      const x = c.items[0];
      if (c.n === 1 && x.form === 'dough') {
        const kind = dk(x);
        const map = { pastaDough: 'pastaSheets', pastryDough: 'pieCrust', cookieDough: 'rolledCookies', gnocchiDough: 'gnocchiRope' };
        return R(map[kind] || 'pizzaBase', 'dough', '', { noun: true, doughKind: kind, artForm: 'flat' });
      }
      if (c.n === 1 && ['cookie', 'loaf', 'slices'].includes(x.form)) return R(x.form === 'cookie' ? 'cookieCrumbs' : 'crumbs', 'crumbs', modOf(x));
      return R('flattened', 'flat', c.n > 1 ? names(c.mains) : subj(x));
    },
    mash(c) {
      if (c.items.some((i) => i.form === 'dough')) return RULES.knead(c);
      if (c.has('avocado', 'banana', 'potato', 'beans', 'carrot', 'strawberry', 'blueberry', 'apple', 'peach') || c.maxHeat > 0) return R('mash', 'paste', mods(c.mains));
      return R('squished', 'lump', c.n > 1 ? names(c.mains) : subj(c.items[0]));
    },
    grate(c) {
      const x = c.items[0];
      if (c.n === 1 && x.kind === 'ingredient') {
        if (['lemon', 'orange'].includes(x.id)) return R('zest', 'crumbs', ING.get(x.id).mod);
        if (x.id === 'chocolate') return R('shavings', 'crumbs', ING.get(x.id).mod);
        if (x.id === 'nuts') return RULES.grind(c);
      }
      if (c.n === 1 && ['loaf', 'slices', 'cookie'].includes(x.form)) return R('crumbs', 'crumbs', modOf(x));
      if (c.n === 1 && x.frozen) return R('shaved', 'crumbs', subj(x), { prep: true });
      return R('grated', 'crumbs', c.n > 1 ? names(c.mains) : subj(x), { prep: true });
    },

    blend(c) {
      const fruit = c.catW('fruit');
      if (c.all('egg', 'oil') && c.only('egg', 'oil', 'lemon', 'vinegar', 'salt', 'black_pepper', 'garlic')) return R('mayo', 'sauce', '', { noun: true });
      if (c.has('flour') && (c.liquids.length || c.has('egg'))) return RULES.mix(c);
      if (c.only('egg', 'salt', 'black_pepper') || (c.has('egg') && c.only('egg', 'milk', 'salt', 'black_pepper', 'cheese', 'herbs'))) return c.only('egg') ? R('whisked', 'liquid', t('food.eggs'), { prep: true }) : RULES.mix(c);
      if (c.only('cream', 'sugar', 'vanilla')) return R('whipped', 'paste', ING.get('cream').name, { noun: false });
      if (c.liquids.length && c.liquids.every((i) => c.isBase(i, 'water')) && c.solids.length === 0) return R('bubbly', 'drink', subj(c.items[0]));
      if (c.has('herbs', 'spinach', 'mint') && c.has('oil') && !fruit) return R('pesto', 'sauce', c.flavour(['oil', 'cheese', 'nuts', 'garlic', 'salt']) || 'Herb');
      if (c.items.some((i) => i.arch === 'iceCream') || (c.has('milk', 'cream', 'yogurt') && c.items.some((i) => i.frozen))) return R('milkshake', 'drink', c.flavour(['milk', 'cream', 'sugar', 'vanilla', 'yogurt']) || ING.get('vanilla').mod);
      if (fruit > 0) {
        const fl = mods(mains(c.parts).filter((id) => ING.get(id).cat === 'fruit' || ING.get(id).cat === 'veg'));
        if (c.has('milk', 'yogurt', 'cream', 'coconut_milk', 'banana') || c.items.some((i) => i.frozen) || c.count((i) => ING.get(Object.keys(i.parts)[0])?.cat === 'fruit') >= 2) return R('smoothie', 'drink', fl);
        if (c.only('apple', 'orange', 'lemon', 'peach', 'strawberry', 'blueberry', 'water', 'sugar', 'honey', 'mint')) return R('juice', 'drink', fl);
        return R('puree', 'paste', fl);
      }
      if (c.has('tomato', 'bell_pepper', 'carrot', 'spinach', 'onion', 'mushroom', 'corn', 'potato', 'beans')) {
        if (c.liquids.length || c.items.some((i) => i.form === 'soup')) return c.maxHeat > 0 ? R('soup', 'soup', mods(c.mains)) : R('coldSoup', 'soup', mods(c.mains));
        return R('puree', 'paste', mods(c.mains));
      }
      if (c.has('chocolate', 'coffee') && c.has('milk', 'cream')) return R('milkshake', 'drink', c.flavour(['milk', 'cream', 'sugar']));
      if (c.solids.length === 0) return R('frothy', 'drink', modOf(c.items[0]));
      return R('blended', 'paste', mods(c.mains));
    },

    mix(c) {
      const flour = c.items.find((i) => (c.isBase(i, 'flour')) || i.arch === 'flourOf');
      const wet = c.liquids.reduce((s, i) => s + Object.values(i.parts).reduce((a, b) => a + b, 0), 0) + (c.has('egg') ? 0.7 * (c.parts.egg || 0) : 0);
      if (c.n === 1) {
        const x = c.items[0];
        if (c.isBase(x, 'egg')) return R('whisked', 'liquid', t('food.eggs'), { prep: true });
        if (c.isBase(x, 'cream')) return R('whipped', 'paste', x.name);
        return R('stirred', x.form, subj(x), { prep: true });
      }
      if (flour) {
        const fw = Object.values(flour.parts).reduce((a, b) => a + b, 0);
        const extra = (skip) => c.flavour(['flour', 'water', 'milk', 'egg', 'sugar', 'butter', 'yeast', 'oil', ...skip]);
        if (c.items.some((i) => i.heat > 0 && i.parts.potato) && !c.liquids.length) return R('gnocchiDough', 'dough', '', { noun: true });
        if (wet > fw * 1.15) {
          if (c.has('egg') && c.has('milk', 'cream', 'yogurt', 'coconut_milk') && !c.has('butter', 'chocolate')) return R('pancakeBatter', 'batter', '', { noun: true });
          if (c.has('sugar', 'honey', 'chocolate') && c.has('butter', 'egg', 'oil')) return R('cakeBatter', 'batter', extra([]) , { noun: true });
          return extra([]) ? R('flavBatter', 'batter', extra([]), { noun: true }) : R('batter', 'batter', '', { noun: true });
        }
        if (wet === 0 && c.has('butter')) return c.has('sugar', 'honey') ? R('crumble', 'crumbs', '', { noun: true }) : R('pastryDough', 'dough', '', { noun: true });
        if (wet === 0) return R('mix', 'powder', mods(c.mainsSweet));
        if (c.has('yeast')) return extra([]) ? R('flavBreadDough', 'dough', extra([]), { noun: true }) : R('breadDough', 'dough', '', { noun: true });
        if (c.has('egg') && !c.has('water', 'milk', 'butter', 'sugar')) return R('pastaDough', 'dough', '', { noun: true });
        if (c.has('butter', 'oil') && c.has('sugar', 'honey', 'chocolate')) return R('cookieDough', 'dough', extra(['chocolate']) ? extra([]) : (c.has('chocolate') ? ING.get('chocolate').mod : ''), { noun: true });
        if (c.has('butter')) return R('pastryDough', 'dough', '', { noun: true });
        return extra([]) ? R('flavDough', 'dough', extra([]), { noun: true }) : R('dough', 'dough', '', { noun: true });
      }
      // pies & pizzas waiting for the oven
      const dough = c.items.find((i) => i.form === 'dough');
      if (dough && c.n > 1) {
        const others = c.items.filter((i) => i !== dough);
        const top = mods(mains(mergeParts(others)));
        if (dk(dough) === 'pastryDough' || dk(dough) === 'cookieDough') return R('rawPie', 'pie', top);
        if (others.some((i) => i.form === 'sauce' || i.arch === 'sauce')) return R('rawPizza', 'pizza', top);
        return R('flavDough', 'dough', top, { noun: true });
      }
      if (c.has('egg') && c.items.some((i) => c.isBase(i, 'egg') || i.arch === 'whisked' || i.arch === 'cracked')) {
        if (c.has('milk', 'cream') && c.sweetish) return R('custardBase', 'liquid', '', { noun: true });
        if (c.has('milk', 'cream') && c.only('egg', 'milk', 'cream', 'sugar', 'vanilla', 'honey')) return R('custardBase', 'liquid', '', { noun: true });
        if (!c.items.some((i) => ['slices', 'loaf'].includes(i.form) || i.arch === 'toast')) return R('omeletteMix', 'liquid', c.flavour(['egg', 'milk', 'cream', 'salt', 'black_pepper']), { noun: true });
      }
      // cooked potatoes (or carrots, beans…) mixed with butter or milk → mash
      const mashable = c.items.find((i) => i.heat > 0 && (i.parts.potato || i.parts.carrot || i.parts.beans) && !i.burnt && ['whole', 'pieces', 'plated'].includes(i.form));
      if (mashable && c.items.every((i) => i === mashable || (i.kind === 'ingredient' && ['butter', 'milk', 'cream', 'salt', 'black_pepper', 'herbs', 'garlic', 'cheese', 'oil', 'yogurt'].includes(i.id))))
        return R('mash', 'paste', mods(mains(mashable.parts)));
      // butter with flavourings
      if (c.base('butter') && c.only('butter', 'herbs', 'garlic', 'honey', 'salt', 'black_pepper', 'chili', 'lemon', 'cinnamon')) return R('compoundButter', 'block', c.flavour(['butter', 'salt']) || 'Salted');
      if (c.has('oil') && c.has('lemon', 'vinegar') && c.only('oil', 'lemon', 'vinegar', 'salt', 'black_pepper', 'herbs', 'garlic', 'honey', 'sugar', 'mint')) return R('dressing', 'sauce', c.flavour(['oil', 'vinegar', 'salt', 'black_pepper']) || mods(['vinegar']));
      // drinks
      if (c.solids.length === 0 || c.solids.every((i) => i.kind === 'ingredient' && (flag(i.id, 'sweetener') || flag(i.id, 'seasoning')))) {
        if (c.onlyWaterLiquid && c.has('sugar', 'honey') && c.solids.length) return R('syrup', 'sauce', c.has('honey') ? ING.get('honey').mod : '', { noun: true });
        if (c.has('milk')) return c.flavour(['milk', 'sugar', 'water', 'honey']) ? R('flavMilk', 'drink', c.flavour(['milk', 'sugar', 'water', 'honey'])) : R('sweetMilk', 'drink', '', { noun: true });
        return R('cooler', 'drink', mods(c.mainsSweet));
      }
      if (c.has('lemon', 'orange') && c.water && c.has('sugar', 'honey')) return R('ade', 'drink', mods(c.mains.filter((id) => ['lemon', 'orange', 'strawberry', 'peach', 'mint'].includes(id))));
      if (c.has('chocolate') && c.has('milk') && c.n === 2) return R('flavMilk', 'drink', ING.get('chocolate').mod);
      // bread things
      const bread = c.items.find((i) => i.form === 'slices' || i.arch === 'toast' || i.form === 'loaf');
      const flat = c.items.find((i) => i.form === 'flat' && ['flatbread', 'flavFlatbread'].includes(i.arch));
      const fill = (x) => mods(mains(mergeParts(c.items.filter((i) => i !== x))));
      if (bread && c.n > 1) return bread.arch === 'toast' || bread.arch === 'toasted' ? R('onToast', 'sandwich', fill(bread)) : R('sandwich', 'sandwich', fill(bread));
      if (flat && c.n > 1) return R('wrap', 'wrap', fill(flat));
      // pasta, rice
      const pasta = c.items.find((i) => ['cookedPasta', 'cookedGnocchi', 'buttered'].includes(i.arch) || (i.form === 'noodles' && i.heat > 0));
      if (pasta && c.n > 1) return R('pastaDish', 'pasta', fill(pasta) || mods(mains(pasta.parts)), { pastaName: pasta.name });
      const rice = c.items.find((i) => i.arch === 'rice');
      if (rice && c.n > 1) return R('riceBowl', 'mixbowl', fill(rice));
      if (c.has('yogurt') && c.catW('fruit') > 0) return R('parfait', 'custard', c.flavour(['yogurt', 'sugar', 'honey']));
      // fruit coated in sugar
      if (c.has('sugar', 'honey') && c.solids.every((i) => i.kind !== 'ingredient' || ING.get(i.id).cat === 'fruit' || flag(i.id, 'sweetener')) && c.catW('fruit') > 0) return R('sugared', 'wedges', names(c.mains));
      // salads: several fresh raw things
      const fresh = c.solids.filter((i) => i.heat === 0 && !i.frozen && (i.parts && Object.keys(i.parts).some((id) => ['veg', 'fruit', 'herb'].includes(ING.get(id).cat))));
      if (fresh.length >= 2 || (fresh.length >= 1 && c.items.some((i) => i.arch === 'dressing'))) {
        if (c.catW('fruit') >= c.catW('veg') && !c.has('cheese', 'onion')) return R('fruitSalad', 'salad', mods(c.mains.filter((id) => ING.get(id).cat === 'fruit')), { noun: true });
        return R('salad', 'salad', mods(c.mains.filter((id) => !['oil', 'lemon', 'vinegar'].includes(id))));
      }
      // one big thing with a little extra
      const sorted = [...c.items].sort((a, b) => b.depth - a.depth || Object.keys(b.parts).length - Object.keys(a.parts).length);
      if (sorted[0].noun && sorted[0].kind !== 'ingredient' && c.n === 2) return R('with', sorted[0].form, sorted[0].name, { y: modOf(sorted[1]) });
      return R('mix', 'mixbowl', mods(c.mainsSweet));
    },

    boil(c) {
      const liquid = c.liquids.length > 0;
      const solids = c.solids;
      if (c.n === 1 && c.isBase(c.items[0], 'water')) return R('boilingWater', 'liquid', '', { noun: true });
      const tea = c.items.filter((i) => i.kind === 'ingredient' && (flag(i.id, 'tea') || i.id === 'herbs' || i.id === 'ginger'));
      if (liquid && tea.length && c.only('water', 'milk', 'sugar', 'honey', 'lemon', 'herbs', 'mint', 'tea_leaves', 'coffee', 'ginger', 'cinnamon', 'cream', 'chocolate', 'vanilla')) {
        if (c.has('coffee')) return R('coffee', 'drink', c.has('milk', 'cream') ? t('food.withMilk') : '', { noun: true, hot: true });
        if (c.only('water', 'tea_leaves', 'sugar', 'honey', 'milk', 'lemon')) return R('cupOfTea', 'drink', '', { noun: true, hot: true });
        return R('tea', 'drink', mods(tea.map((i) => i.id).filter((id) => id !== 'tea_leaves').concat(tea.some((i) => i.id === 'tea_leaves') ? [] : [])), { hot: true });
      }
      if (!liquid) {
        if (c.only('sugar', 'butter', 'cream', 'honey')) return R('caramel', 'sauce', '', { noun: true });
        if (c.only('chocolate', 'butter', 'cream', 'sugar')) return R('melted', 'sauce', ING.get('chocolate').name);
        if (c.items.some((i) => i.arch === 'roux')) return R('roux', 'paste', '', { noun: true });
        if (c.has('flour') && c.has('butter') && c.only('flour', 'butter', 'salt')) return R('roux', 'paste', '', { noun: true });
        if (c.catW('fruit') > 0 && c.solids.every((i) => i.kind !== 'ingredient' || ['fruit'].includes(ING.get(i.id).cat) || flag(i.id, 'sweetener') || flag(i.id, 'seasoning'))) {
          const fl = mods(c.mains.filter((id) => ING.get(id).cat === 'fruit'));
          return c.has('sugar', 'honey') ? R('jam', 'sauce', fl) : R('compote', 'sauce', fl);
        }
        if (c.has('tomato', 'bell_pepper') || c.items.some((i) => i.form === 'sauce')) return R('sauce', 'sauce', mods(c.mains));
        if (c.items.some((i) => i.parts && Object.keys(i.parts).some((id) => flag(id, 'juicy'))) && c.items.some((i) => PIECE_FORMS.has(i.form))) return R('stewed', 'soup', names(c.mains));
        if (c.only('butter')) return R('melted', 'sauce', ING.get('butter').name);
        return R('scorched', solids[0]?.form in FORM_ART ? solids[0].form : 'lump', subj(solids[0] || c.items[0]), { burnt: 1 });
      }
      // with liquid
      if (solids.length === 0) {
        if (c.items.some((i) => i.arch === 'roux')) return R('bechamel', 'sauce', '', { noun: true });
        if (c.dairyLiquid || c.has('milk')) return c.has('chocolate') ? R('hotChocolate', 'drink', '', { noun: true }) : R('hotMilk', 'drink', c.flavour(['milk', 'water', 'sugar']), { hot: true });
        const juice = c.items.find((i) => i.form === 'drink');
        if (juice) return R('warmDrink', 'drink', juice.noun ? juice.name : modOf(juice), { hot: true });
        if (c.items.some((i) => i.form === 'soup' || i.form === 'sauce')) return R('simmered', c.items[0].form, subj(c.items[0]));
        return R('warmDrink', 'drink', mods(c.mains), { hot: true });
      }
      const roux = c.items.find((i) => i.arch === 'roux');
      if (roux && c.has('milk', 'cream')) return R('bechamel', 'sauce', c.flavour(['flour', 'butter', 'milk', 'cream', 'salt']) , { noun: true });
      if (c.has('chocolate') && c.dairyLiquid && c.only('chocolate', 'milk', 'cream', 'sugar', 'vanilla', 'cinnamon', 'honey')) return R('hotChocolate', 'drink', '', { noun: true });
      const noodles = c.items.find((i) => i.form === 'noodles');
      const gnocchi = c.items.find((i) => i.arch === 'gnocchi');
      const others = (x) => c.items.filter((i) => i !== x && !LIQUID_FORMS.has(i.form) && !(i.kind === 'ingredient' && flag(i.id, 'seasoning')));
      if (gnocchi && c.onlyWaterLiquid && others(gnocchi).length === 0) return R('cookedGnocchi', 'pasta', '', { noun: true, round: true });
      if (noodles) {
        if (others(noodles).length === 0 && c.onlyWaterLiquid) return R('cookedPasta', 'pasta', noodles.arch === 'freshPasta' ? t('food.pasta') : noodles.name.replace(/^Fresh /, ''), { noun: true });
        return R('noodleSoup', 'soup', mods(mains(mergeParts(others(noodles)))) || modOf(noodles), { hot: true });
      }
      if (c.base('rice') || c.items.some((i) => i.parts.rice && i.heat === 0)) {
        if (c.has('milk', 'coconut_milk', 'cream') && (c.has('sugar', 'honey', 'cinnamon', 'vanilla') || c.sweetish)) return R('ricePudding', 'custard', c.flavour(['rice', 'milk', 'sugar', 'cream']), { noun: true });
        if (c.only('rice', 'water', 'salt', 'butter', 'oil')) return R('rice', 'mixbowl', '', { noun: true });
        return R('risotto', 'mixbowl', c.flavour(['rice', 'water', 'butter', 'oil', 'salt']));
      }
      if (c.has('oats') && c.only('oats', 'water', 'milk', 'sugar', 'honey', 'salt', 'cinnamon', 'banana', 'apple', 'blueberry', 'strawberry', 'nuts', 'cream')) return R('porridge', 'mixbowl', c.flavour(['oats', 'water', 'milk', 'salt']), { noun: !c.flavour(['oats', 'water', 'milk', 'salt']) });
      if (solids.length === 1 && c.isBase(solids[0], 'egg') && c.onlyWaterLiquid) return R('boiledEgg', 'egg', '', { noun: true });
      const dumpling = c.items.find((i) => i.form === 'dough');
      if (dumpling) return R('dumplings', 'pieces', c.flavour(['flour', 'water', 'egg', 'salt']) || '', { round: true, noun: !c.flavour(['flour', 'water', 'egg', 'salt']) });
      if (c.has('milk', 'cream') && c.has('egg') && (c.sweetish || c.has('sugar', 'honey'))) return R('custard', 'custard', c.flavour(['milk', 'cream', 'egg', 'sugar', 'vanilla']), { noun: true });
      if (c.has('curry_powder')) return R('curry', 'soup', c.flavour(['curry_powder', 'coconut_milk', 'water']));
      const realSolids = solids.filter((i) => !(i.kind === 'ingredient' && flag(i.id, 'seasoning')));
      if (realSolids.length === 1 && c.onlyWaterLiquid && !c.liquids.some((i) => i.form !== 'liquid')) return R('boiled', realSolids[0].form === 'whole' ? 'whole' : realSolids[0].form, subj(realSolids[0]), { keepArt: realSolids[0] });
      if (c.catW('fruit') > c.catW('veg') && c.sweetish) return R('compote', 'sauce', mods(c.mains.filter((id) => ING.get(id).cat === 'fruit')));
      if (c.catW('protein') >= 1 || c.has('beans')) return R('stew', 'soup', mods(c.mains.filter((id) => !['water'].includes(id))));
      if (c.dairyLiquid) return R('creamySoup', 'soup', c.flavour(['milk', 'cream', 'butter', 'coconut_milk']));
      return R('soup', 'soup', mods(c.mains));
    },

    fry(c) {
      const egg = c.items.find((i) => c.isBase(i, 'egg') || i.arch === 'cracked');
      const others = (x) => c.items.filter((i) => i !== x && !['oil', 'butter', 'salt', 'black_pepper'].includes(i.kind === 'ingredient' ? i.id : ''));
      if (egg && others(egg).length === 0) return R('friedEgg', 'eggFried', '', { noun: true });
      const bread = c.items.find((i) => i.form === 'slices');
      if (bread && c.items.some((i) => ['custardBase', 'whisked', 'omeletteMix'].includes(i.arch))) return R('frenchToast', 'slices', '', { noun: true });
      if (bread && c.has('cheese') && c.only(...Object.keys(bread.parts), 'cheese', 'butter', 'oil')) return R('grilledCheese', 'sandwich', '', { noun: true });
      if (bread && others(bread).length === 0) return R('toast', 'slices', '', { noun: true });
      const omelette = c.items.find((i) => ['omeletteMix', 'whisked'].includes(i.arch));
      if (omelette) { const fl = c.flavour(['egg', 'milk', 'cream', 'salt', 'black_pepper', 'butter', 'oil']); return fl ? R('flavOmelette', 'flat', fl, { noun: true }) : R('omelette', 'flat', '', { noun: true }); }
      const batter = c.items.find((i) => i.form === 'batter');
      if (batter) {
        const fl = c.flavour(['flour', 'egg', 'milk', 'water', 'sugar', 'butter', 'oil', 'cream', 'yogurt', 'vanilla']);
        if (batter.arch === 'pancakeBatter' || batter.arch === 'cakeBatter' || c.sweetish) return fl ? R('flavPancakes', 'stack', fl, { noun: true }) : R('pancakes', 'stack', '', { noun: true });
        return R('fritters', 'plated', fl || mods(c.mains));
      }
      const dough = c.items.find((i) => i.form === 'dough');
      if (dough) return c.sweetish || dk(dough) === 'cookieDough' ? R('doughnuts', 'pieces', '', { noun: true, round: true }) : (c.flavour(['flour', 'water', 'salt', 'oil', 'butter', 'yeast', 'egg']) ? R('flavFlatbread', 'flat', c.flavour(['flour', 'water', 'salt', 'oil', 'butter', 'yeast', 'egg']), { noun: true }) : R('flatbread', 'flat', '', { noun: true }));
      const rice = c.items.find((i) => i.arch === 'rice' || i.arch === 'risotto');
      if (rice) return R('friedRice', 'mixbowl', c.flavour(['rice', 'water', 'oil', 'butter', 'salt', 'soy_sauce']), { noun: !c.flavour(['rice', 'water', 'oil', 'butter', 'salt', 'soy_sauce']) });
      const noodles = c.items.find((i) => i.form === 'noodles' || i.form === 'pasta');
      if (noodles) return R('friedNoodles', 'pasta', c.flavour(['flour', 'egg', 'water', 'oil', 'butter', 'salt']));
      if (c.only('butter')) return R('brownButter', 'sauce', '', { noun: true });
      if (c.only('sugar', 'butter', 'honey') && c.has('sugar', 'honey')) return R('caramel', 'sauce', '', { noun: true });
      if (c.solids.length === 0) {
        if (c.only('water')) return R('steamPuff', 'liquid', '', { noun: true });
        return R('sizzled', c.items[0].form, subj(c.items[0]));
      }
      const solids = c.solids.filter((i) => !(i.kind === 'ingredient' && (flag(i.id, 'seasoning') || flag(i.id, 'fat') || flag(i.id, 'sweetener'))));
      if (solids.length && solids.every((i) => i.arch === 'grated' && i.parts.potato)) return R('hashBrowns', 'flat', '', { noun: true });
      const potatoish = solids.length && solids.every((i) => i.parts.potato || i.parts.carrot) && solids.every((i) => PIECE_FORMS.has(i.form));
      if (potatoish) return c.has('potato') ? R('fries', 'fries', '', { noun: true }) : R('flavFries', 'fries', mods(c.mains));
      if (c.only('corn', 'oil', 'butter', 'salt', 'sugar')) return R('popcorn', 'crumbs', '', { noun: true });
      if (solids.length === 1 && solids[0].heat >= 1 && !solids[0].noun) return R('twice', solids[0].form, solids[0].subject);
      if (solids.length === 1 && solids[0].noun && solids[0].states.includes('fry')) return R('crispy', solids[0].form in FORM_ART ? solids[0].form : 'plated', solids[0].name);
      if (solids.length >= 2 && (c.has('soy_sauce') || solids.length >= 3)) return R('stirfry', 'plated', mods(c.mains.filter((id) => id !== 'soy_sauce')));
      if (c.only('onion', 'oil', 'butter', 'salt', 'sugar')) return R('caramelized', 'plated', t('food.onions'));
      if (c.has('cheese') && c.only('cheese', 'oil', 'butter', 'flour', 'breadcrumbs')) return R('friedCheese', 'plated', '', { noun: true });
      const x = solids[0] || c.items[0];
      const cat = x.kind === 'ingredient' ? ING.get(x.id).cat : '';
      const label = solids.length > 1 ? names(c.mains) : subj(x);
      if (cat === 'protein' || x.parts.chicken || x.parts.fish) return R('panFried', 'plated', label);
      if (cat === 'veg' || PIECE_FORMS.has(x.form) || x.form === 'whole') return R('sauteed', 'plated', label);
      return R('fried', x.form in FORM_ART ? x.form : 'plated', label);
    },

    bake(c) {
      const dough = c.items.find((i) => i.form === 'dough');
      const fl = (skip = []) => c.flavour(['flour', 'water', 'milk', 'egg', 'sugar', 'butter', 'yeast', 'oil', 'salt', 'cream', 'vanilla', ...skip]);
      const extrasAreLoose = dough && c.items.every((i) => i === dough || LIQUID_FORMS.has(i.form) || (i.kind === 'ingredient' && (flag(i.id, 'sweetener') || flag(i.id, 'seasoning') || flag(i.id, 'fat'))));
      if (dough && (c.n === 1 || extrasAreLoose) && dough.arch === 'pizzaBase') return R('flatbread', 'flat', '', { noun: true });
      if (dough && (c.n === 1 || extrasAreLoose)) {
        if (dk(dough) === 'cookieDough') return fl() ? R('flavCookies', 'cookie', fl(), { noun: true }) : R('cookies', 'cookie', '', { noun: true });
        if (dk(dough) === 'pastaDough') return R('crackers', 'cookie', '', { noun: true });
        if (dk(dough) === 'pastryDough') return R('biscuits', 'cookie', '', { noun: true });
        return fl() ? R('flavBread', 'loaf', fl(), { noun: true }) : R('bread', 'loaf', '', { noun: true });
      }
      if (dough) {
        const top = mods(mains(mergeParts(c.items.filter((i) => i !== dough))));
        if (dk(dough) === 'pastryDough' || dk(dough) === 'cookieDough') return R('pie', 'pie', top);
        if (c.items.some((i) => i.form === 'sauce')) return R('pizza', 'pizza', top);
        return R('flavBread', 'loaf', fl(), { noun: true });
      }
      const pie = c.items.find((i) => i.arch === 'rawPie');
      if (pie) return R('pie', 'pie', pie.x || modOf(pie));
      const pizza = c.items.find((i) => i.arch === 'rawPizza');
      if (pizza) return R('pizza', 'pizza', pizza.x || '');
      const batter = c.items.find((i) => i.form === 'batter');
      if (batter) {
        if (batter.arch === 'cakeBatter' || c.sweetish) return fl() ? R('flavCake', 'cake', fl(), { noun: true }) : R('cake', 'cake', '', { noun: true });
        return R('muffins', 'cake', fl() || mods(c.mains));
      }
      if (c.items.some((i) => i.arch === 'custardBase')) return R('bakedCustard', 'custard', '', { noun: true });
      if (c.items.some((i) => i.arch === 'omeletteMix' || i.arch === 'whisked')) return R('frittata', 'flat', c.flavour(['egg', 'milk', 'cream', 'salt', 'black_pepper']) || mods(['egg']));
      if (c.items.some((i) => i.form === 'pasta') && c.n >= 1) return R('pastaBake', 'pie', c.flavour(['flour', 'egg', 'water', 'salt', 'oil']));
      if (c.items.every((i) => i.form === 'slices')) return R('croutons', 'crumbs', '', { noun: true });
      if (c.items.some((i) => i.form === 'loaf')) return R('toasted', 'loaf', subj(c.items.find((i) => i.form === 'loaf')));
      if (c.has('oats') && c.has('honey', 'sugar', 'nuts')) return R('granola', 'crumbs', '', { noun: true });
      if (c.solids.length === 0) return R('hotAir', 'liquid', '', { noun: true });
      if (c.only('sugar')) return R('caramel', 'sauce', '', { noun: true });
      if (c.only('cheese')) return R('melted', 'plated', ING.get('cheese').name);
      if (c.only('flour')) return R('toasted', 'powder', ING.get('flour').name);
      const solids = c.solids.filter((i) => !(i.kind === 'ingredient' && (flag(i.id, 'seasoning') || flag(i.id, 'fat'))));
      const x = solids[0] || c.items[0];
      if (solids.length === 1 && c.isBase(x, 'potato')) return R('bakedPotato', 'whole', '', { noun: true, keepArt: x });
      if (solids.length === 1 && x.heat >= 1 && !x.noun) return R('twice', x.form, x.subject);
      if (c.catW('protein') > 0) return R('roast', 'plated', mods(c.mains));
      if (c.catW('fruit') > c.catW('veg')) return R('baked', solids.length === 1 && x.form === 'whole' ? 'whole' : 'plated', solids.length > 1 ? names(c.mains) : subj(x), { keepArt: solids.length === 1 && x.form === 'whole' ? x : null });
      if (solids.length >= 3 && c.catW('veg') > 0) return R('roastVeg', 'plated', '', { noun: true });
      return R('roasted', 'plated', solids.length > 1 ? names(c.mains) : subj(x));
    },

    grill(c) {
      const bread = c.items.find((i) => i.form === 'slices' || i.form === 'loaf');
      if (bread && c.has('cheese')) return R('grilledCheese', 'sandwich', '', { noun: true });
      if (bread && c.n === 1) return R('toast', 'slices', '', { noun: true });
      if (c.only('corn', 'butter', 'salt', 'oil')) return R('cornCob', 'whole', '', { noun: true, keepArt: c.base('corn') });
      const solids = c.solids.filter((i) => !(i.kind === 'ingredient' && (flag(i.id, 'seasoning') || flag(i.id, 'fat'))));
      if (solids.length >= 2) return R('skewers', 'skewer', mods(c.mains));
      const x = solids[0] || c.items[0];
      return R('grilled', x.form === 'whole' ? 'whole' : 'plated', subj(x), { keepArt: x.form === 'whole' ? x : null });
    },

    steam(c) {
      const dough = c.items.find((i) => i.form === 'dough');
      if (dough) { const fl = c.flavour(['flour', 'water', 'yeast', 'egg', 'salt', 'sugar']); return c.n > 1 && fl ? R('flavBuns', 'bun', fl, { noun: true }) : R('buns', 'bun', '', { noun: true }); }
      if (c.items.some((i) => i.arch === 'dumplings')) return R('steamedDumplings', 'pieces', '', { noun: true, round: true });
      if (c.base('rice')) return R('rice', 'mixbowl', '', { noun: true });
      const x = c.solids[0] || c.items[0];
      return R('steamed', x.form in FORM_ART ? x.form : 'plated', c.solids.length > 1 ? names(c.mains) : subj(x), { keepArt: x.form === 'whole' ? x : null });
    },

    freeze(c) {
      if (c.items.some((i) => i.frozen)) return R('deepFrozen', c.items[0].form, subj(c.items[0]));
      if (c.only('water')) return R('ice', 'ice', '', { noun: true });
      const sweetDairy = c.has('milk', 'cream', 'coconut_milk') && (c.sweetish || c.has('sugar', 'honey', 'chocolate')) || c.items.some((i) => ['custard', 'custardBase', 'flavMilk', 'milkshake'].includes(i.arch));
      if (sweetDairy) { const fl = c.flavour(['milk', 'cream', 'sugar', 'egg', 'honey', 'coconut_milk']); return R('iceCream', 'icecream', fl || ING.get('vanilla').mod); }
      if (c.has('yogurt')) return R('frozenYogurt', 'icecream', c.flavour(['yogurt', 'sugar', 'honey']) || '', { noun: !c.flavour(['yogurt', 'sugar', 'honey']) });
      const drink = c.items.find((i) => i.form === 'drink');
      if (drink) return R('icePop', 'pop', drink.noun ? modOf(drink) : mods(mains(drink.parts)));
      if (c.items.some((i) => ['puree', 'smoothie', 'compote', 'jam'].includes(i.arch))) return R('sorbet', 'icecream', mods(c.mains));
      const x = c.items[0];
      return R('frozen', x.form in FORM_ART ? x.form : 'lump', c.n > 1 ? names(c.mains) : subj(x), { keepArt: x.kind === 'ingredient' ? x : null });
    },

    marinate(c) {
      let solids = c.solids.filter((i) => !(i.kind === 'ingredient' && (flag(i.id, 'seasoning') || flag(i.id, 'sweetener'))));
      if (solids.some((i) => !(i.kind === 'ingredient' && flag(i.id, 'acid')))) solids = solids.filter((i) => !(i.kind === 'ingredient' && flag(i.id, 'acid')));
      const label = solids.length > 1 ? names(mains(mergeParts(solids))) : subj(solids[0] || c.items[0]);
      if (c.has('fish') && c.has('lemon', 'orange', 'vinegar')) return R('ceviche', 'mixbowl', '', { noun: true });
      if (c.catW('protein') > 0) return R('marinated', 'plated', label);
      if (c.catW('fruit') > 0 && c.has('sugar', 'honey')) return R('macerated', 'wedges', label);
      if (c.has('vinegar', 'lemon', 'salt') && c.catW('veg') > 0) return R('pickled', 'sauce', label);
      return R('marinated', (solids[0] || c.items[0]).form, label);
    },

    age(c) {
      const x = c.items[0];
      if (c.items.some((i) => i.states.includes('age'))) return R('vintage', x.form, subj(x));
      if (c.only('milk') || c.only('milk', 'salt', 'lemon', 'vinegar')) return R('cheeseMade', 'block', '', { noun: true });
      if (c.only('cream', 'salt')) return R('crème', 'paste', '', { noun: true });
      if (x.form === 'drink' && c.catW('fruit') > 0) return R('vinegarOf', 'sauce', mods(c.mains));
      if (x.form === 'loaf' || x.form === 'slices') return R('stale', x.form, subj(x));
      if (x.form === 'dough') return R('sourdough', 'dough', '', { noun: true });
      if (c.catW('protein') > 0) return R('cured', x.form === 'whole' ? 'whole' : 'plated', subj(x), { keepArt: x.kind === 'ingredient' ? x : null });
      if (c.has('salt') && c.catW('veg') > 0) return R('fermented', 'sauce', names(c.mains));
      if (x.kind === 'ingredient' && ING.get(x.id).cat === 'fruit') return R('overripe', 'whole', x.name, { keepArt: x });
      return R('aged', x.form in FORM_ART ? x.form : 'lump', c.n > 1 ? names(c.mains) : subj(x), { keepArt: x.kind === 'ingredient' ? x : null });
    },
  };

  // ---------- turning a rule result into a full item ----------

  function finish(op, items, r, key) {
    const c = context(items);
    const parts = mergeParts(items);
    const heat = HEAT_OPS.has(op) ? c.maxHeat + 1 : c.maxHeat;
    const burnt = r.burnt ?? (c.burnt ? 1 : 0);
    const frozen = op === 'freeze' ? true : HEAT_OPS.has(op) ? false : items.some((i) => i.frozen) && !['mix', 'blend', 'plate'].includes(op) ? true : false;
    let rawW = items.reduce((s, i) => s + i.rawW, 0);
    if (HEAT_OPS.has(op) || ['mayo', 'ceviche', 'cured', 'cheeseMade'].includes(r.arch)) rawW = 0; else if (op === 'marinate' || op === 'age') rawW *= 0.5;
    const states = [...new Set([...items.flatMap((i) => i.states), op, `arch:${r.arch}`])];

    // taste: start from the mix, then let the cooking change it
    const taste = { ...c.taste };
    const bump = (k, v) => { taste[k] = Math.max(0, Math.min(4, +(taste[k] + v).toFixed(2))); };
    if (op === 'fry') { bump('rich', 0.8); bump('umami', 0.3); }
    if (op === 'bake' || op === 'grill') { bump('umami', 0.4); bump('sweet', 0.2); }
    if (op === 'boil' || op === 'steam') { bump('fresh', -0.4); }
    if (op === 'marinate') { bump('sour', 0.5); bump('salty', 0.3); }
    if (op === 'age') { bump('umami', 0.8); bump('sour', 0.4); bump('fresh', -1); }
    if (op === 'freeze') { bump('fresh', 0.5); }
    if (['caramel', 'caramelized'].includes(r.arch)) { bump('sweet', 0.5); bump('bitter', 0.3); }
    if (burnt) { bump('bitter', burnt * 1.8); bump('sweet', -1); bump('fresh', -1); }

    // name and description
    const name = cleanup(t(`food.${r.arch}`, { x: r.x, y: r.y || '', pasta: r.pastaName || '' }));
    const seed = key;
    const lower = (s) => String(s || '').toLowerCase();
    const descVars = { x: lower(r.x || mods(mains(parts))), y: lower(r.y) };
    let desc = pick(`desc.${r.arch}`, seed, descVars);
    if (!desc || desc === `desc.${r.arch}`) desc = pick(`desc.op.${op}`, seed, descVars);

    // colour: the mix of the main ingredients, tinted by the cooking
    const ids = mains(parts, { keepSweet: true }).slice(0, 3);
    let color = mixColors(ids.map((id) => [ING.get(id).color, parts[id]]));
    if (['fry', 'bake', 'grill'].includes(op) && !['friedEgg', 'omelette', 'flavOmelette'].includes(r.arch)) {
      // doughs and batters turn properly golden; other things just get a little colour
      const golden = ['loaf', 'cookie', 'cake', 'pie', 'stack', 'flat', 'pizza', 'slices', 'crumbs', 'fries'].includes(r.form);
      color = tint(color, golden ? '#d48f45' : '#d99a53', golden ? 0.6 : 0.35);
    }
    if (['caramel', 'brownButter'].includes(r.arch)) color = '#d48a3a';
    if (op === 'age') color = tint(color, '#b98149', 0.2);
    if (frozen) color = tint(color, '#dff2fb', 0.3);
    if (burnt) color = tint(color, '#3b2a22', burnt >= 2 ? 0.85 : 0.6);

    const art = makeArt(r, { color, parts, c, op, heat, frozen, burnt, key });
    const item = {
      id: hashKey(key), key, kind: 'creation', name, desc, form: r.form, arch: r.arch, x: r.x,
      parts, heat, burnt, frozen, rawW: +rawW.toFixed(2), states, taste, color, art,
      noun: !!r.noun, prep: !!r.prep, adj: r.noun ? 0 : 1, doughKind: r.doughKind || (r.form === 'dough' ? r.arch : undefined),
      subject: r.noun ? name : (r.x || name), sig: null, depth: 1 + Math.max(0, ...items.map((i) => i.depth)),
      from: { op, inputs: items.map((i) => i.id) },
      hot: !frozen && heat > 0 && !burnt && op !== 'freeze',
    };
    return applySignature(item);
  }

  /** "Tomato  Soup" → "Tomato Soup", removes empty bits like " with ". */
  function cleanup(s) {
    return s.replace(/\s+/g, ' ').replace(/ (with|&|and)\s*$/i, '').replace(/^\s*(with|&)\s+/i, '').trim();
  }

  // ---------- doodles for new creations ----------
  function makeArt(r, { color, parts, c, op, frozen, burnt, key }) {
    if (r.keepArt && r.keepArt.art && !burnt) {
      const a = { ...r.keepArt.art };
      if (frozen) a.top = 'frost'; else if (HEAT_OPS.has(op)) a.top = 'steam';
      if (op === 'bake' || op === 'grill') { a.color = tint(a.color, '#b07c46', 0.35); a.top = r.arch === 'bakedPotato' ? 'pat' : 'steam'; a.topColor = '#fbe08a'; }
      if (op === 'age') a.top = 'specks', a.topColor = '#8a6a4a';
      return a;
    }
    const base = FORM_ART[r.artForm || r.form] || FORM_ART.lump;
    const a = { ...base, color, accent: tint(color, '#4a3426', 0.25) };
    // containers: the vessel colour stays friendly, the food goes inside as "fill"
    if (['bowl', 'jar', 'glass', 'mug', 'plate', 'ramekin', 'icecream', 'icepop', 'wrap', 'sandwich', 'pizza'].includes(a.shape)) {
      const vessel = { bowl: '#f2efe8', jar: '#f2efe8', glass: '#f4fafb', mug: '#f6c7a6', plate: '#f7f3ea', ramekin: '#fbf6ea', icecream: '#e9c37a', icepop: '#c99a63', wrap: '#efd09a', sandwich: '#f6e3bf', pizza: '#e8b065' }[a.shape];
      a.fill = color;
      a.color = vessel;
      if (a.shape === 'glass' || a.shape === 'jar') { a.color = color; a.accent = tint(color, '#4a3426', 0.3); }
      if (a.shape === 'pizza' || a.shape === 'sandwich' || a.shape === 'wrap') { a.color = vessel; a.accent = color; }
    }
    if (r.form === 'drink' && (r.hot || c.maxHeat > 0 || op === 'boil')) { a.shape = 'mug'; a.color = '#f6c7a6'; a.fill = color; }
    if (r.round) a.round = true;
    // garnish: the most interesting minor ingredient shows on top
    const garnish = ['herbs', 'spinach', 'mint', 'cheese', 'tomato', 'chili', 'blueberry', 'strawberry', 'nuts', 'chocolate', 'black_pepper', 'bell_pepper', 'mushroom', 'bacon']
      .find((id) => parts[id] && mains(parts)[0] !== id);
    if (burnt) { a.top = 'char'; a.topColor = '#2a1c16'; }
    else if (frozen) { a.top = 'frost'; a.topColor = '#ffffff'; }
    else if (garnish && !a.top) { a.top = ['herbs', 'spinach', 'mint', 'black_pepper'].includes(garnish) ? 'specks' : 'dots'; a.topColor = ING.get(garnish).color; }
    else if (garnish && a.top === 'dots') { a.topColor = ING.get(garnish).color; }
    else if (a.top === 'dots') { a.topColor = tint(color, '#ffffff', 0.45); }
    if (!a.top && (op === 'boil' || op === 'steam' || op === 'bake' || op === 'fry' || op === 'grill') && !['fries', 'cookie', 'crumbs'].includes(r.form)) a.top = 'steam';
    if (a.top === 'swirl' || a.top === 'mound' || a.top === 'noodles') a.topColor = a.topColor || tint(color, '#4a3426', 0.15);
    if (['sugared', 'macerated', 'powdered'].includes(r.arch)) { a.top = 'sparkle'; a.topColor = '#ffffff'; }
    if (r.arch === 'boiledEgg') { a.color = '#f4e6cf'; a.accent = '#e2cba6'; a.top = 'steam'; }
    if (r.arch === 'friedEgg') { a.color = '#fffaf0'; a.accent = '#f7b733'; delete a.top; }
    if (r.arch === 'ice') { a.color = '#dff2fb'; a.accent = '#a9d6ea'; a.top = 'frost'; }
    if (r.arch === 'charcoal') { a.color = '#2f2420'; }
    if (r.arch === 'toast' || r.arch === 'frenchToast') { a.color = '#e3b26a'; a.accent = '#b9773d'; }
    a.face = !burnt || r.arch !== 'charcoal';
    return a;
  }

  // ---------- famous dishes ----------
  function sigMatches(sig, item) {
    if (sig.arch && !sig.arch.includes(item.arch)) return false;
    const has = (req) => (Array.isArray(req) ? req.some(has) : req.startsWith('arch:') || req.startsWith('op:') ? item.states.includes(req.replace('op:', '')) || item.states.includes(req) : item.parts[req] > 0);
    if (sig.need && !sig.need.every(has)) return false;
    if (sig.not && sig.not.some(has)) return false;
    if (sig.only && !Object.keys(item.parts).every((id) => sig.only.includes(id))) return false;
    return true;
  }
  function applySignature(item) {
    const sig = signatures.find((s) => sigMatches(s, item));
    if (!sig) return item;
    return { ...item, name: sig.name, desc: sig.desc || item.desc, sig: sig.id, noun: true, adj: 0, subject: sig.name, art: sig.art ? { ...item.art, ...sig.art } : item.art };
  }

  // ---------- public ----------

  /** The stable recipe key: same tool + same inputs (in any order) = same key. */
  const keyOf = (op, items) => `${op}(${items.map((i) => i.id).sort().join(',')})`;

  /**
   * Cooks items with a tool. Returns a new item (it may have the same name as
   * something already discovered; the game merges those).
   */
  function cook(op, items) {
    if (!items.length) return null;
    const sorted = [...items].sort((a, b) => a.id.localeCompare(b.id));
    const key = keyOf(op, sorted);
    const c = context(sorted);
    const rule = RULES[op];
    if (!rule) throw new Error(`Unknown tool action: ${op}`);
    const charcoal = sorted.some((i) => i.arch === 'charcoal' || i.arch === 'stillCharcoal');
    const r = charcoal ? R('stillCharcoal', 'lump', '', { noun: true, burnt: 2 }) : burnCheck(c, op) || rule(c);
    return finish(op, sorted, r, key);
  }

  /**
   * Plating: puts 1–4 things on a plate to serve to the critic.
   * The most "dish-like" item becomes the main, the others are served with it.
   */
  function plate(items) {
    if (!items.length) return null;
    const sorted = [...items].sort((a, b) => a.id.localeCompare(b.id));
    const key = keyOf('plate', sorted);
    const dishiness = (i) => i.depth * 2 + (i.noun ? 2 : 0) + (i.heat ? 1 : 0) + (i.sig ? 3 : 0) + (['soup', 'pizza', 'pie', 'cake', 'pasta', 'stack', 'flat', 'loaf'].includes(i.form) ? 2 : 0);
    const byDish = [...sorted].sort((a, b) => dishiness(b) - dishiness(a) || a.id.localeCompare(b.id));
    const main = byDish[0], sides = byDish.slice(1);
    const label = (i) => (i.kind === 'ingredient' || i.noun ? i.name : subj(i));
    let arch, name;
    if (sides.length === 0) {
      arch = main.kind === 'ingredient' ? 'lonely' : main.burnt ? 'plateBurnt' : 'plateOne';
      name = cleanup(t(`food.${arch}`, { x: main.name }));
    } else {
      arch = 'plateWith';
      name = cleanup(t(sides.length === 1 ? 'food.plateWith' : 'food.plateWith2', { x: label(main), y: label(sides[0]), z: sides[1] ? label(sides[1]) : '' }));
      if (sides.length === 3) name = cleanup(t('food.plateFeast', { x: label(main) }));
    }
    const parts = mergeParts(sorted);
    const c = context(sorted);
    const item = {
      id: hashKey(key), key, kind: 'dish', name, arch, form: 'dish',
      desc: pick(`desc.${arch}`, key, { x: label(main), y: sides[0] ? label(sides[0]) : '' }),
      parts, heat: c.maxHeat, burnt: Math.max(...sorted.map((i) => i.burnt)), frozen: sorted.some((i) => i.frozen),
      rawW: sorted.reduce((s, i) => s + i.rawW, 0), states: [...new Set([...sorted.flatMap((i) => i.states), 'plate', `arch:${arch}`])],
      taste: c.taste, color: main.color, noun: true, adj: 0, subject: name, sig: null,
      depth: 1 + Math.max(...sorted.map((i) => i.depth)),
      art: { shape: 'portrait', layers: byDish.map((i) => i.art), hot: sorted.some((i) => i.hot) },
      from: { op: 'plate', inputs: sorted.map((i) => i.id) },
      components: byDish.map((i) => ({ id: i.id, name: i.name, arch: i.arch, form: i.form, sig: i.sig, heat: i.heat, burnt: i.burnt, frozen: i.frozen, kind: i.kind, depth: i.depth })),
      hot: sorted.some((i) => i.hot),
    };
    // a single signature dish keeps its name; a plate can also be a classic combo
    const combo = signatures.find((s) => s.arch?.includes('plateWith') && sigMatches(s, item));
    if (combo) return { ...item, name: combo.name, desc: combo.desc || item.desc, sig: combo.id };
    if (sides.length === 0 && main.sig) return { ...item, sig: null, mainSig: main.sig };
    return item;
  }

  return { baseItem, cook, plate, keyOf, mains, mods, ING, signatures };
}
