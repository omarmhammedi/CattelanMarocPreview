/**
 * Adds the showroom's Instagram account to the native site settings, which feed the
 * structured data's sameAs. Only an empty field is written; an editor's value is kept.
 *
 *   EMDASH_BASE_URL=http://localhost:4331 EMDASH_AUTH_FILE=.wrangler/cms-sync-session.json node scripts/migrations/0020-social-profiles.mjs [--apply]
 *   EMDASH_BASE_URL=https://cattelan-maroc-preview.cattelan.workers.dev node scripts/migrations/0020-social-profiles.mjs [--apply]
 */
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { authenticatedApi } from './0014-site-strategy-pages.mjs';

export const migration = '0020-social-profiles';
export const profiles = { instagram: 'https://www.instagram.com/cattelanitalia.ma/' };

export function socialChanges(settings) {
  const current = settings?.social || {};
  return Object.fromEntries(Object.entries(profiles).filter(([key]) => !current[key]));
}

export async function applySocial(api, log = () => {}) {
  const settings = await api('/_emdash/api/settings');
  const add = socialChanges(settings);
  if (!Object.keys(add).length) return {};
  await api('/_emdash/api/settings', { method: 'POST', data: { social: { ...(settings.social || {}), ...add } } });
  log(`social + ${Object.keys(add).join(', ')}`);
  return add;
}

async function main() {
  const flags = process.argv.slice(2);
  assert(flags.every(flag => flag === '--apply'), 'Use no flag for a dry run, or --apply.');
  assert(process.env.EMDASH_BASE_URL, 'Set EMDASH_BASE_URL to the CMS origin.');
  const origin = new URL(process.env.EMDASH_BASE_URL);
  const api = await authenticatedApi(origin, /^\/_emdash\/api\/settings$/u);
  console.log(JSON.stringify({ origin: origin.origin, migration, mode: flags.includes('--apply') ? 'apply' : 'dry-run', add: socialChanges(await api('/_emdash/api/settings')) }));
  if (flags.includes('--apply')) await applySocial(api, message => console.log(message));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) await main();
