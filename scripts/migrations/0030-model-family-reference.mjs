/** Add the native inverse view of the existing family_models relation.
 * No links, entries, revisions or publication state are written.
 * EMDASH_BASE_URL=<origin> node scripts/migrations/0030-model-family-reference.mjs [--apply]
 */
import assert from 'node:assert/strict';
import {mkdir, writeFile} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {join} from 'node:path';
import {authenticatedApi} from './0014-site-strategy-pages.mjs';

export const migration = '0030-model-family-reference';
export const familyReferenceField = {
  slug: 'families', label: 'Collections associées', type: 'reference', sortOrder: 17,
  validation: {relation: 'family_models', relationSide: 'child', targetCollection: 'families'},
};
const root = fileURLToPath(new URL('../../', import.meta.url));
const schemaPath = collection => `/_emdash/api/schema/collections/${collection}?includeFields=true`;
export function validateOrigin(value) {
  const origin = new URL(value);
  assert(!origin.username && !origin.password && origin.pathname === '/' && !origin.search && !origin.hash, 'Use a bare CMS origin.');
  assert(origin.origin === 'https://cattelan-maroc-preview.cattelan.workers.dev'
    || (origin.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(origin.hostname)), 'Use the pinned Cattelan preview or a local fixture.');
  return origin;
}
export function guardedMigrationApi(api) {
  return (path, options = {}) => {
    const method = options.method || 'GET';
    assert((method === 'GET' && [schemaPath('models'), schemaPath('families')].includes(path))
      || (method === 'POST' && path === '/_emdash/api/schema/collections/models/fields'), 'Migration 0030 may only read the two schemas or add its model field.');
    if (method === 'POST') assert.deepEqual(options.data, familyReferenceField, 'Only the defined inverse field may be created.');
    return api(path, options);
  };
}
function verifyField(field) {
  assert.equal(field.type, 'reference', 'models.families must be a native reference.');
  for (const [key, value] of Object.entries(familyReferenceField.validation)) {
    assert.equal(field.validation?.[key], value, `models.families has an incompatible ${key}.`);
  }
}
export async function planModelFamilyReference(api) {
  const models = (await api(schemaPath('models'))).item;
  const families = (await api(schemaPath('families'))).item;
  const forward = families.fields.find(field => field.slug === 'models');
  assert.equal(forward?.type, 'reference', 'families.models must remain a native reference.');
  assert.equal(forward.validation?.relation, 'family_models', 'The existing family relation must match.');
  assert.equal(forward.validation?.relationSide, 'parent', 'families.models must be the parent side.');
  assert.equal(forward.validation?.targetCollection, 'models', 'families.models must target models.');
  const existing = models.fields.find(field => field.slug === familyReferenceField.slug);
  if (existing) verifyField(existing);
  assert(!models.fields.some(field => field.slug !== 'families' && field.type === 'reference' && field.validation?.relation === 'family_models'),
    'A different inverse reference already exists; review rather than adding a duplicate picker.');
  return {migration, models, families, createField: !existing};
}
export async function applyModelFamilyReference(api, plan, {beforeWrite, log = () => {}} = {}) {
  assert.equal(typeof beforeWrite, 'function', 'A private backup writer is required.');
  if (!plan.createField) return;
  await beforeWrite(plan);
  const fresh = await planModelFamilyReference(api);
  assert.deepEqual(fresh.models, plan.models, 'Models schema changed since planning; re-run.');
  assert.deepEqual(fresh.families, plan.families, 'Families schema changed since planning; re-run.');
  await api('/_emdash/api/schema/collections/models/fields', {method: 'POST', data: familyReferenceField});
  const verified = await planModelFamilyReference(api);
  assert.equal(verified.createField, false, 'The native inverse field must resolve after creation.');
  log('models.families: native inverse view added; all existing links and drafts preserved');
}
async function main() {
  const flags = process.argv.slice(2);
  assert(flags.every(flag => flag === '--apply'), 'Use no flag for a dry run, or --apply.');
  const origin = validateOrigin(process.env.EMDASH_BASE_URL || '');
  const api = guardedMigrationApi(await authenticatedApi(origin, /^\/_emdash\/api\/schema\/collections\/(?:models|families)(?:[/?]|$)/u));
  const plan = await planModelFamilyReference(api);
  console.log(JSON.stringify({origin: origin.origin, migration, mode: flags.includes('--apply') ? 'apply' : 'dry-run',
    createFields: plan.createField ? ['models.families'] : [], contentWrites: 0, relationWrites: 0, publish: 'none'}));
  if (!flags.includes('--apply')) return;
  const dir = join(root, '.wrangler/migrations', migration);
  await mkdir(dir, {recursive: true, mode: 0o700});
  await applyModelFamilyReference(api, plan, {beforeWrite: value => writeFile(join(dir, `${new Date().toISOString().replaceAll(/[:.]/gu, '-')}-backup.json`), JSON.stringify({origin: origin.origin, ...value}, null, 2), {mode: 0o600, flag: 'wx'}), log: console.log});
}
if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) await main();
