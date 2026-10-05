/**
 * Public, read-only verification after native migrations 0003 through 0010.
 * No credentials, CMS content API, setup, authentication or publication calls.
 * Exact copy/assets require the historical 0003–0010 fixture; use migration
 * 0026 to preserve its metadata in native SEO before the current frontend.
 *
 * PUBLIC_TEST_URL=http://localhost:4321 node tests/published-content-browser.mjs
 * Optional --only-content / --only-layouts / --only-webkit for a focused rerun.
 * PUBLIC_TEST_WIDTH=390 limits a focused layout rerun to mobile.
 */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {chromium, webkit} from 'playwright';
import {finishHasSeparateCode} from '../src/lib/model-labels.ts';

const base = new URL(process.env.PUBLIC_TEST_URL || 'http://localhost:4321');
assert(['http:', 'https:'].includes(base.protocol) && !base.username && !base.password);
const output = resolve(process.env.PUBLIC_CONTENT_OUTPUT || 'test-results/publication-final');
const onlyContent = process.argv.includes('--only-content');
const onlyLayouts = process.argv.includes('--only-layouts');
const onlyWebkit = process.argv.includes('--only-webkit');
assert([onlyContent, onlyLayouts, onlyWebkit].filter(Boolean).length <= 1, 'Choose one focused suite.');
const selectedWidth = process.env.PUBLIC_TEST_WIDTH ? Number(process.env.PUBLIC_TEST_WIDTH) : null;
assert(selectedWidth === null || [390, 1440].includes(selectedWidth), 'Unsupported focused viewport.');
const manifests = await Promise.all(['family-guides.json', 'model-editorial.json'].map(async file =>
  JSON.parse(await readFile(`content/${file}`, 'utf8'))));
const refreshedCopy = JSON.parse(await readFile('content/editorial-refresh-products.json', 'utf8'));
for (const manifest of manifests) for (const entry of manifest.entries) {
  const refresh = refreshedCopy.find(value => value.collection === manifest.collection && value.slug === entry.slug);
  assert(refresh, 'Missing current editorial expectation.');
  entry.after = {...entry.after, ...refresh.after};
  if (refresh.seoAfter) entry.afterSeo = refresh.seoAfter;
}
const details = JSON.parse(await readFile('content/model-details.json', 'utf8'));
const models = new Map(details.models.map(model => [model.slug, model]));
const modelCopy = new Map(manifests[1].entries.map(model => [model.slug, model]));
assert.equal(manifests[0].entries.length, 6);
assert.equal(models.size, 11);
await mkdir(`${output}/screenshots`, {recursive: true});
const report = {startedAt: new Date().toISOString(), origin: base.origin,
  readOnly: true, checks: [], pages: [], assets: [], screenshots: []};
const pass = message => { report.checks.push(message); console.log(`PASS ${message}`); };
const hash = value => createHash('sha256').update(value).digest('hex');
const normalize = value => value.replace(/\s+/gu, ' ').trim();
const assetPairs = new Map();
const links = new Set();
let failure;

function publicUrl(path) {
  const url = new URL(path, base);
  assert.equal(url.origin, base.origin, 'Public verification must stay on the selected origin.');
  assert(!url.pathname.startsWith('/_emdash/') || url.pathname.startsWith('/_emdash/api/media/file/'),
    `Nonpublic route refused: ${url.pathname}`);
  assert(!url.searchParams.has('_preview'), 'Signed previews are outside this public suite.');
  return url;
}
async function get(path, method = 'GET') {
  assert(['GET', 'HEAD'].includes(method), 'This suite cannot perform a write.');
  const response = await fetch(publicUrl(path), {method, redirect: 'manual',
    signal: AbortSignal.timeout(30000), headers: {'Cache-Control': 'no-cache'}});
  assert.equal(response.status, 200, `${method} ${new URL(path, base).pathname}`);
  return response;
}
async function markup(path) {
  const response = await get(path);
  assert.match(response.headers.get('x-robots-tag') || '', /noindex/u, 'The private preview remains noindex.');
  return response.text();
}
async function nodes(page, html, selector, attribute) {
  return page.evaluate(({html, selector, attribute}) => {
    const document = new DOMParser().parseFromString(html, 'text/html');
    return [...document.querySelectorAll(selector)].map(node => attribute
      ? node.getAttribute(attribute) : node.textContent.trim());
  }, {html, selector, attribute});
}
function pairAsset(path, media, label) {
  assert(path, `${label}: missing public asset.`);
  const url = publicUrl(path).href;
  const source = media?.$media;
  assert(source?.url, `${label}: missing official source.`);
  const existing = assetPairs.get(url);
  if (existing) {
    if (!existing.aliases.some(alias => alias.url === source.url)) existing.aliases.push(source);
  } else assetPairs.set(url, {source, aliases: [source], label});
}
async function guardContext(context, blocked) {
  await context.route('**/*', route => {
    const request = route.request();
    const url = new URL(request.url());
    const forbidden = !['GET', 'HEAD'].includes(request.method()) ||
      (url.origin === base.origin && url.pathname.startsWith('/_emdash/') &&
       !url.pathname.startsWith('/_emdash/api/media/file/'));
    if (forbidden) { blocked.push(`${request.method()} ${url.pathname}`); return route.abort(); }
    return route.continue();
  });
}
async function verifyContent(engine) {
  const context = await engine.newContext({serviceWorkers: 'block'});
  const blocked = [];
  await guardContext(context, blocked);
  const page = await context.newPage();
  const reachableModels = new Set();
  const titles = new Set();
  try {
    const index = await markup('/collections/');
    for (const manifest of manifests) for (const entry of manifest.entries) {
      const family = manifest.collection === 'families';
      const route = `/${family ? 'collections' : 'modeles'}/${entry.slug}/`;
      const html = await markup(route);
      assert.deepEqual(await nodes(page, html, 'title'), [entry.afterSeo.title], route);
      assert(!titles.has(entry.afterSeo.title), `${route}: duplicate SEO title.`);
      titles.add(entry.afterSeo.title);
      assert.deepEqual(await nodes(page, html, 'meta[name="description"]', 'content'), [entry.afterSeo.description], route);
      assert.deepEqual(await nodes(page, html, 'meta[property="og:title"]', 'content'), [entry.afterSeo.title], route);
      assert.equal((await nodes(page, html, 'h1')).length, 1, route);
      assert.deepEqual(await nodes(page, html, '.page-lead'), [entry.after[family ? 'intro' : 'description']], route);
      const prose = (await nodes(page, html, family ? '.page-reading-section .page-prose' : '.model-story .page-prose'))[0];
      assert(prose, `${route}: missing editorial body.`);
      for (const block of entry.after.content) {
        const text = block.children.map(span => span.text).join('');
        assert(normalize(prose).includes(normalize(text)), `${route}: missing paragraph ${text.slice(0, 70)}.`);
        for (const mark of block.markDefs || []) {
          assert((await nodes(page, html, '.page-prose a', 'href')).includes(mark.href), `${route}: missing contextual link.`);
          links.add(mark.href);
        }
      }
      if (family) {
        assert.deepEqual(await nodes(page, index, `.family-tile[href="${route}"] > p`), [entry.after.card_text]);
        const cards = await page.evaluate(html => {
          const doc = new DOMParser().parseFromString(html, 'text/html');
          return [...doc.querySelectorAll('.model-card')].map(card => ({
            href: card.querySelector('a')?.getAttribute('href'),
            target: card.querySelector('a')?.getAttribute('target'),
            description: card.querySelector(':scope > p')?.textContent.trim(),
          }));
        }, html);
        assert(cards.length, `${route}: missing model selection.`);
        for (const card of cards) {
          const slug = /^\/modeles\/([^/]+)\/$/u.exec(card.href)?.[1];
          assert(models.has(slug), `${route}: card does not point to a published local model.`);
          assert(!card.target || card.target === '_self', `${route}: model card opens another tab.`);
          assert.equal(card.description, modelCopy.get(slug).after.description);
          reachableModels.add(slug);
          links.add(card.href);
        }
      } else {
        const model = models.get(entry.slug);
        assert.deepEqual(await nodes(page, html, '.model-year dd'), [String(model.release_year)]);
        assert.equal((await nodes(page, html, '.model-gallery-view')).length, model.gallery.length, `${route}: gallery count.`);
        assert.deepEqual(await nodes(page, html, '.model-gallery-view figcaption'), model.gallery.map(row => row.caption).filter(Boolean));
        assert.deepEqual(await nodes(page, html, '.model-dimension-value'), model.dimensions.map(row => row.value).filter(Boolean), `${route}: dimension values.`);
        assert.equal((await nodes(page, html, '.model-drawings img')).length, model.drawings.length, `${route}: drawing count.`);
        assert.equal((await nodes(page, html, '.model-finish')).length, model.finishes.length, `${route}: finish count.`);
        assert.deepEqual(await nodes(page, html, '.model-finish-code'), model.finishes.filter(finishHasSeparateCode).map(row => row.code), `${route}: separate finish codes (codes already in names are not repeated).`);
        assert.deepEqual(await nodes(page, html, '.model-source a', 'href'), [], `${route}: internal research URL is no longer exposed as a public CTA.`);
        pairAsset((await nodes(page, html, '.model-hero-figure img', 'src'))[0], model.image, `${entry.slug}: hero`);
        for (const [selector, rows, label] of [
          ['.model-gallery-view img', model.gallery, 'gallery'],
          ['.model-drawings img', [...model.drawings].sort((a, b) => a.row - b.row || a.column - b.column), 'drawing'],
          ['.model-finish img', model.finishes.filter(row => row.image), 'finish'],
        ]) {
          const sources = await nodes(page, html, selector, 'src');
          assert.equal(sources.length, rows.length, `${route}: ${label} image count.`);
          sources.forEach((source, index) => pairAsset(source, rows[index].image, `${entry.slug}: ${label} ${index + 1}`));
        }
        const pdf = (await nodes(page, html, '.model-technical-download[download]', 'href'))[0];
        pairAsset(pdf, model.technical_sheet, `${entry.slug}: PDF`);
      }
      report.pages.push(route);
    }
    assert.equal(reachableModels.size, 11);
    for (const href of links) await get(href, 'HEAD');
    assert.deepEqual(blocked, []);
    pass('17 pages publiées : textes exacts, SEO, cartes et liens internes ; 11 modèles accessibles depuis leurs familles.');
    pass('Galeries, dimensions, plans et codes de finition correspondent au manifeste ; les sources de recherche restent internes.');
  } finally { await context.unrouteAll({behavior: 'ignoreErrors'}); await context.close(); }

  // Two bounded workers; all downloads are anonymous public GETs. Official
  // cache metadata contains only public URLs, MIME types and SHA-256 digests.
  const pending = [...assetPairs];
  let position = 0;
  let completed = 0;
  const worker = async () => {
    while (position < pending.length) {
      const [url, {source, aliases, label}] = pending[position++];
      const expected = JSON.parse(await readFile(`.wrangler/migrations/0003-model-detail-assets/${hash(source.url)}.json`, 'utf8'));
      assert.equal(expected.url, source.url);
      for (const alias of aliases) {
        const meta = JSON.parse(await readFile(`.wrangler/migrations/0003-model-detail-assets/${hash(alias.url)}.json`, 'utf8'));
        assert.equal(meta.url, alias.url);
        assert.equal(alias.sha256 || meta.sha256, expected.sha256, `${label}: inconsistent native media deduplication.`);
      }
      const response = await get(url);
      const bytes = Buffer.from(await response.arrayBuffer());
      assert.equal(hash(bytes), source.sha256 || expected.sha256, `${label}: official asset bytes differ.`);
      if (expected.mimeType === 'application/pdf') {
        assert.match(response.headers.get('content-type') || '', /application\/pdf/u);
        assert.equal(bytes.subarray(0, 5).toString(), '%PDF-');
      } else assert.match(response.headers.get('content-type') || '', /^image\//u, label);
      report.assets.push({path: new URL(url).pathname, mimeType: expected.mimeType, bytes: bytes.length, sha256: hash(bytes)});
      if (++completed % 100 === 0) console.log(`Verified public assets: ${completed}/${pending.length}`);
    }
  };
  const workers = await Promise.allSettled([worker(), worker()]);
  const rejected = workers.find(result => result.status === 'rejected');
  if (rejected) throw rejected.reason;
  assert.equal(report.assets.filter(asset => asset.mimeType === 'application/pdf').length, 11);
  pass(`${report.assets.length} médias locaux, dont 11 PDF : réponses publiques, types et SHA-256 identiques aux originaux vérifiés.`);
}
async function decode(locator, label) {
  const before = await locator.evaluate(image => ({src: image.getAttribute('src'), currentSrc: image.currentSrc,
    complete: image.complete, naturalWidth: image.naturalWidth}));
  await locator.scrollIntoViewIfNeeded();
  // Scrolling a native lazy image into view can replace its pending decoder.
  // First require the actual source to finish loading, then decode it. A
  // broken image or an unexpected src replacement is still a hard failure.
  await locator.evaluate(image => new Promise((resolve, reject) => {
    const deadline = performance.now() + 20000;
    const check = () => {
      if (image.complete && image.naturalWidth > 0) return resolve();
      if (performance.now() >= deadline) return reject(new Error('Visible image did not finish loading within 20 seconds.'));
      setTimeout(check, 50);
    };
    check();
  }));
  const loaded = await locator.evaluate(image => ({src: image.getAttribute('src'), currentSrc: image.currentSrc,
    complete: image.complete, naturalWidth: image.naturalWidth}));
  assert.equal(loaded.src, before.src, `${label}: image source changed unexpectedly.`);
  try {
    await locator.evaluate(image => Promise.race([image.decode(), new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Loaded image did not decode within 20 seconds.')), 20000))]));
  } catch (error) {
    report.imageDecodeFailure = {label, before, loaded, error: error.message};
    throw error;
  }
  (report.imageLoads ||= []).push({label, before, loaded});
}
async function screenshot(page, name) {
  await page.locator('header .page-brand img:visible').evaluateAll(images => Promise.all(images.map(image =>
    Promise.race([image.decode(), new Promise((_, reject) => setTimeout(() =>
      reject(new Error('Visible brand image did not decode within 20 seconds.')), 20000))]))));
  await page.screenshot({path: `${output}/screenshots/${name}`, type: 'jpeg', quality: 84, timeout: 20000});
  report.screenshots.push(name);
}
async function verifyLayouts(engine, name) {
  const routes = ['/collections/tables/', '/modeles/skorpio/', '/modeles/rhonda/', '/modeles/napoleon-keramik-outdoor/'];
  for (const viewport of [{width: 1440, height: 900}, {width: 390, height: 844}].filter(viewport => !selectedWidth || viewport.width === selectedWidth)) for (const theme of ['dark', 'light']) {
    const context = await engine.newContext({viewport, serviceWorkers: 'block', reducedMotion: 'reduce', acceptDownloads: true});
    context.setDefaultTimeout(20000);
    context.setDefaultNavigationTimeout(30000);
    const blocked = [], errors = [];
    try {
      await guardContext(context, blocked);
      await context.addInitScript(theme => localStorage.setItem('ci-mode', theme), theme);
      const page = await context.newPage();
      page.on('pageerror', error => errors.push(error.message));
      for (const route of routes) {
        const response = await page.goto(new URL(route, base).href, {waitUntil: 'domcontentloaded'});
        assert.equal(response.status(), 200);
        assert.equal(await page.locator('html').getAttribute('data-mode'), theme);
        assert.equal(await page.locator('h1').count(), 1);
        assert(await page.locator('h1').isVisible());
        await page.evaluate(() => Promise.race([document.fonts.ready, new Promise(resolve => setTimeout(resolve, 2000))]));
        assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), `${name}/${viewport.width}/${theme}${route}: overflow.`);
        const slug = route.split('/').filter(Boolean).at(-1);
        if (route.startsWith('/modeles/')) await decode(page.locator('.model-hero-figure img'), `${name}/${viewport.width}/${theme}/${slug}: hero`);
        await page.evaluate(() => scrollTo(0, 0));
        if (name === 'chromium') await screenshot(page, `${slug}-${viewport.width}-${theme}-hero.jpg`);
        const body = page.locator(route.startsWith('/modeles/') ? '.model-story' : '.page-reading-section');
        await body.scrollIntoViewIfNeeded();
        await body.evaluate(element => scrollTo(0, element.getBoundingClientRect().top + scrollY -
          (document.querySelector('header')?.getBoundingClientRect().height || 0) - 24));
        if (name === 'chromium' && ['tables', 'skorpio'].includes(slug)) await screenshot(page, `${slug}-${viewport.width}-${theme}-content.jpg`);
      }
      await page.goto(new URL('/collections/tables/', base).href, {waitUntil: 'domcontentloaded'});
      await page.locator('.page-prose a[href="/modeles/skorpio/"]').click();
      await page.waitForURL('**/modeles/skorpio/');
      assert.equal(context.pages().length, 1);
      assert.equal(await page.locator('html').getAttribute('data-mode'), theme);
      const opposite = theme === 'dark' ? 'light' : 'dark';
      await page.locator('[data-theme-toggle]').press('Enter');
      assert.equal(await page.locator('html').getAttribute('data-mode'), opposite);
      await page.locator('[data-theme-toggle]').press('Enter');
      const thumbnail = page.locator('.model-gallery-thumbnails a').first();
      const target = await thumbnail.getAttribute('href');
      await thumbnail.focus(); await page.keyboard.press('Enter');
      await page.waitForURL(url => url.hash === target);
      await decode(page.locator(`${target} img`), `${name}/${viewport.width}/${theme}/skorpio: gallery ${target}`);
      const finish = page.locator('.model-finish-group').first();
      assert.equal(await finish.getAttribute('open'), null);
      await finish.locator('summary').focus(); await page.keyboard.press('Enter');
      assert(await finish.evaluate(element => element.open));
      await decode(finish.locator('img').first(), `${name}/${viewport.width}/${theme}/skorpio: first finish`);
      if (name === 'chromium') await screenshot(page, `skorpio-${viewport.width}-${theme}-finishes.jpg`);
      if (viewport.width === 390) {
        await page.locator('.page-mobile-menu > summary').click();
        await page.locator('.page-mobile-menu nav a[href="/collections/"]').click();
        await page.waitForURL('**/collections/');
        assert.equal(await page.locator('html').getAttribute('data-mode'), theme);
      }
      assert.deepEqual(blocked, [], 'A public view attempted a write or an admin/auth request.');
      assert.deepEqual(errors, [], 'Public view raised a JavaScript exception.');
      pass(`${name} ${viewport.width}×${viewport.height} ${theme} : quatre pages, images décodées, navigation, thèmes, galerie et finitions au clavier, sans débordement.`);
    } catch (error) {
      console.error(`${name} ${viewport.width}/${theme}: ${error.stack || error.message}`);
      throw error;
    } finally {
      // A browser process exit must not replace the actionable navigation or
      // assertion error with an unrelated closed-context cleanup exception.
      await context.unrouteAll({behavior: 'ignoreErrors'}).catch(() => {});
      await context.close().catch(() => {});
    }
  }
}
try {
  if (!onlyWebkit) {
    const browser = await chromium.launch({headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage']});
    try {
      if (!onlyLayouts) await verifyContent(browser);
      if (!onlyContent) await verifyLayouts(browser, 'chromium');
    } finally { await browser.close(); }
  }
  if (!onlyContent) {
    // Diagnose an unresponsive development server before attributing a
    // navigation timeout to WebKit. This remains an anonymous HEAD request.
    await get('/collections/tables/', 'HEAD');
    const browser = await webkit.launch({headless: true});
    try { await verifyLayouts(browser, 'webkit'); } finally { await browser.close(); }
  }
} catch (error) {
  failure = error;
  console.error(error.stack || error.message);
} finally {
  report.completedAt = new Date().toISOString();
  report.passed = !failure;
  if (failure) report.error = failure.message;
  await writeFile(`${output}/report${onlyContent ? '-content' : onlyLayouts ? '-layouts' : onlyWebkit ? '-webkit' : ''}${selectedWidth ? `-${selectedWidth}` : ''}.json`, `${JSON.stringify(report, null, 2)}\n`);
}
if (failure) process.exitCode = 1;
