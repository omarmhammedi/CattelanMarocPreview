/**
 * Site plan, page titles: home, showroom and every family. A title is replaced only when it
 * still holds a value this project wrote (seed or an earlier migration), both in the seo_title
 * field and in the native SEO panel; an editor's own title is kept and reported. Additive.
 *
 *   EMDASH_BASE_URL=http://localhost:4331 EMDASH_AUTH_FILE=.wrangler/cms-sync-session.json node scripts/migrations/0019-seo-titles.mjs [--apply]
 *   EMDASH_BASE_URL=https://cattelan-maroc-preview.cattelan.workers.dev node scripts/migrations/0019-seo-titles.mjs [--apply]
 */
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { authenticatedApi } from './0014-site-strategy-pages.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
export const migration = '0019-seo-titles';

export function validateManifest(manifest) {
  assert.equal(manifest.version, 1);
  for (const entry of manifest.entries) {
    assert(['pages', 'families'].includes(entry.collection), `${entry.slug}: unsupported collection.`);
    // Limit of the seo_title fields; the CMS refuses longer values.
    assert(entry.after && entry.after.length <= 90 && !entry.known.includes(entry.after), `${entry.slug}: invalid title.`);
  }
  return manifest;
}

export async function loadManifest() {
  return validateManifest(JSON.parse(await readFile(join(root, 'content/seo-titles.json'), 'utf8')));
}

/** What to change in one entry: the field and/or the native title, each only from a known value. */
export function titleChange(item, entry) {
  const field = item.data.seo_title ?? null;
  const native = item.seo?.title ?? null;
  const replace = value => entry.known.includes(value);
  return {
    field: replace(field) || field === null ? entry.after : null,
    native: replace(native) ? entry.after : null,
    kept: [field, native].filter(value => value !== null && value !== entry.after && !replace(value)),
  };
}

export async function planTitles(api, manifest) {
  const lists = {};
  const changes = [], kept = [];
  for (const entry of manifest.entries) {
    lists[entry.collection] ||= (await api(`/_emdash/api/content/${entry.collection}?limit=100`)).items || [];
    const summary = lists[entry.collection].find(item => item.slug === entry.slug);
    if (!summary) { kept.push({ ...entry, reason: 'missing' }); continue; }
    const { item } = await api(`/_emdash/api/content/${entry.collection}/${encodeURIComponent(summary.id)}`);
    const change = titleChange(item, entry);
    if (change.kept.length) kept.push({ collection: entry.collection, slug: entry.slug, reason: 'edited', values: change.kept });
    if (change.field || change.native) changes.push({ ...entry, id: summary.id, ...change });
  }
  return { changes, kept };
}

export async function applyTitles(api, plan, { beforeWrite, log = () => {} }) {
  assert.equal(typeof beforeWrite, 'function', 'A private backup writer is required before any mutation.');
  await beforeWrite(plan);
  for (const change of plan.changes) {
    const path = `/_emdash/api/content/${change.collection}/${encodeURIComponent(change.id)}`;
    const fresh = await api(path);
    const again = titleChange(fresh.item, change);
    if (!again.field && !again.native) continue;
    await api(path, { method: 'PUT', data: {
      _rev: fresh._rev,
      data: again.field ? { ...fresh.item.data, seo_title: again.field } : fresh.item.data,
      ...(again.native ? { seo: { ...fresh.item.seo, title: again.native } } : {}),
    } });
    const saved = await api(path);
    if (fresh.item.status === 'published') await api(`${path}/publish`, { method: 'POST', data: { _rev: saved._rev } });
    log(`${change.collection}/${change.slug}: ${change.after}`);
  }
}

const allowedPaths = /^\/_emdash\/api\/content\/(?:pages|families)(?:[/?]|$)/u;

async function main() {
  const flags = process.argv.slice(2);
  assert(flags.every(flag => flag === '--apply'), 'Use no flag for a dry run, or --apply.');
  assert(process.env.EMDASH_BASE_URL, 'Set EMDASH_BASE_URL to the CMS origin.');
  const origin = new URL(process.env.EMDASH_BASE_URL);
  const api = await authenticatedApi(origin, allowedPaths);
  const plan = await planTitles(api, await loadManifest());
  console.log(JSON.stringify({ origin: origin.origin, migration, mode: flags.includes('--apply') ? 'apply' : 'dry-run',
    change: plan.changes.map(change => `${change.collection}/${change.slug}${change.native ? ' (+ native)' : ''}`), kept: plan.kept }));
  if (!flags.includes('--apply')) return;
  const dir = join(root, '.wrangler/migrations', migration);
  await mkdir(dir, { recursive: true, mode: 0o700 });
  await applyTitles(api, plan, {
    beforeWrite: value => writeFile(join(dir, `${new Date().toISOString().replaceAll(/[:.]/gu, '-')}-backup.json`), JSON.stringify(value, null, 2), { mode: 0o600, flag: 'wx' }),
    log: message => console.log(message),
  });
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) await main();
