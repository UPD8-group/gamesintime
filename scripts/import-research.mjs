/* One-off importer: merges the fact-checked research (docs/research/research.json) into public/content.js
   and writes docs/RESEARCH.md. After running it, content.js is the source of truth; edit it directly.
   Usage: node scripts/import-research.mjs */
import {readFile, writeFile} from 'node:fs/promises';
import vm from 'node:vm';

const contentSrc = await readFile('public/content.js', 'utf8');
const sandbox = {window: {}};
vm.runInNewContext(contentSrc, sandbox);
const C = sandbox.window.GIT_CONTENT;
const R = JSON.parse(await readFile('docs/research/research.json', 'utf8'));

const byId = Object.fromEntries(C.games.map(g => [g.id, g]));
const entries = R.groups.flatMap(g => g.final.entries);
const games = entries.map(e => {
  const old = byId[e.id] || {};
  return {
    id: e.id, title: e.title, era: e.era, year: e.year, yearLabel: e.yearLabel, origin: e.origin, blurb: e.blurb,
    story: e.story, howToPlay: old.howToPlay && old.howToPlay.length && old.playable ? old.howToPlay : e.howToPlay,
    didYouKnow: e.didYouKnow, computer: old.computer || '', sources: e.sources, uncertainties: e.uncertainties || [],
    nameNotes: e.nameNotes || '', confidence: e.confidence,
    playable: !!old.playable, realLife: !!e.realLife, kind: e.id === 'penny-arcade' ? 'story' : (old.kind || 'game'),
  };
});
// keep any hand-written entries the research did not cover
for (const g of C.games) if (!games.find(x => x.id === g.id)) games.push(g);
games.sort((a, b) => a.year - b.year || a.title.localeCompare(b.title));
C.games = games;
C.kids = R.kids?.final?.eras || [];
C.curriculum = R.curriculum?.final ? {links: R.curriculum.final.links, lessons: R.curriculum.final.lessons, tips: R.curriculum.final.tips} : C.curriculum;
C.trove = R.trove?.final?.finds || [];
C.wordCross = R.wordCross?.final || C.wordCross;

const header = `/* Games in Time: words and catalogue.
   Edit this file to change what the site says. Each playable game also has a file in public/games/<id>.js.
   Research notes and sources for every entry are in docs/RESEARCH.md. */
`;
await writeFile('public/content.js', header + 'window.GIT_CONTENT = ' + JSON.stringify(C, null, 2) + ';\n');

const md = [];
md.push('# Research notes\n');
md.push('Every entry on the site was researched by one agent, fact-checked by two sceptics (dates and attribution; sources, trademarks and classroom suitability), then edited. This file lists what was accepted and what stays uncertain. Dates are shown as the site shows them.\n');
for (const era of C.eras.filter(e => !e.gap && !e.external)) {
  const list = C.games.filter(g => g.era === era.id);
  if (!list.length) continue;
  md.push(`\n## ${era.name} (${era.years})\n`);
  for (const g of list) {
    md.push(`\n### ${g.title}\n`);
    md.push(`- **Date shown:** ${g.yearLabel} (sort year ${g.year}); **origin:** ${g.origin}; **confidence:** ${g.confidence || 'n/a'}${g.realLife ? '; played off-screen' : ''}${g.playable ? '; playable' : ''}`);
    if (g.nameNotes) md.push(`- **Names:** ${g.nameNotes}`);
    if (g.sources?.length) { md.push('- **Sources:**'); for (const s of g.sources) md.push(`  - [${s.title}](${s.url})${s.note ? ' — ' + s.note : ''}`); }
    if (g.uncertainties?.length) { md.push('- **Not sure about:**'); for (const u of g.uncertainties) md.push(`  - ${u}`); }
  }
}
if (C.kids.length) {
  md.push('\n## Kids your age\n');
  for (const k of C.kids) {
    md.push(`\n### ${k.title} (${k.era})\n`);
    for (const s of k.sources || []) md.push(`- [${s.title}](${s.url})${s.note ? ' — ' + s.note : ''}`);
    for (const u of k.uncertainties || []) md.push(`- Not sure: ${u}`);
  }
}
if (C.trove.length) {
  md.push('\n## Newspaper quotes (Trove)\n');
  for (const t of C.trove) md.push(`- **${t.gameId}**: ${t.newspaper}, ${t.date}, "${t.headline}". [Trove](${t.url})`);
}
if (C.curriculum?.links?.length) {
  md.push('\n## Curriculum links\n');
  for (const l of C.curriculum.links) md.push(`- ${l.jurisdiction}, ${l.yearLevel}, ${l.learningArea}: ${l.code ? l.code + ' ' : ''}${l.description} ([link](${l.url}))`);
  for (const u of R.curriculum?.final?.uncertainties || []) md.push(`- Not sure: ${u}`);
}
if (C.wordCross) {
  md.push('\n## Word-Cross 1913\n');
  md.push(`- Confidence: ${C.wordCross.confidence}`);
  for (const s of C.wordCross.sources || []) md.push(`- [${s.title}](${s.url})`);
  for (const d of C.wordCross.discrepancies || []) md.push(`- Note: ${d}`);
}
await writeFile('docs/RESEARCH.md', md.join('\n') + '\n');
console.log(`content.js: ${C.games.length} games, ${C.kids.length} kids panels, ${C.trove.length} newspaper quotes, ${C.curriculum.lessons?.length || 0} lessons, word-cross ${C.wordCross ? 'present' : 'missing'}`);
