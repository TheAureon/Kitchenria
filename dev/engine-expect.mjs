// Common-sense checks for the food engine: "if you do THIS, you should get THAT".
// Each line is a recipe note (see game/js/recipes.js) and what should come out:
//   'Tomato Soup'        the exact name
//   'arch:soup|stew'     the kind of result (one of these)
//   '!arch:skewers'      anything but this kind
//   'refuse'             the tool should politely refuse (it makes no sense)
//   'mess'               a funny, honest "this didn't work" result
//   '~Chicken'           the name must contain this word   ('!~Flour': must NOT contain it)
// Several checks can be combined with " & ".
// Run:  node dev/engine-expect.mjs        (add -v to see every line)
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { createEngine } from '../game/js/engine.js';
import { setStrings, t, pick } from '../game/js/i18n.js';
import { parseHow } from '../game/js/recipes.js';

const G = join(dirname(fileURLToPath(import.meta.url)), '..', 'game');
const json = (p) => JSON.parse(readFileSync(join(G, p), 'utf8'));
setStrings(json('lang/en.json'));
const E = createEngine({ ingredients: json('data/ingredients.json').ingredients, signatures: json('data/signatures.json').signatures, t, pick });

const CASES = [
  // ---------- the pot ----------
  ['boil(tomato,water)', 'arch:soup & ~Tomato'],
  ['boil(pumpkin,water)', 'arch:soup|creamySoup & ~Pumpkin'],
  ['boil(mushroom,water)', 'arch:soup & ~Mushroom'],
  ['boil(onion,water)', 'arch:soup'],
  ['boil(peas,water)', 'arch:soup'],
  ['boil(potato,water)', 'arch:boiled & ~Potato'],
  ['boil(carrot,water)', 'arch:boiled'],
  ['boil(egg,water)', 'Boiled Egg'],
  ['boil(rice,water)', 'arch:rice'],
  ['boil(water)', 'arch:boilingWater'],
  ['boil(salt,water)', 'arch:boilingWater'],
  ['boil(sugar,water)', 'arch:syrup'],
  ['boil(apple,water)', 'arch:boiled|compote'],
  ['boil(chop(apple),water)', 'arch:compote'],
  ['boil(apple,sugar,water)', 'arch:jam|compote'],
  ['fry(whisk(egg))', 'arch:omelette'],
  ['steam(mix(egg,water))', 'arch:steamed'],
  ['mash(boil(potato,kale,water))', 'arch:mash'],
  ['mash(chickpeas)', 'arch:mash'],
  ['boil(apple)', 'arch:compote'],
  ['boil(strawberry,sugar)', 'arch:jam'],
  ['boil(lemon,water)', 'arch:tea|warmDrink'],
  ['boil(lemon,honey,water)', 'arch:tea|warmDrink'],
  ['boil(ginger,water)', 'arch:tea'],
  ['boil(milk)', 'arch:hotMilk'],
  ['boil(milk,chocolate)', 'Hot Chocolate'],
  ['boil(tea_leaves,water)', 'Cup of Tea'],
  ['boil(coffee,water)', 'arch:coffee'],
  ['boil(chicken,carrot,water)', 'arch:stew|soup'],
  ['boil(chop(mix(flour,egg)),water)', 'arch:cookedPasta'],
  ['boil(oats,milk)', 'arch:porridge'],
  ['boil(fish,water)', 'arch:boiled'],
  ['boil(chocolate)', 'arch:melted'],
  ['boil(butter)', 'arch:melted'],
  // ---------- the pan & wok ----------
  ['fry(egg)', 'Fried Egg'],
  ['fry(chop(potato))', 'Fries'],
  ['fry(chicken)', 'arch:panFried & ~Chicken'],
  ['fry(chicken,lemon)', 'arch:panFried & ~Chicken'],
  ['fry(fish,lemon)', 'arch:panFried & ~Fish'],
  ['fry(fish,garlic,butter)', 'arch:panFried'],
  ['fry(onion)', 'arch:caramelized'],
  ['fry(mushroom,garlic)', 'arch:sauteed'],
  ['fry(chop(bake(mix(flour,water,yeast))))', 'arch:toast'],
  ['fry(orange,blueberry,mozzarella)', '!arch:stirfry'],
  ['fry(banana,sugar)', '!arch:stirfry'],
  ['fry(chicken,carrot,onion)', 'arch:stirfry'],
  ['wok(chicken,carrot)', 'arch:stirfry'],
  ['wok(orange,blueberry)', '!arch:stirfry'],
  ['wok(egg)', 'arch:scrambled'],
  ['fry(milk)', 'refuse'],
  ['fry(oil)', 'refuse'],
  ['fry(butter)', 'arch:brownButter'],
  ['fry(sugar,butter)', 'arch:caramel'],
  ['wok(soy_sauce)', 'refuse'],
  // ---------- the grill ----------
  ['grill(chicken)', 'arch:grilled'],
  ['grill(chicken,lemon)', 'arch:grilled'],
  ['grill(bacon,lemon,ginger)', 'arch:grilled'],
  ['grill(fish,herbs)', 'arch:grilled'],
  ['grill(chicken,onion)', 'arch:skewers'],
  ['grill(beef,bell_pepper,onion)', 'arch:skewers'],
  ['grill(corn)', 'arch:cornCob'],
  ['grill(chop(bake(mix(flour,water,yeast))))', 'arch:toast'],
  ['grill(water)', 'refuse'],
  ['grill(flour)', 'refuse'],
  ['grill(milk)', 'refuse'],
  // ---------- the oven ----------
  ['bake(potato)', 'Baked Potato'],
  ['bake(chicken)', 'arch:roast & ~Chicken'],
  ['bake(chicken,flour)', 'arch:roast & ~Chicken & !~Flour'],
  ['bake(fish,breadcrumbs)', 'arch:roast & !~Breadcrumbs'],
  ['bake(mix(flour,water,yeast))', 'Bread'],
  ['bake(mix(flour,egg,milk,butter))', '!~Flour'],
  ['bake(mix(flour,egg,milk))', '!~Flour'],
  ['bake(apple)', 'arch:baked'],
  ['bake(tomato)', 'arch:roasted'],
  ['bake(cheese)', 'arch:melted'],
  ['bake(potato,carrot,onion)', 'arch:roastVeg'],
  ['bake(mix(flour,butter),apple)', 'Apple Pie'],
  // ---------- the steamer, freezer, jar, cellar, waffle iron ----------
  ['steam(fish)', 'arch:steamed'],
  ['steam(rice,water)', 'arch:rice'],
  ['steam(water)', 'refuse'],
  ['freeze(water)', 'arch:ice'],
  ['freeze(milk,sugar)', 'arch:iceCream'],
  ['freeze(squeeze(orange))', 'arch:icePop'],
  ['freeze(fish)', 'arch:frozen'],
  ['marinate(chicken)', 'refuse'],
  ['marinate(chicken,soy_sauce)', 'arch:marinated'],
  ['marinate(cucumber,vinegar,salt)', 'arch:pickled'],
  ['marinate(water)', 'refuse'],
  ['age(milk)', 'arch:cheeseMade'],
  ['age(water)', 'refuse'],
  ['waffle(mix(flour,egg,milk))', 'arch:waffles'],
  ['waffle(water)', 'refuse'],
  // ---------- the blender ----------
  ['blend(banana,milk)', 'arch:smoothie'],
  ['blend(strawberry,blueberry,yogurt)', 'arch:smoothie'],
  ['blend(tomato,water)', 'arch:coldSoup'],
  ['blend(apricot)', 'arch:puree'],
  ['blend(orange,water)', 'arch:juice'],
  ['blend(herbs,oil,nuts)', 'arch:pesto'],
  ['blend(milk)', 'arch:frothy'],
  // ---------- hand tools ----------
  ['chop(tomato)', 'arch:chop'],
  ['chop(lemon)', 'arch:sliced'],
  ['chop(water)', 'refuse'],
  ['chop(squeeze(apricot))', 'refuse'],
  ['chop(boil(tomato,water))', 'refuse'],
  ['whisk(egg)', 'arch:whisked'],
  ['whisk(cream)', 'arch:whipped'],
  ['whisk(egg,sugar)', 'arch:meringueMix'],
  ['whisk(milk)', 'arch:frothy'],
  ['whisk(flour,egg,milk)', 'arch:pancakeBatter'],
  ['whisk(brussels_sprouts)', 'refuse'],
  ['whisk(chocolate)', 'refuse'],
  ['whisk(apple,banana)', 'refuse'],
  ['mash(boil(potato,water))', 'arch:mash'],
  ['mash(banana)', 'arch:mash'],
  ['mash(avocado,lemon)', 'arch:mash'],
  ['mash(potato)', 'refuse'],
  ['mash(water)', 'refuse'],
  ['mash(miso)', 'refuse'],
  ['mash(flour)', 'refuse'],
  ['grate(cheese)', 'arch:grated'],
  ['grate(potato)', 'arch:grated'],
  ['grate(lemon)', 'arch:zest'],
  ['grate(chocolate)', 'arch:shavings'],
  ['grate(water)', 'refuse'],
  ['grate(miso)', 'refuse'],
  ['grate(boil(tomato,water))', 'refuse'],
  ['grate(grill(chicken,onion))', 'refuse'],
  ['grind(nuts)', 'arch:nutButter'],
  ['grind(coffee)', 'arch:groundCoffee'],
  ['grind(water)', 'refuse'],
  ['roll(mix(flour,water))', 'arch:pizzaBase'],
  ['roll(chicken)', 'arch:flattened'],
  ['roll(water)', 'refuse'],
  ['peel(carrot)', 'arch:peeled'],
  ['peel(banana)', 'arch:peeled'],
  ['peel(boil(egg,water))', 'arch:peeledEgg'],
  ['peel(miso)', 'refuse'],
  ['peel(water)', 'refuse'],
  ['peel(flour)', 'refuse'],
  ['peel(egg)', 'refuse'],
  ['pipe(whisk(cream,sugar))', 'arch:rosettes'],
  ['pipe(chicken)', 'refuse'],
  ['pipe(water)', 'refuse'],
  ['rollup(water)', 'refuse'],
  ['rollup(boil(rice,water),seaweed,fish)', 'arch:sushiRoll'],
  ['mix(fish,lime,pineapple)', '!arch:fruitSalad & ~Fish'],
  ['mix(peach,corn,cream_cheese)', '!arch:fruitSalad'],
  ['mix(apple,banana,strawberry)', 'arch:fruitSalad'],
  ['mix(tomato,cucumber)', 'arch:salad'],
  ['mix(corn,lime)', 'arch:salad'],
  ['boil(zucchini,potato,ham)', 'refuse'],
  ['boil(potato)', 'refuse'],
  ['grill(chili,yeast,oats)', '!~Yeast'],
  ['rollup(apricot)', 'refuse'],
  ['rollup(radish,vanilla)', 'refuse'],
  ['rollup(fry(mix(flour,egg,milk)),banana)', 'arch:rolledWith'],
  ['roll(cinnamon)', 'refuse'],
  ['roll(cream_cheese,vinegar)', 'refuse'],
  ['roll(flour)', 'refuse'],
  // ---------- things that don't belong together ----------
  ['boil(fish,chocolate,water)', 'mess'],
  ['bake(chicken,sprinkles)', 'mess'],
  ['fry(garlic,chocolate)', 'mess'],
  ['blend(shrimp,strawberry,milk)', 'mess'],
  ['bake(bacon,maple_syrup)', '!mess'],
  ['boil(chicken,honey,soy_sauce)', '!mess'],
];

function verdict(it, want) {
  return want.split(' & ').every((w) => {
    w = w.trim();
    if (w === 'refuse') return !!it.refused;
    if (it.refused) return false;
    if (w === 'mess') return it.arch === 'mess';
    if (w === '!mess') return it.arch !== 'mess';
    if (w.startsWith('!arch:')) return !w.slice(6).split('|').includes(it.arch);
    if (w.startsWith('arch:')) return w.slice(5).split('|').includes(it.arch);
    if (w.startsWith('!~')) return !it.name.includes(w.slice(2));
    if (w.startsWith('~')) return it.name.includes(w.slice(1));
    return it.name === w;
  });
}

let bad = 0;
for (const [how, want] of CASES) {
  // cook step by step; an earlier step that refuses makes the whole recipe "refused"
  const run = (n) => {
    if (typeof n === 'string') return E.baseItem(n);
    const items = n.args.map(run);
    if (items.some((i) => i.refused)) return items.find((i) => i.refused);
    return n.op === 'plate' ? E.plate(items) : E.cook(n.op, items);
  };
  let it;
  try { it = run(parseHow(how)); } catch (e) { console.log(`✗ ${how}: ${e.message}`); bad++; continue; }
  const ok = verdict(it, want);
  const got = it.refused ? `refused ("${it.reason}")` : `${it.name} [${it.arch}]`;
  if (!ok) { bad++; console.log(`✗ ${how.padEnd(42)} wanted ${want.padEnd(28)} got ${got}`); }
  else if (process.argv.includes('-v')) console.log(`✓ ${how.padEnd(42)} ${got}`);
}
console.log(bad ? `\n${bad} of ${CASES.length} common-sense checks failed` : `All ${CASES.length} common-sense checks pass ✓`);
process.exit(bad ? 1 : 0);
