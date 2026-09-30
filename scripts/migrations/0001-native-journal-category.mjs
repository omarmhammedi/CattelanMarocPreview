/**
 * Migration 0001 — remove only the duplicated posts.category string field.
 * Native category taxonomy definitions and assignments are never written.
 * Run against the initial local development database after the server is idle:
 * EMDASH_AUTH_FILE=.wrangler/cms-sync-session.json node scripts/migrations/0001-native-journal-category.mjs --apply
 */
import assert from 'node:assert/strict';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { join } from 'node:path';

const root = fileURLToPath(new URL('../../', import.meta.url));
const origin = new URL(process.env.EMDASH_BASE_URL || 'http://localhost:4321');
assert(['localhost', '127.0.0.1', '[::1]'].includes(origin.hostname), 'This migration is restricted to the initial local development database.');
assert(process.env.EMDASH_AUTH_FILE, 'Provide a genuine signed-in admin session in EMDASH_AUTH_FILE.');
const raw = await readFile(process.env.EMDASH_AUTH_FILE, 'utf8');
let auth;
try { auth = JSON.parse(raw); } catch { auth = { cookie: raw.trim() }; }
const cookie = auth.cookie || auth.cookies?.filter((item) => {
  const domain = item.domain?.replace(/^\./, '');
  return domain === origin.hostname && (item.expires < 0 || item.expires > Date.now() / 1000);
}).map(({ name, value }) => `${name}=${value}`).join('; ');
assert(cookie, 'The authentication file has no valid cookie for this local origin.');
const apply = process.argv.includes('--apply');
const fieldPath = '/_emdash/api/schema/collections/posts/fields/category';
async function api(path, method = 'GET', allowMissing = false) {
  const response = await fetch(new URL(path, origin), {
    method, redirect: 'error', signal: AbortSignal.timeout(30000),
    headers: { Cookie: cookie, Origin: origin.origin, 'X-EmDash-Request': '1' },
  });
  const body = await response.json();
  if (allowMissing && response.status === 404) return null;
  if (!response.ok || !body.success) throw new Error(`${method} ${path}: ${response.status} ${body.error?.code || ''} ${body.error?.message || 'API error'}`);
  return body.data;
}
async function categoryTerms(id) {
  const value = await api(`/_emdash/api/content/posts/${encodeURIComponent(id)}/terms/category`);
  assert.equal(value.unresolved?.length || 0, 0, `Unresolved native category assignment for ${id}`);
  return value.terms.map(({ id: termId, slug, label, locale }) => ({ id: termId, slug, label, locale })).sort((a, b) => a.id.localeCompare(b.id));
}

try {
  const current = await api(fieldPath, 'GET', true);
  if (!current) {
    console.log('Migration 0001 already applied: no duplicated posts.category field.');
    process.exit(0);
  }
  const field = current.item;
  assert.equal(field?.type, 'string', 'Refusing to delete a field whose type differs from the original duplicated text field.');
  assert.equal(field?.slug, 'category');
  assert.equal(field?.label, 'Rubrique', 'Refusing to delete a field reconfigured by an editor.');
  const schema = await api('/_emdash/api/schema/collections/posts');
  assert.notEqual(schema.item?.titleField, 'category');
  assert.notEqual(schema.item?.dateField, 'category');
  const list = await api('/_emdash/api/content/posts?limit=100');
  assert(!list.nextCursor, 'The initial migration does not support a larger, already edited Journal.');
  const seed = JSON.parse(await readFile(join(root, 'seed/seed.json'), 'utf8'));
  const expectedSlugs = seed.content.posts.map((post) => post.slug).sort();
  assert.deepEqual(list.items.map((post) => post.slug).sort(), expectedSlugs, 'This initial migration requires exactly the five original Journal entries.');
  const snapshot = { migration: '0001-native-journal-category', createdAt: new Date().toISOString(), field, entries: [] };
  for (const post of list.items) {
    const detail = await api(`/_emdash/api/content/posts/${encodeURIComponent(post.id)}`);
    const item = detail.item;
    assert(!item.draftRevisionId || item.draftRevisionId === item.liveRevisionId, `Finish the pending draft for ${item.slug} before migrating.`);
    const terms = await categoryTerms(item.id);
    const duplicate = item.data.category;
    assert(typeof duplicate === 'string' && terms.some((term) => term.label === duplicate), `Native terms do not already contain the text rubric for ${item.slug}; nothing was deleted.`);
    snapshot.entries.push({ id: item.id, slug: item.slug, duplicatedValue: duplicate, nativeTerms: terms });
  }
  if (!apply) {
    console.log(`Migration 0001 ready: ${snapshot.entries.length} native category assignments already match the duplicated text. Re-run with --apply to remove only the text field.`);
    process.exit(0);
  }
  const backupFolder = join(root, '.wrangler/migrations');
  await mkdir(backupFolder, { recursive: true });
  const backupPath = join(backupFolder, `0001-native-journal-category-${Date.now()}.json`);
  await writeFile(backupPath, `${JSON.stringify(snapshot, null, 2)}\n`, { mode: 0o600 });
  await api(fieldPath, 'DELETE');
  assert.equal(await api(fieldPath, 'GET', true), null, 'Duplicated schema field still exists after deletion.');
  for (const saved of snapshot.entries) {
    assert.deepEqual(await categoryTerms(saved.id), saved.nativeTerms, `Native terms changed for ${saved.slug}. Restore from the migration snapshot before continuing.`);
  }
  console.log(`Migration 0001 complete: duplicated text field removed; all ${snapshot.entries.length} native category assignments unchanged.`);
  console.log('Schema/value snapshot saved in the ignored .wrangler/migrations directory. Regenerate EmDash types before deployment.');
} catch (error) {
  console.error(error instanceof Error ? error.message : 'Migration 0001 failed');
  process.exitCode = 1;
}
