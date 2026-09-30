/**
 * Anonymous, read-only verification of the six family guides after migration 0010.
 * Never reads credentials or calls setup, authentication, content or publication APIs.
 *
 * PUBLIC_TEST_ENGINE=chromium|webkit PUBLIC_TEST_THEME=dark|light
 * PUBLIC_TEST_URL=http://localhost:4321 node tests/family-guides-browser.mjs
 * Optional --only-content / --only-layouts; PUBLIC_TEST_SCREENSHOTS=false.
 */
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { chromium, webkit } from 'playwright';

const base = new URL(process.env.PUBLIC_TEST_URL || 'http://localhost:4321');
assert(['http:', 'https:'].includes(base.protocol) && !base.username && !base.password);
const engine = process.env.PUBLIC_TEST_ENGINE || 'chromium';
const theme = process.env.PUBLIC_TEST_THEME || 'dark';
assert(['chromium', 'webkit'].includes(engine), 'Choose chromium or webkit.');
assert(['dark', 'light'].includes(theme), 'Choose dark or light.');
const onlyContent = process.argv.includes('--only-content');
const onlyLayouts = process.argv.includes('--only-layouts');
assert(!(onlyContent && onlyLayouts), 'Choose only one focused suite.');
assert(process.argv.slice(2).every(flag => ['--only-content', '--only-layouts'].includes(flag)), 'Unknown test option.');
const output = resolve(process.env.PUBLIC_TEST_OUTPUT || 'test-results/family-guides', `${engine}-${theme}`);
const takeScreenshots = process.env.PUBLIC_TEST_SCREENSHOTS !== 'false' && engine === 'chromium';
const manifest = JSON.parse(await readFile('content/family-guides.json', 'utf8'));
const previous = JSON.parse(await readFile('content/family-editorial.json', 'utf8'));
const modelManifest = JSON.parse(await readFile('content/model-editorial.json', 'utf8'));
const refresh = JSON.parse(await readFile('content/editorial-refresh-products.json', 'utf8'));
for (const current of [manifest, modelManifest]) for (const entry of current.entries) {
  const patch = refresh.find(value => value.collection === current.collection && value.slug === entry.slug);
  assert(patch);
  entry.after = {...entry.after, ...patch.after};
  if (patch.seoAfter) entry.afterSeo = patch.seoAfter;
}
const details = JSON.parse(await readFile('content/model-details.json', 'utf8'));
assert.equal(manifest.collection, 'families');
assert.equal(manifest.entries.length, 6);
const modelCopy = new Map(modelManifest.entries.map(entry => [entry.slug, entry]));
assert.equal(modelCopy.size, 11);
const expectedSelections = new Map(previous.entries.map(entry => {
  const modelSlugs = entry.after.content.flatMap(block => (block.markDefs || [])
    .map(mark => /^\/modeles\/([^/]+)\/$/u.exec(mark.href || '')?.[1]).filter(Boolean));
  return [entry.slug, [...new Set(modelSlugs)]];
}));
assert.equal(new Set([...expectedSelections.values()].flat()).size, 11, 'Baseline must identify all eleven models.');
await mkdir(output, { recursive: true });
const report = {
  startedAt: new Date().toISOString(), origin: base.origin, engine, theme, readOnly: true,
  checks: [], pages: [], links: [], screenshots: [], errors: [], attemptedWrites: [], blockedPrivateRequests: [], error: '',
};
const pass = (name, data = {}) => { report.checks.push({ name, ...data }); console.log(`PASS ${name}`); };
const normalize = text => text.replace(/\s+/gu, ' ').trim();
const blockText = block => normalize(block.children.map(span => span.text).join(''));
const documents = new Map();
let failure;

function publicUrl(path) {
  const url = new URL(path, base);
  assert.equal(url.origin, base.origin, 'Checks must stay on the chosen preview origin.');
  assert(!url.username && !url.password && !url.searchParams.has('_preview'), 'Credentials/previews are outside this suite.');
  assert(!url.pathname.startsWith('/_emdash/') || url.pathname.startsWith('/_emdash/api/media/file/'),
    `Private route refused: ${url.pathname}`);
  return url;
}
async function get(path, method = 'GET') {
  assert(['GET', 'HEAD'].includes(method), 'This suite cannot write.');
  const response = await fetch(publicUrl(path), { method, redirect: 'manual',
    signal: AbortSignal.timeout(30000), headers: { 'Cache-Control': 'no-cache' } });
  assert.equal(response.status, 200, `${method} ${new URL(path, base).pathname}`);
  return response;
}
async function markup(path) {
  const url = publicUrl(path);
  url.hash = '';
  if (!documents.has(url.href)) {
    const response = await get(url.href);
    assert.match(response.headers.get('x-robots-tag') || '', /noindex/u, 'The private preview remains noindex.');
    documents.set(url.href, await response.text());
  }
  return documents.get(url.href);
}
async function nodes(page, html, selector, attribute) {
  return page.evaluate(({ html, selector, attribute }) => {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    return [...doc.querySelectorAll(selector)].map(node => attribute ? node.getAttribute(attribute) : node.textContent.trim());
  }, { html, selector, attribute });
}
async function newContext(browser, viewport = { width: 1440, height: 900 }) {
  const context = await browser.newContext({ viewport, reducedMotion: 'reduce', serviceWorkers: 'block' });
  await context.addInitScript(value => { try { localStorage.setItem('ci-mode', value); } catch { /* No storage on a blank parse document. */ } }, theme);
  await context.route('**/*', route => {
    const request = route.request();
    const url = new URL(request.url());
    if (!['GET', 'HEAD'].includes(request.method())) {
      report.attemptedWrites.push(`${request.method()} ${url.pathname}`);
      return route.abort();
    }
    if (url.origin === base.origin && url.pathname.startsWith('/_emdash/') && !url.pathname.startsWith('/_emdash/api/media/file/')) {
      report.blockedPrivateRequests.push(`${request.method()} ${url.pathname}`);
      return route.abort();
    }
    return route.continue();
  });
  context.on('page', page => page.on('pageerror', error => report.errors.push(error.message)));
  return context;
}
async function closeContext(context) {
  await context.unrouteAll({ behavior: 'ignoreErrors' }).catch(() => {});
  await context.close().catch(() => {});
}
async function verifyContent(browser) {
  const context = await newContext(browser);
  const page = await context.newPage();
  const localLinks = new Set();
  const reachableModels = new Set();
  const titles = new Set();
  try {
    const index = await markup('/collections/');
    for (const entry of manifest.entries) {
      const path = `/collections/${entry.slug}/`;
      const html = await markup(path);
      assert.deepEqual(await nodes(page, html, 'title'), [entry.afterSeo.title], path);
      assert.deepEqual(await nodes(page, html, 'meta[name="description"]', 'content'), [entry.afterSeo.description], path);
      assert.deepEqual(await nodes(page, html, 'meta[property="og:title"]', 'content'), [entry.afterSeo.title], path);
      assert(!titles.has(entry.afterSeo.title), `${path}: duplicate SEO title.`);
      titles.add(entry.afterSeo.title);
      assert.equal((await nodes(page, html, 'h1')).length, 1, path);
      assert.deepEqual(await nodes(page, html, '.page-lead'), [entry.after.intro], path);
      const paragraphs = (await nodes(page, html, '.page-reading-section .page-prose :is(p,h2,h3)')).map(normalize);
      assert.deepEqual(paragraphs, entry.after.content.map(blockText), `${path}: exact ordered guide copy.`);
      assert.deepEqual(await nodes(page, index, `.family-tile[href="${path}"] > p`), [entry.after.card_text], path);
      const proseLinks = await nodes(page, html, '.page-prose a', 'href');
      for (const block of entry.after.content) for (const mark of block.markDefs || []) {
        if (mark._type === 'link') assert(proseLinks.includes(mark.href), `${path}: missing editorial link ${mark.href}.`);
      }
      const cards = await page.evaluate(html => {
        const doc = new DOMParser().parseFromString(html, 'text/html');
        return [...doc.querySelectorAll('.model-card')].map(card => ({
          href: card.querySelector('a')?.getAttribute('href'),
          target: card.querySelector('a')?.getAttribute('target'),
          description: card.querySelector(':scope > p')?.textContent.trim(),
        }));
      }, html);
      const selection = [];
      for (const card of cards) {
        const slug = /^\/modeles\/([^/]+)\/$/u.exec(card.href)?.[1];
        assert(modelCopy.has(slug), `${path}: local model card is invalid.`);
        assert(!card.target || card.target === '_self', `${path}: model link opens another tab.`);
        assert.equal(card.description, modelCopy.get(slug).after.description, `${path}: model description changed.`);
        selection.push(slug);
        reachableModels.add(slug);
      }
      assert.deepEqual([...selection].sort(), [...expectedSelections.get(entry.slug)].sort(), `${path}: existing model selection retained.`);
      const ctas = await nodes(page, html, '.page-cta a', 'href');
      assert(ctas.includes('/catalogue/') && ctas.includes('/showroom-casablanca/#showroom-contact'), `${path}: catalogue and showroom next steps.`);
      for (const href of await nodes(page, html, 'a[href]', 'href')) {
        const target = new URL(href, new URL(path, base));
        if (target.origin === base.origin) localLinks.add(target.href);
      }
      report.pages.push(path);
      pass(`SSR ${entry.slug}: introduction, corps, carte, SEO et sélection existante`, { models: selection });
    }
    assert.equal(reachableModels.size, 11, 'All eleven existing models remain reachable.');
    for (const entry of modelManifest.entries) {
      const path = `/modeles/${entry.slug}/`;
      const html = await markup(path);
      assert.deepEqual(await nodes(page, html, 'title'), [entry.afterSeo.title], path);
      assert.deepEqual(await nodes(page, html, 'meta[name="description"]', 'content'), [entry.afterSeo.description], path);
      assert.deepEqual(await nodes(page, html, '.page-lead'), [entry.after.description], path);
      assert.deepEqual((await nodes(page, html, '.model-story .page-prose :is(p,h2,h3)')).map(normalize), entry.after.content.map(blockText), path);
      const source = details.models.find(model => model.slug === entry.slug);
      assert.equal((await nodes(page, html, '.model-gallery-view')).length, source.gallery.length, `${path}: original gallery count.`);
      const pdf = (await nodes(page, html, '.model-technical-download[download]', 'href'))[0];
      assert(pdf, `${path}: technical PDF link retained.`);
      const response = await get(pdf, 'HEAD');
      assert.match(response.headers.get('content-type') || '', /application\/pdf/u, path);
    }
    pass('11 fiches modèles : textes, SEO, galeries et liens PDF conservés');
    for (const href of localLinks) {
      const target = publicUrl(href);
      if (target.pathname.startsWith('/_emdash/api/media/file/')) await get(href, 'HEAD');
      else {
        const html = await markup(href);
        if (target.hash) {
          const id = decodeURIComponent(target.hash.slice(1));
          const exists = await page.evaluate(({ html, id }) => !!new DOMParser().parseFromString(html, 'text/html').getElementById(id), { html, id });
          assert(exists, `${target.pathname}: fragment #${id} absent.`);
        }
      }
      report.links.push(`${target.pathname}${target.hash}`);
    }
    pass(`${localLinks.size} liens internes des familles : réponses 200 et ancres présentes`);
  } finally { await closeContext(context); }
}
async function scrollToSection(page, selector) {
  await page.locator(selector).evaluate(element => scrollTo({
    top: element.getBoundingClientRect().top + scrollY - (document.querySelector('header')?.getBoundingClientRect().height || 0) - 20,
    behavior: 'instant',
  }));
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
}
async function decodeVisibleImages(page) {
  await page.evaluate(async () => {
    for (const image of document.images) {
      const rect = image.getBoundingClientRect();
      if (rect.bottom <= 0 || rect.top >= innerHeight || rect.width <= 0) continue;
      await Promise.race([image.decode(), new Promise((_, reject) => setTimeout(() => reject(new Error('Visible image decode timeout')), 20000))]);
      if (!image.naturalWidth) throw new Error('Visible image is broken');
    }
  });
}
async function screenshot(page, name) {
  if (!takeScreenshots) return;
  await decodeVisibleImages(page);
  const file = `${name}.jpg`;
  await page.screenshot({ path: join(output, file), type: 'jpeg', quality: 85, timeout: 20000 });
  report.screenshots.push(file);
}
async function verifyLayouts(browser) {
  for (const viewport of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
    const context = await newContext(browser, viewport);
    try {
      const page = await context.newPage();
      for (const entry of manifest.entries) {
        const path = `/collections/${entry.slug}/`;
        const response = await page.goto(new URL(path, base).href, { waitUntil: 'domcontentloaded', timeout: 30000 });
        assert.equal(response.status(), 200, path);
        await page.evaluate(() => document.fonts.ready);
        assert.equal(await page.locator('html').getAttribute('data-mode'), theme);
        assert.equal(await page.locator('h1').count(), 1);
        assert.equal((await page.locator('.page-lead').textContent()).trim(), entry.after.intro);
        const overflow = await page.evaluate(() => ({ width: innerWidth, document: document.documentElement.scrollWidth }));
        assert(overflow.document <= overflow.width + 1, `${engine}/${viewport.width}/${theme}${path}: horizontal overflow.`);
        for (const selector of ['.page-reading-section', '.models-section', '.page-cta']) {
          await scrollToSection(page, selector);
          assert(await page.locator(selector).isVisible(), `${path}: ${selector} is hidden.`);
          const headings = page.locator(`${selector} h2`);
          assert(await headings.count() > 0, `${path}: ${selector} has no heading.`);
          if (entry.slug === 'tables') {
            const area = { '.page-reading-section': 'overview', '.models-section': 'selection', '.page-cta': 'cta' }[selector];
            await screenshot(page, `tables-${viewport.width}-${area}`);
          }
        }
        pass(`${engine} ${viewport.width}×${viewport.height} ${theme} : ${entry.slug}, guide/sélection/actions sans débordement`);
      }
      await page.goto(new URL('/collections/tables/', base).href, { waitUntil: 'domcontentloaded' });
      const modelLink = page.locator('.model-card a[href^="/modeles/"]').first();
      const modelHref = await modelLink.getAttribute('href');
      await modelLink.click();
      await page.waitForURL(new URL(modelHref, base).href);
      assert.equal(context.pages().length, 1);
      assert.equal(await page.locator('html').getAttribute('data-mode'), theme);
      const toggle = page.locator('[data-theme-toggle]');
      await toggle.press('Enter');
      assert.equal(await page.locator('html').getAttribute('data-mode'), theme === 'dark' ? 'light' : 'dark');
      await toggle.press('Enter');
      assert.equal(await page.locator('html').getAttribute('data-mode'), theme);
      pass(`${engine} ${viewport.width} : lien famille→modèle et changement de thème au clavier`);
    } finally { await closeContext(context); }
  }
}

const browser = await { chromium, webkit }[engine].launch({ headless: true,
  ...(engine === 'chromium' ? { args: ['--no-sandbox', '--disable-dev-shm-usage'] } : {}) });
try {
  if (!onlyLayouts) await verifyContent(browser);
  if (!onlyContent) await verifyLayouts(browser);
  assert.deepEqual(report.attemptedWrites, [], 'Unexpected attempted write.');
  assert.deepEqual(report.blockedPrivateRequests, [], 'Unexpected private/auth request.');
  assert.deepEqual(report.errors, [], 'JavaScript exception.');
} catch (error) {
  failure = error;
  report.error = error.stack || error.message;
  console.error(report.error);
} finally {
  await browser.close().catch(() => {});
  report.completedAt = new Date().toISOString();
  report.passed = !failure;
  await writeFile(join(output, `report${onlyContent ? '-content' : onlyLayouts ? '-layouts' : ''}.json`), `${JSON.stringify(report, null, 2)}\n`);
}
if (failure) process.exitCode = 1;
