/** Real native PDF editor flow in a marked disposable local CMS only.
 * No public form, contact, email, publication, or remote storage mutation.
 * Existing drafts are refused; this test restores the exact original live revision.
 */
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';
import { chromium } from 'playwright';
import { integrationEnvironment } from './integration-environment.mjs';

const base = await integrationEnvironment();
const output = resolve(process.env.PDF_ADMIN_TEST_OUTPUT || 'test-results/catalogue-admin');
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'],
  ...(process.env.PLAYWRIGHT_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH } : {}) });
const context = await browser.newContext({ storageState: '.wrangler/cms-sync-session.json', viewport: { width: 1440, height: 1000 } });
const page = await context.newPage();
const checks = [], screenshots = [], keys = [], errors = [], blockedWrites = [];
let path, before, changed = false, restored = false, failure;
const uploadPath = '/_emdash/api/plugins/catalogue-leads/pdf/upload';
const record = message => { checks.push(message); console.log(`PASS ${message}`); };
page.on('pageerror', error => errors.push(error.message));
await context.route('**/*', route => {
  const request = route.request(), url = new URL(request.url());
  if (url.origin !== base.origin) return route.abort();
  if (!['GET', 'HEAD'].includes(request.method()) && !(
    (url.pathname === uploadPath && request.method() === 'POST') ||
    (url.pathname === path && request.method() === 'PUT') ||
    (url.pathname === `${path}/discard-draft` && request.method() === 'POST')
  )) { blockedWrites.push(`${request.method()} ${url.pathname}`); return route.abort(); }
  return route.continue();
});
async function api(target, method = 'GET', body) {
  const result = await page.evaluate(async ({ target, method, body }) => {
    const response = await fetch(target, { method, credentials: 'same-origin', signal: AbortSignal.timeout(30000),
      headers: { 'X-EmDash-Request': '1', ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    return { status: response.status, envelope: await response.json() };
  }, { target, method, body });
  assert(result.status < 300 && result.envelope.success, `${method} ${target}: ${result.status}`);
  return result.envelope.data;
}
async function capture(name) {
  await page.screenshot({ path: `${output}/${name}.png`, fullPage: false }); screenshots.push(`${name}.png`);
}
async function upload(suffix) {
  const pdf = Buffer.concat([await readFile('src/plugins/catalogue/assets/cattelan-demonstration.pdf'), Buffer.from(`\n% synthetic-editor-${suffix}\n`)]);
  await page.locator('input[name="pdf"]').setInputFiles({ name: 'synthetic-editor.pdf', mimeType: 'application/pdf', buffer: pdf });
  const uploadResponse = page.waitForResponse(response => new URL(response.url()).pathname === uploadPath && response.request().method() === 'POST');
  const saveResponse = page.waitForResponse(response => new URL(response.url()).pathname === path && response.request().method() === 'PUT');
  await page.getByRole('button', { name: 'Associer au brouillon', exact: true }).click();
  const uploaded = await (await uploadResponse).json();
  assert(uploaded.success && uploaded.data.ok);
  keys.push(uploaded.data.private_file_key);
  assert.match(uploaded.data.private_file_key, /^catalogues\/[a-zA-Z0-9_-]+\.pdf$/u);
  return saveResponse;
}
try {
  await page.goto(new URL('/_emdash/admin/', base).href, { waitUntil: 'domcontentloaded' });
  const catalogues = await api('/_emdash/api/content/catalogues?limit=100');
  const target = catalogues.items.find(item => item.status === 'published');
  assert(target, 'A published catalogue is required.');
  path = `/_emdash/api/content/catalogues/${encodeURIComponent(target.id)}`;
  before = await api(path);
  assert(!before.item.draftRevisionId || before.item.draftRevisionId === before.item.liveRevisionId, 'Refusing to overwrite an existing draft.');
  await page.goto(new URL(`/_emdash/admin/plugins/catalogue-leads/contacts?catalogue=${encodeURIComponent(before.item.slug)}#catalogue-pdf`, base).href, { waitUntil: 'domcontentloaded' });
  const welcome = page.getByRole('button', { name: /Get Started|Commencer/i });
  await Promise.race([welcome.first().waitFor(), page.getByRole('heading', { name: 'Remplacer un catalogue PDF' }).waitFor()]);
  if (await welcome.count() && await welcome.first().isVisible()) await welcome.first().click();
  await page.getByRole('heading', { name: 'Remplacer un catalogue PDF' }).waitFor();
  await page.waitForFunction(() => { const input = document.querySelector('input[name="pdf"]'); return input && !input.disabled; });
  assert.equal(await page.locator('select[name="catalogue"]').inputValue(), before.item.id, 'Entry slug deep-link selects the exact edition.');
  const originalPlaceholder = before.item.data.is_placeholder === true || before.item.data.is_placeholder === 1;
  assert.equal(await page.getByRole('checkbox', { name: 'Document de démonstration' }).isChecked(), originalPlaceholder);
  const marker = `PRIVATE-PDF-CONCURRENT-${Date.now()}`;
  changed = true;
  const concurrent = await api(path, 'PUT', { _rev: before._rev, data: { description: marker, is_placeholder: !originalPlaceholder } });
  const rejected = await upload('conflict');
  assert.equal(rejected.status(), 409, 'Uploader must submit the originally reviewed revision.');
  assert.equal(rejected.request().postDataJSON()._rev, before._rev);
  assert.deepEqual(Object.keys(rejected.request().postDataJSON().data).sort(), ['is_placeholder', 'private_file_key']);
  await page.getByRole('button', { name: 'Recharger cette édition' }).waitFor();
  const unchanged = await api(path);
  assert.equal(unchanged._rev, concurrent._rev);
  assert.deepEqual(unchanged.item.data, concurrent.item.data, 'Conflicting upload cannot overwrite any concurrent draft data.');
  assert.equal(unchanged.item.liveRevisionId, before.item.liveRevisionId);
  await capture('pdf-concurrent-edit-rejected');
  record('Le téléversement privé rejette la révision devenue obsolète ; le brouillon concurrent et sa case démonstration restent intacts.');

  await page.getByRole('button', { name: 'Recharger cette édition' }).click();
  await page.waitForFunction(() => { const input = document.querySelector('input[name="pdf"]'); return input && !input.disabled; });
  assert.equal(await page.getByRole('checkbox', { name: 'Document de démonstration' }).isChecked(), !originalPlaceholder);
  const accepted = await upload('saved-draft');
  assert.equal(accepted.status(), 200);
  assert.equal(accepted.request().postDataJSON()._rev, concurrent._rev);
  await page.getByRole('link', { name: 'Vérifier et publier le catalogue' }).waitFor();
  const saved = await api(path);
  assert.equal(saved.item.data.description, marker);
  assert.equal(Boolean(saved.item.data.is_placeholder), !originalPlaceholder);
  assert.equal(saved.item.data.private_file_key, keys.at(-1));
  assert.equal(saved.item.liveRevisionId, before.item.liveRevisionId, 'Upload must never publish.');
  assert(saved.item.draftRevisionId && saved.item.draftRevisionId !== saved.item.liveRevisionId);
  const publicHtml = await (await fetch(new URL('/catalogue/', base), { signal: AbortSignal.timeout(30000) })).text();
  assert(!publicHtml.includes(marker) && !publicHtml.includes(keys.at(-1)), 'Private draft/key must not leak into the public catalogue.');
  await capture('pdf-draft-associated');
  record('Après rechargement, seule l’association PDF et la case démonstration sont enregistrées ; les autres champs restent intacts et aucune publication n’a lieu.');
  assert.deepEqual(errors, []);
  assert.deepEqual(blockedWrites, []);
} catch (error) { failure = error; await capture('pdf-editor-failure').catch(() => {}); }
finally {
  try {
    if (changed && before) {
      const current = await api(path);
      assert.equal(current.item.liveRevisionId, before.item.liveRevisionId, 'Refusing cleanup if another process published this catalogue.');
      await api(`${path}/discard-draft`, 'POST', { _rev: current._rev });
      const after = await api(path);
      assert.deepEqual(after.item.data, before.item.data);
      assert.equal(after.item.liveRevisionId, before.item.liveRevisionId);
      assert.equal(after.item.status, before.item.status);
      assert(!after.item.draftRevisionId || after.item.draftRevisionId === after.item.liveRevisionId);
      restored = true;
      record('Le brouillon de test est abandonné ; données, publication et révision publique initiales sont restaurées exactement.');
    }
    for (const key of keys) execFileSync('npx', ['wrangler', 'r2', 'object', 'delete', `cattelan-maroc-catalogues-preview/${key}`, '--local'], { stdio: 'ignore' });
    if (keys.length) record('Tous les PDF synthétiques de ce test sont supprimés du stockage R2 local.');
  } catch (error) { failure ||= error; }
  await writeFile(`${output}/catalogue-admin-report.json`, `${JSON.stringify({ completedAt: new Date().toISOString(), origin: base.origin, passed: !failure, restored, checks, screenshots, syntheticPdfs: keys.length, errors, blockedWrites, failure: failure?.message || null }, null, 2)}\n`);
  await context.close(); await browser.close();
}
if (failure) throw failure;
