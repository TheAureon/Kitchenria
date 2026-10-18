// Automated browser test for Kitchenria (for development only; not part of the game).
// Run:  python3 -m http.server 8123   (in the Kitchenria folder), then
//       NODE_PATH=$(npm root -g) node dev/test-game.cjs
const { chromium } = require('playwright');
const path = require('path');
const { execSync } = require('child_process');
const BASE = process.env.BASE || 'http://localhost:8123/game/';
const SHOTS = __dirname + '/screens/';
let failures = 0;
const check = (ok, msg) => { console.log(`${ok ? '  ✓' : '  ✗'} ${msg}`); if (!ok) failures++; };

async function center(page, sel) {
  const loc = typeof sel === 'string' ? page.locator(sel).first() : sel;
  await loc.scrollIntoViewIfNeeded().catch(() => {});
  const b = await loc.boundingBox();
  if (!b) throw new Error('Not found: ' + sel);
  return [b.x + b.width / 2, b.y + b.height / 2];
}
async function mouseDrag(page, from, to) {
  await page.mouse.move(...from);
  await page.mouse.down();
  for (let i = 1; i <= 12; i++) await page.mouse.move(from[0] + ((to[0] - from[0]) * i) / 12, from[1] + ((to[1] - from[1]) * i) / 12);
  await page.mouse.up();
  await page.waitForTimeout(350);
}
const tile = (id) => `.tile[data-id="${id}"]`;
const tool = (id) => `.hand-tool[data-tool="${id}"]`;
const appliance = (id) => `.appliance[data-tool="${id}"] .appliance-drop`;
const chip = (page, name) => page.locator('#table .chip:not(.vanish)', { has: page.locator('.chip-name', { hasText: new RegExp(`^${name}$`) }) });
const chipAt = async (page, name) => center(page, chip(page, name).first());

(async () => {
  const browser = await chromium.launch();
  const errors = [];
  const watch = (p, tag) => {
    p.on('pageerror', (e) => errors.push(`${tag}: ${e.message}`));
    p.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(`${tag}: ${m.text()}`); });
  };

  // ---------------- desktop ----------------
  console.log('Desktop (mouse):');
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  watch(page, 'desktop');
  await page.goto(BASE);
  await page.waitForSelector('body.ready');
  await page.screenshot({ path: SHOTS + 'desktop-empty.png' });

  check(await page.locator('.tile').count() === 52, 'all 52 ingredients are in the pantry from the start (no unlocks)');
  check(await page.locator('.shelf-section').count() === 8, 'the pantry is sorted into 8 sections');
  check(await page.locator('.hand-tool').count() === 8, '8 hand tools hang on the wall rail');
  check(await page.locator('.appliance').count() === 10, '10 appliances on the counter (with the plate first)');

  // stacking: food on food makes a stack, nothing is combined yet
  await mouseDrag(page, await center(page, tile('flour')), [320, 560]);
  await mouseDrag(page, await center(page, tile('water')), [322, 560]);
  check(await chip(page, 'Stack of 2').count() === 1, 'water dropped on flour makes a stack (nothing combined yet)');
  await mouseDrag(page, await center(page, tile('salt')), [324, 556]);
  check(await chip(page, 'Stack of 3').count() === 1, 'adding salt makes a stack of 3');
  check((await page.locator('#table .chip.is-stack .stack-list span').allTextContents()).join(',') === 'Flour,Water,Salt', 'the stack remembers what is in it');

  // hand tools
  await mouseDrag(page, await center(page, tool('hands')), await chipAt(page, 'Stack of 3'));
  check(await chip(page, 'Dough').count() === 1, 'hands knead the stack → Dough');
  await mouseDrag(page, await center(page, tool('pin')), await chipAt(page, 'Dough'));
  check(await chip(page, 'Pizza Base').count() === 1, 'rolling pin on dough → Pizza Base');
  await page.screenshot({ path: SHOTS + 'desktop-kneading.png' });

  await mouseDrag(page, await center(page, tile('tomato')), [600, 560]);
  await mouseDrag(page, await center(page, tool('knife')), await chipAt(page, 'Tomato'));
  check(await chip(page, 'Chopped Tomato').count() === 1, 'knife on tomato → Chopped Tomato');

  // appliances cook straight away
  await mouseDrag(page, await chipAt(page, 'Chopped Tomato'), await center(page, appliance('pot')));
  await page.waitForTimeout(1100);
  check(await chip(page, 'Tomato Sauce').count() === 1, `chopped tomato into the pot → Tomato Sauce (${(await page.locator('#table .chip-name').allTextContents()).join(', ')})`);

  await mouseDrag(page, await center(page, tile('cheese')), [800, 600]);
  await mouseDrag(page, await center(page, tool('grater')), await chipAt(page, 'Cheese'));
  check(await chip(page, 'Grated Cheese').count() === 1, 'grater on cheese → Grated Cheese');

  // pizza: stack base + sauce + cheese, into the oven
  const base = await chipAt(page, 'Pizza Base');
  await mouseDrag(page, await chipAt(page, 'Tomato Sauce'), base);
  await mouseDrag(page, await chipAt(page, 'Grated Cheese'), base);
  check(await chip(page, 'Stack of 3').count() === 1, 'pizza base + sauce + cheese stacked');
  await mouseDrag(page, await chipAt(page, 'Stack of 3'), await center(page, appliance('oven')));
  await page.waitForTimeout(1100);
  check(await chip(page, 'Cheese Pizza').count() === 1, 'the stack into the oven → Cheese Pizza');
  check(await page.locator('.toast-sig').count() >= 1, 'a classic dish is celebrated');
  await page.screenshot({ path: SHOTS + 'desktop-pizza.png' });

  // tapping instead of dragging: tap egg, tap whisk; tap result, tap pan
  await page.click(tile('egg'));
  await page.waitForTimeout(300);
  await chip(page, 'Egg').click();
  check(await page.locator('#table .chip.selected').count() === 1, 'tapping food picks it up');
  await page.click(tool('whisk'));
  await page.waitForTimeout(300);
  check(await chip(page, 'Whisked Eggs').count() === 1, 'tap egg, tap whisk → Whisked Eggs');
  await chip(page, 'Whisked Eggs').click();
  await page.click(appliance('pan'));
  await page.waitForTimeout(1100);
  check(await chip(page, 'Omelette').count() === 1, 'tap whisked eggs, tap pan → Omelette');

  // keyboard: Enter on food, Enter on a hand tool
  await page.click(tile('potato'));
  await page.waitForTimeout(300);
  await chip(page, 'Potato').focus(); await page.keyboard.press('Enter');
  await page.focus(tool('grater')); await page.keyboard.press('Enter');
  await page.waitForTimeout(300);
  check(await chip(page, 'Grated Potato').count() === 1, `keyboard: potato + grater → Grated Potato (${(await page.locator('#table .chip-name').allTextContents()).join(', ')} | selected: ${await page.locator('#table .chip.selected').count()})`);
  await chip(page, 'Grated Potato').focus(); await page.keyboard.press('Enter');
  await page.focus(appliance('pan')); await page.keyboard.press('Enter');
  await page.waitForTimeout(1100);
  check(await chip(page, 'Hash Browns').count() === 1, 'keyboard: grated potato into the pan → Hash Browns');
  await page.mouse.click(900, 700);

  // the hands do many things: a menu offers what makes sense
  await mouseDrag(page, await center(page, tile('lemon')), [700, 680]);
  await mouseDrag(page, await center(page, tool('hands')), await chipAt(page, 'Lemon'));
  const menu = await page.locator('.hand-menu button[data-op]:not(.hand-cancel)').allTextContents();
  check(menu.join(',') === 'Squeeze,Peel', `hands on a lemon offer: ${menu.join(', ')}`);
  await page.click('.hand-menu [data-op="squeeze"]');
  check(await chip(page, 'Lemon Juice').count() === 1, 'squeeze → Lemon Juice');
  await mouseDrag(page, await center(page, tile('salt')), await chipAt(page, 'Hash Browns'));
  await mouseDrag(page, await center(page, tool('hands')), await chipAt(page, 'Stack of 2'));
  check(await chip(page, 'Salted Hash Browns').count() === 1, 'hands on hash browns + salt → Salted Hash Browns (only one choice, so no menu)');
  await mouseDrag(page, await center(page, tile('herbs')), [520, 680]);
  await page.click(tile('egg'));
  await page.waitForTimeout(300);
  await chip(page, 'Egg').click();
  await page.click(tool('hands'));
  check(await chip(page, 'Cracked Egg').count() === 1, 'tap egg, tap hands → Cracked Egg');
  await chip(page, 'Herbs').focus(); await page.keyboard.press('Enter');
  await page.focus(tool('hands')); await page.keyboard.press('Enter');
  check(await chip(page, 'Torn Herbs').count() === 1, 'keyboard: herbs + hands → Torn Herbs');
  await mouseDrag(page, await center(page, tile('cheese')), [420, 680]);
  await mouseDrag(page, await center(page, tool('hands')), await chipAt(page, 'Cheese'));
  check(await page.locator('.hand-menu').count() === 1, 'hands on cheese open the menu (tear or crumble)');
  await page.keyboard.press('ArrowDown'); await page.keyboard.press('Enter');
  check(await chip(page, 'Crumbled Cheese').count() === 1, 'keyboard in the menu: down, Enter → Crumbled Cheese');
  await page.screenshot({ path: SHOTS + 'desktop-hands.png' });
  for (const name of ['Lemon Juice', 'Salted Hash Browns', 'Cracked Egg', 'Torn Herbs', 'Crumbled Cheese']) {
    await chip(page, name).focus(); await page.keyboard.press('Delete');
  }
  await page.waitForTimeout(300);

  // double-click a stack to spread it out
  await mouseDrag(page, await center(page, tile('apple')), [200, 650]);
  await mouseDrag(page, await center(page, tile('banana')), [202, 650]);
  await chip(page, 'Stack of 2').dblclick();
  await page.waitForTimeout(400);
  check(await chip(page, 'Apple').count() === 1 && await chip(page, 'Banana').count() === 1, 'double-clicking a stack spreads it out');

  // stack limit
  for (let i = 0; i < 7; i++) await mouseDrag(page, await center(page, tile('sugar')), [120, 420]);
  check(await chip(page, 'Stack of 6').count() === 1, 'a stack holds at most 6 things');

  // plate & serve
  await mouseDrag(page, await chipAt(page, 'Cheese Pizza'), await center(page, appliance('plate')));
  await mouseDrag(page, await chipAt(page, 'Banana'), await center(page, appliance('plate')));
  check(await page.locator('.appliance[data-tool="plate"] .slot.full').count() === 2, 'pizza and banana on the plate');
  await page.click('.appliance[data-tool="plate"] .slot.full >> nth=1');
  await page.waitForTimeout(300);
  check(await page.locator('.appliance[data-tool="plate"] .slot.full').count() === 1 && await chip(page, 'Banana').count() === 1, 'tapping the banana on the plate takes it back');
  await page.click('.appliance[data-tool="plate"] .serve-btn');
  await page.waitForSelector('#review[open]', { timeout: 3000 });
  await page.waitForTimeout(1800);
  const dish = (await page.textContent('#review .review-dish')).trim().replace(/\s+/g, ' ');
  const score = await page.textContent('#review .review-score');
  check(/Cheese Pizza/.test(dish), `the critic reviews the dish ("${dish}")`);
  check(/^\d\.\d$/.test(score), `a star score between 0.0 and 5.0 (${score})`);
  check((await page.textContent('#review blockquote')).length > 20, 'a written review');
  await page.screenshot({ path: SHOTS + 'desktop-review.png' });
  await page.click('#review .big-btn');
  await page.waitForTimeout(400);
  check(/1 dish /.test(await page.textContent('#book-summary')), `top bar shows the dish (${await page.textContent('#book-summary')})`);

  // the recipe book keeps finished dishes only
  await page.click('#btn-book');
  await page.waitForSelector('#book[open]');
  check(await page.locator('#book .dish-card').count() === 1, 'the Recipe Book has the served dish');
  await page.click('#book [data-tab="classics"]');
  check(await page.locator('#book .classic.found').count() >= 1, 'classics collection shows Cheese Pizza');
  await page.screenshot({ path: SHOTS + 'desktop-book.png' });
  await page.keyboard.press('Escape');

  // pantry sections and search
  await page.click('[data-section="fruit"]');
  check(await page.locator('.tile').count() === 8 && await page.locator('.shelf-section').count() === 1, 'the Fruit tab shows only fruit');
  await page.click('[data-section="all"]');
  await page.fill('#shelf-search', 'pep');
  await page.waitForTimeout(100);
  const names = await page.locator('.tile .tile-name').allTextContents();
  check(names.length === 2 && names.every((n) => /pep/i.test(n)), `search "pep" (${names.join(', ')})`);
  await page.fill('#shelf-search', '');

  // saving
  await mouseDrag(page, await chipAt(page, 'Omelette'), await center(page, appliance('plate')));
  const before = await page.locator('#table .chip').count();
  await page.waitForTimeout(600);
  await page.reload();
  await page.waitForSelector('body.ready');
  check(await page.locator('#table .chip').count() === before, `after reload: the counter is the same (${before} things)`);
  check(await chip(page, 'Stack of 6').count() === 1, 'after reload: the stack is still a stack');
  check(await page.locator('.appliance[data-tool="plate"] .slot.full').count() === 1, 'after reload: the omelette is still on the plate');
  check(/1 dish /.test(await page.textContent('#book-summary')), 'after reload: the Recipe Book is kept');
  await page.screenshot({ path: SHOTS + 'desktop-after.png' });

  // ---------------- mobile (real touch events) ----------------
  console.log('Phone (touch):');
  const m = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
  const mp = await m.newPage();
  watch(mp, 'mobile');
  await mp.goto(BASE);
  await mp.waitForSelector('body.ready');
  const cdp = await m.newCDPSession(mp);
  const touchDrag = async (from, to) => {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: from[0], y: from[1] }] });
    for (let i = 1; i <= 14; i++) {
      await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: from[0] + ((to[0] - from[0]) * i) / 14, y: from[1] + ((to[1] - from[1]) * i) / 14 }] });
      await mp.waitForTimeout(16);
    }
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await mp.waitForTimeout(500);
  };
  check(await mp.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), 'nothing sticks out sideways on a phone');
  await touchDrag(await center(mp, tile('potato')), [195, 420]);
  check(await chip(mp, 'Potato').count() === 1, 'touch: pull a potato up onto the counter');
  await touchDrag(await center(mp, tool('knife')), await chipAt(mp, 'Potato'));
  check(await chip(mp, 'Chopped Potato').count() === 1, 'touch: pull the knife down onto it → Chopped Potato');
  await touchDrag(await chipAt(mp, 'Chopped Potato'), await center(mp, appliance('pan')));
  await mp.waitForTimeout(1100);
  check(await chip(mp, 'Fries').count() === 1, 'touch: into the pan → Fries');
  await mp.screenshot({ path: SHOTS + 'phone.png' });
  const g = await center(mp, '#shelf-grid');
  const sl0 = await mp.evaluate(() => document.getElementById('shelf-grid').scrollLeft);
  await touchDrag([g[0] + 120, g[1]], [g[0] - 140, g[1] + 4]);
  check(await mp.evaluate(() => document.getElementById('shelf-grid').scrollLeft) > sl0, 'touch: sideways swipe scrolls the pantry');
  const r = await center(mp, '#rack');
  const rl0 = await mp.evaluate(() => document.getElementById('rack').scrollLeft);
  await touchDrag([r[0] + 120, r[1] + 10], [r[0] - 120, r[1] + 12]);
  check(await mp.evaluate(() => document.getElementById('rack').scrollLeft) > rl0, 'touch: sideways swipe scrolls the hand tools');
  check(await mp.locator('#table .chip').count() === 1, 'touch: swiping did not drop or use anything');

  // ---------------- one-file version, opened straight from disk ----------------
  console.log('One-file index.html (double-clicked, no server):');
  let upToDate = true;
  try { execSync(`node ${__dirname}/build-standalone.mjs --check`); } catch { upToDate = false; }
  check(upToDate, 'index.html matches the game/ folder (rebuilt after the latest changes)');
  const fctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const fp = await fctx.newPage();
  watch(fp, 'file');
  await fp.goto('file://' + path.resolve(__dirname, '..', 'index.html'));
  await fp.waitForSelector('body.ready', { timeout: 5000 });
  check(await fp.locator('.tile').count() === 52, 'opens from disk with all 52 ingredients');
  check(await fp.locator('#boot-error').isHidden(), 'no "didn\'t open" message');
  await mouseDrag(fp, await center(fp, tile('tomato')), [500, 560]);
  await mouseDrag(fp, await center(fp, tool('knife')), await chipAt(fp, 'Tomato'));
  check(await chip(fp, 'Chopped Tomato').count() === 1, 'tomato + knife → Chopped Tomato');
  check(await fp.evaluate(() => document.fonts.check('16px Fredoka')), 'the cosy font is loaded');
  await fp.waitForTimeout(500);
  await fp.reload();
  await fp.waitForSelector('body.ready');
  check(await chip(fp, 'Chopped Tomato').count() === 1, 'the counter is saved between visits');

  // ---------------- art gallery ----------------
  const gp = await ctx.newPage();
  watch(gp, 'gallery');
  await gp.goto(BASE.replace('/game/', '/dev/gallery.html'));
  await gp.waitForSelector('figure');
  await gp.screenshot({ path: SHOTS + 'gallery.png', fullPage: true });

  check(errors.length === 0, `no errors or warnings in the console${errors.length ? ': ' + errors.join(' | ') : ''}`);
  await browser.close();
  console.log(failures ? `\n${failures} check(s) failed` : '\nAll checks passed!');
  process.exit(failures ? 1 : 0);
})();
