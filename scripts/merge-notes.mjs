/* Merges builder notes, research and picture manifests into public/content.js.
   - docs/research/halls.json        -> the halls (eras), in order. Existing halls keep their words; new ones are added.
   - docs/research/new-games.json    -> base entries for games added after the first 39. A game is only added once
                                        public/games/<id>.js exists, so nothing half-built ever appears on the site.
   - docs/game-notes/<id>.json       -> howToPlay, controls, computer, players and adaptation notes for that game
   - docs/research/arcade.json and docs/research/<decade>s.json (1990s.json, 2030s.json ...)
                                     -> each hall's hook and intro, the future hall's "where games are heading" cards,
                                        game stories, sources and doubts, kids panels and lessons
   - docs/research/images-*.json     -> content.images (pictures for the home page, halls, kids panels and games)
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
const log = [];
const readJson = async (p) => { try { return JSON.parse(await readFile(p, 'utf8')); } catch (e) { log.push(`bad JSON in ${p}: ${e.message}`); return null; } };

// 0a. halls: add any hall that is missing, after the hall it names
if (existsSync('docs/research/halls.json')) {
  const H = await readJson('docs/research/halls.json');
  for (const hall of (H && H.halls) || []) {
    if (C.eras.some(e => e.id === hall.id)) continue;
    const after = hall.after ? C.eras.findIndex(e => e.id === hall.after) : -1;
    const entry = Object.fromEntries(Object.entries(hall).filter(([k]) => k !== 'after'));
    if (after >= 0) C.eras.splice(after + 1, 0, entry); else C.eras.push(entry);
    log.push(`hall added: ${hall.id}`);
  }
}

// 0b. new games: only those whose game file exists
if (existsSync('docs/research/new-games.json')) {
  const N = await readJson('docs/research/new-games.json');
  for (const base of (N && N.games) || []) {
    if (C.games.some(g => g.id === base.id)) continue;
    if (!existsSync(`public/games/${base.id}.js`)) { log.push(`not yet built, left out: ${base.id}`); continue; }
    C.games.push(Object.assign({story: [], howToPlay: [], didYouKnow: [], sources: [], uncertainties: [], playable: true}, base));
    log.push(`game added: ${base.id}`);
  }
}
const byId = Object.fromEntries(C.games.map(g => [g.id, g]));

// 1. builder notes
if (existsSync('docs/game-notes')) {
  for (const f of (await readdir('docs/game-notes')).filter(f => f.endsWith('.json'))) {
    const id = f.replace(/\.json$/, '');
    const g = byId[id];
    if (!g) { log.push(`notes for a game not on the site (yet): ${id}`); continue; }
    const n = await readJson('docs/game-notes/' + f);
    if (!n) continue;
    if (Array.isArray(n.howToPlay) && n.howToPlay.length) g.howToPlay = n.howToPlay;
    if (typeof n.controls === 'string' && n.controls) g.controls = n.controls;
    if (typeof n.computer === 'string') g.computer = n.computer;
    if (Array.isArray(n.players) && n.players.length) g.players = n.players;
    if (typeof n.notes === 'string' && n.notes) g.adaptation = n.notes;
    log.push(`notes merged: ${id}`);
  }
}

// 2. hall research: arcade.json (1970s and 1980s) and one file per newer hall
const researchFiles = existsSync('docs/research') ? (await readdir('docs/research')).filter(f => f === 'arcade.json' || /^\d{4}s\.json$/.test(f)).sort() : [];
for (const f of researchFiles) {
  const A = await readJson('docs/research/' + f);
  if (!A) continue;
  const e = A.hall && A.hall.id ? C.eras.find(x => x.id === A.hall.id) : null;
  if (A.hall && A.hall.id && !e) log.push(`${f}: hall ${A.hall.id} is not in the eras list`);
  if (e) {
    for (const k of ['hook', 'intro']) if (A.hall[k]) e[k] = A.hall[k];
    if (A.future && A.future.length) { e.future = A.future; log.push(`future cards: ${A.future.length}`); }
    log.push(`hall words: ${e.id}`);
  }
  for (const a of A.games || []) {
    const g = byId[a.id];
    if (!g) { log.push(`${f}: story for a game not on the site (yet): ${a.id}`); continue; }
    for (const k of ['yearLabel', 'stamp', 'origin', 'tagline', 'blurb', 'story', 'didYouKnow', 'sources', 'uncertainties']) if (a[k] && (!Array.isArray(a[k]) || a[k].length)) g[k] = a[k];
    log.push(`story merged: ${a.id}`);
  }
  for (const k of A.kids || []) { C.kids = (C.kids || []).filter(x => x.era !== k.era); C.kids.push(k); log.push(`kids panel: ${k.era}`); }
  const lessons = (A.lessons || []).filter(l => byId[l.gameId]);
  if (lessons.length) {
    C.curriculum.lessons = (C.curriculum.lessons || []).filter(l => !lessons.some(x => x.gameId === l.gameId && x.title === l.title)).concat(lessons);
    log.push(`${f}: lessons merged: ${lessons.length}`);
  }
}

// 3. pictures
C.images = C.images || {};
const imageFiles = existsSync('docs/research') ? (await readdir('docs/research')).filter(f => /^images-.+\.json$/.test(f)).sort() : [];
for (const f of imageFiles) {
  const M = await readJson('docs/research/' + f);
  if (!M) continue;
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
console.log(`\n${C.games.length} games in ${C.eras.length} halls; ${Object.keys(C.images).length} pictures; games without a picture: ${missingPics.length ? missingPics.join(', ') : 'none'}`);
const noRules = C.games.filter(g => !g.howToPlay || !g.howToPlay.length).map(g => g.id);
console.log(`games without rules: ${noRules.length ? noRules.join(', ') : 'none'}`);
const noStory = C.games.filter(g => !g.story || !g.story.length).map(g => g.id);
console.log(`games without a story: ${noStory.length ? noStory.join(', ') : 'none'}`);
