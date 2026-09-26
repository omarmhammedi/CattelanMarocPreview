/**
 * Actual EmDash/Cloudflare local integration check.
 *
 * Start `npm run dev`, then run:
 *   node tests/cms-sync.mjs --setup
 *
 * `--setup` permits the native initial setup wizard on a fresh LOCAL database.
 * No development auth bypass, direct database writes, API tokens, or email.
 * The test enrolls and authenticates a Chromium virtual WebAuthn passkey using
 * EmDash's real setup/login endpoints. Test credentials stay in ignored
 * .wrangler/cms-sync-webauthn.json, never in the repository or test report.
 * Existing content is restored and republished in finally blocks.
 *
 * Requires an installed Playwright module (or PLAYWRIGHT_MODULE pointing at
 * one) and Chromium. PLAYWRIGHT_EXECUTABLE_PATH can select an existing browser.
 * Localhost only by design.
 */
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile, chmod } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);
let playwright;
try {
  playwright = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
} catch {
  const runtime = process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES || '/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules';
  playwright = require(resolve(runtime, 'playwright'));
}

const base = new URL(process.env.CMS_TEST_URL || 'http://localhost:4321');
assert(['localhost', '127.0.0.1', '[::1]'].includes(base.hostname), 'CMS tests are restricted to a local development server.');
const credentialFile = resolve('.wrangler/cms-sync-webauthn.json');
const reportFile = resolve('docs/test-results-cms.md');
const report = [];
const record = (message) => { report.push(message); console.log(`PASS ${message}`); };
const headings = (html) => [...html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/giu)].map((match) => match[1].replace(/<[^>]*>/gu, ''));
const browser = await playwright.chromium.launch({
  headless: true,
  ...(process.env.PLAYWRIGHT_EXECUTABLE_PATH ? { executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH } : {}),
  args: ['--no-sandbox', '--disable-dev-shm-usage'],
});
const context = await browser.newContext();
const page = await context.newPage();
const cdp = await context.newCDPSession(page);
await cdp.send('WebAuthn.enable');
const { authenticatorId } = await cdp.send('WebAuthn.addVirtualAuthenticator', {
  options: {
    protocol: 'ctap2', transport: 'internal', hasResidentKey: true,
    hasUserVerification: true, isUserVerified: true, automaticPresenceSimulation: true,
  },
});

async function api(path, method = 'GET', body, allowFailure = false) {
  const response = await page.evaluate(async ({ path, method, body }) => {
    const response = await fetch(path, {
      method, credentials: 'same-origin',
      headers: { 'X-EmDash-Request': '1', ...(body === undefined ? {} : { 'Content-Type': 'application/json' }) },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    });
    let value;
    try { value = await response.json(); } catch { value = { invalidJson: true }; }
    return { status: response.status, value };
  }, { path, method, body });
  if (!allowFailure) {
    assert(response.status >= 200 && response.status < 300 && response.value.success !== false,
      `${method} ${path} failed (${response.status}): ${JSON.stringify(response.value)}`);
  }
  return allowFailure ? response : response.value.data;
}

async function publicHtml(path) {
  const url = new URL(path, base);
  const response = await fetch(url, { redirect: 'follow', headers: { 'Cache-Control': 'no-cache' } });
  const html = await response.text();
  // Signed preview URLs are credentials: never put their query in logs/reports.
  assert.equal(response.status, 200, `Public route ${url.pathname} returned ${response.status}`);
  assert(headings(html).length > 0, `Public route ${url.pathname} did not return a rendered page heading (possible streamed rendering error).`);
  return { html, headers: response.headers };
}

async function setupAndLogin() {
  // Astro logs "ready" before the first SSR dependency optimization finishes.
  // Only retry this read-only readiness probe; never replay CMS mutations.
  let ready = false;
  for (let attempt = 0; attempt < 45 && !ready; attempt++) {
    try {
      const response = await fetch(new URL('/_emdash/api/setup/status', base));
      ready = response.ok && (await response.json()).success === true;
    } catch { /* workerd may still be starting */ }
    if (!ready) await new Promise((resolve) => setTimeout(resolve, 1000));
  }
  assert(ready, 'EmDash setup API did not become ready within 45 readiness probes.');
  // Keep a genuine same-origin document without the admin SPA's automatic
  // login redirects, which could destroy a WebAuthn evaluation mid-flight.
  // Registration/login still use the native endpoints and browser credentials.
  await page.goto(new URL('/_emdash/api/setup/status', base).href, { waitUntil: 'domcontentloaded' });
  const status = await api('/_emdash/api/setup/status');
  if (status.needsSetup) {
    assert(process.argv.includes('--setup'), 'Fresh database: rerun with --setup to permit native local setup.');
    // Repeated requests are the native wizard's supported resumable seed flow.
    let complete = false;
    for (let i = 0; i < 30 && !complete; i++) {
      const seed = await api('/_emdash/api/setup', 'POST', {
        title: 'Cattelan Italia Maroc', tagline: 'Vivre italien, à Casablanca', includeContent: true,
      });
      complete = seed.seedComplete;
    }
    assert(complete, 'Seed wizard did not complete within 30 requests.');
    const registration = await api('/_emdash/api/setup/admin', 'POST', {
      email: 'cms-sync@example.invalid', name: 'Test local de synchronisation CMS',
    });
    const credential = await page.evaluate(async (options) => {
      const publicKey = PublicKeyCredential.parseCreationOptionsFromJSON(options);
      const credential = await navigator.credentials.create({ publicKey });
      return credential.toJSON();
    }, registration.options);
    await api('/_emdash/api/setup/admin/verify', 'POST', { credential });
    const credentials = await cdp.send('WebAuthn.getCredentials', { authenticatorId });
    await mkdir(resolve('.wrangler'), { recursive: true });
    await writeFile(credentialFile, JSON.stringify(credentials.credentials), { mode: 0o600 });
    await chmod(credentialFile, 0o600);
    record('Initialisation native EmDash et création du compte de test local avec une passkey WebAuthn.');
  } else {
    let credentials;
    try { credentials = JSON.parse(await readFile(credentialFile, 'utf8')); }
    catch { throw new Error('Existing local admin has no saved test passkey. Use a separate fresh local DB; the test will never bypass authentication.'); }
    for (const credential of credentials) {
      await cdp.send('WebAuthn.addCredential', { authenticatorId, credential });
    }
  }
  const login = await api('/_emdash/api/auth/passkey/options', 'POST', {});
  const credential = await page.evaluate(async (options) => {
    const publicKey = PublicKeyCredential.parseRequestOptionsFromJSON(options);
    const credential = await navigator.credentials.get({ publicKey });
    return credential.toJSON();
  }, login.options);
  await api('/_emdash/api/auth/passkey/verify', 'POST', { credential });
  const credentials = await cdp.send('WebAuthn.getCredentials', { authenticatorId });
  await writeFile(credentialFile, JSON.stringify(credentials.credentials), { mode: 0o600 });
  await api('/_emdash/api/dashboard');
  const sessionFile = resolve('.wrangler/cms-sync-session.json');
  await context.storageState({ path: sessionFile });
  await chmod(sessionFile, 0o600);
  record('Connexion native par passkey et accès authentifié au tableau de bord.');
}

async function checkEntry(collection, id, route, field = 'title') {
  const path = `/_emdash/api/content/${collection}/${id}`;
  const original = await api(path);
  assert.equal(original.item.status, 'published', `${collection}/${id} must be published before this test.`);
  assert(!original.item.draftRevisionId || original.item.draftRevisionId === original.item.liveRevisionId,
    `${collection}/${id} has pending editorial edits. Test refuses to replace them.`);
  const marker = `CMS-SYNC-${collection}-${Date.now()}`;
  const before = await publicHtml(route);
  assert(!before.html.includes(marker));
  if (route === '/') assert(before.html.includes('data-scene="hero"'), 'Homepage request returned a legacy preview instead of the Astro CMS page.');
  let changed = false;
  try {
    await api(path, 'PUT', { data: { ...original.item.data, [field]: marker }, _rev: original._rev });
    changed = true;
    const draft = await api(path);
    assert.equal(draft.item.data[field], marker);
    const stillPublic = await publicHtml(route);
    assert(!stillPublic.html.includes(marker), 'Saving a draft leaked to anonymous public HTML.');
    record(`${collection}/${id} : l’enregistrement d’un brouillon ne modifie pas la page publique.`);

    const preview = await api(`${path}/preview-url`, 'POST', {});
    const previewResult = await publicHtml(preview.url);
    assert(headings(previewResult.html).some((heading) => heading.includes(marker)), 'Native signed preview did not render the saved draft in its page heading.');
    assert(/no-store|private/.test(previewResult.headers.get('cache-control') || ''), 'Preview response must not be publicly cached.');
    record(`${collection}/${id} : aperçu natif signé rendu avec le brouillon et protégé du cache public.`);

    const invalid = new URL(preview.url, base);
    invalid.searchParams.set('_preview', 'invalid-test-token');
    const invalidResponse = await fetch(invalid);
    const invalidHtml = await invalidResponse.text();
    assert([200, 400, 401, 403, 404].includes(invalidResponse.status), 'Invalid-preview check encountered an unexpected server failure.');
    assert(!invalidHtml.includes(marker), 'Invalid preview token exposed the draft.');
    record(`${collection}/${id} : un jeton d’aperçu invalide ne dévoile pas le brouillon.`);

    const wrongEntry = new URL(preview.url, base);
    wrongEntry.pathname = wrongEntry.pathname.replace(id, 'another-entry');
    const wrongEntryResponse = await fetch(wrongEntry);
    assert.equal(wrongEntryResponse.status, 404, 'A signed preview token must be scoped to its own content entry.');
    assert(!(await wrongEntryResponse.text()).includes(marker));
    record(`${collection}/${id} : le lien signé ne donne accès qu’à son propre contenu.`);

    await api(`${path}/publish`, 'POST', { _rev: draft._rev });
    const published = await publicHtml(route);
    assert(headings(published.html).some((heading) => heading.includes(marker)), 'Published change did not appear in the visible page heading on the next anonymous request.');
    record(`${collection}/${id} : publication visible dès la requête anonyme suivante, sans reconstruction.`);
  } finally {
    if (changed) {
      const current = await api(path);
      await api(path, 'PUT', { data: original.item.data, _rev: current._rev });
      const restored = await api(path);
      await api(`${path}/publish`, 'POST', { _rev: restored._rev });
      const publicRestored = await publicHtml(route);
      assert(!publicRestored.html.includes(marker), 'Original content was not restored.');
      const final = await api(path);
      assert.deepEqual(final.item.data, original.item.data, 'Original CMS data differs after restoration.');
      record(`${collection}/${id} : contenu initial restauré puis republié.`);
    }
  }
}

async function checkPrivacy() {
  const paths = [
    '/_emdash/api/content/pages',
    '/_emdash/api/content/posts',
    ...(process.env.CMS_PRIVATE_PATHS || '').split(',').filter(Boolean),
  ];
  for (const path of paths) {
    const response = await fetch(new URL(path, base));
    assert([401, 403].includes(response.status), `Anonymous ${path} returned ${response.status}, expected 401/403.`);
  }
  record('API d’administration refusée aux visiteurs anonymes (401/403).');
}

let failed;
try {
  await setupAndLogin();
  if (!process.argv.includes('--setup-only')) {
    const pages = await api('/_emdash/api/content/pages');
    const home = pages.items.find((entry) => ['accueil', 'home', 'index'].includes(entry.slug));
    assert(home, 'Seeded home entry missing.');
    const posts = await api('/_emdash/api/content/posts');
    const post = posts.items.find((entry) => entry.status === 'published');
    assert(post, 'Seeded published article missing.');
    await checkEntry('pages', home.id, '/');
    await checkEntry('posts', post.id, `/journal/${post.slug}/`);
  }
  await checkPrivacy();
} catch (error) {
  failed = error;
  console.error(error.message);
} finally {
  await browser.close();
  await mkdir(resolve('docs'), { recursive: true });
  const title = failed ? 'Vérification CMS interrompue' : process.argv.includes('--setup-only') ? 'Initialisation CMS vérifiée — synchronisation à tester' : 'Vérification CMS réussie';
  const lines = [
    `# ${title}`, '', `Date UTC : ${new Date().toISOString()}`, '',
    'Environnement : serveur Astro local, moteur Cloudflare workerd, base D1 locale. EmDash 0.41.0.', '',
    'Protocole : initialisation/connexion natives avec une passkey WebAuthn virtuelle Chromium, appels API authentifiés, puis requêtes HTTP anonymes indépendantes. Aucun contournement de l’authentification et aucun envoi d’email.', '',
    ...report.map((item) => `- ${item}`), '',
    ...(failed ? [`Échec : ${failed.message}`, ''] : []),
    'Les données éditoriales modifiées pour le test sont restaurées. Les révisions du test restent dans l’historique local. Le compte fictif et sa passkey restent uniquement dans l’environnement de développement.', '',
    'Limite : ces vérifications locales ne remplacent pas une recette sur les ressources Cloudflare de préproduction après connexion du compte.', '',
  ];
  await writeFile(reportFile, lines.join('\n'));
}
if (failed) process.exitCode = 1;
