/**
 * Site plan, information pages: À propos, Votre projet, FAQ and Mentions légales,
 * the owner-confirmed contact details and the showroom delivery paragraph.
 * Additive; a value an editor changed is kept and reported. Dry run by default.
 *
 *   EMDASH_BASE_URL=http://localhost:4331 EMDASH_AUTH_FILE=.wrangler/cms-sync-session.json node scripts/migrations/0015-site-information-pages.mjs [--apply]
 */
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { applySiteStrategy, authenticatedApi, planSiteStrategy, validateManifest } from './0014-site-strategy-pages.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
export const migration = '0015-site-information-pages';
export const sectionLimit = 40;
const allowed = /^\/_emdash\/api\/(?:content\/(?:pages|site_content)|schema\/collections\/(?:pages|models)|menus\/primary)(?:[/?]|$)/u;

export async function loadManifest() {
  const manifest = validateManifest(JSON.parse(await readFile(join(root, 'content/site-information-pages.json'), 'utf8')));
  for (const update of manifest.globalUpdates) assert(update.field && update.after && Array.isArray(update.before), 'Invalid global update.');
  assert(manifest.showroomBlock.key && manifest.showroomBlock.before && manifest.showroomBlock.after);
  return manifest;
}

async function entry(api, collection, slug) {
  const list = await api(`/_emdash/api/content/${collection}?limit=100`);
  const item = (list.items || []).find(candidate => candidate.slug === slug);
  return item ? api(`/_emdash/api/content/${collection}/${encodeURIComponent(item.id)}`) : null;
}

/** Pure decisions, so the same rules apply to a dry run, the apply step and the tests. */
export function globalChanges(data, updates) {
  const changes = {}, kept = [];
  for (const { field, before, after } of updates) {
    const current = data[field] ?? null;
    if (current === after) continue;
    if (before.includes(current) || (current === '' && before.includes(null))) changes[field] = after;
    else kept.push(field);
  }
  return { changes, kept };
}

export function blockChange(content, { key, before, after }) {
  const blocks = Array.isArray(content) ? content : [];
  const block = blocks.find(item => item._key === key);
  const text = block?.children?.map(child => child.text).join('') ?? null;
  if (text === after) return { status: 'done' };
  if (text !== before || block.children.length !== 1) return { status: 'kept' };
  return { status: 'change', content: blocks.map(item => item._key === key ? { ...item, children: [{ ...item.children[0], text: after }] } : item) };
}

export async function planInformation(api, manifest) {
  const pages = await planSiteStrategy(api, manifest);
  const sectionsField = (await api('/_emdash/api/schema/collections/pages?includeFields=true')).item.fields.find(field => field.slug === 'sections');
  assert(sectionsField?.type === 'repeater', 'pages.sections must be a repeater.');
  const needed = Math.max(...manifest.pages.map(page => page.data.sections.length));
  assert(needed <= sectionLimit, 'A page exceeds the section limit this migration sets.');
  const global = await entry(api, 'site_content', 'global');
  assert(global, 'site_content/global is missing.');
  const showroom = await entry(api, 'pages', 'showroom-casablanca');
  return {
    sectionsField: (sectionsField.validation?.maxItems ?? Infinity) < needed ? sectionsField : null,
    pages, global: { id: global.item.id, ...globalChanges(global.item.data, manifest.globalUpdates) },
    showroom: showroom ? { id: showroom.item.id, ...blockChange(showroom.item.data.content, manifest.showroomBlock) } : { status: 'kept' },
    snapshot: { global: global.item.data, showroomContent: showroom?.item.data.content ?? null },
  };
}

async function save(api, collection, id, transform) {
  const path = `/_emdash/api/content/${collection}/${encodeURIComponent(id)}`;
  const fresh = await api(path);
  await api(path, { method: 'PUT', data: { data: transform(fresh.item.data), _rev: fresh._rev } });
  const saved = await api(path);
  await api(`${path}/publish`, { method: 'POST', data: { _rev: saved._rev } });
}

export async function applyInformation(api, plan, manifest, { beforeWrite, log = () => {} }) {
  assert.equal(typeof beforeWrite, 'function', 'A private backup writer is required before any mutation.');
  await beforeWrite(plan);
  if (plan.sectionsField) {
    // The FAQ holds 7 groups and their questions; 20 sections were enough for the first pages only.
    await api('/_emdash/api/schema/collections/pages/fields/sections', { method: 'PUT', data: { validation: { ...plan.sectionsField.validation, maxItems: sectionLimit } } });
    log(`pages.sections: up to ${sectionLimit} sections`);
  }
  await applySiteStrategy(api, plan.pages, { beforeWrite: () => {}, log });
  if (Object.keys(plan.global.changes).length) {
    await save(api, 'site_content', plan.global.id, data => {
      const { changes } = globalChanges(data, manifest.globalUpdates);
      return { ...data, ...changes };
    });
    log(`site_content/global: ${Object.keys(plan.global.changes).join(', ')}`);
  }
  if (plan.showroom.status === 'change') {
    await save(api, 'pages', plan.showroom.id, data => {
      const result = blockChange(data.content, manifest.showroomBlock);
      assert.equal(result.status, 'change', 'The showroom paragraph changed during the migration.');
      return { ...data, content: result.content };
    });
    log('pages/showroom-casablanca: delivery paragraph');
  }
}

async function main() {
  const flags = process.argv.slice(2);
  assert(flags.every(flag => flag === '--apply'), 'Use no flag for a dry run, or --apply.');
  assert(process.env.EMDASH_BASE_URL, 'Set EMDASH_BASE_URL to the CMS origin.');
  const origin = new URL(process.env.EMDASH_BASE_URL);
  const manifest = await loadManifest(), api = await authenticatedApi(origin, allowed);
  const plan = await planInformation(api, manifest);
  console.log(JSON.stringify({ origin: origin.origin, migration, mode: flags.includes('--apply') ? 'apply' : 'dry-run',
    sectionLimit: plan.sectionsField ? sectionLimit : null, routeKeys: plan.pages.missingRoutes, createPages: plan.pages.createPages.map(page => page.slug), keptPages: plan.pages.keptPages,
    globalFields: Object.keys(plan.global.changes), keptGlobalFields: plan.global.kept, showroomParagraph: plan.showroom.status }));
  if (!flags.includes('--apply')) return;
  const dir = join(root, '.wrangler/migrations', migration);
  await mkdir(dir, { recursive: true, mode: 0o700 });
  await applyInformation(api, plan, manifest, {
    beforeWrite: value => writeFile(join(dir, `${new Date().toISOString().replaceAll(/[:.]/gu, '-')}-backup.json`), JSON.stringify(value, null, 2), { mode: 0o600, flag: 'wx' }),
    log: message => console.log(message),
  });
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) await main();
