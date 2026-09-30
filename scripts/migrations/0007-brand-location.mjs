/** Optional logo caption, independent of the real showroom city. No setup/seed. */
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join, resolve } from 'node:path';
import { assertNoDraft, authentication } from './0003-model-detail-pages.mjs';
import { readReferences } from './0004-collection-editorial.mjs';
import { applyShowroomLocation } from './0005-showroom-location.mjs';

export const BRAND_FIELD = {
  slug: 'brand_location', label: 'Libellé sous le logo', type: 'string', required: false,
  options: { helpText: 'Libellé géographique de la marque, distinct de la ville du showroom. Vider ce champ masque la ligne sous le logo.' },
};

export async function prepareBrandLocation(api) {
  const schema = (await api('/_emdash/api/schema/collections/site_content?includeFields=true')).item;
  assert(schema.slug === 'site_content' && schema.supports?.includes('revisions'), 'Expected native site_content revisions.');
  const field = schema.fields.find(item => item.slug === BRAND_FIELD.slug);
  if (field) assert(field.type === 'string' && !field.required && !field.defaultValue, 'Preserve incompatible existing branding field.');
  const before = await api('/_emdash/api/content/site_content/global');
  assertNoDraft(before.item);
  assert(before.item.status === 'published' && before._rev, 'Expected published global content and revision.');
  if (!field) assert(before.item.data.brand_location == null, 'Preserve an existing branding value.');
  // An existing field belongs to the editor: preserve changes and intentional clears.
  const values = field ? {} : { brand_location: 'Maroc' };
  return { schemas: { site_content: schema }, fields: field ? [] : [BRAND_FIELD], entries: [{
    collection: 'site_content', slug: 'global', before, values,
    references: await readReferences(api, 'site_content', before.item, schema.fields),
  }] };
}

async function main() {
  const flags = process.argv.slice(2);
  assert(flags.every(flag => ['--apply', '--dry-run'].includes(flag)) && !(flags.includes('--apply') && flags.includes('--dry-run')), 'Use --dry-run or --apply.');
  const apply = flags.includes('--apply');
  const origin = new URL(process.env.EMDASH_BASE_URL || 'http://localhost:4321');
  assert(['localhost', '127.0.0.1', '[::1]'].includes(origin.hostname) && ['http:', 'https:'].includes(origin.protocol) && !origin.username && !origin.password && origin.pathname === '/' && !origin.search && !origin.hash, 'Local development only.');
  const auth = await authentication(origin);
  const api = async (path, { method = 'GET', data } = {}) => {
    assert(path.startsWith('/_emdash/api/'), 'Native API only.');
    assert(auth.expiresAt > Date.now(), 'Native session expired.');
    const response = await fetch(new URL(path, origin), {
      method, redirect: 'error', signal: AbortSignal.timeout(30000),
      headers: { ...auth.headers, Origin: origin.origin, 'X-EmDash-Request': '1', ...(data === undefined ? {} : { 'Content-Type': 'application/json' }) },
      ...(data === undefined ? {} : { body: JSON.stringify(data) }),
    });
    const body = await response.json();
    assert(response.ok && body.success === true, `${method} ${path}: HTTP ${response.status}`);
    return body.data;
  };
  const plan = await prepareBrandLocation(api);
  console.log(`${apply ? 'Apply' : 'Dry run'} 0007: ${plan.fields.length} new branding field; showroom city and other content preserved.`);
  if (!apply || !plan.fields.length) return;
  const directory = fileURLToPath(new URL('../../.wrangler/migrations/', import.meta.url));
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const prefix = join(directory, `0007-brand-location-${Date.now()}`);
  await applyShowroomLocation(api, plan, {
    beforeWrite: snapshot => writeFile(`${prefix}-before.json`, JSON.stringify(snapshot, null, 2), { flag: 'wx', mode: 0o600 }),
    afterEntry: snapshot => writeFile(`${prefix}-after.json`, JSON.stringify(snapshot, null, 2), { flag: 'wx', mode: 0o600 }),
  });
  console.log('Published brand_location=Maroc; all other content and references preserved.');
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch(error => { console.error(error.message); process.exitCode = 1; });
