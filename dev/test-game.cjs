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
  const loc = page.locator(sel).first();
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
const station = (id) => `.station[data-tool="${id}"] .station-drop`;
const go = (id) => `.station[data-tool="${id}"] .station-go`;
const chipNamed = (page, name) => page.locator('#table .chip:not(.vanish)', { has: page.locator('.chip-name', { hasText: new RegExp(`^${name}$`) }) });
const toStation = async (page, from, tool) => mouseDrag(page, await center(page, from), await center(page, station(tool)));

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

  check(await page.locator('.tile').count() === 16, '16 starter ingredients in the pantry');
  check(await page.locator('.station:not(.locked)').count() === 6, '6 tools ready (knife, pot, pan, oven, bowl, plate)');
  check(await page.locator('.station.locked').count() === 7, '7 tools locked until later ranks');

  // knife works instantly
  await toStation(page, tile('tomato'), 'knife');
  await page.waitForTimeout(500);
  check(await chipNamed(page, 'Chopped Tomato').count() === 1, 'tomato into the knife → Chopped Tomato on the counter');
  check(await page.locator('.toast-new').count() >= 1, 'new creation message shown');
  check(await page.locator(tile(await chipNamed(page, 'Chopped Tomato').getAttribute('data-id'))).count() === 1, 'Chopped Tomato added to the pantry');

  // pot collects things, Boil! cooks them
  await toStation(page, tile('potato'), 'pot');
  await toStation(page, tile('water'), 'pot');
  check(await page.locator('.station[data-tool="pot"] .slot.full').count() === 2, 'pot holds potato + water');
  await page.click(go('pot'));
  await page.waitForTimeout(1100);
  check(await chipNamed(page, 'Boiled Potato').count() === 1, 'Boil! → Boiled Potato');
  check(await page.locator('.station[data-tool="pot"] .slot.full').count() === 0, 'pot is empty again');

  // mixing two things on the counter
  await mouseDrag(page, await center(page, tile('flour')), [300, 560]);
  await mouseDrag(page, await center(page, tile('water')), [304, 562]);
  check(await chipNamed(page, 'Dough').count() === 1, 'water dropped on flour → Dough');

  // dough into the oven
  await mouseDrag(page, await center(page, '#table .chip[data-id] >> text=Dough'), await center(page, station('oven')));
  await page.click(go('oven'));
  await page.waitForTimeout(1100);
  check(await chipNamed(page, 'Bread').count() === 1, 'Bake! → Bread');
  await page.screenshot({ path: SHOTS + 'desktop-cooking.png' });

  // tap to pick up, tap a tool: fried egg
  await page.click(tile('egg'));
  await page.waitForTimeout(300);
  await chipNamed(page, 'Egg').click();
  check(await page.locator('#table .chip.selected').count() === 1, 'tapping food picks it up');
  await page.click(station('pan'));
  await page.click(go('pan'));
  await page.waitForTimeout(1100);
  check(await chipNamed(page, 'Fried Egg').count() === 1, 'tap egg, tap pan, Fry! → Fried Egg');

  // keyboard: Enter on a chip, Enter on a tool
  await page.click(tile('apple'));
  await page.waitForTimeout(300);
  await chipNamed(page, 'Apple').focus(); await page.keyboard.press('Enter');
  await page.focus(station('knife')); await page.keyboard.press('Enter');
  await page.waitForTimeout(700);
  check(await chipNamed(page, 'Sliced Apple').count() === 1, 'keyboard: apple + knife → Sliced Apple');

  // taking something back out of a tool
  await toStation(page, tile('salt'), 'pan');
  await page.click('.station[data-tool="pan"] .slot.full');
  await page.waitForTimeout(400);
  check(await page.locator('.station[data-tool="pan"] .slot.full').count() === 0 && await chipNamed(page, 'Salt').count() === 1, 'tapping a filled slot puts it back on the counter');

  // a full tool says no
  for (const id of ['sugar', 'sugar', 'sugar', 'sugar', 'sugar']) await toStation(page, tile(id), 'bowl');
  check(await page.locator('.station[data-tool="bowl"] .slot.full').count() === 4, 'the bowl holds at most 4 things');
  for (let i = 0; i < 4; i++) { await page.click('.station[data-tool="bowl"] .slot.full'); await page.waitForTimeout(150); }

  // serve to the critic
  await mouseDrag(page, await center(page, '#table .chip >> text=Fried Egg'), await center(page, station('plate')));
  await mouseDrag(page, await center(page, '#table .chip >> text=Chopped Tomato'), await center(page, station('plate')));
  await page.click(go('plate'));
  await page.waitForSelector('#review[open]', { timeout: 3000 });
  await page.waitForTimeout(1800);
  const dish = await page.textContent('#review .review-dish');
  const score = await page.textContent('#review .review-score');
  check(/Fried Egg/.test(dish), `the critic reviews the plated dish ("${dish.trim().replace(/\s+/g, ' ')}")`);
  check(/^\d\.\d$/.test(score) && +score >= 0 && +score <= 5, `a star score between 0.0 and 5.0 (${score})`);
  check((await page.textContent('#review blockquote')).length > 20, 'a written review');
  await page.screenshot({ path: SHOTS + 'desktop-review.png' });
  await page.click('#review .big-btn');
  await page.waitForTimeout(400);
  check(!(await page.locator('#review[open]').count()), 'the review closes');

  // cookbook
  await page.click('#btn-book');
  await page.waitForSelector('#cookbook[open]');
  check(await page.locator('#cookbook .dish-card').count() === 1, 'the cookbook lists the served dish');
  await page.click('#cookbook [data-tab="ranks"]');
  check(await page.locator('#cookbook .rank-row').count() === 10, 'the cookbook shows 10 chef ranks');
  await page.click('#cookbook [data-tab="classics"]');
  check(await page.locator('#cookbook .classic').count() > 50, 'the classics collection is listed');
  await page.screenshot({ path: SHOTS + 'desktop-cookbook.png' });
  await page.keyboard.press('Escape');

  // rank up after enough points
  const rank = await page.textContent('#rank-name');
  check(rank === 'Prep Cook', `ranked up to Prep Cook (${rank}; ${await page.textContent('#rank-points')})`);
  check(await page.locator('.station[data-tool="blender"]:not(.locked)').count() === 1, 'rank 2 unlocks the blender');
  check(await page.locator(tile('carrot')).count() === 1, 'rank 2 unlocks the garden basket (carrot)');

  // a classic dish: pasta with tomato sauce
  const cookTo = async (tool, ids) => {
    for (const id of ids) await toStation(page, id.startsWith('.') || id.startsWith('#') ? id : tile(id), tool);
    if (tool !== 'knife') await page.click(go(tool));
    await page.waitForTimeout(1100);
  };
  await page.click('#btn-clear'); await page.waitForTimeout(400);
  await cookTo('bowl', ['flour', 'egg']);                       // pasta dough
  await cookTo('knife', ['#table .chip >> text=Pasta Dough']);  // fresh pasta
  await cookTo('pot', ['#table .chip >> text=Fresh Pasta', 'water']);
  await cookTo('knife', ['tomato']);
  await cookTo('pot', ['#table .chip >> text=Chopped Tomato', 'onion']);
  const sauce = await page.locator('#table .chip-name', { hasText: 'Sauce' }).first().textContent();
  await mouseDrag(page, await center(page, `#table .chip >> text=${sauce}`), await center(page, '#table .chip >> text=/^Pasta$/'));
  check(await chipNamed(page, 'Spaghetti Pomodoro').count() === 1, `pasta + ${sauce} → Spaghetti Pomodoro (a classic)`);
  check(await page.locator('.toast-sig').count() >= 1, 'classic dish celebration shown');
  await page.screenshot({ path: SHOTS + 'desktop-classic.png' });

  // search
  await page.fill('#shelf-search', 'toma');
  await page.waitForTimeout(100);
  const names = await page.locator('.tile .tile-name').allTextContents();
  check(names.length >= 2 && names.every((n) => /toma/i.test(n)), `search "toma" (${names.join(', ')})`);
  await page.fill('#shelf-search', '');
  await page.click('[data-filter="signature"]');
  check(await page.locator('.tile').count() >= 1, 'Classics filter shows Spaghetti Pomodoro');
  await page.click('[data-filter="all"]');

  // saving
  await toStation(page, tile('cheese'), 'oven');
  const before = await page.textContent('#creations-text');
  await page.waitForTimeout(600);
  await page.reload();
  await page.waitForSelector('body.ready');
  check(await page.textContent('#creations-text') === before, `after reload: same creations count (${before})`);
  check(await page.textContent('#rank-name') === 'Prep Cook', 'after reload: rank kept');
  check(await page.locator('.station[data-tool="oven"] .slot.full').count() === 1, 'after reload: the cheese is still in the oven');
  check(await chipNamed(page, 'Spaghetti Pomodoro').count() === 1, 'after reload: the counter is restored');
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
  check(await mp.locator('.tile').count() === 16, 'pantry at the bottom with 16 ingredients');
  await touchDrag(await center(mp, tile('potato')), await center(mp, station('knife')));
  check(await chipNamed(mp, 'Chopped Potato').count() === 1, 'touch: pull potato up into the knife');
  await touchDrag(await center(mp, '#table .chip >> text=Chopped Potato'), await center(mp, station('pan')));
  await touchDrag(await center(mp, tile('oil')), await center(mp, station('pan')));
  await mp.tap(go('pan'));
  await mp.waitForTimeout(1200);
  check(await chipNamed(mp, 'Fries').count() === 1, 'touch: chopped potato + oil, Fry! → Fries');
  await mp.screenshot({ path: SHOTS + 'phone.png' });
  const sl0 = await mp.evaluate(() => document.getElementById('shelf-grid').scrollLeft);
  const g = await center(mp, '#shelf-grid');
  await touchDrag([g[0] + 120, g[1]], [g[0] - 140, g[1] + 4]);
  const sl1 = await mp.evaluate(() => document.getElementById('shelf-grid').scrollLeft);
  check(sl1 > sl0, `touch: sideways swipe scrolls the pantry (${sl0} → ${sl1})`);
  const st0 = await mp.evaluate(() => document.getElementById('stations').scrollLeft);
  const sg = await center(mp, '#stations');
  await touchDrag([sg[0] + 120, sg[1] + 40], [sg[0] - 140, sg[1] + 44]);
  check(await mp.evaluate(() => document.getElementById('stations').scrollLeft) > st0, 'touch: the row of tools scrolls sideways');
  check(await mp.locator('#table .chip').count() === 1, 'touch: swiping did not drop anything');

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
  check(await fp.locator('.tile').count() === 16, 'opens from disk with 16 ingredients');
  check(await fp.locator('#boot-error').isHidden(), 'no "didn\'t open" message');
  await toStation(fp, tile('tomato'), 'knife');
  await fp.waitForTimeout(500);
  check(await chipNamed(fp, 'Chopped Tomato').count() === 1, 'tomato + knife → Chopped Tomato');
  check(await fp.evaluate(() => document.fonts.check('16px Fredoka')), 'the cosy font is loaded');
  await fp.waitForTimeout(500);
  await fp.reload();
  await fp.waitForSelector('body.ready');
  check(await fp.textContent('#creations-text') === '1 creations' || /^1 /.test(await fp.textContent('#creations-text')), 'progress is saved between visits');

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
