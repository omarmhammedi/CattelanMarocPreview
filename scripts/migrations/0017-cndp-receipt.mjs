/**
 * Adds the CNDP receipt number to Configuration du site. Empty until the declaration is filed;
 * once set, it appears on the privacy page and in the notice under every form. Additive.
 *
 *   EMDASH_BASE_URL=http://localhost:4331 EMDASH_AUTH_FILE=.wrangler/cms-sync-session.json node scripts/migrations/0017-cndp-receipt.mjs [--apply]
 *   EMDASH_BASE_URL=https://cattelan-maroc-preview.cattelan.workers.dev node scripts/migrations/0017-cndp-receipt.mjs [--apply]
 */
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { authenticatedApi } from './0014-site-strategy-pages.mjs';

export const migration = '0017-cndp-receipt';
export const field = {
  slug: 'cndp_receipt', label: 'Récépissé CNDP', type: 'string', required: false,
  options: { helpText: 'Numéro du récépissé de la déclaration CNDP. Laisser vide tant que la déclaration est en cours : la page Confidentialité l’indique alors.' },
};

export async function planCndpReceipt(api) {
  const schema = (await api('/_emdash/api/schema/collections/site_content?includeFields=true')).item;
  const existing = schema.fields.find(item => item.slug === field.slug);
  assert(!existing || existing.type === 'string', `site_content.${field.slug} exists with another type.`);
  return { addField: existing ? null : field };
}

export async function applyCndpReceipt(api, plan, log = () => {}) {
  if (!plan.addField) return;
  await api('/_emdash/api/schema/collections/site_content/fields', { method: 'POST', data: plan.addField });
  log(`site_content.${field.slug} added`);
}

async function main() {
  const flags = process.argv.slice(2);
  assert(flags.every(flag => flag === '--apply'), 'Use no flag for a dry run, or --apply.');
  assert(process.env.EMDASH_BASE_URL, 'Set EMDASH_BASE_URL to the CMS origin.');
  const origin = new URL(process.env.EMDASH_BASE_URL);
  const api = await authenticatedApi(origin, /^\/_emdash\/api\/schema\/collections\/site_content(?:[/?]|$)/u);
  const plan = await planCndpReceipt(api);
  console.log(JSON.stringify({ origin: origin.origin, migration, mode: flags.includes('--apply') ? 'apply' : 'dry-run', addField: plan.addField?.slug || null }));
  if (flags.includes('--apply')) await applyCndpReceipt(api, plan, message => console.log(message));
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) await main();
