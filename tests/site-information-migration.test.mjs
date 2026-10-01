import assert from 'node:assert/strict';
import test from 'node:test';
import { blockChange, globalChanges, loadManifest, sectionLimit } from '../scripts/migrations/0015-site-information-pages.mjs';

test('the four pages follow the plan and the content rules', async () => {
  const manifest = await loadManifest();
  assert.deepEqual(manifest.pages.map(page => page.slug), ['a-propos', 'votre-projet', 'faq', 'mentions-legales']);
  for (const page of manifest.pages) {
    assert(page.data.sections.length <= sectionLimit, page.slug);
    for (const section of page.data.sections) {
      assert.doesNotMatch(section.heading || '', /prix/iu, `${page.slug}: no price in a heading`);
      assert.doesNotMatch(`${section.heading} ${section.text || ''}`, /revendeur officiel|représentant officiel|!/iu, `${page.slug}: wording rules`);
    }
  }
  const faq = manifest.pages.find(page => page.slug === 'faq').data.sections;
  assert.equal(faq.filter(section => section.section_key === 'group').length, 7);
  assert(faq.filter(section => section.section_key.startsWith('faq_')).every(section => section.heading && section.text));
  const project = manifest.pages.find(page => page.slug === 'votre-projet').data;
  assert.equal(project.seo_title, 'Commander du mobilier Cattelan Italia au Maroc');
});

test('updates a contact field only from its expected value', () => {
  const updates = [
    { field: 'contact_phone', before: ['+212 7 71 10 54 90'], after: '+212 771 105 490' },
    { field: 'public_email', before: ['', null], after: 'contact@cattelanitalia.ma' },
  ];
  assert.deepEqual(globalChanges({ contact_phone: '+212 7 71 10 54 90' }, updates).changes, { contact_phone: '+212 771 105 490', public_email: 'contact@cattelanitalia.ma' });
  assert.deepEqual(globalChanges({ contact_phone: '+212 771 105 490', public_email: 'contact@cattelanitalia.ma' }, updates), { changes: {}, kept: [] });
  assert.deepEqual(globalChanges({ contact_phone: '+212 600 000 000', public_email: 'autre@example.com' }, updates), { changes: {}, kept: ['contact_phone', 'public_email'] });
});

test('replaces the showroom delivery paragraph only when it is the expected text', () => {
  const spec = { key: 'b6', before: 'Ancien texte.', after: 'Nouveau texte.' };
  const block = text => [{ _key: 'b5', children: [{ text: 'Autre.' }] }, { _key: 'b6', style: 'normal', children: [{ _type: 'span', text, marks: [] }] }];
  const result = blockChange(block('Ancien texte.'), spec);
  assert.equal(result.status, 'change');
  assert.deepEqual(result.content[1], { _key: 'b6', style: 'normal', children: [{ _type: 'span', text: 'Nouveau texte.', marks: [] }] });
  assert.deepEqual(result.content[0], { _key: 'b5', children: [{ text: 'Autre.' }] });
  assert.equal(blockChange(block('Nouveau texte.'), spec).status, 'done');
  assert.equal(blockChange(block('Texte modifié par un éditeur.'), spec).status, 'kept');
  assert.equal(blockChange([], spec).status, 'kept');
});
