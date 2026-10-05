/**
 * Model pages and native CMS publication checks, only in a marked disposable
 * environment. Run cms-sync.mjs --setup-only and the model importer first.
 *
 * CMS_TEST_URL=http://localhost:4331 node tests/models-browser.mjs [--webkit]
 * The saved native session is reused; this suite never enrolls a passkey.
 * A single model is edited/unpublished and restored in a finally block.
 */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {chromium, webkit} from 'playwright';
import {integrationEnvironment} from './integration-environment.mjs';

const base = await integrationEnvironment();
const session = JSON.parse(await readFile('.wrangler/cms-sync-session.json', 'utf8'));
assert(session.cookies.some(cookie => [base.hostname, `.${base.hostname}`].includes(cookie.domain)),
  'Run the native CMS login in this disposable environment first.');
const output = resolve(process.env.MODEL_TEST_OUTPUT || 'test-results/models');
const onlyPublication = process.argv.includes('--only-publication');
const onlyWebkit = process.argv.includes('--only-webkit');
assert(!(onlyPublication && onlyWebkit), 'Choose only one focused suite.');
await mkdir(`${output}/screenshots`, {recursive: true});
const results = [];
const downloads = [];
const screenshots = [];
const record = message => { results.push(message); console.log(`PASS ${message}`); };
const sha256 = bytes => createHash('sha256').update(bytes).digest('hex');
const modelPath = item => `/modeles/${item.slug || item.data.slug}/`;
const mediaSource = image => image?.src || image?.url ||
  (image?.meta?.storageKey || image?.id || image?.mediaId
    ? `/_emdash/api/media/file/${encodeURIComponent(image.meta?.storageKey || image.id || image.mediaId)}` : '');
const originalImageSource = source => {
  const url = new URL(source, base);
  if (url.pathname === '/_image' && url.searchParams.has('href')) return originalImageSource(url.searchParams.get('href'));
  return url.origin === base.origin ? `${url.pathname}${url.search}` : url.href;
};
const paragraph = text => [{_type: 'block', _key: 'model-test-block', style: 'normal', markDefs: [], children: [{_type: 'span', _key: 'model-test-span', text, marks: []}]}];
function editorialData(value) {
  if (Array.isArray(value)) return value.map(editorialData);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value)
    .filter(([, child]) => child !== null && child !== undefined && child !== '' && !(Array.isArray(child) && !child.length))
    .map(([key, child]) => [key, key === 'meta' && value.provider === 'local' && value.id
      ? {storageKey: child?.storageKey} : editorialData(child)]));
}
const browser = await chromium.launch({headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'],
  ...(process.env.PLAYWRIGHT_EXECUTABLE_PATH ? {executablePath: process.env.PLAYWRIGHT_EXECUTABLE_PATH} : {})});
const admin = await browser.newContext({storageState: session});
const apiPage = await admin.newPage();

async function api(path, method = 'GET', body) {
  const response = await apiPage.evaluate(async ({path, method, body}) => {
    const response = await fetch(path, {method, credentials: 'same-origin', signal:AbortSignal.timeout(30000),
      headers: {'X-EmDash-Request': '1', ...(body === undefined ? {} : {'Content-Type': 'application/json'})},
      ...(body === undefined ? {} : {body: JSON.stringify(body)})});
    let value;
    try { value = await response.json(); } catch { value = {success: false}; }
    return {status: response.status, value};
  }, {path, method, body});
  assert(response.status >= 200 && response.status < 300 && response.value.success,
    `${method} ${path.split('?')[0]} failed (${response.status}).`);
  return response.value.data;
}
async function publicResponse(path) {
  const url = new URL(path, base);
  assert.equal(url.origin, base.origin, 'Public checks must stay in the disposable environment.');
  return fetch(url, {headers: {'Cache-Control': 'no-cache'}, redirect: 'manual', signal:AbortSignal.timeout(30000)});
}
async function publicHtml(path, expectedStatus = 200) {
  const response = await publicResponse(path);
  assert.equal(response.status, expectedStatus, `Public route ${new URL(path, base).pathname}`);
  const html = await response.text();
  if (expectedStatus === 200) assert(/<h1\b/u.test(html), 'The response must contain rendered page content.');
  return {html, headers: response.headers};
}
async function nodes(html, selector, attribute) {
  return apiPage.evaluate(({html, selector, attribute}) => {
    const document = new DOMParser().parseFromString(html, 'text/html');
    return [...document.querySelectorAll(selector)].map(node => attribute
      ? node.getAttribute(attribute) : node.textContent.trim());
  }, {html, selector, attribute});
}
async function contains(html, selector, marker, attribute) {
  assert((await nodes(html, selector, attribute)).some(value => value?.includes(marker)),
    `Expected changed model content in ${selector}.`);
}

// Astro HMR can abort an in-flight read-only navigation while another source
// file changes. Retry that transport cancellation only; never replay mutations
// or mask HTTP, rendering, or browser assertions.
async function navigate(page, url, options) {
  for (let attempt = 0; ; attempt++) {
    try { return await page.goto(url, options); }
    catch (error) {
      if (attempt >= 2 || !String(error.message).includes('net::ERR_ABORTED')) throw error;
      await page.waitForTimeout(300);
    }
  }
}

async function checkPublishedPages(models, families) {
  const references = new Map(models.map(model => [modelPath(model), []]));
  for (const family of families) {
    const path = `/collections/${family.slug}/`;
    const {html} = await publicHtml(path);
    const links = await nodes(html, '.model-card a[href]', 'href');
    assert(links.length, `${path}: expected a model selection.`);
    for (const href of links) {
      assert(references.has(href), `${path}: model cards must link to an internal model page.`);
      references.get(href).push(path);
    }
    assert((await nodes(html, '.model-card a[target="_blank"]')).length === 0,
      `${path}: discovering a model must work without a popup.`);
  }
  assert([...references.values()].every(paths => paths.length), 'Every imported model must be reachable from a family.');
  record(`${families.length} familles : les ${models.length} modèles sont accessibles par des liens internes, sans nouvel onglet.`);

  for (const model of models) {
    const data = model.data;
    const {html} = await publicHtml(modelPath(model));
    assert.deepEqual(await nodes(html, 'h1'), [data.title]);
    assert.deepEqual((await nodes(html, '.model-hero-figure img', 'src')).map(originalImageSource), [mediaSource(data.image)].filter(Boolean).map(originalImageSource));
    assert((await nodes(html, '.model-story')).length === 1, `${model.slug}: missing editorial body.`);
    const gallerySources = (data.gallery || []).map(item => mediaSource(item.image)).filter(Boolean);
    assert.deepEqual((await nodes(html, '.model-gallery-view img', 'src')).map(originalImageSource), gallerySources.map(originalImageSource));
    assert.equal((await nodes(html, '.model-dimension')).length, (data.dimensions || []).length);
    assert.deepEqual(await nodes(html, '.model-dimension-value'), (data.dimensions || []).filter(item => item.value).map(item => item.value));
    assert.deepEqual((await nodes(html, '.model-drawings img', 'src')).map(originalImageSource).sort(), (data.drawings || []).map(item => mediaSource(item.image)).map(originalImageSource).sort());
    assert.equal((await nodes(html, '.model-finish')).length, (data.finishes || []).length);
    assert.equal((await nodes(html, '.model-source a')).length, 0, 'Internal research URLs must not reappear as public calls to action.');
    const sheets = await nodes(html, '.model-technical-download[download]', 'href');
    assert.deepEqual(sheets, [mediaSource(data.technical_sheet)]);
    const pdf = await publicResponse(sheets[0]);
    assert.equal(pdf.status, 200, `${model.slug}: technical PDF response.`);
    assert.match(pdf.headers.get('content-type') || '', /application\/pdf/i);
    const bytes = Buffer.from(await pdf.arrayBuffer());
    assert.equal(bytes.subarray(0, 5).toString(), '%PDF-');
    downloads.push({slug: model.slug, bytes: bytes.length, sha256: sha256(bytes)});
  }
  record(`${models.length} fiches : titre, photo exacte, texte, galerie, dimensions, dessins, finitions et PDF local vérifiés.`);
  return references;
}

async function checkBrowserPages(engine, name, models) {
  for (const viewport of [{width: 1440, height: 900}, {width: 390, height: 844}]) {
    for (const theme of ['dark', 'light']) {
      const context = await engine.newContext({viewport, serviceWorkers: 'block', acceptDownloads: true});
      context.setDefaultTimeout(20000);
      context.setDefaultNavigationTimeout(20000);
      const writes = [], errors = [];
      try {
        await context.addInitScript(theme => localStorage.setItem('ci-mode', theme), theme);
        await context.route('**/*', route => {
          if (!['GET', 'HEAD'].includes(route.request().method())) {
            writes.push(route.request().method());
            return route.abort();
          }
          return route.continue();
        });
        const page = await context.newPage();
        page.on('pageerror', error => errors.push(error.message));
        for (const model of models) {
          const response = await navigate(page, new URL(modelPath(model), base).href, {waitUntil: 'domcontentloaded'});
          assert.equal(response.status(), 200);
          await page.locator('.model-hero-figure img').evaluate(image => Promise.race([image.decode(),new Promise((_,reject)=>setTimeout(()=>reject(new Error('Model photograph did not load within 20 seconds.')),20000))]));
          await page.evaluate(() => Promise.race([document.fonts.ready, new Promise(resolve => setTimeout(resolve, 2000))]));
          assert.equal(await page.locator('html').getAttribute('data-mode'), theme);
          assert.equal(await page.locator('h1').textContent(), model.data.title);
          assert(await page.locator('h1').isVisible());
          assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1),
            `${model.slug}/${viewport.width}/${theme}: horizontal overflow.`);
          const filename = `${name}-${model.slug}-${viewport.width}-${theme}.jpg`;
          await page.screenshot({path: `${output}/screenshots/${filename}`, type: 'jpeg', quality: 82,timeout:20000});
          screenshots.push(filename);
        }

        const model = models.find(item => item.slug === 'skorpio') || models[0];
        await navigate(page, new URL(modelPath(model), base).href, {waitUntil: 'domcontentloaded'});
        const oppositeTheme = theme === 'dark' ? 'light' : 'dark';
        await page.locator('[data-theme-toggle]').press('Enter');
        assert.equal(await page.locator('html').getAttribute('data-mode'), oppositeTheme);
        await page.locator('[data-theme-toggle]').press('Enter');
        assert.equal(await page.locator('html').getAttribute('data-mode'), theme);
        const familyHref = await page.locator('.model-breadcrumb a[href^="/collections/"]:not([href="/collections/"])').first().getAttribute('href');
        assert(familyHref, 'The representative model must have a collection breadcrumb.');
        if (viewport.width === 390) {
          await page.locator('.page-mobile-menu > summary').click();
          assert(await page.locator('.page-mobile-menu').evaluate(element => element.open));
          await Promise.all([
            page.waitForURL(url => url.pathname === '/collections/'),
            page.locator('.page-mobile-menu nav a[href="/collections/"]').click(),
          ]);
          await Promise.all([
            page.waitForURL(url => url.pathname === familyHref),
            page.locator(`.family-tile[href="${familyHref}"]`).click(),
          ]);
        } else {
          await Promise.all([
            page.waitForURL(url => url.pathname === familyHref),
            page.locator(`.model-breadcrumb a[href="${familyHref}"]`).click(),
          ]);
        }
        await Promise.all([
          page.waitForURL(url => url.pathname === modelPath(model)),
          page.locator(`.model-card a[href="${modelPath(model)}"]`).first().click(),
        ]);
        assert.equal(context.pages().length, 1, 'Collection to model navigation must stay in the same tab.');
        assert.equal(await page.locator('html').getAttribute('data-mode'), theme, 'The chosen theme must survive navigation.');
        const thumbnail = page.locator('.model-gallery-thumbnails a').first();
        assert(await thumbnail.count(), 'The fixture needs at least two gallery views.');
        const target = await thumbnail.getAttribute('href');
        await thumbnail.focus();
        await page.keyboard.press('Enter');
        await page.waitForURL(url => url.hash === target);
        assert(await page.locator(target).isVisible(), 'A keyboard gallery link must reach its full photograph.');

        const finish = page.locator('.model-finish-group').first();
        assert.equal(await finish.getAttribute('open'), null, 'Finish groups must initially be collapsed.');
        await finish.locator('summary').focus();
        await page.keyboard.press('Enter');
        assert(await finish.evaluate(element => element.open), 'Finish groups must open from the keyboard.');
        await finish.scrollIntoViewIfNeeded();
        await finish.locator('img').first().evaluate(image => Promise.race([image.decode(),new Promise((_,reject)=>setTimeout(()=>reject(new Error('Visible finish photograph did not load within 20 seconds.')),20000))]));
        await page.waitForTimeout(1200);
        const filename = `${name}-${model.slug}-finishes-${viewport.width}-${theme}.jpg`;
        await page.screenshot({path: `${output}/screenshots/${filename}`, type: 'jpeg', quality: 82});
        screenshots.push(filename);
        await finish.locator('summary').focus();
        await page.keyboard.press('Enter');
        assert.equal(await finish.getAttribute('open'), null);

        if (name === 'chromium' && viewport.width === 1440 && theme === 'dark') {
          const downloadEvent = page.waitForEvent('download');
          await page.locator('.model-technical-download').click();
          const download = await downloadEvent;
          assert.equal(await download.failure(), null, 'The browser PDF download must complete.');
          const bytes = await readFile(await download.path());
          assert.equal(sha256(bytes), downloads.find(item => item.slug === model.slug).sha256);
          record('Le téléchargement PDF depuis le navigateur correspond aux octets du fichier technique local.');
        }
        assert.deepEqual(writes, [], 'Public browser checks attempted a write.');
        assert.deepEqual(errors, [], 'Public model pages raised a JavaScript exception.');
        record(`${name} ${viewport.width} × ${viewport.height}, ${theme} : ${models.length} fiches, thème, navigation interne, galerie et finitions au clavier, sans débordement.`);
      } catch(error) {
        console.error(`${name} ${viewport.width}/${theme}: ${error.message}`);
        throw error;
      } finally {
        await context.unrouteAll({behavior: 'ignoreErrors'});
        await context.close();
      }
    }
  }
  const reduced = await engine.newContext({viewport: {width: 1440, height: 900}, reducedMotion: 'reduce', serviceWorkers: 'block'});
  const reducedWrites = [];
  try {
    await reduced.route('**/*', route => {
      if (!['GET', 'HEAD'].includes(route.request().method())) {
        reducedWrites.push(route.request().method());
        return route.abort();
      }
      return route.continue();
    });
    const page = await reduced.newPage();
    await navigate(page, new URL(modelPath(models[0]), base).href, {waitUntil: 'domcontentloaded'});
    assert(await page.locator('h1').isVisible());
    assert.equal(await page.locator('.will-reveal').count(), 0);
    const motion = await page.locator('[data-page-reveal]').first().evaluate(element => ({
      opacity: getComputedStyle(element).opacity,
      transform: getComputedStyle(element).transform,
      transition: getComputedStyle(element).transitionDuration,
    }));
    assert.deepEqual(motion, {opacity: '1', transform: 'none', transition: '0s'});
    assert.deepEqual(reducedWrites, []);
    record(`${name} : mouvement réduit, contenu visible et transitions désactivées.`);
  } finally {
    await reduced.unrouteAll({behavior: 'ignoreErrors'});
    await reduced.close();
  }
}

async function checkPublication(model, models, references) {
  const path = `/_emdash/api/content/models/${model.id}`;
  const route = modelPath(model);
  const original = await api(path);
  assert.equal(original.item.status, 'published');
  assert(!original.item.draftRevisionId || original.item.draftRevisionId === original.item.liveRevisionId,
    'This test must not replace pending editorial changes.');
  const marker = `MODELE-TEST-${Date.now()}`;
  const data = original.item.data;
  const replacementImage = models.find(item => item.id !== model.id && item.data.image)?.data.image;
  assert(replacementImage && data.drawings?.[0]?.image && data.finishes?.[0]?.image,
    'Import the complete official model fixtures before running this suite.');
  const source = new URL(data.source_url || data.official_url);
  source.searchParams.set('cms-model-test', marker);
  const changedData = {...data, title: marker, description: `${marker} présentation`, content: paragraph(`${marker} texte`),
    image: {...replacementImage, alt: `${marker} image`}, image_caption: `${marker} légende`, availability_note: `${marker} disponibilité`,
    release_year: data.release_year === 2024 ? 2025 : 2024,
    gallery: [{image: {...data.image, alt: `${marker} galerie`}, caption: `${marker} vue`}],
    dimensions: [{label: `${marker} format`, value: '240 × 120 × 75 cm', seats: 8, large_seats: 6}],
    drawings: [{label: `${marker} plan`, row: 1, column: 1, image: data.drawings[0].image}],
    finishes: [{group: `${marker} groupe`, material_group: `${marker} matière`, material: `${marker} finition`, name: `${marker} nom`, code: `${marker}-01`, image: data.finishes[0].image}],
    technical_sheet_label: `${marker} PDF`, source_url: source.href};
  let changed = false;
  const save = async value => {
    const current = await api(path);
    changed = true;
    await api(path, 'PUT', {data: value, _rev: current._rev});
  };
  const publish = async () => {
    const current = await api(path);
    await api(`${path}/publish`, 'POST', {_rev: current._rev});
  };
  const verifyChanged = async html => {
    await contains(html, 'h1', marker);
    await contains(html, '.page-lead', `${marker} présentation`);
    await contains(html, '.model-story', `${marker} texte`);
    await contains(html, '.model-hero-figure img', `${marker} image`, 'alt');
    assert.deepEqual((await nodes(html, '.model-hero-figure img', 'src')).map(originalImageSource), [mediaSource(replacementImage)].map(originalImageSource));
    await contains(html, '.model-hero-figure figcaption', `${marker} légende`);
    assert(!html.includes(`${marker} disponibilité`), 'Retired availability copy must remain internal.');
    await contains(html, '.model-year', String(changedData.release_year));
    await contains(html, '.model-gallery-view', `${marker} vue`);
    await contains(html, '.model-dimension', `${marker} format`);
    await contains(html, '.model-dimension-value', '240 × 120 × 75 cm');
    await contains(html, '.model-seating', '8 places');
    await contains(html, '.model-seating', '6 avec de grandes chaises');
    await contains(html, '.model-drawings', `${marker} plan`);
    await contains(html, '.model-finish-group summary', `${marker} matière`);
    await contains(html, '.model-finish', `${marker}-01`);
    await contains(html, '.model-technical-download', `${marker} PDF`);
    assert.equal((await nodes(html, '.model-source a')).length, 0);
  };
  const verifyCleared = async html => {
    for (const selector of ['.model-story', '.model-year', '.model-hero-figure', '.model-availability', '.model-gallery', '.model-technical', '.model-finishes', '.model-source']) {
      assert.equal((await nodes(html, selector)).length, 0, `Cleared ${selector} must not gain fallback content.`);
    }
  };
  try {
    await save(changedData);
    for (const publicRoute of [route, ...references.get(route)]) {
      assert(!(await publicHtml(publicRoute)).html.includes(marker), 'A draft leaked to public content.');
    }
    const preview = await api(`${path}/preview-url`, 'POST', {});
    const previewPage = await publicHtml(preview.url);
    await verifyChanged(previewPage.html);
    assert.match(previewPage.headers.get('cache-control') || '', /private|no-store/);
    const invalid = new URL(preview.url, base);
    invalid.searchParams.set('_preview', 'invalid-model-test');
    const invalidResponse = await publicResponse(invalid.href);
    assert([200, 400, 401, 403, 404].includes(invalidResponse.status));
    assert(!(await invalidResponse.text()).includes(marker), 'An invalid token exposed the model draft.');
    record('Modèle : brouillon invisible au public, aperçu signé complet et jeton invalide sans fuite.');

    await publish();
    await verifyChanged((await publicHtml(route)).html);
    for (const familyRoute of references.get(route)) await contains((await publicHtml(familyRoute)).html, '.model-card', marker);
    record('Modèle : publication immédiatement visible sur la fiche et ses cartes de collection.');

    await save({...data, content: [], image: null, image_caption: '', availability_note: '', release_year: null,
      gallery: [], dimensions: [], drawings: [], finishes: [], technical_sheet: null, technical_sheet_label: '', source_url: null, official_url: null});
    assert((await publicHtml(route)).html.includes(marker), 'Clearing an unpublished draft affected live content.');
    const emptyPreview = await api(`${path}/preview-url`, 'POST', {});
    await verifyCleared((await publicHtml(emptyPreview.url)).html);
    await publish();
    await verifyCleared((await publicHtml(route)).html);
    record('Modèle : champs facultatifs effacés dans l’aperçu puis dans la fiche publiée, sans ancien contenu de secours.');

    const current = await api(path);
    await api(`${path}/unpublish`, 'POST', {_rev: current._rev});
    await publicHtml(route, 404);
    for (const familyRoute of references.get(route)) {
      assert(!(await nodes((await publicHtml(familyRoute)).html, '.model-card a', 'href')).includes(route),
        'An unpublished model remained in a public collection selection.');
    }
    const unpublishedPreview = await api(`${path}/preview-url`, 'POST', {});
    assert.equal((await nodes((await publicHtml(unpublishedPreview.url)).html, '.model-detail')).length, 1);
    record('Modèle dépublié : fiche publique en 404, retrait des collections, aperçu signé toujours disponible.');
  } finally {
    if (changed) {
      const current = await api(path);
      await save({...Object.fromEntries(Object.keys(current.item.data).filter(key => !(key in data)).map(key => [key, null])), ...data});
      await publish();
      const restored = await api(path);
      assert.deepEqual(editorialData(restored.item.data), editorialData(data), 'The original model data was not restored.');
      assert.deepEqual(await nodes((await publicHtml(route)).html, 'h1'), [data.title]);
      for (const familyRoute of references.get(route)) {
        assert((await nodes((await publicHtml(familyRoute)).html, '.model-card a', 'href')).includes(route));
      }
      record('Modèle initial restauré et republié ; fiche et références de collection rétablies.');
    }
  }
}

let failure;
try {
  await apiPage.goto(new URL('/_emdash/api/setup/status', base).href, {waitUntil: 'domcontentloaded'});
  await api('/_emdash/api/dashboard');
  const models = (await api('/_emdash/api/content/models?limit=100')).items;
  const families = (await api('/_emdash/api/content/families?limit=100')).items;
  const seed = JSON.parse(await readFile('seed/seed.json', 'utf8'));
  assert.deepEqual(models.map(item => item.slug).sort(), seed.content.models.map(item => item.slug).sort(), 'Model fixtures must match the current seed.');
  assert.deepEqual(families.map(item => item.slug).sort(), seed.content.families.map(item => item.slug).sort(), 'Family fixtures must match the current seed.');
  assert(models.every(model => model.status === 'published'));
  const references = await checkPublishedPages(models, families);
  if (!onlyPublication && !onlyWebkit) {
    const browserModels = process.argv.includes('--representative') ? models.filter(model => ['skorpio', 'rhonda', 'douglas', 'napoleon-keramik-outdoor'].includes(model.slug)) : models;
    await checkBrowserPages(browser, 'chromium', browserModels);
  }
  if (!onlyPublication && (process.argv.includes('--webkit') || onlyWebkit)) {
    const webkitBrowser = await webkit.launch({headless: true});
    // Representative layouts supplement the exhaustive Chromium matrix: long
    // Outdoor title, glass table/drawings and the extensive upholstered palette.
    const webkitModels=models.filter(model=>['skorpio','rhonda','napoleon-keramik-outdoor'].includes(model.slug));
    try { await checkBrowserPages(webkitBrowser, 'webkit', webkitModels); }
    finally { await webkitBrowser.close(); }
  }
  if (!onlyWebkit) await checkPublication(models.find(model => model.slug === 'skorpio') || models[0], models, references);
} catch (error) {
  failure = error;
  console.error(error.message);
} finally {
  await browser.close();
  await writeFile(`${output}/report.json`, JSON.stringify({
    completedAt: new Date().toISOString(), disposableOrigin: base.origin, suite:onlyPublication?'publication':onlyWebkit?'webkit':process.argv.includes('--representative')?'representative-browser-and-complete-publication':'full',
    passed: !failure, results, downloads, screenshots,
    ...(failure ? {error: failure.message} : {}),
  }, null, 2));
}
if (failure) process.exitCode = 1;
