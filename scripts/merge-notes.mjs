/* Merges builder notes, research and picture manifests into public/content.js.
   - docs/game-notes/<id>.json      -> howToPlay, controls, computer, players for that game
   - docs/research/arcade.json      -> story, didYouKnow, sources and more for the 1970s and 1980s games, kids panels, lessons
   - docs/research/images-*.json    -> content.images (pictures for the home page, halls, kids panels and games)
   Safe to run again: it only fills in what these files provide.
   Usage: node scripts/merge-notes.mjs */
import {readFile, writeFile, readdir} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import vm from 'node:vm';

const path = 'public/content.js';
const src = await readFile(path, 'utf8');
const header = src.slice(0, src.indexOf('window.GIT_CONTENT = '));
const box = {window: {}};
vm.runInNewContext(src, box);
const C = box.window.GIT_CONTENT;
const byId = Object.fromEntries(C.games.map(g => [g.id, g]));
const log = [];

// 1. builder notes
if (existsSync('docs/game-notes')) {
  for (const f of (await readdir('docs/game-notes')).filter(f => f.endsWith('.json'))) {
    const id = f.replace(/\.json$/, '');
    const g = byId[id];
    if (!g) { log.push(`notes for unknown game ${id}`); continue; }
    let n;
    try { n = JSON.parse(await readFile('docs/game-notes/' + f, 'utf8')); } catch (e) { log.push(`bad JSON in ${f}: ${e.message}`); continue; }
    if (Array.isArray(n.howToPlay) && n.howToPlay.length) g.howToPlay = n.howToPlay;
    if (typeof n.controls === 'string' && n.controls) g.controls = n.controls;
    if (typeof n.computer === 'string') g.computer = n.computer;
    if (Array.isArray(n.players) && n.players.length) g.players = n.players;
    if (typeof n.notes === 'string' && n.notes) g.adaptation = n.notes;
    log.push(`notes merged: ${id}`);
  }
}

// 2. arcade research
if (existsSync('docs/research/arcade.json')) {
  const A = JSON.parse(await readFile('docs/research/arcade.json', 'utf8'));
  for (const a of A.games || []) {
    const g = byId[a.id];
    if (!g) { log.push(`arcade entry for unknown game ${a.id}`); continue; }
    for (const k of ['yearLabel', 'stamp', 'origin', 'blurb', 'story', 'didYouKnow', 'sources', 'uncertainties']) if (a[k] && (!Array.isArray(a[k]) || a[k].length)) g[k] = a[k];
    log.push(`arcade story merged: ${a.id}`);
  }
  for (const k of A.kids || []) { C.kids = (C.kids || []).filter(x => x.era !== k.era); C.kids.push(k); log.push(`kids panel: ${k.era}`); }
  if (A.lessons && A.lessons.length) {
    C.curriculum.lessons = (C.curriculum.lessons || []).filter(l => !A.lessons.some(x => x.gameId === l.gameId)).concat(A.lessons);
    log.push(`lessons added: ${A.lessons.length}`);
  }
}

// 3. pictures
C.images = C.images || {};
for (const f of ['images-a.json', 'images-b.json', 'images-c.json']) {
  const p = 'docs/research/' + f;
  if (!existsSync(p)) continue;
  let M;
  try { M = JSON.parse(await readFile(p, 'utf8')); } catch (e) { log.push(`bad JSON in ${f}: ${e.message}`); continue; }
  for (const im of M.images || []) {
    if (!im.hero) { delete C.images[im.id]; continue; }
    const ok = existsSync('public/' + im.hero) && (!im.card || existsSync('public/' + im.card));
    if (!ok) { log.push(`missing file for picture ${im.id}`); continue; }
    C.images[im.id] = {hero: im.hero, card: im.card || null, alt: im.alt || '', caption: im.caption || '', credit: im.credit || '', license: im.license || '', licenseUrl: im.licenseUrl || '', source: im.source || '', focus: im.focus || '50% 40%', width: im.width || null, height: im.height || null};
  }
  log.push(`pictures from ${f}: ${(M.images || []).filter(i => i.hero).length}`);
}

await writeFile(path, header + 'window.GIT_CONTENT = ' + JSON.stringify(C, null, 2) + ';\n');
console.log(log.join('\n'));
const missingPics = C.games.filter(g => !C.images[g.id]).map(g => g.id);
console.log(`\n${Object.keys(C.images).length} pictures; games without a picture: ${missingPics.length ? missingPics.join(', ') : 'none'}`);
const noRules = C.games.filter(g => !g.howToPlay || !g.howToPlay.length).map(g => g.id);
console.log(`games without rules: ${noRules.length ? noRules.join(', ') : 'none'}`);
