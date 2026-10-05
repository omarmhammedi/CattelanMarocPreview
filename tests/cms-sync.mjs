/**
 * Actual EmDash/Cloudflare local integration check.
 *
 * Start a disposable checkout on its own local port, then run:
 *   CMS_TEST_URL=http://localhost:4331 node tests/cms-sync.mjs --setup
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
import { integrationEnvironment } from './integration-environment.mjs';

const require = createRequire(import.meta.url);
let playwright;
try {
  playwright = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
} catch {
  const runtime = process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES || '/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules';
  playwright = require(resolve(runtime, 'playwright'));
}

const base = await integrationEnvironment();
const credentialFile = resolve('.wrangler/cms-sync-webauthn.json');
const reportFile = resolve(process.env.CMS_TEST_REPORT || 'docs/test-results-cms.md');
const report = [];
const record = (message) => { report.push(message); console.log(`PASS ${message}`); };
const headings = (html) => [...html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/giu)].map((match) => match[1].replace(/<[^>]*>/gu, ''));
// EmDash enriches seeded image metadata on the first REST save. Compare the
// editorial choice and alt text, without treating that hydration or the
// addition of an empty optional field as data loss.
function editorialData(value) {
  if (Array.isArray(value)) return value.map(editorialData);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value).filter(([, child]) => child !== null && child !== undefined && child !== '' && !(Array.isArray(child) && child.length === 0)).map(([key, child]) => [key,
    key === 'meta' && value.provider === 'local' && value.id ? { storageKey: child?.storageKey } : editorialData(child),
  ]));
}
// Native PUT merges data. Explicitly clear keys introduced by a fixture so
// sparse original records regain their original editorial state.
function restoreData(original, current) {
  return {...Object.fromEntries(Object.keys(current).filter(key => !(key in original)).map(key => [key, null])), ...original};
}
function originalImageSource(source) {
  const url = new URL(source, base);
  if (url.pathname === '/_image' && url.searchParams.has('href')) return originalImageSource(url.searchParams.get('href'));
  return url.origin === base.origin ? `${url.pathname}${url.search}` : url.href;
}
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
  assert(headings(html).length > 0 || /class="model-card"/u.test(html), `Public route ${url.pathname} did not return rendered content (possible streamed rendering error).`);
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
    for (let i = 0; i < 150 && !complete; i++) {
      const seed = await api('/_emdash/api/setup', 'POST', {
        title: 'Cattelan Italia Maroc', tagline: 'Vivre italien, à Casablanca', includeContent: true,
      });
      complete = seed.seedComplete;
    }
    assert(complete, 'Seed wizard did not complete within 150 requests.');
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
      await api(path, 'PUT', { data: restoreData(original.item.data, current.item.data), _rev: current._rev });
      const restored = await api(path);
      await api(`${path}/publish`, 'POST', { _rev: restored._rev });
      const publicRestored = await publicHtml(route);
      assert(!publicRestored.html.includes(marker), 'Original content was not restored.');
      const final = await api(path);
      assert.deepEqual(editorialData(final.item.data), editorialData(original.item.data), 'Original CMS data differs after restoration.');
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

async function inspect(html, selector, attribute) {
  return page.evaluate(({ html, selector, attribute }) => {
    const document = new DOMParser().parseFromString(html, 'text/html');
    return [...document.querySelectorAll(selector)].map((element) => attribute ? element.getAttribute(attribute) : element.textContent);
  }, { html, selector, attribute });
}

async function includesAt(html, selector, marker, attribute) {
  const values = await inspect(html, selector, attribute);
  assert(values.some((value) => value?.includes(marker)), `Expected editable content in ${selector}${attribute ? ` (${attribute})` : ''}.`);
}

async function imageAt(html, selector, expectedSource) {
  const sources = await inspect(html, selector, 'src');
  assert.equal(sources.length, 1, `Expected exactly one editable image at ${selector}.`);
  assert.equal(originalImageSource(sources[0]), originalImageSource(expectedSource), `The image at ${selector} must use the replacement media stored in R2.`);
}

const paragraph = (text) => [{ _type: 'block', _key: 'integration-block', style: 'normal', markDefs: [], children: [{ _type: 'span', _key: 'integration-span', text, marks: [] }] }];

async function checkFields({ collection, entry, route, label, mutate, verify, verifyPreview = verify, clear, verifyCleared, verifyClearedPreview = verifyCleared, clearMessage, additionalRoutes = [], afterPublish }) {
  const path = `/_emdash/api/content/${collection}/${entry.id}`;
  const original = await api(path);
  assert.equal(original.item.status, 'published');
  assert(!original.item.draftRevisionId || original.item.draftRevisionId === original.item.liveRevisionId, 'Pending editorial edits must not be replaced.');
  const marker = `CMS-FIELD-${Date.now()}-${collection}`;
  let changed = false;
  async function publish() {
    const latest = await api(path);
    await api(`${path}/publish`, 'POST', { _rev: latest._rev });
  }
  async function save(data) {
    const latest = await api(path);
    await api(path, 'PUT', { data, _rev: latest._rev });
    changed = true;
  }
  try {
    await save(mutate(structuredClone(original.item.data), marker));
    for (const publicRoute of [route, ...additionalRoutes]) assert(!(await publicHtml(publicRoute)).html.includes(marker), 'Draft field leaked to the public site.');
    const preview = await api(`${path}/preview-url`, 'POST', {});
    await verifyPreview((await publicHtml(preview.url)).html, marker, route);
    await publish();
    for (const publicRoute of [route, ...additionalRoutes]) await verify((await publicHtml(publicRoute)).html, marker, publicRoute);
    if (afterPublish) await afterPublish(marker);
    record(`${label} : brouillon isolé, aperçu signé fidèle et publication immédiate.`);
    if (clear) {
      await save(clear(structuredClone(original.item.data)));
      assert((await publicHtml(route)).html.includes(marker), 'Clearing a draft changed the published page.');
      const emptyPreview = await api(`${path}/preview-url`, 'POST', {});
      const previewHtml = (await publicHtml(emptyPreview.url)).html;
      assert(!previewHtml.includes(marker));
      await verifyClearedPreview(previewHtml, route);
      await publish();
      for (const publicRoute of [route, ...additionalRoutes]) {
        const html = (await publicHtml(publicRoute)).html;
        assert(!html.includes(marker));
        await verifyCleared(html, publicRoute);
      }
      record(clearMessage || `${label} : champs vidés respectés après publication, sans valeur de secours éditoriale.`);
    }
  } finally {
    if (changed) {
      const current = await api(path);
      await save(restoreData(original.item.data, current.item.data));
      await publish();
      assert.deepEqual(editorialData((await api(path)).item.data), editorialData(original.item.data), 'CMS field fixture was not restored.');
      record(`${label} : contenu initial restauré.`);
    }
  }
}

async function checkEditableFields(pages, home, post) {
  const homeData = (await api(`/_emdash/api/content/pages/${home.id}`)).item.data;
  const imageFixture = homeData.brand_detail_image;
  assert(imageFixture?.id && imageFixture?.meta?.storageKey, 'The isolated seed must contain imported media for image replacement checks.');
  const imageSource = `/_emdash/api/media/file/${encodeURIComponent(imageFixture.meta.storageKey)}`;
  const fixedRoutes = { collections: '/collections/', showroom: '/showroom-casablanca/', catalogue: '/catalogue/', journal: '/journal/' };
  for (const [key, route] of Object.entries(fixedRoutes)) {
    const entry = pages.items.find((item) => item.data.route_key === key);
    assert(entry, `Missing fixed page ${key}`);
    await checkFields({
      collection: 'pages', entry, route, label: `Page ${key} : sections, images, bouton et corps enrichi`,
      mutate: (data, marker) => ({ ...data, hero_image: { ...imageFixture, alt: `${marker}-hero` }, content: paragraph(`${marker}-body`), sections: [
        { section_key: 'integration-section', heading: `${marker}-heading`, display_heading: `${marker}-display`, text: `${marker}-text`, cta_label: `${marker}-button`, cta_href: '/collections/?cms-integration=section', image: { ...imageFixture, alt: `${marker}-section-image` } },
        ...(key === 'showroom' ? [
          { section_key: 'faq_named', heading: `${marker}-question`, text: `${marker}-answer` },
          { section_key: 'faq_untitled', heading: '', display_heading: '', text: `${marker}-plain-answer`, cta_label: `${marker}-faq-button`, cta_href: '/collections/?cms-integration=faq', image: { ...imageFixture, alt: `${marker}-faq-image` } },
          { section_key: 'faq_empty', heading: '', display_heading: '', text: '', cta_label: '', cta_href: '' },
        ] : []),
      ] }),
      verify: async (html, marker) => {
        await includesAt(html, 'main', `${marker}-body`);
        await includesAt(html, 'main', `${marker}-display`);
        await includesAt(html, 'main', `${marker}-text`);
        await includesAt(html, 'main a[href="/collections/?cms-integration=section"]', `${marker}-button`);
        await includesAt(html, 'main img', `${marker}-hero`, 'alt');
        await includesAt(html, '[data-section-key="integration-section"] img', `${marker}-section-image`, 'alt');
        await imageAt(html, `main img[alt="${marker}-hero"]`, imageSource);
        await imageAt(html, '[data-section-key="integration-section"] img', imageSource);
        if (key === 'showroom') {
          assert.equal((await inspect(html, '.page-faq summary')).length, 1, 'Only a named FAQ may create an accordion.');
          await includesAt(html, '.page-faq summary', `${marker}-question`);
          await includesAt(html, '.page-faq [data-section-key="faq_untitled"]', `${marker}-plain-answer`);
          await includesAt(html, '.page-faq a[href="/collections/?cms-integration=faq"]', `${marker}-faq-button`);
          await imageAt(html, '.page-faq [data-section-key="faq_untitled"] img', imageSource);
          assert.equal((await inspect(html, '.page-faq details [data-section-key="faq_untitled"]')).length, 0, 'An untitled FAQ must retain its content outside an unnamed accordion.');
          assert.equal((await inspect(html, '[data-section-key="faq_empty"]')).length, 0, 'An empty FAQ must not render.');
        }
      },
      clear: (data) => ({ ...data, hero_image: null, content: [], sections: [] }),
      verifyCleared: async (html) => {
        assert.equal((await inspect(html, 'main a[href="/collections/?cms-integration=section"]')).length, 0);
        assert.equal((await inspect(html, '.page-hero-figure img, .showroom-editorial figure img')).length, 0);
        if (key === 'showroom') assert.equal((await inspect(html, '.page-faq')).length, 0, 'A cleared FAQ must not leave an empty section.');
      },
    });
  }

  await checkFields({
    collection: 'pages', entry: home, route: '/', label: 'Accueil responsive : CTA des sections et sections ajoutées',
    mutate: (data, marker) => ({ ...data, content: paragraph(`${marker}-body`), sections: [
      ...data.sections.map((section) => ({ ...section, cta_label: `${marker}-${section.section_key}`, cta_href: `/collections/?cms-integration=${section.section_key}`, image: { ...imageFixture, alt: `${marker}-${section.section_key}-image` } })),
      { section_key: 'integration-extra', heading: `${marker}-extra`, text: `${marker}-text`, cta_label: `${marker}-button`, cta_href: '/collections/?cms-integration=extra' },
    ] }),
    verify: async (html, marker) => {
      const sections = [
        ['brand', 'italie', ':is(.p1[data-mobile-frame] > img, .p1[data-mobile-frame] > picture.home-photo > img)'],
        ['collections', 'collections', ':is(.section-image-frame > img.section-image, .section-image-frame > picture.home-photo > img.section-image)'],
        ['showroom', 'showroom', ':is(.showroom-photo > img, .showroom-photo > picture.home-photo > img)'],
        ['catalogue', 'catalogue', '.book :is(.cv > img.pic, .cv > picture.home-photo > img.pic)'],
        ['journal', 'journal', ':is(.journal-section-frame > img.journal-section-image, .journal-section-frame > picture.home-photo > img.journal-section-image)'],
      ];
      for (const [key, id, imageSelector] of sections) {
        const section = `main.home .home-sections > section#${id}`;
        const cta = `${key === 'catalogue' ? 'main.home #collections' : section} a[href="/collections/?cms-integration=${key}"]`;
        assert.equal((await inspect(html, `#${id}`)).length, 1, `Expected one responsive ${id} section.`);
        assert.equal((await inspect(html, section)).length, 1, `Expected ${id} in the shared editorial tree.`);
        assert.equal((await inspect(html, cta)).length, 1, `Expected one editable CTA in ${id}.`);
        await includesAt(html, cta, `${marker}-${key}`);
        await imageAt(html, `${section} ${imageSelector}`, imageSource);
        // A CMS section image retains its semantic alt, including the catalogue cover.
        await includesAt(html, `${section} ${imageSelector}`, `${marker}-${key}-image`, 'alt');
        assert.equal((await inspect(html, `main img[alt="${marker}-${key}-image"]`)).length, 1, `Expected one responsive ${id} image.`);
      }
      await includesAt(html, 'main', `${marker}-body`);
      await includesAt(html, 'main', `${marker}-extra`);
      await includesAt(html, 'main a[href="/collections/?cms-integration=extra"]', `${marker}-button`);
    },
    clear: (data) => ({ ...data, content: [], sections: [] }),
    verifyCleared: async (html) => {
      assert.equal((await inspect(html, 'main a[href*="cms-integration="]')).length, 0);
      for (const id of ['italie', 'collections', 'showroom', 'catalogue', 'journal']) {
        assert.equal((await inspect(html, `main #${id}`)).length, 0, `Cleared ${id} section must disappear from the shared responsive markup.`);
      }
      assert.equal((await inspect(html, 'main .home-editorial')).length, 0);
    },
  });

  const postRoute = `/journal/${post.slug}/`;
  await checkFields({
    collection: 'posts', entry: post, route: postRoute, label: 'Article : appel à l’action éditorial',
    mutate: (data, marker) => ({ ...data, cta_text: `${marker}-text`, cta_label: `${marker}-button`, cta_href: '/catalogue/?cms-integration=article' }),
    verify: async (html, marker) => {
      await includesAt(html, '.page-cta', `${marker}-text`);
      await includesAt(html, '.page-cta a[href="/catalogue/?cms-integration=article"]', `${marker}-button`);
    },
    clear: (data) => ({ ...data, cta_text: '', cta_label: '', cta_href: '' }),
    verifyCleared: async (html) => assert.equal((await inspect(html, 'article .page-cta')).length, 0, 'Cleared article CTA must not gain a fallback button.'),
  });

  const models = await api('/_emdash/api/content/models');
  const model = models.items.find((item) => item.slug === 'skorpio');
  assert(model);
  await checkFields({
    collection: 'models', entry: model, route: '/collections/tables/', label: 'Modèle lié : image et légende',
    mutate: (data, marker) => ({ ...data, image: { ...imageFixture, alt: `${marker}-image` }, image_caption: `${marker}-caption`, availability_note: `${marker}-availability` }),
    verify: async (html, marker) => {
      await includesAt(html, '.model-card img', `${marker}-image`, 'alt');
      await imageAt(html, `.model-card img[alt="${marker}-image"]`, imageSource);
      await includesAt(html, '.model-card figcaption', `${marker}-caption`);
      assert(!html.includes(`${marker}-availability`), 'Retired internal availability notes must not reappear in model cards.');
    },
    verifyPreview: async (html, marker) => {
      await includesAt(html, '.model-hero-figure img', `${marker}-image`, 'alt');
      await imageAt(html, '.model-hero-figure img', imageSource);
      await includesAt(html, '.model-hero-figure figcaption', `${marker}-caption`);
      assert(!html.includes(`${marker}-availability`));
    },
    verifyClearedPreview: async (html) => assert.equal((await inspect(html, '.model-hero-figure')).length, 0),
    clear: (data) => ({ ...data, image: null, image_caption: '', availability_note: '' }),
    verifyCleared: async (html) => assert.equal((await inspect(html, '.model-card:first-child figure')).length, 0),
  });

  const globals = await api('/_emdash/api/content/site_content');
  const global = globals.items.find((item) => item.slug === 'global');
  assert(global);
  await checkFields({
    collection: 'site_content', entry: global, route: '/', additionalRoutes: ['/showroom-casablanca/', '/journal/'], label: 'Configuration : e-mail public et libellé Lire l’article',
    mutate: (data, marker) => ({ ...data, public_email: `${marker.toLowerCase()}@example.invalid`, read_article_label: `${marker}-read` }),
    verify: async (html, marker, route) => {
      await includesAt(html, 'footer a[href^="mailto:"]', marker.toLowerCase());
      if (route === '/showroom-casablanca/') await includesAt(html, '.showroom-contact a[href^="mailto:"]', marker.toLowerCase());
      if (route === '/' || route === '/journal/') await includesAt(html, 'main', `${marker}-read`);
    },
    clearMessage: 'Configuration : libellé Lire l’article vidé après publication ; adresse e-mail publique obligatoire conservée et connectée.',
    clear: (data) => ({ ...data, read_article_label: '' }),
    verifyCleared: async (html) => assert((await inspect(html, 'footer a[href^="mailto:"]')).length > 0, 'The required public contact address remains connected.'),
  });
  await checkFields({
    collection: 'site_content', entry: global, route: '/', additionalRoutes: ['/catalogue/'], label: 'Formulaire catalogue : erreurs éditables du nom et de l’e-mail',
    mutate: (data, marker) => ({ ...data, form_name_error: `${marker}-name`, form_email_error: `${marker}-email` }),
    verify: async (html, marker) => {
      await includesAt(html, '[data-catalogue-form]', `${marker}-name`, 'data-name-error');
      await includesAt(html, '[data-catalogue-form]', `${marker}-email`, 'data-email-error');
    },
    afterPublish: async (marker) => {
      const visitor = await browser.newContext();
      const formPage = await visitor.newPage();
      try {
        await formPage.goto(new URL('/catalogue/', base).href, { waitUntil: 'networkidle' });
        const form = formPage.locator('[data-catalogue-form]');
        await form.evaluate((element) => element.requestSubmit());
        await form.locator('[name="name"][aria-invalid="true"]').waitFor();
        assert((await form.textContent()).includes(`${marker}-name`));
        await form.locator('[name="name"]').fill('Test catalogue local');
        await form.locator('[name="email"]').fill('invalid');
        await form.evaluate((element) => element.requestSubmit());
        await form.locator('[name="email"][aria-invalid="true"]').waitFor();
        assert((await form.textContent()).includes(`${marker}-email`));
      } finally { await visitor.close(); }
    },
  });
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
    await checkEditableFields(pages, home, post);
  }
  await checkPrivacy();
} catch (error) {
  failed = error;
  console.error(error.message);
} finally {
  await browser.close();
  await mkdir(resolve(reportFile, '..'), { recursive: true });
  const title = failed ? 'Vérification CMS interrompue' : process.argv.includes('--setup-only') ? 'Initialisation CMS vérifiée — synchronisation à tester' : 'Vérification CMS réussie';
  const lines = [
    `# ${title}`, '', `Date UTC : ${new Date().toISOString()}`, '',
    'Environnement : serveur Astro local, moteur Cloudflare workerd, base D1 locale. EmDash 0.41.0.', '',
    'Protocole : initialisation/connexion natives avec une passkey WebAuthn virtuelle Chromium, appels API authentifiés, puis requêtes HTTP anonymes indépendantes. Aucun contournement de l’authentification et aucun envoi d’email.', '',
    ...report.map((item) => `- ${item}`), '',
    ...(failed ? [`Échec : ${failed.message}`, ''] : []),
    failed
      ? 'Les restaurations réussies sont indiquées ci-dessus. Cette exécution a échoué : la restauration complète ne peut pas être affirmée. Le compte fictif, sa passkey et les révisions restent uniquement dans l’environnement jetable.'
      : 'Les données éditoriales modifiées pour le test sont restaurées. Les révisions du test restent dans l’historique local. Le compte fictif et sa passkey restent uniquement dans l’environnement jetable.', '',
    'Limite : ces vérifications locales ne remplacent pas une recette sur les ressources Cloudflare de préproduction après connexion du compte.', '',
  ];
  await writeFile(reportFile, lines.join('\n'));
}
if (failed) process.exitCode = 1;
