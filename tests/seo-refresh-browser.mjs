/**
 * Anonymous, read-only SEO and visual acceptance checks. No login, CMS writes,
 * valid catalogue submission, or private PDF download is permitted.
 *
 * PUBLIC_TEST_URL=https://preview.example PUBLIC_TEST_ENGINE=chromium|webkit
 * node tests/seo-refresh-browser.mjs [--only-content|--only-layouts]
 * Optional PUBLIC_TEST_THEME=dark|light, PUBLIC_TEST_SCREENSHOTS=false.
 */
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium, webkit } from 'playwright';

const base = new URL(process.env.PUBLIC_TEST_URL || 'http://localhost:4321');
assert(['http:', 'https:'].includes(base.protocol) && !base.username && !base.password);
assert.equal(base.pathname, '/');
assert(!base.search && !base.hash);
const engineName = process.env.PUBLIC_TEST_ENGINE || 'chromium';
assert(['chromium', 'webkit'].includes(engineName));
const themes = process.env.PUBLIC_TEST_THEME ? [process.env.PUBLIC_TEST_THEME] : ['dark', 'light'];
assert(themes.every(theme => ['dark', 'light'].includes(theme)));
const onlyContent = process.argv.includes('--only-content');
const onlyLayouts = process.argv.includes('--only-layouts');
assert(!(onlyContent && onlyLayouts));
assert(process.argv.slice(2).every(arg => ['--only-content', '--only-layouts'].includes(arg)));
const output = resolve(process.env.PUBLIC_TEST_OUTPUT || 'test-results/seo-refresh', engineName);
const captures = process.env.PUBLIC_TEST_SCREENSHOTS !== 'false' && engineName === 'chromium';
const entries = (await Promise.all(['pages', 'products', 'journal'].map(async suffix =>
  JSON.parse(await readFile(`content/editorial-refresh-${suffix}.json`, 'utf8'))))).flat();
const routes = entries.filter(entry => entry.collection !== 'site_content').map(entry =>
  entry.collection === 'pages' ? (entry.slug === 'home' ? '/' : `/${entry.slug}/`)
    : `/${({families: 'collections', models: 'modeles', posts: 'journal'})[entry.collection]}/${entry.slug}/`);
routes.push('/confidentialite/');
assert.equal(new Set(routes).size, 28);
const selected = ['/', '/showroom-casablanca/', '/collections/tables/', '/modeles/greta/', '/journal/choisir-forme-proportions-table-salle-a-manger/', '/catalogue/'];
const viewports = [{width: 1440, height: 900}, {width: 390, height: 844}];
const report = {startedAt: new Date().toISOString(), origin: base.origin, engine: engineName,
  readOnly: true, checks: [], pages: [], layouts: [], screenshots: [], swatches: [],
  errors: [], attemptedWrites: [], blockedPrivateRequests: [], failure: '',
  limits: ['Browser emulation, not a physical iPhone or field Core Web Vitals measurement.',
    'Product markup describes furniture without offers, ratings or a claim of Google rich-result eligibility.',
    'Native publication and valid catalogue/PDF flows are covered separately in an isolated environment.']};
const pass = (name, details = {}) => { report.checks.push({name, ...details}); console.log(`PASS ${name}`); };
await mkdir(output, {recursive: true});

function isPrivate(url) {
  if (url.pathname === '/_image') {
    const source = url.searchParams.get('href') || '';
    // Renditions may only read native public raster media, never an auth/API
    // URL hidden inside the image service's source parameter.
    if (!/^\/_emdash\/api\/media\/file\/[A-Za-z0-9._-]+\.(?:jpe?g|png|webp|avif)$/i.test(source)) return true;
  }
  return url.pathname.startsWith('/preview/') || url.searchParams.has('_preview')
    || (url.pathname.startsWith('/_emdash/') && !url.pathname.startsWith('/_emdash/api/media/file/'));
}
async function publicGet(path) {
  const url = new URL(path, base);
  assert.equal(url.origin, base.origin);
  assert(!isPrivate(url) && !url.username && !url.password);
  const response = await fetch(url, {redirect: 'manual', signal: AbortSignal.timeout(30000)});
  assert.equal(response.status, 200, path);
  assert.match(response.headers.get('x-robots-tag') || '', /noindex/);
  return response.text();
}
async function guardedContext(browser, options = {}) {
  const context = await browser.newContext({serviceWorkers: 'block', ...options});
  await context.route('**/*', route => {
    const request = route.request(), url = new URL(request.url());
    if (!['GET', 'HEAD'].includes(request.method())) {
      report.attemptedWrites.push(`${request.method()} ${url.origin}${url.pathname}`);
      return route.abort();
    }
    if (isPrivate(url) || url.username || url.password) {
      report.blockedPrivateRequests.push(`${request.method()} ${url.origin}${url.pathname}`);
      return route.abort();
    }
    return route.continue();
  });
  context.on('page', page => page.on('pageerror', error => report.errors.push(error.message)));
  return context;
}
async function closeContext(context) {
  await context.unrouteAll({behavior: 'ignoreErrors'}).catch(() => {});
  await context.close().catch(() => {});
}

async function verifyContent(browser) {
  const context = await guardedContext(browser);
  const parser = await context.newPage();
  let canonicalOrigin;
  const titles = new Set();
  try {
    for (const path of routes) {
      const html = await publicGet(path);
      const data = await parser.evaluate(html => {
        const doc = new DOMParser().parseFromString(html, 'text/html');
        const all = query => [...doc.querySelectorAll(query)];
        return {
          title: doc.title, titleCount: all('head > title').length,
          description: doc.querySelector('meta[name="description"]')?.content,
          canonical: all('link[rel="canonical"]').map(node => node.getAttribute('href')),
          robots: all('meta[name="robots"]').map(node => node.content),
          h1: all('h1').map(node => node.textContent.trim()),
          jsonld: all('script[type="application/ld+json"]').map(node => JSON.parse(node.textContent)),
          og: all('meta[property="og:image"]').map(node => node.content),
          twitter: all('meta[name="twitter:image"]').map(node => node.content),
          icons: all('link[rel="icon"]').map(node => node.getAttribute('href')),
          byline: doc.querySelector('.article-byline')?.textContent.trim(),
          brand: doc.querySelector('.page-brand')?.getAttribute('aria-label')?.replace(/ — Accueil$/, ''),
          breadcrumbs: all('.model-breadcrumb a').map(node => ({name: node.textContent.trim(), path: node.getAttribute('href')})),
          imageCount: all('img').length,
          imagesWithoutDimensions: all('img').filter(node => !node.getAttribute('width') || !node.getAttribute('height')).length,
          responsiveImages: all('img[srcset]').length,
          sources: all('img').map(node => ({src: node.getAttribute('src'), srcset: node.getAttribute('srcset'), original: node.getAttribute('data-original-src')})),
        };
      }, html);
      assert.equal(data.titleCount, 1, `${path}: one document title`);
      assert(data.title && !titles.has(data.title), `${path}: unique document title`);
      titles.add(data.title);
      assert.equal(data.h1.length, 1, `${path}: one semantic H1 for every viewport`);
      assert.equal(data.canonical.length, 1, `${path}: canonical`);
      const canonical = new URL(data.canonical[0]);
      canonicalOrigin ||= canonical.origin;
      assert.equal(canonical.origin, canonicalOrigin, `${path}: consistent configured public origin`);
      assert.equal(canonical.pathname, path, `${path}: canonical path`);
      assert(data.robots.some(value => /noindex/.test(value)), `${path}: preview stays noindex`);
      assert.equal(data.icons.length, 1, `${path}: native or existing-brand favicon`);
      assert(['http:', 'https:'].includes(new URL(data.icons[0], canonicalOrigin).protocol), `${path}: public favicon`);
      if (path !== '/confidentialite/') assert(data.description, `${path}: description`);
      for (const url of [...data.og, ...data.twitter]) assert(/^https?:\/\//.test(url), `${path}: absolute social image`);
      assert.equal(data.og.length, data.twitter.length, `${path}: matching social image fields`);
      if (path === '/journal/') assert.equal(data.og.length, 1, 'Journal has a social image');
      const graphs = data.jsonld.flatMap(graph => graph['@graph'] || [graph]);
      const typed = type => graphs.filter(graph => graph['@type'] === type);
      if (path === '/') assert.equal(typed('BreadcrumbList').length, 0);
      else {
        assert.equal(typed('BreadcrumbList').length, 1, `${path}: one breadcrumb graph`);
        const crumbs = typed('BreadcrumbList')[0].itemListElement;
        assert(crumbs.length >= 2);
        assert.equal(crumbs.at(-1).item, data.canonical[0]);
        crumbs.forEach((crumb, index) => assert.equal(crumb.position, index + 1));
        for (const visible of data.breadcrumbs) assert(crumbs.some(crumb => crumb.name === visible.name && new URL(crumb.item).pathname === visible.path), `${path}: visible model breadcrumb retained`);
      }
      if (/^\/journal\/[^/]+\/$/.test(path)) {
        assert.equal(typed('BlogPosting').length, 1, `${path}: one article graph`);
        const article = typed('BlogPosting')[0];
        assert.equal(article.headline, data.h1[0], `${path}: visible headline, no SEO suffix`);
        if (article.author?.name === data.brand) assert.equal(article.author['@type'], 'Organization');
        if (article.image) assert(/^https?:\/\//.test(article.image));
      }
      if (path.startsWith('/modeles/')) {
        assert.equal(typed('Product').length, 1, `${path}: product graph`);
        const product = typed('Product')[0];
        assert.equal(product.name, data.h1[0]);
        for (const field of ['offers', 'aggregateRating', 'review']) assert.equal(field in product, false, `${path}: no invented ${field}`);
        for (const image of product.image || []) assert(/^https?:\/\//.test(image));
      }
      if (['/', '/showroom-casablanca/'].includes(path)) {
        assert.equal(typed('FurnitureStore').length, 1, `${path}: showroom schema`);
        const store = typed('FurnitureStore')[0];
        assert(store.address && store.telephone && store.geo && store.openingHoursSpecification, `${path}: existing published store information`);
        assert.equal(store.address.addressCountry, 'MA');
        assert.equal('priceRange' in store, false);
      }
      report.pages.push({path, htmlBytes: Buffer.byteLength(html), ...data});
    }
    pass('28 public SSR routes: canonical, preview indexing protection, social metadata, favicon and scoped JSON-LD', {count: routes.length, canonicalOrigin});
  } finally { await closeContext(context); }
}

async function settle(page) {
  await page.evaluate(async () => {
    await document.fonts.ready;
    const visible = [...document.images].filter(image => {
      const rect = image.getBoundingClientRect();
      return rect.width > 0 && rect.height > 0 && rect.top < innerHeight && rect.bottom > 0;
    });
    await Promise.all(visible.map(image => image.decode().catch(() => {})));
  });
  await page.waitForTimeout(350);
}
async function verifyLayouts(browser) {
  for (const theme of themes) for (const viewport of viewports) {
    const context = await guardedContext(browser, {viewport, reducedMotion: 'no-preference'});
    // A new Playwright page starts at opaque about:blank, where localStorage
    // throws. Only seed the theme on the actual site, not blank pages/iframes.
    await context.addInitScript(({value, origin}) => {
      if (location.origin === origin) localStorage.setItem('ci-mode', value);
    }, {value: theme, origin: base.origin});
    const page = await context.newPage();
    try {
      for (const path of selected) {
        const imagesRequested = new Set();
        const renditions = [];
        const onRequest = request => { if (request.resourceType() === 'image') imagesRequested.add(request.url()); };
        const onResponse = response => {
          if (new URL(response.url()).pathname === '/_image') renditions.push({url: response.url(), status: response.status(), type: response.headers()['content-type'] || ''});
        };
        page.on('request', onRequest);
        page.on('response', onResponse);
        const response = await page.goto(new URL(path, base).href, {waitUntil: 'networkidle', timeout: 45000});
        assert.equal(response.status(), 200);
        await settle(page);
        const layout = await page.evaluate(() => ({
          mode: document.documentElement.dataset.mode,
          scrollWidth: document.documentElement.scrollWidth, width: innerWidth,
          visibleH1: [...document.querySelectorAll('h1')].filter(node => {
            const rect = node.getBoundingClientRect(); return rect.width && rect.height;
          }).map(node => node.textContent.trim()),
          images: [...document.images].filter(image => {
            const rect = image.getBoundingClientRect(); return rect.width && rect.height && rect.top < innerHeight && rect.bottom > 0;
          }).map(image => ({src: image.getAttribute('src'), currentSrc: image.currentSrc, srcset: image.getAttribute('srcset'),
            original: image.getAttribute('data-original-src'), width: image.width, naturalWidth: image.naturalWidth, complete: image.complete})),
          imageResourceBytes: performance.getEntriesByType('resource').filter(entry => entry.initiatorType === 'img').reduce((sum, entry) => sum + entry.encodedBodySize, 0),
        }));
        assert.equal(layout.mode, theme);
        assert(layout.scrollWidth <= layout.width + 1, `${path}: no horizontal overflow at ${viewport.width}`);
        assert.equal(layout.visibleH1.length, 1, `${path}: one visible H1 at ${viewport.width}`);
        assert(layout.images.every(image => image.complete && image.naturalWidth > 0), `${path}: visible images decode`);
        for (const image of layout.images.filter(image => image.original && image.currentSrc)) {
          const rendition = new URL(image.currentSrc, base);
          assert.equal(rendition.pathname, '/_image');
          assert.equal(rendition.searchParams.get('href'), image.original, `${path}: rendition preserves CMS source`);
          assert.equal(rendition.searchParams.get('f'), 'webp');
        }
        assert(renditions.every(image => image.status === 200 && image.type.startsWith('image/webp')), `${path}: requested renditions return WebP`);
        report.layouts.push({path, theme, viewport, ...layout, initialImageRequests: imagesRequested.size, renditions});
        if (captures && ['/', '/showroom-casablanca/', '/collections/tables/'].includes(path)) {
          const name = `${path === '/' ? 'home' : path.slice(1, -1).replaceAll('/', '-')}-${viewport.width}-${theme}.jpg`;
          await page.screenshot({path: `${output}/${name}`, type: 'jpeg', quality: 86});
          report.screenshots.push(name);
        }
        if (path === '/modeles/greta/') {
          const loaded = () => page.locator('.model-finish img').evaluateAll(images => images.filter(image => image.complete && image.naturalWidth > 0).length);
          const initialLoaded = await loaded();
          assert.equal(initialLoaded, 0, 'Closed finish groups do not download all swatches initially');
          const group = page.locator('.model-finish-group').first();
          await group.scrollIntoViewIfNeeded();
          await page.waitForTimeout(200);
          assert.equal(await loaded(), 0, 'Scrolling to a closed finish group keeps its images deferred');
          await group.locator('summary').click();
          await page.waitForFunction(() => [...document.querySelectorAll('.model-finish-group[open] img')].some(image => image.complete && image.naturalWidth > 0));
          report.swatches.push({theme, viewport, initialLoaded, loadedAfterOpening: await loaded(), totalRequests: imagesRequested.size});
        }
        page.off('request', onRequest);
        page.off('response', onResponse);
      }
      pass(`${engineName} ${theme} ${viewport.width}: six layouts, image selection and deferred finishes`);
    } finally { await closeContext(context); }
  }
}

let browser;
try {
  browser = await ({chromium, webkit})[engineName].launch({headless: true});
  if (!onlyLayouts) await verifyContent(browser);
  if (!onlyContent) await verifyLayouts(browser);
  assert.deepEqual(report.attemptedWrites, []);
  assert.deepEqual(report.blockedPrivateRequests, []);
  assert.deepEqual(report.errors, []);
  report.passed = true;
} catch (error) {
  report.passed = false;
  report.failure = error.message;
  console.error(`SEO refresh validation failed: ${error.message}`);
  process.exitCode = 1;
} finally {
  await browser?.close();
  report.finishedAt = new Date().toISOString();
  await writeFile(`${output}/report.json`, `${JSON.stringify(report, null, 2)}\n`);
}
