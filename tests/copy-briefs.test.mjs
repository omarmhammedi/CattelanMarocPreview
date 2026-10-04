import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const D = join(ROOT, 'docs/copy-briefs');
const data = JSON.parse(readFileSync(join(D, 'data/models-facts.json'), 'utf8'));

test('every model belongs to exactly one family and is briefed once', () => {
  assert.equal(data.models.length, 39);
  const counts = new Map();
  for (const slugs of Object.values(data.families)) for (const s of slugs) counts.set(s, (counts.get(s) || 0) + 1);
  assert.equal(counts.size, 39);
  for (const n of counts.values()) assert.equal(n, 1);
  const files = Object.keys(data.families).map((f) => readFileSync(join(D, 'models', `${f}.md`), 'utf8')).join('\n');
  for (const m of data.models) assert.equal(files.split(`\`${m.slug}.description\``).length - 1, 1, m.slug);
});

test('model facts carry data only: no prose field', () => {
  for (const m of data.models) {
    assert.deepEqual(Object.keys(m).sort(), ['dimensions', 'family', 'finishes', 'slug', 'technical_sheet', 'title', 'traits']);
    for (const t of m.traits) assert.ok(t.length < 120, `${m.slug}: trait too long`);
  }
});

test('one brief per family and per guide, with slots and a fact bank', () => {
  const fam = readdirSync(join(D, 'families'));
  assert.equal(fam.length, 8);
  for (const f of fam) {
    const t = readFileSync(join(D, 'families', f), 'utf8');
    assert.match(t, /## Slots/);
    assert.match(t, /## Fact bank/);
  }
  assert.equal(readdirSync(join(D, 'guides')).length, 5);
  for (const f of readdirSync(join(D, 'guides'))) assert.match(readFileSync(join(D, 'guides', f), 'utf8'), /## Fact bank/);
});

test('briefs never mention the old phone number or an unconfirmed claim as a fact', () => {
  const all = [];
  const walk = (d) => readdirSync(d, { withFileTypes: true }).forEach((e) => (e.isDirectory() ? walk(join(d, e.name)) : e.name.endsWith('.md') && all.push(readFileSync(join(d, e.name), 'utf8'))));
  walk(D);
  const text = all.join('\n');
  assert.ok(!/661\s?49\s?62\s?66/.test(text));
  assert.ok(!/représentant officiel\s*:/.test(text));
});
