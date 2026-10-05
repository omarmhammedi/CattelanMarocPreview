/**
 * Copy the currently public legacy metadata to empty native SEO fields.
 * Native SEO saves immediately: NEVER send content data, status or publish.
 * Run after seed, and before releasing the native-only frontend. A dry run
 * must show no remaining changes/blockers after apply. Legacy data stays as
 * an archived migration source; it is no longer the frontend's fallback.
 *
 * EMDASH_BASE_URL=https://… EMDASH_API_TOKEN=… node scripts/migrations/0026-native-seo-authority.mjs [--apply]
 * Put credentials in the environment, not the shell command/history.
 */
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { authenticatedApi } from './0014-site-strategy-pages.mjs';

export const migration = '0026-native-seo-authority';
export const seoCollections = ['pages', 'families', 'models', 'posts'];
const root = fileURLToPath(new URL('../../', import.meta.url));
const isRecord = value => value && typeof value === 'object' && !Array.isArray(value);

/** Admin data is a draft overlay; only liveData is trustworthy when it exists. */
export function nativeSeoChange(item, collection = item.type) {
  const changes = {}, conflicts = [];
  if (item.status !== 'published') return { changes, conflicts, skipped: 'unpublished' };
  if (!Object.hasOwn(item, 'draftRevisionId') || !Object.hasOwn(item, 'liveRevisionId')) {
    return { changes, conflicts, blocker: 'missing-revision-state' };
  }
  if (item.draftRevisionId && !isRecord(item.liveData)) {
    return { changes, conflicts, blocker: 'missing-live-data' };
  }
  const live = item.draftRevisionId ? item.liveData : item.data;
  if (!isRecord(live)) return { changes, conflicts, blocker: 'missing-live-data' };
  if (!isRecord(item.seo)) return { changes, conflicts, blocker: 'native-seo-not-enabled' };
  for (const [native, legacy, max] of [['title', 'seo_title', 200], ['description', 'meta_description', 500]]) {
    const source = live[legacy];
    // The old model template used description directly and generated its title
    // when seo_title merely repeated the visible model name. Do not promote an
    // ignored legacy value into a new, immediately live native override.
    if (collection === 'models' && (native === 'description' || source === live.title)) continue;
    if (source === undefined || source === null || source === '') continue;
    if (typeof source !== 'string' || source.length > max) return { changes: {}, conflicts, blocker: `invalid-${legacy}` };
    const current = item.seo[native];
    if (current === null || current === undefined || current === '') changes[native] = source;
    else if (current !== source) conflicts.push({ field: native, reason: 'native-value-preserved' });
  }
  return { changes, conflicts };
}

export async function planNativeSeo(api) {
  const changes = [], conflicts = [], skipped = [], blockers = [];
  let inspected = 0;
  for (const collection of seoCollections) {
    const seen = new Set();
    let cursor;
    do {
      // Rich model entries include large image galleries. Small pages also fit
      // the CPU limit of the current preview Worker's authenticated API.
      const listing = await api(`/_emdash/api/content/${collection}?limit=2${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`);
      for (const summary of listing.items || []) {
        const response = await api(`/_emdash/api/content/${collection}/${encodeURIComponent(summary.id)}`);
        const { item } = response;
        const identity = { collection, id: item.id, slug: item.slug };
        const decision = nativeSeoChange(item, collection);
        inspected++;
        if (decision.blocker) blockers.push({ ...identity, reason: decision.blocker });
        if (decision.skipped) skipped.push({ ...identity, reason: decision.skipped });
        conflicts.push(...decision.conflicts.map(conflict => ({ ...identity, ...conflict })));
        if (Object.keys(decision.changes).length && !decision.blocker) {
          if (!response._rev) blockers.push({ ...identity, reason: 'missing-revision-token' });
          else changes.push({ ...identity, seo: decision.changes, before: response });
        }
      }
      cursor = listing.nextCursor;
      if (cursor) {
        assert(!seen.has(cursor) && seen.size < 10_000, `Invalid pagination for ${collection}.`);
        seen.add(cursor);
      }
    } while (cursor);
  }
  return { migration, inspected, changes, conflicts, skipped, blockers };
}

export async function applyNativeSeo(api, plan, { beforeWrite, log = () => {} }) {
  assert.equal(typeof beforeWrite, 'function', 'A private backup writer is required before any mutation.');
  assert.equal(plan.blockers.length, 0, 'Resolve all migration blockers before applying the SEO cutover.');
  await beforeWrite({ kind: 'plan', ...plan });
  for (const entry of plan.changes) {
    const path = `/_emdash/api/content/${entry.collection}/${encodeURIComponent(entry.id)}`;
    const fresh = await api(path);
    const decision = nativeSeoChange(fresh.item, entry.collection);
    assert(!decision.blocker, `${entry.collection}/${entry.slug}: ${decision.blocker}`);
    assert.equal(fresh._rev, entry.before._rev, `${entry.collection}/${entry.slug} changed; repeat the dry run.`);
    assert.deepEqual(decision.changes, entry.seo, `${entry.collection}/${entry.slug} metadata changed; repeat the dry run.`);
    await beforeWrite({ kind: 'entry', collection: entry.collection, id: entry.id, response: fresh });
    await api(path, { method: 'PUT', data: { _rev: fresh._rev, seo: entry.seo } });
    const saved = await api(path);
    for (const [field, value] of Object.entries(entry.seo)) assert.equal(saved.item.seo?.[field], value, `${entry.slug}: ${field} verification failed.`);
    assert.equal(saved.item.status, fresh.item.status, `${entry.slug}: publication status changed unexpectedly.`);
    assert.equal(saved.item.draftRevisionId, fresh.item.draftRevisionId, `${entry.slug}: draft changed unexpectedly.`);
    assert.equal(saved.item.liveRevisionId, fresh.item.liveRevisionId, `${entry.slug}: live revision changed unexpectedly.`);
    log(`${entry.collection}/${entry.slug}: native ${Object.keys(entry.seo).join(', ')} migrated; body untouched.`);
  }
}

const allowedPaths = /^\/_emdash\/api\/content\/(?:pages|families|models|posts)(?:[/?]|$)/u;

async function main() {
  const flags = process.argv.slice(2);
  assert(flags.every(flag => flag === '--apply'), 'Use no flag for a dry run, or --apply.');
  assert(process.env.EMDASH_BASE_URL, 'Set EMDASH_BASE_URL to the CMS origin.');
  const origin = new URL(process.env.EMDASH_BASE_URL);
  assert(origin.protocol === 'https:' || ['localhost', '127.0.0.1'].includes(origin.hostname), 'Remote CMS credentials require HTTPS.');
  const api = await authenticatedApi(origin, allowedPaths);
  const plan = await planNativeSeo(api);
  console.log(JSON.stringify({ origin: origin.origin, migration, mode: flags.includes('--apply') ? 'apply' : 'dry-run',
    inspected: plan.inspected, changes: plan.changes.map(({ collection, slug, seo }) => ({ collection, slug, fields: Object.keys(seo) })),
    conflicts: plan.conflicts, skipped: plan.skipped, blockers: plan.blockers }, null, 2));
  if (!flags.includes('--apply')) { if (plan.blockers.length) process.exitCode = 2; return; }
  const dir = join(root, '.wrangler/migrations', migration, new Date().toISOString().replaceAll(/[:.]/gu, '-'));
  await mkdir(dir, { recursive: true, mode: 0o700 });
  let number = 0;
  await applyNativeSeo(api, plan, {
    beforeWrite: value => writeFile(join(dir, `${String(number++).padStart(4, '0')}-backup.json`), JSON.stringify({ origin: origin.origin, ...value }, null, 2), { mode: 0o600, flag: 'wx' }),
    log: message => console.log(message),
  });
  const after = await planNativeSeo(api);
  assert.equal(after.changes.length, 0, 'SEO changes remain: repeat the inventory before deployment.');
  assert.equal(after.blockers.length, 0, 'SEO blockers remain: do not deploy the native-only frontend.');
  console.log('Native SEO cutover verified. Unpublished legacy entries still require editor review before their first publication.');
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) await main();
