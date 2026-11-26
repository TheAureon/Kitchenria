// recipes.js — reads the little recipe notes that every classic dish has in signatures.json,
// like  "bake(mix(flour,butter),apple)"  =  mix flour and butter, then bake that with an apple.
// Each word before a bracket is a tool action (chop, boil, bake, pipe, plate…), every other
// word is an ingredient id. The Recipe Book uses this to draw a pencil sketch of a dish you
// haven't found yet, and dev/check-classics.mjs uses it to prove every classic can be cooked.

/** Turns "boil(chop(tomato),water)" into a tree: { op:'boil', args:[{op:'chop',args:['tomato']}, 'water'] }. */
export function parseHow(text) {
  let i = 0;
  const s = String(text).replace(/\s+/g, '');
  function node() {
    const m = /^[a-z_]+/i.exec(s.slice(i));
    if (!m) throw new Error(`Recipe note "${text}" is confusing near position ${i}`);
    i += m[0].length;
    if (s[i] !== '(') return m[0];
    i++;
    const args = [node()];
    while (s[i] === ',') { i++; args.push(node()); }
    if (s[i] !== ')') throw new Error(`Recipe note "${text}" is missing a ")"`);
    i++;
    return { op: m[0], args };
  }
  const out = node();
  if (i !== s.length) throw new Error(`Recipe note "${text}" has extra bits at the end`);
  return out;
}

/** Cooks a recipe note with the food engine and returns the final item. */
export function cookHow(engine, text) {
  const run = (n) => {
    if (typeof n === 'string') {
      if (!engine.ING.has(n)) throw new Error(`Unknown ingredient "${n}" in "${text}"`);
      return engine.baseItem(n);
    }
    const items = n.args.map(run);
    const no = items.find((i) => i.refused); // a step the kitchen said no to
    if (no) return no;
    return n.op === 'plate' ? engine.plate(items) : engine.cook(n.op, items);
  };
  return run(parseHow(text));
}

/** The last step of a recipe: which action finishes it, and the ingredients that go in. */
export function howSummary(text) {
  const tree = parseHow(text);
  const ings = new Set();
  const walk = (n) => (typeof n === 'string' ? ings.add(n) : n.args.forEach(walk));
  walk(tree);
  return { op: typeof tree === 'string' ? null : tree.op, ingredients: [...ings] };
}
