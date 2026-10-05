/* Shared test helpers: a static server for public/ and a Chromium launcher. */
import http from 'node:http';
import {readFile, stat} from 'node:fs/promises';
import {extname, join, normalize} from 'node:path';
import {chromium} from 'playwright';

export const ROOT = new URL('../public/', import.meta.url).pathname;
const TYPES = {'.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.txt': 'text/plain', '.json': 'application/json', '.webp': 'image/webp', '.png': 'image/png'};

export async function serve() {
  const server = http.createServer(async (req, res) => {
    let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (p === '/') p = '/index.html';
    const file = normalize(join(ROOT, p));
    if (!file.startsWith(ROOT)) { res.writeHead(403); return res.end(); }
    try {
      await stat(file);
      res.writeHead(200, {'Content-Type': TYPES[extname(file)] || 'application/octet-stream'});
      res.end(await readFile(file));
    } catch { res.writeHead(404); res.end('not found'); }
  });
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  return {server, base: `http://127.0.0.1:${server.address().port}/`};
}

export async function launch() { return chromium.launch(); }

/* Opens a page that records problems: console errors, page errors, failed or 4xx requests to our own server. */
export async function openPage(browser, base, path, width = 1280) {
  const page = await browser.newPage({viewport: {width, height: 800}});
  const problems = [];
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) problems.push('console: ' + m.text()); });
  page.on('pageerror', e => problems.push('pageerror: ' + e.message));
  page.on('requestfailed', r => { if (r.url().startsWith(base)) problems.push('request failed: ' + r.url()); });
  page.on('response', r => { if (r.url().startsWith(base) && r.status() >= 400) problems.push(`HTTP ${r.status()}: ` + r.url().slice(base.length)); });
  await page.goto(base + path, {waitUntil: 'load'});
  await page.waitForTimeout(150);
  return {page, problems};
}

export async function loadContent() {
  const src = await readFile(join(ROOT, 'content.js'), 'utf8');
  const mod = await import('data:text/javascript,' + encodeURIComponent(src.replace('window.GIT_CONTENT =', 'export default')));
  return mod.default;
}
