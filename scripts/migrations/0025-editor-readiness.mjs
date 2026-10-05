/**
 * Organize native editors and add missing business-copy fields without publishing drafts.
 * Dry run by default. --apply writes a private pre-change backup, then uses native APIs.
 * Re-run to resume; existing copy, relations, drafts and footer menus are preserved.
 *
 * EMDASH_BASE_URL=https://cattelan-maroc-preview.cattelan.workers.dev node scripts/migrations/0025-editor-readiness.mjs [--apply]
 */
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { authenticatedApi } from './0014-site-strategy-pages.mjs';
import { EDITORIAL_COPY_DEFAULTS, EDITORIAL_COPY_FIELDS, EDITORIAL_COPY_FIELD, editorialData } from '../../src/lib/editorial-storage.mjs';
import { FOOTER_MENU } from '../../src/lib/navigation-copy.mjs';

export const migration = '0025-editor-readiness';
const root = fileURLToPath(new URL('../../', import.meta.url));
const unfinishedFooterLabel = `${FOOTER_MENU.label} — migration 0025 en cours`;
const schemaPath = name => `/_emdash/api/schema/collections/${name}?includeFields=true`;
const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
const pick = (value, keys) => Object.fromEntries(keys.filter(key => Object.hasOwn(value, key)).map(key => [key, value[key]]));
const collectionKeys = ['label', 'labelSingular', 'group', 'sortOrder', 'titleField', 'description', 'admin'];
// EmDash 0.41 refuses changing required on existing fields; native hooks protect
// operational blanks. Fresh installs and newly added fields retain required schema flags.
const fieldKeys = ['label', 'widget', 'sortOrder'];
export async function loadEditorSeed() { return JSON.parse(await readFile(join(root, 'seed/seed.json'), 'utf8')); }

export async function allEntries(api, collection) {
  const items = [], seen = new Set();
  let cursor;
  do {
    const page = await api(`/_emdash/api/content/${collection}?limit=50${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`);
    items.push(...(page.items || []));
    assert(items.length <= 10000, 'Unexpected content volume; review before continuing.');
    cursor = page.nextCursor || undefined;
    assert(!cursor || !seen.has(cursor), 'CMS returned a repeated pagination cursor.');
    if (cursor) seen.add(cursor);
    assert(!page.hasMore || cursor, 'CMS pagination omitted its cursor.');
  } while (cursor);
  return items;
}

export function planCollection(current, desired) {
  const metadata = {};
  for (const [key, value] of Object.entries(pick(desired, collectionKeys))) if (!same(current[key], value)) metadata[key] = value;
  // Preserve unrelated collection capabilities. Remove only misleading SEO panels.
  if (['catalogues', 'site_content'].includes(desired.slug) && (current.hasSeo || current.supports?.includes('seo'))) {
    metadata.supports = (current.supports || []).filter(value => value !== 'seo');
    metadata.hasSeo = false;
  }
  const fields = [];
  for (const wanted of desired.fields) {
    const existing = current.fields.find(field => field.slug === wanted.slug);
    if (!existing) { fields.push({ slug: wanted.slug, create: wanted }); continue; }
    assert.equal(existing.type, wanted.type, `${desired.slug}.${wanted.slug} changed type; manual review required.`);
    const changes = {};
    for (const [key, value] of Object.entries(pick(wanted, fieldKeys))) if (!same(existing[key], value)) changes[key] = value;
    if (desired.slug === 'pages' && wanted.slug === 'route_key') {
      const options = [...new Set([...(existing.validation?.options || []), ...wanted.validation.options])];
      if (!same(options, existing.validation?.options)) changes.validation = { ...existing.validation, options };
    }
    if (Object.keys(changes).length) fields.push({ slug: wanted.slug, before: existing, changes });
  }
  return { slug: desired.slug, before: current, metadata, fields };
}

export async function planEditorReadiness(api, seed) {
  seed ||= await loadEditorSeed();
  const collections = [];
  for (const desired of seed.collections) collections.push(planCollection((await api(schemaPath(desired.slug))).item, desired));
  const globals = await allEntries(api, 'site_content');
  const owners = globals.filter(item => item.slug === 'global');
  assert.equal(owners.length, 1, 'Exactly one global configuration must exist; do not guess its owner.');
  const global = await api(`/_emdash/api/content/site_content/${encodeURIComponent(owners[0].id)}`);
  assert(global._rev, 'Native CMS did not return the draft revision token.');
  const existingCopy = global.item.data[EDITORIAL_COPY_FIELD];
  assert(existingCopy == null || (typeof existingCopy === 'object' && !Array.isArray(existingCopy)), 'The editorial copy field holds an unexpected value; review before replacing it.');
  const missingCopy = Object.fromEntries(Object.entries(EDITORIAL_COPY_DEFAULTS).filter(([key]) => !Object.hasOwn(existingCopy || {}, key)).map(([key, fallback]) => [key, Object.hasOwn(global.item.data, key) ? global.item.data[key] : fallback]));
  const additions = Object.keys(missingCopy).length ? { [EDITORIAL_COPY_FIELD]: { ...existingCopy, ...missingCopy } } : {};
  const effective = editorialData({ ...global.item.data, ...additions });
  const incompleteRequired = [...seed.collections.find(item => item.slug === 'site_content').fields, ...EDITORIAL_COPY_FIELDS].filter(field => field.required && ['string', 'text'].includes(field.type) && (typeof effective[field.slug] !== 'string' || !effective[field.slug].trim())).map(field => field.slug);
  const pages = await allEntries(api, 'pages');
  const privacy = seed.content.pages.find(page => page.slug === 'confidentialite');
  assert(privacy, 'The seed must define the CMS-owned privacy page.');
  const existingPrivacy = pages.find(page => page.slug === 'confidentialite');
  const menus = await api('/_emdash/api/menus');
  const footerExists = menus.some(menu => menu.name === 'footer');
  const footer = footerExists ? await api('/_emdash/api/menus/footer') : null;
  const resumeFooter = footer?.label === unfinishedFooterLabel;
  const expectedUrls = new Set(FOOTER_MENU.items.map(item => item.url));
  if (resumeFooter) assert(footer.items.every(item => item.type === 'custom' && expectedUrls.has(item.customUrl)), 'An unfinished footer was edited; review it manually before resuming.');
  return { migration, collections, global, additions, missingCopy: Object.keys(missingCopy), incompleteRequired, extraGlobalEntries: globals.filter(item => item.slug !== 'global').map(item => ({ id: item.id, slug: item.slug })), privacy: existingPrivacy ? null : privacy, existingPrivacy: existingPrivacy ? await api(`/_emdash/api/content/pages/${encodeURIComponent(existingPrivacy.id)}`) : null,
    footer, createFooter: !footerExists, resumeFooter };
}

export async function applyEditorReadiness(api, plan, { beforeWrite, log = () => {} } = {}) {
  assert.equal(typeof beforeWrite, 'function', 'A private backup writer is required before any mutation.');
  await beforeWrite(plan);
  for (const collection of plan.collections) {
    const base = `/_emdash/api/schema/collections/${collection.slug}`;
    // Native schema APIs have no _rev. Refuse observed drift; apply during a schema-edit freeze.
    const fresh = (await api(schemaPath(collection.slug))).item;
    for (const key of Object.keys(collection.metadata)) assert(same(fresh[key], collection.before[key]), `Schema ${collection.slug}.${key} changed since planning; re-run the dry run.`);
    if (Object.keys(collection.metadata).length) await api(base, { method: 'PUT', data: collection.metadata });
    for (const field of collection.fields) {
      const current = fresh.fields.find(value => value.slug === field.slug);
      if (field.create) {
        assert(!current, `${collection.slug}.${field.slug} appeared since planning; re-run.`);
        await api(`${base}/fields`, { method: 'POST', data: field.create });
      } else {
        assert(current, `${collection.slug}.${field.slug} disappeared since planning; re-run.`);
        for (const key of Object.keys(field.changes)) assert(same(current[key], field.before[key]), `${collection.slug}.${field.slug}.${key} changed since planning; re-run.`);
        await api(`${base}/fields/${field.slug}`, { method: 'PUT', data: field.changes });
      }
    }
    if (Object.keys(collection.metadata).length || collection.fields.length) log(`${collection.slug}: editor schema updated`);
  }
  if (Object.keys(plan.additions).length) {
    const path = `/_emdash/api/content/site_content/${encodeURIComponent(plan.global.item.id)}`;
    const fresh = await api(path);
    assert.equal(fresh._rev, plan.global._rev, 'Global content changed since planning; re-run to preserve that edit.');
    await api(path, { method: 'PUT', data: { _rev: fresh._rev, data: plan.additions } });
    log('global: missing copy added to the draft only; existing values and relations preserved');
  }
  if (plan.privacy) {
    const pages = await allEntries(api, 'pages');
    assert(!pages.some(page => page.slug === 'confidentialite'), 'Privacy page appeared since planning; re-run.');
    await api('/_emdash/api/content/pages', { method: 'POST', data: { slug: plan.privacy.slug, data: plan.privacy.data } });
    log('confidentialite: created as draft; review and publish explicitly');
  }
  if (plan.createFooter || plan.resumeFooter) {
    let footer = plan.footer;
    if (plan.createFooter) {
      const menus = await api('/_emdash/api/menus');
      assert(!menus.some(menu => menu.name === 'footer'), 'Footer menu appeared since planning; re-run.');
      await api('/_emdash/api/menus', { method: 'POST', data: { name: 'footer', label: unfinishedFooterLabel } });
      footer = { items: [] };
    }
    for (const [index, item] of FOOTER_MENU.items.entries()) {
      if (footer.items.some(existing => existing.customUrl === item.url)) continue;
      await api('/_emdash/api/menus/footer/items', { method: 'POST', data: { type: 'custom', label: item.label, customUrl: item.url, sortOrder: index } });
    }
    await api('/_emdash/api/menus/footer', { method: 'PUT', data: { label: FOOTER_MENU.label } });
    log('footer: native menu initialized (menu changes are immediate)');
  }
}

async function main() {
  const flags = process.argv.slice(2);
  assert(flags.every(flag => flag === '--apply'), 'Use no flag for a dry run, or --apply.');
  assert(process.env.EMDASH_BASE_URL, 'Set EMDASH_BASE_URL to the CMS origin.');
  const origin = new URL(process.env.EMDASH_BASE_URL);
  assert(origin.protocol === 'https:' || ['localhost', '127.0.0.1'].includes(origin.hostname), 'Remote CMS credentials require HTTPS.');
  const api = await authenticatedApi(origin, /^\/_emdash\/api\/(?:schema\/collections|content\/(?:pages|site_content)|menus)(?:[/?]|$)/u);
  const plan = await planEditorReadiness(api);
  console.log(JSON.stringify({ origin: origin.origin, migration, mode: flags.includes('--apply') ? 'apply' : 'dry-run',
    collections: plan.collections.map(item => ({ slug: item.slug, metadata: Object.keys(item.metadata), fields: item.fields.map(field => field.slug) })),
    missingCopy: plan.missingCopy, incompleteRequired: plan.incompleteRequired, createPrivacyDraft: !!plan.privacy, extraGlobalEntries: plan.extraGlobalEntries,
    footer: plan.createFooter ? 'create' : plan.resumeFooter ? 'resume' : 'preserve', publish: 'none' }));
  if (!flags.includes('--apply')) return;
  const dir = join(root, '.wrangler/migrations', migration);
  await mkdir(dir, { recursive: true, mode: 0o700 });
  await applyEditorReadiness(api, plan, { beforeWrite: value => writeFile(join(dir, `${new Date().toISOString().replaceAll(/[:.]/gu, '-')}-backup.json`), JSON.stringify({ origin: origin.origin, ...value }, null, 2), { mode: 0o600, flag: 'wx' }), log: message => console.log(message) });
}
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) await main();
