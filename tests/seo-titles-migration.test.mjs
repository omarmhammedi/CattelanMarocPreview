import assert from 'node:assert/strict';
import test from 'node:test';
import { applyTitles, loadManifest, planTitles, titleChange } from '../scripts/migrations/0019-seo-titles.mjs';

const entry = { collection: 'families', slug: 'tables', known: ['Old | A', 'Older | A'], after: 'Tables Cattelan Italia à Casablanca · Cattelan Italia Maroc' };

test('replaces only known titles, in the field and the native panel', () => {
  assert.deepEqual(titleChange({ data: { seo_title: 'Old | A' }, seo: { title: 'Older | A' } }, entry), { field: entry.after, native: entry.after, kept: [] });
  assert.deepEqual(titleChange({ data: { seo_title: 'Old | A' }, seo: { title: null } }, entry), { field: entry.after, native: null, kept: [] });
  assert.deepEqual(titleChange({ data: { seo_title: 'Mon titre' }, seo: { title: null } }, entry), { field: null, native: null, kept: ['Mon titre'] });
  assert.deepEqual(titleChange({ data: { seo_title: entry.after }, seo: { title: entry.after } }, entry), { field: null, native: null, kept: [] });
});

test('the plan titles stay under 90 characters and follow the plan pattern', async () => {
  const manifest = await loadManifest();
  for (const item of manifest.entries.filter(item => item.collection === 'families')) assert.match(item.after, /^.+ Cattelan Italia à Casablanca · Cattelan Italia Maroc$/u);
  assert.equal(manifest.entries.find(item => item.slug === 'home').after, 'Cattelan Italia Maroc · Showroom de mobilier italien à Casablanca');
});

test('applies once and keeps an editor’s title', async () => {
  const items = {
    tables: { id: 't', slug: 'tables', status: 'published', data: { title: 'Tables', seo_title: 'Old | A' }, seo: { title: 'Older | A', description: 'D' } },
    luminaires: { id: 'l', slug: 'luminaires', status: 'published', data: { seo_title: 'Mon titre' }, seo: { title: null } },
  };
  const manifest = { entries: [entry, { ...entry, slug: 'luminaires', after: 'Luminaires Cattelan Italia à Casablanca · Cattelan Italia Maroc' }] };
  const api = async (path, { method = 'GET', data } = {}) => {
    if (path.includes('?limit')) return { items: Object.values(items) };
    const id = path.split('/')[5]; const item = Object.values(items).find(value => value.id === id);
    if (method === 'PUT') { item.data = data.data; if (data.seo) item.seo = data.seo; return {}; }
    if (path.endsWith('/publish')) return {};
    return { item, _rev: 'r' };
  };
  const plan = await planTitles(api, manifest);
  assert.deepEqual(plan.kept.map(item => item.slug), ['luminaires']);
  await applyTitles(api, plan, { beforeWrite: () => {} });
  assert.equal(items.tables.data.seo_title, entry.after);
  assert.deepEqual(items.tables.seo, { title: entry.after, description: 'D' });
  assert.equal(items.luminaires.data.seo_title, 'Mon titre');
  assert.deepEqual((await planTitles(api, manifest)).changes, []);
});
