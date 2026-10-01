/**
 * Site plan, first pages: the Sur-mesure and Professionnels page keys and entries,
 * their menu items and the models' on-display flag. Native APIs only; additive.
 *
 *   EMDASH_BASE_URL=http://localhost:4331 EMDASH_AUTH_FILE=.wrangler/cms-sync-session.json node scripts/migrations/0014-site-strategy-pages.mjs [--apply]
 *   EMDASH_BASE_URL=https://cattelan-maroc-preview.cattelan.workers.dev node scripts/migrations/0014-site-strategy-pages.mjs [--apply]
 */
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
export const migration = '0014-site-strategy-pages';
const schemaPath = collection => `/_emdash/api/schema/collections/${collection}?includeFields=true`;

export function validateManifest(manifest) {
  assert.equal(manifest.version, 1);
  assert.deepEqual(manifest.routeKeys, manifest.pages.map(page => page.data.route_key), 'Each new page owns one route key.');
  for (const page of manifest.pages) {
    assert.equal(page.slug, page.data.route_key, `${page.slug}: slug and route key must match the public path.`);
    assert(page.data.title && page.data.intro, `${page.slug}: title and introduction are required.`);
    // Limits of the pages schema; the CMS refuses longer values.
    assert(page.data.seo_title.length <= 90 && page.data.meta_description.length <= 180, `${page.slug}: SEO text too long.`);
    for (const section of page.data.sections) assert(section.section_key && (section.text || section.heading), `${page.slug}: empty section.`);
  }
  for (const item of manifest.menu || []) assert(manifest.pages.some(page => `/${page.slug}/` === item.url), `${item.url}: menu item without its page.`);
  if (manifest.modelField) assert.equal(manifest.modelField.type, 'boolean');
  return manifest;
}

export async function loadManifest() {
  return validateManifest(JSON.parse(await readFile(join(root, 'content/site-strategy-pages.json'), 'utf8')));
}

export async function planSiteStrategy(api, manifest) {
  const pagesSchema = (await api(schemaPath('pages'))).item;
  const modelsSchema = (await api(schemaPath('models'))).item;
  const routeField = pagesSchema.fields.find(field => field.slug === 'route_key');
  assert(routeField?.type === 'select', 'pages.route_key must be a select field.');
  const options = routeField.validation?.options || [];
  const existingFlag = manifest.modelField && modelsSchema.fields.find(field => field.slug === manifest.modelField.slug);
  assert(!existingFlag || existingFlag.type === 'boolean', `models.${manifest.modelField?.slug} exists with another type.`);
  const list = await api('/_emdash/api/content/pages?limit=100');
  const slugs = new Set((list.items || []).map(item => item.slug));
  const menu = await api('/_emdash/api/menus/primary');
  return {
    routeField,
    missingRoutes: manifest.routeKeys.filter(key => !options.includes(key)),
    addField: existingFlag || !manifest.modelField ? null : manifest.modelField,
    createPages: manifest.pages.filter(page => !slugs.has(page.slug)),
    keptPages: manifest.pages.filter(page => slugs.has(page.slug)).map(page => page.slug),
    menu,
    missingMenu: (manifest.menu || []).filter(item => !menu.items.some(existing => existing.customUrl === item.url)),
  };
}

/** Top-level order after inserting each new item behind its anchor; children keep their place. */
export function menuOrder(items, additions) {
  const top = items.filter(item => !item.parentId).sort((a, b) => a.sortOrder - b.sortOrder);
  for (const { item, after } of additions) {
    const anchor = top.findIndex(existing => existing.customUrl === after);
    top.splice(anchor < 0 ? top.length : anchor + 1, 0, item);
  }
  return [
    ...top.map((item, sortOrder) => ({ id: item.id, parentId: null, sortOrder })),
    ...items.filter(item => item.parentId).map(item => ({ id: item.id, parentId: item.parentId, sortOrder: item.sortOrder })),
  ];
}

export async function applySiteStrategy(api, plan, { beforeWrite, log = () => {} }) {
  assert.equal(typeof beforeWrite, 'function', 'A private backup writer is required before any mutation.');
  await beforeWrite(plan);
  if (plan.missingRoutes.length) {
    const { validation } = plan.routeField;
    await api('/_emdash/api/schema/collections/pages/fields/route_key', { method: 'PUT', data: { validation: { ...validation, options: [...(validation?.options || []), ...plan.missingRoutes] } } });
    log(`pages.route_key + ${plan.missingRoutes.join(', ')}`);
  }
  if (plan.addField) {
    await api('/_emdash/api/schema/collections/models/fields', { method: 'POST', data: plan.addField });
    log(`models.${plan.addField.slug} added`);
  }
  for (const page of plan.createPages) {
    const created = await api('/_emdash/api/content/pages', { method: 'POST', data: { slug: page.slug, data: page.data } });
    const draft = await api(`/_emdash/api/content/pages/${encodeURIComponent(created.item.id)}`);
    await api(`/_emdash/api/content/pages/${encodeURIComponent(created.item.id)}/publish`, { method: 'POST', data: { _rev: draft._rev } });
    log(`pages/${page.slug} created and published`);
  }
  if (plan.missingMenu.length) {
    const additions = [];
    for (const entry of plan.missingMenu) {
      const item = await api('/_emdash/api/menus/primary/items', { method: 'POST', data: { type: 'custom', label: entry.label, customUrl: entry.url } });
      additions.push({ item, after: entry.after });
    }
    const current = await api('/_emdash/api/menus/primary');
    const added = new Set(additions.map(({ item }) => item.id));
    await api('/_emdash/api/menus/primary/reorder', { method: 'POST', data: { items: menuOrder(current.items.filter(item => !added.has(item.id)), additions.map(({ item, after }) => ({ item: current.items.find(existing => existing.id === item.id), after }))) } });
    log(`menu + ${plan.missingMenu.map(entry => entry.label).join(', ')}`);
  }
}

const allowedPaths = /^\/_emdash\/api\/(?:content\/pages|schema\/collections\/(?:pages|models)|menus\/primary)(?:[/?]|$)/u;

export async function authenticatedApi(origin, allowed = allowedPaths) {
  let headers;
  if (process.env.EMDASH_AUTH_FILE) {
    assert(['localhost', '127.0.0.1'].includes(origin.hostname), 'Session files are for a local server; use the native CLI login for a remote CMS.');
    const session = JSON.parse(await readFile(process.env.EMDASH_AUTH_FILE, 'utf8'));
    const cookie = session.cookie || session.cookies?.filter(item => item.domain?.replace(/^\./u, '') === origin.hostname).map(({ name, value }) => `${name}=${value}`).join('; ');
    assert(cookie, 'The session file holds no cookie for this origin.');
    headers = { Cookie: cookie };
  } else {
    const store = JSON.parse(await readFile(join(process.env.XDG_CONFIG_HOME || join(homedir(), '.config'), 'emdash/auth.json'), 'utf8'));
    const credential = store?.[origin.origin];
    assert(credential?.accessToken && Date.parse(credential.expiresAt) > Date.now(), 'Log in with the native emdash CLI for this exact origin first.');
    headers = { Authorization: `Bearer ${credential.accessToken}` };
  }
  return async (path, { method = 'GET', data } = {}) => {
    assert(allowed.test(path), `Refused path ${path}.`);
    const response = await fetch(new URL(path, origin), { method, redirect: 'error', signal: AbortSignal.timeout(90_000),
      headers: { ...headers, Origin: origin.origin, 'X-EmDash-Request': '1', ...(data === undefined ? {} : { 'Content-Type': 'application/json' }) },
      ...(data === undefined ? {} : { body: JSON.stringify(data) }) });
    const body = await response.json().catch(() => ({}));
    assert(response.ok && body.success !== false, `${method} ${path}: HTTP ${response.status} ${body.error?.message || ''}`);
    return body.data;
  };
}

async function main() {
  const flags = process.argv.slice(2);
  assert(flags.every(flag => flag === '--apply'), 'Use no flag for a dry run, or --apply.');
  assert(process.env.EMDASH_BASE_URL, 'Set EMDASH_BASE_URL to the CMS origin.');
  const origin = new URL(process.env.EMDASH_BASE_URL);
  const manifest = await loadManifest(), api = await authenticatedApi(origin);
  const plan = await planSiteStrategy(api, manifest);
  console.log(JSON.stringify({ origin: origin.origin, migration, mode: flags.includes('--apply') ? 'apply' : 'dry-run',
    routeKeys: plan.missingRoutes, modelField: plan.addField?.slug || null, createPages: plan.createPages.map(page => page.slug),
    keptPages: plan.keptPages, menu: plan.missingMenu.map(item => item.label) }));
  if (!flags.includes('--apply')) return;
  const dir = join(root, '.wrangler/migrations', migration);
  await mkdir(dir, { recursive: true, mode: 0o700 });
  await applySiteStrategy(api, plan, {
    beforeWrite: value => writeFile(join(dir, `${new Date().toISOString().replaceAll(/[:.]/gu, '-')}-backup.json`), JSON.stringify(value, null, 2), { mode: 0o600, flag: 'wx' }),
    log: message => console.log(message),
  });
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) await main();
