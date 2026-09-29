import assert from 'node:assert/strict';
import test from 'node:test';
import { BRAND_FIELD, prepareBrandLocation } from '../scripts/migrations/0007-brand-location.mjs';

function fixture(field, value) {
  const entry = { _rev: 'original', item: { id: 'global', slug: 'global', type: 'site_content', status: 'published', liveRevisionId: 'original', draftRevisionId: 'original', data: { city: 'Casablanca, Maroc', address: 'Original address', ...(value === undefined ? {} : { brand_location: value }) } } };
  const schema = { slug: 'site_content', supports: ['revisions'], fields: field ? [field] : [] };
  return { entry, api: async path => {
    if (path.endsWith('?includeFields=true')) return { item: structuredClone(schema) };
    assert.equal(path, '/_emdash/api/content/site_content/global');
    return structuredClone(entry);
  } };
}

test('brand caption preparation leaves real showroom city and all other values intact', async () => {
  const { api, entry } = fixture();
  const before = structuredClone(entry);
  const plan = await prepareBrandLocation(api);
  assert.deepEqual(plan.entries[0].values, { brand_location: 'Maroc' });
  assert.deepEqual(plan.fields, [BRAND_FIELD]);
  assert.deepEqual(entry, before);
});

test('existing branding fields preserve both editorial changes and intentional clears', async () => {
  for (const value of ['Maroc', 'Another caption', '', null, undefined]) {
    const { api } = fixture(BRAND_FIELD, value);
    const plan = await prepareBrandLocation(api);
    assert.deepEqual(plan.fields, []);
    assert.deepEqual(plan.entries[0].values, {});
  }
});

test('unpublished edits and incompatible schema prevent preparation', async () => {
  const { api, entry } = fixture();
  entry.item.draftRevisionId = 'editor-draft';
  await assert.rejects(prepareBrandLocation(api), /unpublished edits/);
  for (const field of [{ ...BRAND_FIELD, type: 'number' }, { ...BRAND_FIELD, required: true }, { ...BRAND_FIELD, defaultValue: 'Forced' }]) {
    await assert.rejects(prepareBrandLocation(fixture(field).api), /incompatible/);
  }
});
