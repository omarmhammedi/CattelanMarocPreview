import assert from 'node:assert/strict';
import test from 'node:test';
import { loadSeoFollowup, validateFollowup } from '../scripts/migrations/0012-seo-followup.mjs';
import { applyRefresh, planCopy, prepareRefresh, validateRefresh } from '../scripts/migrations/0010-editorial-refresh.mjs';

const responseFor = entry => ({_rev: 'fixture-revision', item: {type: entry.collection, slug: entry.slug, status: 'published', liveRevisionId: 'live', draftRevisionId: 'live', data: structuredClone(entry.before)}});

test('follow-up targets only the four approved entries and fields, without media or native SEO edits', async () => {
  const manifest = await loadSeoFollowup();
  assert.equal(manifest.entries.length, 4);
  for (const mutate of [
    entries => {entries[0].after.hero_image = {}; entries[0].before.hero_image = {};},
    entries => {entries[0].seoBefore = {title: null, description: null}; entries[0].seoAfter = {title: 'Unrequested', description: null};},
    entries => {entries[0].slug = 'catalogue';},
    entries => {entries.pop();},
    entries => {entries.at(-1).after.whatsapp_url = 'https://wa.me/212771105491';},
  ]) {const entries = structuredClone(manifest.entries); mutate(entries); assert.throws(() => validateFollowup(entries));}
});

test('WhatsApp is limited to exact HTTPS wa.me international digits without credentials, queries or redirects', async () => {
  const {entries, menu} = await loadSeoFollowup(), original = entries.find(entry => entry.collection === 'site_content');
  for (const url of ['http://wa.me/212771105490', 'https://wa.me/+212771105490', 'https://wa.me/0212771105490', 'https://wa.me/123', 'https://wa.me/1234567890123456', 'https://wa.me/212771105490/', 'https://wa.me/212771105490?text=hello', 'https://wa.me/212771105490#test', 'https://wa.me@other.example/212771105490', 'https://other.example/212771105490', '//wa.me/212771105490', 'javascript:alert(1)', '', null]) {
    const entry = structuredClone(original); entry.after.whatsapp_url = url;
    assert.throws(() => validateRefresh([entry], menu), /WhatsApp/);
  }
  assert.equal(validateRefresh([original], menu).entries[0], original);
});

test('absent initial WhatsApp state remains distinct from null, clearing and an independent configuration', async () => {
  const {entries, menu} = await loadSeoFollowup(), entry = entries.find(entry => entry.collection === 'site_content');
  const initial = responseFor(entry);
  assert.equal(planCopy(initial, entry), true);
  for (const value of [null, '', 'https://wa.me/212771105491', entry.after.whatsapp_url]) {
    const edited = structuredClone(initial); edited.item.data.whatsapp_url = value;
    assert.throws(() => planCopy(edited, entry), /exact initial or completed state/);
  }
  const done = structuredClone(initial); done.item.data = structuredClone(entry.after);
  assert.equal(planCopy(done, entry), false);
  await applyRefresh(() => assert.fail('Completed follow-up must perform no API calls.'), {plans: [{entry, before: done, change: false}], menuChange: false});
  for (const mutate of [
    entry => {entry.beforeAbsent = [];},
    entry => {entry.beforeAbsent = ['contact_label'];},
    entry => {entry.beforeAbsent = ['whatsapp_url', 'whatsapp_url'];},
    entry => {entry.before.whatsapp_url = null;},
    entry => {entry.slug = 'another';},
  ]) {const invalid = structuredClone(entry); mutate(invalid); assert.throws(() => validateRefresh([invalid], menu));}
});

test('showroom PortableText uses validated links and rejects media blocks, unsafe hrefs and pending drafts', async () => {
  const {entries, menu} = await loadSeoFollowup(), entry = entries.find(entry => entry.slug === 'showroom-casablanca');
  assert.equal(entry.after.content.flatMap(block => block.markDefs).length, 5);
  for (const mutate of [
    entry => {entry.after.content[0]._type = 'image';},
    entry => {entry.after.content[0]._type = 'html';},
    entry => {entry.after.content.find(block => block.markDefs.length).markDefs[0].href = 'javascript:alert(1)';},
    entry => {entry.after.content[0].children[0].marks = ['missing'];},
  ]) {const invalid = structuredClone(entry); mutate(invalid); assert.throws(() => validateRefresh([invalid], menu));}
  const pending = responseFor(entry); pending.item.draftRevisionId = 'owner-draft';
  assert.throws(() => planCopy(pending, entry), /unpublished/);
});

test('dry preparation requires the URL schema and preserves exact current entries and menu without writes', async () => {
  const manifest = await loadSeoFollowup();
  const responses = Object.fromEntries(manifest.entries.map(entry => [`${entry.collection}/${entry.slug}`, responseFor(entry)]));
  const schemas = {};
  for (const entry of manifest.entries) {
    const schema = schemas[entry.collection] ||= {supports: ['revisions'], fields: []};
    for (const slug of Object.keys(entry.after)) if (!schema.fields.some(field => field.slug === slug)) schema.fields.push({slug, type: slug === 'content' ? 'portableText' : slug === 'sections' ? 'repeater' : slug === 'whatsapp_url' ? 'url' : 'text'});
  }
  const menu = {items: [{id: 'fixture-catalogue', customUrl: '/catalogue/', label: 'Catalogue'}]};
  const api = async (path, options = {}) => {
    assert.equal(options.method || 'GET', 'GET');
    if (path === '/_emdash/api/menus/primary') return structuredClone(menu);
    const schema = path.match(/^\/_emdash\/api\/schema\/collections\/([^?]+)\?includeFields=true$/);
    if (schema) return {item: structuredClone(schemas[schema[1]])};
    const key = path.replace('/_emdash/api/content/', '');
    assert(responses[key], 'Unexpected API request'); return structuredClone(responses[key]);
  };
  const snapshot = structuredClone({responses, schemas, menu});
  const plan = await prepareRefresh(api, manifest.entries, manifest.menu);
  assert.equal(plan.plans.filter(entry => entry.change).length, 4);
  assert.equal(plan.menuChange, false);
  assert.deepEqual({responses, schemas, menu}, snapshot);
  schemas.site_content.fields.find(field => field.slug === 'whatsapp_url').type = 'string';
  await assert.rejects(() => prepareRefresh(api, manifest.entries, manifest.menu), /incompatible schema/);
});
