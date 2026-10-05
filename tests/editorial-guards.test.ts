import assert from 'node:assert/strict';
import test from 'node:test';
import { dataProblem, publicationProblem, protectsPublicRoute } from '../src/plugins/editorial/guards.ts';
import { PRIVACY_PAGE } from '../src/lib/privacy-content.mjs';

test('partial changes preserve optional clearing but refuse unusable controls and analytics', () => {
  assert.equal(dataProblem('site_content', { footer_valet_text: '', analytics_token: null }), undefined);
  assert.equal(dataProblem('site_content', { analytics_token: 'a'.repeat(32) }), undefined);
  assert.match(dataProblem('site_content', { analytics_token: ' a'.repeat(16) })!, /32/);
  assert.match(dataProblem('site_content', { form_name_label: '  ' })!, /libellé/);
  assert.match(dataProblem('site_content', { public_email: 'not-an-email' })!, /e-mail publique/);
  assert.equal(dataProblem('site_content', { public_email: 'contact@example.com' }), undefined);
  assert.match(dataProblem('site_content', { request_project_submit: null })!, /libellé/);
  assert.match(dataProblem('catalogues', { download_label: '' })!, /téléchargement/);
});
test('page identity cannot be remapped by a data save or staged-slug publication', () => {
  assert.match(dataProblem('pages', { route_key: 'journal' }, { route_key: 'home' })!, /protégée/);
  assert.equal(publicationProblem('pages', { slug: 'showroom-casablanca', data: { route_key: 'showroom' } }), undefined);
  assert.match(publicationProblem('pages', { slug: 'showroom', data: { route_key: 'showroom' } })!, /showroom-casablanca/);
  assert.match(publicationProblem('site_content', { slug: 'global-copy', data: {} })!, /global/);
});
test('only repeated standard home scenes are blocked; FAQ group markers remain valid', () => {
  assert.match(dataProblem('pages', { route_key: 'home', sections: [{ section_key: 'brand' }, { section_key: 'brand' }] })!, /une section/);
  assert.equal(dataProblem('pages', { route_key: 'faq', sections: [{ section_key: 'group' }, { section_key: 'group' }] }), undefined);
  assert.equal(dataProblem('pages', { route_key: 'home', sections: [{ section_key: 'extra' }, { section_key: 'extra' }] }), undefined);
});
test('privacy content must preserve the factual tokens; fixed public entries are protected', () => {
  assert.equal(dataProblem('pages', PRIVACY_PAGE.data), undefined);
  assert.match(dataProblem('pages', { route_key: 'confidentialite', content: [] })!, /informations légales/);
  assert.equal(protectsPublicRoute('pages', { slug: 'catalogue', data: { route_key: 'catalogue' } }), true);
  assert.equal(protectsPublicRoute('site_content', { slug: 'global' }), true);
  assert.equal(protectsPublicRoute('models', { slug: 'global' }), false);
});

test('publication requires complete operational copy and a complete privacy document', () => {
  assert.match(publicationProblem('site_content', { slug: 'global', data: {} })!, /obligatoire/);
  assert.match(publicationProblem('pages', { slug: 'confidentialite', data: { route_key: 'confidentialite' } })!, /informations légales/);
  assert.match(publicationProblem('catalogues', { slug: 'edition', data: {} })!, /téléchargement/);
});

test('native hook registration includes its required capabilities and rejects blank saves visibly', async () => {
  const { createPlugin } = await import('../src/plugins/editorial/runtime.ts');
  const plugin = createPlugin();
  assert(plugin.capabilities.includes('content:write'), 'Native EmDash skips beforeSave without this capability');
  assert(plugin.capabilities.includes('hooks.content-policy:register'), 'Native EmDash skips publication policies without this capability');
  const save = plugin.hooks!['content:beforeSave']!;
  assert.equal(save.errorPolicy, 'abort');
  const ctx = { content: { list: async () => ({ items: [] }), get: async () => null } };
  await assert.rejects(save.handler({ collection: 'site_content', content: { catalogue_label: '' }, isNew: false }, ctx as never), { name: 'ContentSaveRejectedError' });
  const publish = plugin.hooks!['content:beforePublish']!;
  const decision = await publish.handler({ collection: 'pages', content: { slug: 'renamed', data: { route_key: 'home' } }, origin: { source: 'api' } }, ctx as never);
  assert.equal(decision?.cancel, true);
});
