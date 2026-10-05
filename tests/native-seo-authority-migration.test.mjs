import assert from 'node:assert/strict';
import test from 'node:test';
import { applyNativeSeo, nativeSeoChange, planNativeSeo } from '../scripts/migrations/0026-native-seo-authority.mjs';

const published = () => ({ id: 'one', slug: 'home', status: 'published', draftRevisionId: null, liveRevisionId: 'live-1',
  data: { title: 'Home', seo_title: 'Approved title', meta_description: 'Approved description' },
  seo: { title: null, description: null, image: 'keep-image', canonical: 'https://example.com/', noIndex: true } });

test('migration preserves native overrides and all other native SEO fields', () => {
  const item = published(); item.seo.title = 'Editor title';
  assert.deepEqual(nativeSeoChange(item), { changes: { description: 'Approved description' }, conflicts: [{ field: 'title', reason: 'native-value-preserved' }] });
});

test('pending drafts supply only documented liveData; unavailable liveData blocks cutover', () => {
  const item = published(); item.liveData = structuredClone(item.data); item.draftRevisionId = 'draft-2';
  item.data.seo_title = 'SECRET DRAFT TITLE'; item.data.meta_description = 'UNPUBLISHED COPY';
  assert.deepEqual(nativeSeoChange(item).changes, { title: 'Approved title', description: 'Approved description' });
  delete item.liveData;
  assert.equal(nativeSeoChange(item).blocker, 'missing-live-data');
  assert.deepEqual(nativeSeoChange(item).changes, {});
});

test('draft and unknown revision state are never inferred to be published legacy metadata', () => {
  const item = published(); item.status = 'draft';
  assert.equal(nativeSeoChange(item).skipped, 'unpublished');
  item.status = 'published'; delete item.draftRevisionId;
  assert.equal(nativeSeoChange(item).blocker, 'missing-revision-state');
});

test('historically ignored model SEO values are not promoted into new live overrides', () => {
  const item = published(); item.data.seo_title = item.data.title;
  assert.deepEqual(nativeSeoChange(item, 'models').changes, {});
  item.data.seo_title = 'An actually used model title';
  assert.deepEqual(nativeSeoChange(item, 'models').changes, { title: 'An actually used model title' });
});

function fixture() {
  const item = published(); item.liveData = structuredClone(item.data); item.draftRevisionId = 'draft-2'; item.data.seo_title = 'Draft title';
  const writes = [], backups = [];
  let rev = 'rev-1';
  const api = async (path, options = {}) => {
    if (path.includes('?')) return { items: path.includes('/pages?') ? [{ id: item.id }] : [] };
    if (options.method) {
      writes.push({ path, ...options });
      assert(backups.length >= 2, 'Plan and fresh entry were privately backed up before mutation.');
      assert.equal(options.method, 'PUT');
      assert.deepEqual(Object.keys(options.data).sort(), ['_rev', 'seo']);
      assert.equal(options.data._rev, rev);
      Object.assign(item.seo, options.data.seo); rev = 'rev-2';
    }
    return { item: structuredClone(item), _rev: rev };
  };
  return { item, api, writes, backups, setRev: value => { rev = value; } };
}

test('apply is idempotent, sends only sparse SEO and preserves the unpublished draft', async () => {
  const { item, api, writes, backups } = fixture();
  const before = structuredClone(item);
  const plan = await planNativeSeo(api);
  await applyNativeSeo(api, plan, { beforeWrite: value => backups.push(value) });
  assert.equal(writes.length, 1);
  assert.equal(item.seo.title, 'Approved title');
  assert.deepEqual(item.data, before.data);
  assert.deepEqual(item.liveData, before.liveData);
  assert.equal(item.seo.image, before.seo.image);
  assert.equal(item.seo.canonical, before.seo.canonical);
  assert.equal(item.seo.noIndex, true);
  assert.equal((await planNativeSeo(api)).changes.length, 0);
});

test('a stale plan, backup failure or inventory blocker stops writes', async () => {
  const f = fixture(), plan = await planNativeSeo(f.api);
  await assert.rejects(applyNativeSeo(f.api, plan, { beforeWrite: () => { throw new Error('backup unavailable'); } }), /backup unavailable/u);
  f.setRev('concurrent-edit');
  await assert.rejects(applyNativeSeo(f.api, plan, { beforeWrite: value => f.backups.push(value) }), /changed; repeat the dry run/u);
  await assert.rejects(applyNativeSeo(f.api, { ...plan, blockers: [{ reason: 'missing-live-data' }] }, { beforeWrite: value => f.backups.push(value) }), /Resolve all migration blockers/u);
  assert.equal(f.writes.length, 0);
});

test('inventory follows cursors and rejects cursor cycles', async () => {
  let calls = 0;
  await assert.rejects(planNativeSeo(async () => { calls++; return { items: [], nextCursor: 'repeat' }; }), /Invalid pagination/u);
  assert.equal(calls, 2);
});
