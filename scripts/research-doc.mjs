/* Writes docs/RESEARCH.md from public/content.js, so the research notes always match what the site says.
   Usage: node scripts/research-doc.mjs   (run it after node scripts/merge-notes.mjs or any edit to content.js) */
import { readFile, writeFile } from 'node:fs/promises';

const src = await readFile('public/content.js', 'utf8');
const C = (await import('data:text/javascript,' + encodeURIComponent(src.replace('window.GIT_CONTENT =', 'export default')))).default;

const out = [];
const put = (...lines) => out.push(...lines);
const list = (items) => (items || []).forEach(t => put('- ' + t));
const source = (s) => s.url ? `[${s.title}](${s.url})${s.note ? ': ' + s.note : ''}` : s.title + (s.note ? ': ' + s.note : '');

put('# Research notes', '',
  'Everything here is generated from `public/content.js` by `node scripts/research-doc.mjs`, so it matches the site word for word. To change a fact, change it in `content.js` (or in the notes that `scripts/merge-notes.mjs` copies into it), then run the script again.', '',
  'How we work:', '',
  '1. Every date and story is checked against sources we actually read, and the sources are listed under each game.',
  '2. When historians disagree, we say so. What we cannot confirm goes under "What we are not sure about".',
  '3. We use the names people used at the time, and avoid names that are trademarks today.',
  '4. Games are played by their historical rules. Where we had to change something to put a game on a screen, "How we rebuilt it" says what and why.', '');

for (const era of C.eras) {
  const games = C.games.filter(g => g.era === era.id);
  put(`## ${era.name} (${era.years})`, '', `${era.title} ${era.gold} ${era.intro || ''}`.trim(), '');
  for (const g of games) {
    put(`### ${g.title}`, '');
    put(`- **When:** ${g.yearLabel || g.year}`);
    if (g.origin) put(`- **Where:** ${g.origin}`);
    if (g.players) put(`- **Players:** ${[].concat(g.players).join(', ')}`);
    if (g.confidence) put(`- **How sure we are:** ${g.confidence}`);
    put('');
    [].concat(g.story || []).forEach(p => put(p, ''));
    if (g.didYouKnow && g.didYouKnow.length) { put('**Did you know?**', ''); list(g.didYouKnow); put(''); }
    if (g.nameNotes) put('**About the name:** ' + g.nameNotes, '');
    if (g.uncertainties && g.uncertainties.length) { put('**What we are not sure about**', ''); list(g.uncertainties); put(''); }
    if (g.adaptation) put('**How we rebuilt it:** ' + g.adaptation, '');
    if (g.sources && g.sources.length) { put('**Sources**', ''); list(g.sources.map(source)); put(''); }
    const img = C.images && C.images[g.id];
    if (img) put(`**Picture:** ${img.caption || img.alt}. Credit: ${img.credit}. Licence: ${img.license}.${img.source ? ' Source: ' + img.source : ''}`, '');
  }
}

put('## Kids your age', '');
for (const k of C.kids || []) {
  put(`### ${k.title}`, '');
  (k.paragraphs || []).forEach(p => put(p, ''));
  if (k.fastFacts && k.fastFacts.length) { put('**Fast facts**', ''); list(k.fastFacts.map(f => typeof f === 'string' ? f : (f.label ? f.label + ': ' + f.value : JSON.stringify(f)))); put(''); }
  if (k.uncertainties && k.uncertainties.length) { put('**What we are not sure about**', ''); list(k.uncertainties); put(''); }
  if (k.sources && k.sources.length) { put('**Sources**', ''); list(k.sources.map(source)); put(''); }
}

const cur = C.curriculum || {};
if (cur.links && cur.links.length) {
  put('## Curriculum links', '', '| Year | Learning area | Code | Content description |', '|---|---|---|---|');
  cur.links.forEach(l => put(`| ${l.yearLevel} | ${l.learningArea} | [${l.code}](${l.url}) | ${String(l.description).replace(/\|/g, '/')} |`));
  put('');
}
if (cur.lessons && cur.lessons.length) {
  put('## Lesson ideas', '');
  for (const l of cur.lessons) {
    const g = C.games.find(x => x.id === l.gameId);
    put(`### ${l.title}`, '', `${l.yearLevels}${g ? ', with ' + g.title : ''}.`, '', l.idea, '');
    if (l.computerAngle) put('**The computing angle:** ' + l.computerAngle, '');
  }
}

await writeFile('docs/RESEARCH.md', out.join('\n').replace(/\n{3,}/g, '\n\n'));
console.log(`docs/RESEARCH.md: ${C.eras.length} halls, ${C.games.length} games, ${(C.kids || []).length} kids panels, ${out.length} lines`);
