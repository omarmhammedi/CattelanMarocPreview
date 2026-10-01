import assert from 'node:assert/strict';
import test from 'node:test';
import { collectKnown, itemChange, loadManifest, loadSources } from '../scripts/migrations/0021-copy-v2.mjs';
import { manifestFile, menuChange, planLaunch } from '../scripts/migrations/0022-v2-launch.mjs';

const manifest = await loadManifest(manifestFile);
const known = collectKnown(await loadSources(manifestFile));
const seed = (await import('../seed/seed.json', { with: { type: 'json' } })).default;

test('the menu label changes only from the known value', () => {
  const rule = manifest.menu;
  assert.equal(menuChange({ items: [{ id: 'a', label: 'Professionnels', customUrl: '/professionnels/' }] }, rule).item.id, 'a');
  assert.deepEqual(menuChange({ items: [{ id: 'a', label: 'Pros', customUrl: '/professionnels/' }] }, rule), { item: null, kept: 'Pros' });
  assert.equal(menuChange({ items: [{ id: 'a', label: rule.label, customUrl: '/professionnels/' }] }, rule).item, null);
});

test('new sections land in place, and the three routes open Votre projet', () => {
  const sections = item => item.data.sections.map(section => section.section_key);
  const original = slug => structuredClone(seed.content.pages.find(page => page.slug === slug));
  // The seed already carries the change, so rebuild the earlier state.
  const project = original('votre-projet');
  delete project.data.content;
  const after = itemChange(project, manifest.entries.find(entry => entry.slug === 'votre-projet'), known);
  assert.deepEqual(after.data.content.filter(block => block.style === 'h2').map(block => block.children[0].text), ['Une pièce', 'Une pièce entière ou toute la maison', 'Avec un architecte']);
  assert.equal(sections(after)[0], 'step_1');
  const faq = original('faq');
  faq.data.sections = faq.data.sections.filter(section => !['faq_delivery_4', 'faq_pro_2', 'faq_pro_3'].includes(section.section_key));
  const keys = sections(itemChange(faq, manifest.entries.find(entry => entry.slug === 'faq'), known));
  assert.equal(keys.indexOf('faq_delivery_4'), keys.indexOf('faq_delivery_3') + 1);
  assert.deepEqual(keys.slice(keys.indexOf('faq_pro_1'), keys.indexOf('faq_pro_1') + 3), ['faq_pro_1', 'faq_pro_2', 'faq_pro_3']);
});

test('a malformed analytics token is refused before any request', async () => {
  await assert.rejects(planLaunch(async () => { throw new Error('no call expected'); }, manifest, known, 'abc'), /32 hexadecimal/u);
});

test('the seed carries the launch state', () => {
  assert.equal(seed.menus[0].items.find(item => item.url === '/professionnels/').label, 'Architectes & projets');
  assert(seed.collections.find(collection => collection.slug === 'site_content').fields.some(field => field.slug === 'analytics_token'));
  assert.equal(seed.content.pages.find(page => page.slug === 'professionnels').data.title, 'Architectes & projets');
});
