/**
 * SEO strategy v2, launch items (content/v2-launch.json): the Professionnels page becomes
 * Architectes & projets (URL unchanged, menu label too), Votre projet gets its three routes,
 * the FAQ names the cities served and the architects' services, and Configuration du site
 * gets the Cloudflare Web Analytics token field. Same rules as 0021: a text is replaced only
 * when it still holds a version this project wrote; a missing section is added in place.
 * The menu label changes only while it still reads "Professionnels". Additive.
 *
 * Optional: CF_ANALYTICS_TOKEN=<32 hex> fills the empty token field (Cloudflare › Web Analytics).
 *
 *   EMDASH_BASE_URL=http://localhost:4331 EMDASH_AUTH_FILE=.wrangler/cms-sync-session.json node scripts/migrations/0022-v2-launch.mjs [--apply]
 *   EMDASH_BASE_URL=https://cattelan-maroc-preview.cattelan.workers.dev node scripts/migrations/0022-v2-launch.mjs [--apply]
 */
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { authenticatedApi } from './0014-site-strategy-pages.mjs';
import { applyCopy, collectKnown, loadManifest, loadSources, planCopy } from './0021-copy-v2.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
export const migration = '0022-v2-launch';
export const manifestFile = 'v2-launch.json';
export const field = {
  slug: 'analytics_token', label: 'Jeton Cloudflare Web Analytics', type: 'string', required: false,
  options: { helpText: 'Jeton du site dans Cloudflare › Web Analytics (32 caractères). Mesure d’audience sans cookie ; laisser vide pour la désactiver.' },
};
const TOKEN = /^[0-9a-f]{32}$/iu;

export function menuChange(menu, rule) {
  const item = (menu.items || []).find(entry => entry.customUrl === rule.url);
  if (!item || item.label === rule.label) return { item: null, kept: null };
  return rule.known.includes(item.label) ? { item, kept: null } : { item: null, kept: item.label };
}

export async function planLaunch(api, manifest, known, token = '') {
  assert(!token || TOKEN.test(token), 'CF_ANALYTICS_TOKEN must be 32 hexadecimal characters.');
  const copy = await planCopy(api, manifest, known);
  const schema = (await api('/_emdash/api/schema/collections/site_content?includeFields=true')).item;
  const existing = schema.fields.find(item => item.slug === field.slug);
  assert(!existing || existing.type === 'string', `site_content.${field.slug} exists with another type.`);
  const menu = menuChange(await api('/_emdash/api/menus/primary'), manifest.menu);
  let setToken = null;
  if (token) {
    const global = ((await api('/_emdash/api/content/site_content?limit=10')).items || [])[0];
    assert(global, 'Configuration du site is missing.');
    if (!String(global.data?.analytics_token || '').trim()) setToken = { id: global.id };
  }
  return { ...copy, addField: existing ? null : field, menu: { ...menu, label: manifest.menu.label }, setToken };
}

export async function applyLaunch(api, plan, known, { beforeWrite, log = () => {}, token = '' }) {
  assert.equal(typeof beforeWrite, 'function', 'A private backup writer is required before any mutation.');
  await applyCopy(api, plan, known, { beforeWrite, log });
  if (plan.addField) {
    await api('/_emdash/api/schema/collections/site_content/fields', { method: 'POST', data: plan.addField });
    log(`site_content.${field.slug} added`);
  }
  if (plan.menu.item) {
    await api(`/_emdash/api/menus/primary/items/${encodeURIComponent(plan.menu.item.id)}`, { method: 'PUT', data: { label: plan.menu.label } });
    log(`menu: ${plan.menu.item.label} → ${plan.menu.label}`);
  }
  if (plan.setToken) {
    const path = `/_emdash/api/content/site_content/${encodeURIComponent(plan.setToken.id)}`;
    const fresh = await api(path);
    if (!String(fresh.item.data.analytics_token || '').trim()) {
      await api(path, { method: 'PUT', data: { _rev: fresh._rev, data: { ...fresh.item.data, analytics_token: token } } });
      const saved = await api(path);
      if (fresh.item.status === 'published') await api(`${path}/publish`, { method: 'POST', data: { _rev: saved._rev } });
      log('site_content.analytics_token set');
    }
  }
}

const allowedPaths = /^\/_emdash\/api\/(?:content\/(?:pages|families|models|posts|site_content)|schema\/collections\/site_content|menus\/primary)(?:[/?]|$)/u;

async function main() {
  const flags = process.argv.slice(2);
  assert(flags.every(flag => flag === '--apply'), 'Use no flag for a dry run, or --apply.');
  assert(process.env.EMDASH_BASE_URL, 'Set EMDASH_BASE_URL to the CMS origin.');
  const origin = new URL(process.env.EMDASH_BASE_URL);
  const token = String(process.env.CF_ANALYTICS_TOKEN || '').trim();
  const api = await authenticatedApi(origin, allowedPaths);
  const manifest = await loadManifest(manifestFile);
  const known = collectKnown(await loadSources(manifestFile));
  const plan = await planLaunch(api, manifest, known, token);
  console.log(JSON.stringify({ origin: origin.origin, migration, mode: flags.includes('--apply') ? 'apply' : 'dry-run',
    change: plan.changes.map(change => `${change.collection}/${change.slug}: ${change.fields.join(', ')}`), kept: plan.kept,
    addField: plan.addField?.slug || null, menu: plan.menu.item ? `${plan.menu.item.label} → ${manifest.menu.label}` : plan.menu.kept ? `kept: ${plan.menu.kept}` : null,
    analyticsToken: plan.setToken ? 'set' : null }, null, 1));
  if (!flags.includes('--apply')) return;
  const dir = join(root, '.wrangler/migrations', migration);
  await mkdir(dir, { recursive: true, mode: 0o700 });
  await applyLaunch(api, plan, known, {
    token,
    beforeWrite: value => writeFile(join(dir, `${new Date().toISOString().replaceAll(/[:.]/gu, '-')}-backup.json`),
      JSON.stringify({ changes: value.changes.map(({ entry, ...rest }) => rest), menu: plan.menu }, null, 2), { mode: 0o600, flag: 'wx' }),
    log: message => console.log(message),
  });
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) await main();
