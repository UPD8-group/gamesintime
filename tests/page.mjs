/* Open one route and report problems. Optionally run a script against the page.
   node tests/page.mjs '#/game/nim'                      -> prints problems, exits 1 if any
   node tests/page.mjs '#/game/nim' ./my-check.mjs 360   -> also imports my-check.mjs and calls its default export (page, problems, base)
   The script can click, type and assert; push strings onto problems to fail. */
import {serve, launch, openPage} from './lib.mjs';
const [route = '#/', script, width = '1280'] = process.argv.slice(2);
const {server, base} = await serve();
const browser = await launch();
const {page, problems} = await openPage(browser, base, route, Number(width));
try {
  if (script) {
    const mod = await import(new URL(script, 'file://' + process.cwd() + '/').href);
    await mod.default(page, problems, base);
  }
} catch (e) { problems.push('exception: ' + (e.stack || e.message)); }
await browser.close();
server.close();
if (problems.length) { console.log('PROBLEMS for ' + route + ':\n  ' + problems.join('\n  ')); process.exit(1); }
console.log('ok ' + route);
