/** Native publication checks; refuses the preserved preview and requires isolated state. */
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { promisify } from 'node:util';
import { integrationEnvironment } from './integration-environment.mjs';
import { assertPreservedEntry } from '../scripts/migrations/0004-collection-editorial.mjs';

const base = await integrationEnvironment();
const sessionFile = resolve('.wrangler/cms-sync-session.json');
const session = JSON.parse(await readFile(sessionFile, 'utf8'));
const cookie = session.cookies.filter(item => item.domain.replace(/^\./, '') === base.hostname && (item.expires < 0 || item.expires > Date.now() / 1000)).map(({ name, value }) => `${name}=${value}`).join('; ');
assert(cookie, 'The disposable native setup session is required.');
const manifest = JSON.parse(await readFile('content/family-guides.json', 'utf8'));
const results = [];
const pass = message => { results.push(message); console.log(`PASS ${message}`); };
const api = async (path, method = 'GET', data) => {
  assert(path.startsWith('/_emdash/api/'));
  const response = await fetch(new URL(path, base), { method, redirect: 'error', signal: AbortSignal.timeout(30000),
    headers: { Cookie: cookie, Origin: base.origin, 'X-EmDash-Request': '1', 'Content-Type': 'application/json' },
    ...(data === undefined ? {} : { body: JSON.stringify(data) }) });
  const value = await response.json(); assert(response.ok && value.success, `${method} ${path.split('?')[0]}: ${response.status}`); return value.data;
};
const html = async path => {
  const url = new URL(path, base); assert.equal(url.origin, base.origin);
  const response = await fetch(url, { signal: AbortSignal.timeout(30000) }); assert.equal(response.status, 200);
  return response.text();
};
const migrate = async mode => (await promisify(execFile)(process.execPath, ['scripts/migrations/0008-family-guides.mjs', mode], {
  cwd: process.cwd(), timeout: 120000, env: { ...process.env, EMDASH_BASE_URL: base.origin, EMDASH_AUTH_FILE: sessionFile, EMDASH_USE_CLI_AUTH: '0' },
})).stdout;
const path = '/_emdash/api/content/families/tables';
let restore;
let failed;
try {
  // Build only the known six-entry editorial baseline in this disposable site.
  // This avoids importing the primary database, media, contacts or credentials.
  for (const entry of manifest.entries) {
    const p = `/_emdash/api/content/families/${entry.slug}`;
    const current = await api(p);
    const saved = await api(p, 'PUT', { data: entry.before, seo: entry.beforeSeo, _rev: current._rev });
    await api(`${p}/publish`, 'POST', { _rev: saved._rev });
  }
  pass('Six synthetic family baselines prepared through native APIs in disposable state.');
  const before = await Promise.all(manifest.entries.map(entry => api(`/_emdash/api/content/families/${entry.slug}`)));
  assert.match(await migrate('--dry-run'), /6 entries to improve/);
  assert.deepEqual(await Promise.all(manifest.entries.map(entry => api(`/_emdash/api/content/families/${entry.slug}`))), before);
  pass('Dry run leaves all entries unchanged.');
  await migrate('--apply');
  const schema = (await api('/_emdash/api/schema/collections/families?includeFields=true')).item;
  for (const [index, entry] of manifest.entries.entries()) {
    const after = await api(`/_emdash/api/content/families/${entry.slug}`);
    assertPreservedEntry(after, before[index], entry.after, schema.fields, entry.afterSeo);
    assert(!after.item.draftRevisionId || after.item.liveRevisionId === after.item.draftRevisionId);
    const markup = await html(`/collections/${entry.slug}/`);
    assert(markup.includes(entry.after.intro));
    assert(markup.includes(entry.afterSeo.description));
  }
  assert.match(await migrate('--apply'), /0 entries to improve/);
  pass('Six guides published with original fields preserved; repeated migration makes zero changes.');
  restore = await api(path);
  const marker = `GUIDE-DRAFT-${Date.now()}`;
  const saved = await api(path, 'PUT', { data: { intro: marker }, _rev: restore._rev });
  assert(!(await html('/collections/tables/')).includes(marker));
  pass('Anonymous visitors retain published content while the guide has a draft.');
  const preview = await api(`${path}/preview-url`, 'POST', {});
  assert((await html(preview.url)).includes(marker));
  pass('The signed preview renders the draft.');
  await assert.rejects(migrate('--apply'));
  assert.equal((await api(path))._rev, saved._rev);
  pass('Migration refuses a pending editor draft without changing its revision.');
  await api(`${path}/publish`, 'POST', { _rev: saved._rev });
  assert((await html('/collections/tables/')).includes(marker));
  pass('Native publication updates the public page without a rebuild.');
  let current = await api(path);
  let next = await api(path, 'PUT', { data: { content: [] }, _rev: current._rev });
  await api(`${path}/publish`, 'POST', { _rev: next._rev });
  const firstHeading = restore.item.data.content[0].children.map(span => span.text).join('');
  assert(!(await html('/collections/tables/')).includes(firstHeading));
  pass('Clearing the optional guide body removes its headings from the public page.');
  current = await api(path);
  await api(path, 'PUT', { seo: { title: marker, description: `${marker} description` }, _rev: current._rev });
  assert((await html('/collections/tables/')).includes(`<title>${marker}</title>`));
  pass('Native SEO remains immediate, independently of content publication.');
} catch (error) { failed = error; throw error; }
finally {
  if (restore) {
    const current = await api(path);
    const saved = await api(path, 'PUT', { data: { intro: restore.item.data.intro, content: restore.item.data.content }, seo: { title: restore.item.seo.title, description: restore.item.seo.description }, _rev: current._rev });
    await api(`${path}/publish`, 'POST', { _rev: saved._rev });
    assert((await html('/collections/tables/')).includes(restore.item.data.intro));
  }
  await mkdir('test-results/family-guides', { recursive: true });
  await writeFile('test-results/family-guides/cms-report.json', JSON.stringify({ verifiedAt: new Date().toISOString(), disposable: true, passed: !failed, results }, null, 2) + '\n');
}
