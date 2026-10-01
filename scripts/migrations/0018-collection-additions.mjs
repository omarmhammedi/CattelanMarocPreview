/**
 * Site plan, fuller categories: fifteen models from content/collection-additions.json, added
 * to the existing families after the models they already show. Native APIs only; additive.
 * A model that already exists is kept; a model already in its family is not added twice.
 *
 *   EMDASH_BASE_URL=http://localhost:4331 EMDASH_AUTH_FILE=.wrangler/cms-sync-session.json node scripts/migrations/0018-collection-additions.mjs [--apply]
 *   EMDASH_BASE_URL=https://cattelan-maroc-preview.cattelan.workers.dev node scripts/migrations/0018-collection-additions.mjs [--apply]
 */
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { authenticatedApi } from './0014-site-strategy-pages.mjs';
import { loadAssets, planNewFamilies, validateModels, writers } from './0016-new-families.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
export const migration = '0018-collection-additions';

export function validateManifest(manifest) {
  const { models, files } = validateModels(manifest);
  const placed = Object.values(manifest.additions).flat();
  assert.deepEqual([...placed].sort(), [...models].sort(), 'Each model belongs to exactly one family.');
  return { ...manifest, files: [...new Set(files)] };
}

export async function loadManifest() {
  return loadAssets(validateManifest(JSON.parse(await readFile(join(root, 'content/collection-additions.json'), 'utf8'))));
}

const referencesPath = id => `/_emdash/api/content/families/${encodeURIComponent(id)}/references/family_models/children?limit=100`;

export async function planAdditions(api, manifest) {
  // Same schema checks and model inventory as 0016; this manifest creates no family.
  const base = await planNewFamilies(api, { ...manifest, families: [] });
  const families = new Map(((await api('/_emdash/api/content/families?limit=100')).items || []).map(item => [item.slug, item]));
  const links = [];
  for (const [slug, models] of Object.entries(manifest.additions)) {
    const family = families.get(slug);
    assert(family, `families/${slug} is missing.`);
    const page = await api(referencesPath(family.id));
    assert(!page.nextCursor, `families/${slug}: more than 100 models.`);
    const current = page.children.map(entry => entry.id);
    const missing = models.filter(model => !base.modelIds[model] || !current.includes(base.modelIds[model]));
    if (missing.length) links.push({ family: slug, id: family.id, current, add: missing });
  }
  return { ...base, links };
}

export async function applyAdditions(api, manifest, plan, { beforeWrite, log = () => {} }) {
  assert.equal(typeof beforeWrite, 'function', 'A private backup writer is required before any mutation.');
  await beforeWrite({ plan: { ...plan, createModels: plan.createModels.map(model => model.slug) } });
  const { createModel } = writers(api, manifest);
  const ids = { ...plan.modelIds };
  for (const model of plan.createModels) {
    ids[model.slug] = await createModel(model);
    log(`models/${model.slug} created and published (${1 + model.gallery.length} photos, ${model.finishes.length} finishes)`);
  }
  for (const link of plan.links) {
    const path = `/_emdash/api/content/families/${encodeURIComponent(link.id)}`;
    const fresh = await api(path);
    // The current selection keeps its order; the new models follow it.
    const models = [...link.current, ...link.add.map(slug => ids[slug]).filter(id => !link.current.includes(id))];
    await api(path, { method: 'PUT', data: { data: fresh.item.data, references: { models }, _rev: fresh._rev } });
    const saved = await api(path);
    if (fresh.item.status === 'published') await api(`${path}/publish`, { method: 'POST', data: { _rev: saved._rev } });
    log(`families/${link.family} + ${link.add.join(', ')}`);
  }
}

const allowedPaths = /^\/_emdash\/api\/(?:content\/(?:models|families)|schema\/collections\/(?:models|families)|media)(?:[/?]|$)/u;

async function main() {
  const flags = process.argv.slice(2);
  assert(flags.every(flag => flag === '--apply'), 'Use no flag for a dry run, or --apply.');
  assert(process.env.EMDASH_BASE_URL, 'Set EMDASH_BASE_URL to the CMS origin.');
  const origin = new URL(process.env.EMDASH_BASE_URL);
  const manifest = await loadManifest(), api = await authenticatedApi(origin, allowedPaths);
  const plan = await planAdditions(api, manifest);
  console.log(JSON.stringify({ origin: origin.origin, migration, mode: flags.includes('--apply') ? 'apply' : 'dry-run',
    createModels: plan.createModels.map(model => model.slug), keptModels: plan.keptModels,
    links: Object.fromEntries(plan.links.map(link => [link.family, link.add])) }));
  if (!flags.includes('--apply')) return;
  const dir = join(root, '.wrangler/migrations', migration);
  await mkdir(dir, { recursive: true, mode: 0o700 });
  await applyAdditions(api, manifest, plan, {
    beforeWrite: value => writeFile(join(dir, `${new Date().toISOString().replaceAll(/[:.]/gu, '-')}-backup.json`), JSON.stringify(value, null, 2), { mode: 0o600, flag: 'wx' }),
    log: message => console.log(message),
  });
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) await main();
