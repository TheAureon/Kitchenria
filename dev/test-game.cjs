// Automated browser test for Kitchenria (for development only; not part of the game).
// Run:  python3 -m http.server 8123   (in the Kitchenria folder), then
//       NODE_PATH=$(npm root -g) node dev/test-game.cjs
const { chromium } = require('playwright');
const BASE = process.env.BASE || 'http://localhost:8123/game/';
const SHOTS = __dirname + '/screens/';
let failures = 0;
const check = (ok, msg) => { console.log(`${ok ? '  ✓' : '  ✗'} ${msg}`); if (!ok) failures++; };

async function center(page, sel) {
  const b = await page.locator(sel).first().boundingBox();
  return [b.x + b.width / 2, b.y + b.height / 2];
}
async function mouseDrag(page, from, to) {
  await page.mouse.move(...from);
  await page.mouse.down();
  for (let i = 1; i <= 12; i++) await page.mouse.move(from[0] + ((to[0] - from[0]) * i) / 12, from[1] + ((to[1] - from[1]) * i) / 12);
  await page.mouse.up();
  await page.waitForTimeout(350);
}
const chipCount = (page, id) => page.locator(`#table .chip[data-id="${id}"]:not(.vanish)`).count();

(async () => {
  const browser = await chromium.launch();
  const errors = [];

  // ---------------- desktop ----------------
  console.log('Desktop (mouse):');
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  const page = await ctx.newPage();
  page.on('pageerror', (e) => errors.push(e.message));
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(m.text()); });
  await page.goto(BASE);
  await page.waitForSelector('body.ready');
  await page.screenshot({ path: SHOTS + 'desktop-empty.png' });

  check(await page.locator('.tile').count() === 18, '18 starter items on the shelf (12 ingredients + 6 tools)');
  check((await page.textContent('#found-text')).startsWith('18 /'), 'counter shows 18 found');

  // drag flour onto the table, then water onto flour
  await mouseDrag(page, await center(page, '.tile[data-id="flour"]'), [420, 420]);
  check(await chipCount(page, 'flour') === 1, 'flour dragged onto the table');
  await mouseDrag(page, await center(page, '.tile[data-id="water"]'), [425, 425]);
  check(await chipCount(page, 'dough') === 1 && await chipCount(page, 'flour') === 0, 'flour + water = dough (both used up)');
  check(await page.locator('.tile[data-id="dough"] .tag-new').count() === 1, 'dough on the shelf with a New! tag');
  check(await page.locator('.toast-new').count() >= 1, 'discovery toast shown');
  await page.waitForTimeout(250);
  await page.screenshot({ path: SHOTS + 'desktop-discovery.png' });

  // tool: dough onto the oven
  await mouseDrag(page, await center(page, '.tile[data-id="oven"]'), [700, 420]);
  await mouseDrag(page, await center(page, '#table .chip[data-id="dough"]'), [702, 418]);
  check(await chipCount(page, 'bread') === 1, 'dough + oven = bread');
  check(await chipCount(page, 'oven') === 1, 'the oven stays on the table');

  // a pair with no recipe
  await mouseDrag(page, await center(page, '.tile[data-id="salt"]'), [300, 600]);
  await mouseDrag(page, await center(page, '.tile[data-id="apple"]'), [302, 602]);
  check(await chipCount(page, 'salt') === 1 && await chipCount(page, 'apple') === 1, 'salt + apple: nothing happens, both stay');
  check(await page.locator('.toast-soft').count() >= 1, 'gentle "not yet" message shown');

  // tap-to-combine: tap egg chip, then tap the pan tile on the shelf
  await page.click('.tile[data-id="egg"]');
  await page.waitForTimeout(300);
  await page.click('#table .chip[data-id="egg"]');
  check(await page.locator('#table .chip.selected').count() === 1, 'tapping a chip picks it up');
  await page.click('.tile[data-id="pan"]');
  await page.waitForTimeout(600);
  check(await chipCount(page, 'fried_egg') === 1, 'tap egg, then tap pan on shelf = fried egg');

  // keyboard combining: focus the milk chip, Enter, focus pot chip, Enter
  await page.click('.tile[data-id="milk"]'); await page.click('.tile[data-id="pot"]');
  await page.waitForTimeout(300);
  await page.focus('#table .chip[data-id="milk"]'); await page.keyboard.press('Enter');
  await page.focus('#table .chip[data-id="pot"]'); await page.keyboard.press('Enter');
  await page.waitForTimeout(400);
  check(await chipCount(page, 'warm_milk') === 1, 'keyboard: milk + pot = warm milk');

  // dragging a chip back to the shelf puts it away
  const before = await page.locator('#table .chip:not(.vanish)').count();
  await mouseDrag(page, await center(page, '#table .chip[data-id="salt"]'), [1150, 500]);
  check(await page.locator('#table .chip:not(.vanish)').count() === before - 1, 'drag to shelf removes the chip');

  // search & filter
  await page.fill('#shelf-search', 'bre');
  await page.waitForTimeout(100);
  const names = await page.locator('.tile .tile-name').allTextContents();
  check(names.length === 1 && names[0] === 'Bread', `search "bre" finds Bread (${names.join(', ')})`);
  await page.fill('#shelf-search', '');
  await page.click('[data-filter="tool"]');
  check(await page.locator('.tile').count() === 6, 'Tools filter shows 6 tools');
  await page.click('[data-filter="all"]');

  // saving
  await page.waitForTimeout(500);
  await page.reload();
  await page.waitForSelector('body.ready');
  check((await page.textContent('#found-text')).startsWith('22 /'), 'after reload: 22 found (saved)');
  check(await chipCount(page, 'bread') === 1, 'after reload: table layout restored');
  await page.screenshot({ path: SHOTS + 'desktop-after.png' });

  // ---------------- every recipe actually works in the game ----------------
  const all = await page.evaluate(async () => {
    const { combineIds } = await import('./js/data.js');
    const { recipes } = await fetch('data/recipes.json').then((r) => r.json());
    return recipes.filter((r) => combineIds(r.b, r.a) !== r.makes).length;
  });
  check(all === 0, 'every recipe in recipes.json works both ways round');

  // ---------------- mobile (real touch events) ----------------
  console.log('Phone (touch):');
  const m = await browser.newContext({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
  const mp = await m.newPage();
  mp.on('pageerror', (e) => errors.push('mobile: ' + e.message));
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
    await mp.waitForTimeout(400);
  };
  check(await mp.locator('.tile').count() === 18, 'shelf shown at the bottom with 18 items');
  await touchDrag(await center(mp, '.tile[data-id="potato"]'), [195, 300]);
  check(await chipCount(mp, 'potato') === 1, 'touch: pull potato up onto the table');
  await touchDrag(await center(mp, '.tile[data-id="board"]'), [200, 305]);
  check(await chipCount(mp, 'potato_sticks') === 1, 'touch: board onto potato = potato sticks');
  await mp.waitForTimeout(300);
  await mp.screenshot({ path: SHOTS + 'phone.png' });
  // horizontal swipe should scroll the shelf, not drag
  const sl0 = await mp.evaluate(() => document.getElementById('shelf-grid').scrollLeft);
  const g = await center(mp, '#shelf-grid');
  await touchDrag([g[0] + 120, g[1]], [g[0] - 140, g[1] + 4]);
  const sl1 = await mp.evaluate(() => document.getElementById('shelf-grid').scrollLeft);
  check(sl1 > sl0, `touch: sideways swipe scrolls the shelf (${sl0} → ${sl1})`);
  check(await mp.locator('#table .chip').count() === 2, 'touch: swiping did not drop anything on the table');

  // ---------------- art gallery ----------------
  const gp = await ctx.newPage();
  gp.on('pageerror', (e) => errors.push('gallery: ' + e.message));
  await gp.goto(BASE.replace('/game/', '/dev/gallery.html'));
  await gp.waitForSelector('figure');
  await gp.screenshot({ path: SHOTS + 'gallery.png', fullPage: true });

  check(errors.length === 0, `no errors or warnings in the console${errors.length ? ': ' + errors.join(' | ') : ''}`);
  await browser.close();
  console.log(failures ? `\n${failures} check(s) failed` : '\nAll checks passed!');
  process.exit(failures ? 1 : 0);
})();
