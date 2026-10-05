/* Smoke test: serves public/, opens every page in headless Chromium, fails on console errors, page errors,
   missing headings, unmounted games or horizontal overflow at phone width. Run with: npm test */
import {serve, launch, openPage, loadContent} from './lib.mjs';

const {server, base} = await serve();
const browser = await launch();
const failures = [];
async function check(name, path, width, fn) {
  const {page, problems} = await openPage(browser, base, path, width);
  try {
    const h1 = await page.locator('h1').count();
    if (!h1) problems.push('no h1');
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    if (overflow > 1) problems.push(`horizontal overflow of ${overflow}px at ${width}px`);
    if (fn) await fn(page, problems);
  } catch (e) { problems.push('exception: ' + e.message); }
  await page.close();
  const label = `${name} @${width}`;
  if (problems.length) { failures.push({label, problems}); console.log('FAIL', label, '\n  ' + problems.join('\n  ')); }
  else console.log('ok  ', label);
}

const C = await loadContent();
const playable = C.games.filter(g => g.playable).map(g => g.id);
const eraIds = C.eras.filter(e => !e.external).map(e => e.id);

for (const width of [1280, 360]) {
  await check('home', '#/', width, async (page, problems) => {
    const halls = await page.locator('.era-tile').count();
    if (halls !== C.eras.length) problems.push(`expected ${C.eras.length} hall tiles, got ${halls}`);
    const cards = await page.locator('#games .gcard').count();
    if (cards !== C.games.length) problems.push(`expected ${C.games.length} game cards, got ${cards}`);
    const links = await page.$$eval('a[href*="1973.ai"]', a => a.length);
    if (links) problems.push('page links to 1973.ai');
  });
  for (const id of eraIds) await check('era ' + id, '#/era/' + id, width);
  for (const id of playable) await check('game ' + id, '#/game/' + id, width, async (page, problems) => {
    const kids = await page.locator('.game-root > *').count();
    if (!kids) problems.push('game did not mount anything');
    const regs = await page.evaluate(id => !!window.GamesInTime.get(id), id);
    if (!regs) problems.push('game not registered');
    const small = await page.evaluate(() => {
      const bad = [];
      document.querySelectorAll('.game-root button').forEach(b => {
        const r = b.getBoundingClientRect();
        if (r.width && r.height && (r.width < 36 || r.height < 36)) bad.push((b.getAttribute('aria-label') || b.textContent || '?').trim().slice(0, 30) + ` ${Math.round(r.width)}x${Math.round(r.height)}`);
      });
      return bad.slice(0, 5);
    });
    if (small.length) problems.push('small touch targets: ' + small.join('; '));
  });
  for (const [name, path] of [['all', '#/all'], ['teachers', '#/teachers'], ['about', '#/about'], ['print dots', '#/print/dots'], ['print hundred', '#/print/hundred'], ['not found', '#/nope']]) await check(name, path, width);
}
await check('sound switch', '#/', 1280, async (page, problems) => {
  const btn = page.locator('.site-header button[aria-label="Sound"]');
  const before = await btn.getAttribute('aria-pressed');
  await btn.click();
  const after = await btn.getAttribute('aria-pressed');
  if (before === after) problems.push('sound switch did not toggle');
});
await check('era colours', '#/era/1980s', 1280, async (page, problems) => {
  const bg = await page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  if (bg !== 'rgb(10, 6, 22)') problems.push('1980s hall is not wearing its neon ground: ' + bg);
});
await browser.close();
server.close();
if (failures.length) { console.error(`\n${failures.length} page(s) failed`); process.exit(1); }
console.log('\nAll pages passed');
