import assert from 'node:assert/strict';
import test from 'node:test';
import { bodyOf, collectKnown, itemChange, loadManifest, loadSources, textOf } from '../scripts/migrations/0021-copy-v2.mjs';

const manifest = await loadManifest();
const known = collectKnown(await loadSources());
const entry = (collection, slug) => manifest.entries.find(item => item.collection === collection && item.slug === slug);

test('copy v2 follows the house style', () => {
  const text = JSON.stringify(manifest.entries);
  assert(!text.includes('!'), 'No exclamation marks.');
  assert(!/revendeur officiel|représentant officiel/iu.test(text), 'No official-dealer claim before the licence.');
  assert(!/promo|remise|soldes/iu.test(text), 'No promotions.');
  for (const item of manifest.entries) {
    for (const section of Object.values(item.sections || {})) assert(!/prix/iu.test(section.heading || ''), `${item.slug}: no price in headings.`);
    for (const [heading] of item.fields?.content || []) assert(!/prix/iu.test(heading), `${item.slug}: no price in headings.`);
  }
});

test('seed versions are replaced, and an editor’s text is kept', () => {
  const tables = entry('families', 'tables');
  const seeded = { data: { intro: 'La table rassemble.', title: 'Les tables Cattelan Italia', content: [] }, seo: { title: null } };
  const manual = { data: { ...seeded.data, intro: 'Texte écrit par la cliente.' }, seo: { title: null } };
  const local = collectKnown([{ families: [{ slug: 'tables', data: seeded.data }] }]);
  const first = itemChange(seeded, tables, local);
  assert(first.changed.includes('intro') && first.changed.includes('content'));
  assert.equal(first.data.intro, tables.fields.intro);
  const second = itemChange(manual, tables, local);
  assert(second.kept.includes('intro'));
  assert.equal(second.data.intro, 'Texte écrit par la cliente.');
  assert.deepEqual(itemChange({ data: first.data, seo: {} }, tables, local).changed, []);
});

test('sections: known texts change, missing sections are added', () => {
  const showroom = entry('pages', 'showroom-casablanca');
  const item = { data: { sections: [{ section_key: 'visit', heading: 'Préparer votre visite', text: 'Ancien texte du seed.', cta_label: 'x', cta_href: '#' }] } };
  const local = collectKnown([{ pages: [{ slug: 'showroom-casablanca', data: item.data }] }]);
  const change = itemChange(item, showroom, local);
  const visit = change.data.sections.find(section => section.section_key === 'visit');
  assert.equal(visit.text, showroom.sections.visit.text);
  assert.equal(visit.cta_label, 'x');
  assert(change.data.sections.some(section => section.section_key === 'contact_note'));
});

test('known versions include the seed and the 0012 showroom text', () => {
  const versions = known.get('pages/showroom-casablanca');
  assert(versions.fields.get('intro').size >= 2);
  assert([...versions.fields.get('content')].some(text => text.includes('Découvrir les meubles en situation')));
  assert(known.get('families/tables').fields.get('seo_title').has('Tables Cattelan Italia à Casablanca · Cattelan Italia Maroc'));
});

test('bodies are stable portable text', () => {
  const pairs = entry('families', 'tables').fields.content;
  assert.deepEqual(bodyOf('tables', pairs), bodyOf('tables', pairs));
  assert.equal(textOf(bodyOf('tables', pairs)).split('\n').length, pairs.length * 2);
});
