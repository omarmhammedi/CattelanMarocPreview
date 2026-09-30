/**
 * Bounded, anonymous before/after check of Greta's collapsed finish groups.
 * SWATCH_TEST_URL=http://localhost:4321 node tests/seo-swatches-browser.mjs before
 * SWATCH_TEST_URL=http://localhost:4321 node tests/seo-swatches-browser.mjs after
 * Optional SWATCH_TEST_OUTPUT selects an ignored evidence directory.
 * This checks image transfers and keyboard access, not Core Web Vitals.
 */
import assert from 'node:assert/strict';
import {mkdir, readFile, writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {chromium} from 'playwright';

const stage = process.argv[2];
assert(['before', 'after'].includes(stage));
assert.equal(process.argv.length, 3);
const origin = new URL(process.env.SWATCH_TEST_URL || 'http://localhost:4321').origin;
assert(['http://localhost:4321', 'https://cattelan-maroc-preview.omar-8b8.workers.dev'].includes(origin));
const output = resolve(process.env.SWATCH_TEST_OUTPUT || 'test-results/seo-swatches-local');
assert(output.startsWith(resolve('test-results') + '/'), 'Keep evidence in ignored test-results.');
const variants = [{width: 390, height: 844}, {width: 1440, height: 900}];
const report = {
  stage, origin, startedAt: new Date().toISOString(), readOnly: true,
  settings: {variants, deviceScaleFactor: 2, theme: 'dark', browserCacheDisabled: true, serviceWorkers: 'block', settleMs: 3000},
  method: 'Chromium CDP image response MIME and encodedDataLength, including response headers; initial viewport, closed group in view, then first group opened.',
  limits: ['Single run per viewport; not a load test or a Core Web Vitals score.', 'Browser cache disabled; Cloudflare edge cache is not reset.', 'Mobile viewport emulation, not a physical phone.', 'Lossy WebP variants preserve the source and framing; this is not colorimetric certification.'],
  variants: [], errors: [], blockedRequests: [],
};
await mkdir(output, {recursive: true});
const browser = await chromium.launch({headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage']});
report.browserVersion = browser.version();

try {
  for (const viewport of variants) {
    const context = await browser.newContext({viewport, deviceScaleFactor: 2, serviceWorkers: 'block'});
    try {
      await context.addInitScript(() => localStorage.setItem('ci-mode', 'dark'));
      await context.route('**/*', route => {
        const request = route.request(), url = new URL(request.url());
        if (!['GET', 'HEAD'].includes(request.method()) ||
          (url.pathname.startsWith('/_emdash/') && !url.pathname.startsWith('/_emdash/api/media/file/'))) {
          report.blockedRequests.push(`${request.method()} ${url.pathname}`);
          return route.abort();
        }
        return route.continue();
      });
      const page = await context.newPage();
      page.on('pageerror', error => report.errors.push(error.message));
      const cdp = await context.newCDPSession(page);
      await cdp.send('Network.enable');
      await cdp.send('Network.setCacheDisabled', {cacheDisabled: true});
      const requests = new Map(), pending = new Set();
      let lastActivity = Date.now();
      cdp.on('Network.requestWillBeSent', event => {
        if (!event.request.url.startsWith('http')) return;
        requests.set(event.requestId, {url: event.request.url, type: event.type});
        pending.add(event.requestId); lastActivity = Date.now();
      });
      cdp.on('Network.responseReceived', event => {
        const request = requests.get(event.requestId);
        if (request) Object.assign(request, {
          status: event.response.status, mime: event.response.mimeType,
          browserCached: !!event.response.fromDiskCache || !!event.response.fromServiceWorker,
        });
        lastActivity = Date.now();
      });
      cdp.on('Network.loadingFinished', event => {
        const request = requests.get(event.requestId);
        if (request) Object.assign(request, {completed: true, encodedBytes: event.encodedDataLength});
        pending.delete(event.requestId); lastActivity = Date.now();
      });
      cdp.on('Network.loadingFailed', event => {
        const request = requests.get(event.requestId);
        if (request) Object.assign(request, {completed: false, error: event.errorText});
        pending.delete(event.requestId); lastActivity = Date.now();
      });
      const result = {viewport, snapshots: []};
      report.variants.push(result);
      async function settle() {
        const start = Date.now();
        await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
        while (pending.size || Date.now() - lastActivity < 3000) {
          assert(Date.now() - start < 30000, 'Network must settle within 30 seconds.');
          await page.waitForTimeout(100);
        }
      }
      async function snapshot(name) {
        await settle();
        const images = [...requests.values()].filter(item => item.type === 'Image' || item.mime?.startsWith('image/'));
        const dom = await page.evaluate(() => ({
          scrollY, imageElements: document.images.length,
          finishImages: document.querySelectorAll('.model-finish img').length,
          loadedFinishImages: [...document.querySelectorAll('.model-finish img')].filter(image => image.naturalWidth > 0).length,
          openGroups: document.querySelectorAll('.model-finish-group[open]').length,
          firstGroup: [...document.querySelectorAll('.model-finish-group:first-of-type img')].map(image => {
            const rectangle = image.getBoundingClientRect(), style = getComputedStyle(image);
            return {alt: image.alt, width: Number(image.getAttribute('width')), height: Number(image.getAttribute('height')),
              original: image.dataset.originalSrc || image.getAttribute('src'), currentSrc: image.currentSrc,
              renderedWidth: rectangle.width, renderedHeight: rectangle.height, objectFit: style.objectFit,
              link: image.closest('a')?.getAttribute('href') || null};
          }),
        }));
        const finishSources = new Set(dom.firstGroup.map(image => new URL(image.original, origin).href));
        const finishRequests = images.filter(image => {
          const url = new URL(image.url);
          return finishSources.has(url.pathname === '/_image' ? new URL(url.searchParams.get('href'), origin).href : image.url);
        });
        const countMime = rows => rows.reduce((totals, row) => ({...totals, [row.mime]: (totals[row.mime] || 0) + 1}), {});
        assert(images.every(image => image.completed && image.status === 200), 'All requested images return 200.');
        assert(images.every(image => !image.browserCached), 'Fresh browser cache required.');
        const data = {name, ...dom, imageRequests: images.length, imageBytes: images.reduce((sum, image) => sum + image.encodedBytes, 0),
          imageMimes: countMime(images), finishRequests: finishRequests.length,
          finishBytes: finishRequests.reduce((sum, image) => sum + image.encodedBytes, 0), finishMimes: countMime(finishRequests),
          requests: images};
        result.snapshots.push(data);
        console.log(JSON.stringify({stage, viewport: viewport.width, name, imageRequests: data.imageRequests, imageBytes: data.imageBytes,
          finishRequests: data.finishRequests, finishBytes: data.finishBytes, finishMimes: data.finishMimes}));
        return data;
      }
      const response = await page.goto(origin + '/modeles/greta/', {waitUntil: 'load', timeout: 45000});
      const documentBody = await response.body();
      result.document = {status: response.status(), decodedHTMLBytes: documentBody.length,
        contentEncoding: response.headers()['content-encoding'] || 'identity',
        encodedTransferBytes: [...requests.values()].find(request => request.type === 'Document' && request.url === origin + '/modeles/greta/')?.encodedBytes};
      assert.equal(response.status(), 200);
      assert.equal((await snapshot('initial')).loadedFinishImages, 0);
      const group = page.locator('.model-finish-group').first();
      const summary = group.locator('summary');
      await summary.scrollIntoViewIfNeeded();
      assert.equal((await snapshot('closed-in-view')).loadedFinishImages, 0);
      await summary.click();
      const opened = await snapshot('opened');
      assert.equal(opened.openGroups, 1);
      assert(opened.finishRequests > 0 && opened.loadedFinishImages > 0);
      assert(opened.loadedFinishImages <= opened.firstGroup.length, 'Other finish groups stay deferred.');
      await group.locator('img').first().evaluate(image => image.decode());
      const firstImage = group.locator('.model-finish-image').first();
      await firstImage.scrollIntoViewIfNeeded();
      await page.waitForTimeout(500);
      const frame = await firstImage.boundingBox();
      const screenshot = `${stage}-${viewport.width}-dpr2-first-finish.png`;
      await firstImage.screenshot({path: resolve(output, screenshot)});
      result.qualityScreenshot = screenshot;
      result.firstFrame = frame;
      const view = `${stage}-${viewport.width}-dpr2-group.png`;
      await page.screenshot({path: resolve(output, view)});
      result.groupScreenshot = view;
      if (stage === 'after') {
        assert(opened.finishRequests === opened.finishMimes['image/webp'], 'Loaded native finish renditions are WebP.');
        assert(opened.firstGroup.every(image => image.link === image.original), 'Each finish links to its own unchanged original.');
        const link = group.locator('.model-finish-original').first();
        await summary.focus(); await page.keyboard.press('Tab');
        assert(await link.evaluate(element => element === document.activeElement));
        result.focus = await link.evaluate(element => ({outlineStyle: getComputedStyle(element).outlineStyle,
          outlineWidth: getComputedStyle(element).outlineWidth, label: element.getAttribute('aria-label')}));
        assert.equal(result.focus.outlineStyle, 'solid');
        assert.equal(result.focus.outlineWidth, '2px');
        assert(result.focus.label?.includes('original'));
        const popupPromise = context.waitForEvent('page');
        await page.keyboard.press('Enter');
        const popup = await popupPromise;
        await popup.waitForLoadState('load');
        result.original = {url: popup.url(), openerIsNull: await popup.evaluate(() => window.opener === null)};
        assert.equal(result.original.url, new URL(opened.firstGroup[0].original, origin).href);
        assert.equal(result.original.openerIsNull, true);
        await popup.close();
      }
      await summary.focus(); await page.keyboard.press('Enter');
      assert.equal(await group.getAttribute('open'), null, 'Keyboard still closes the finish group.');
      await cdp.detach();
    } finally { await context.close(); }
  }
  assert.deepEqual(report.blockedRequests, []); assert.deepEqual(report.errors, []);
  if (stage === 'after') {
    const before = JSON.parse(await readFile(resolve(output, 'before.json'), 'utf8'));
    assert.equal(before.origin, origin); assert.equal(before.browserVersion, report.browserVersion);
    assert.deepEqual(before.settings, report.settings);
    report.comparison = report.variants.map((variant, index) => {
      const old = before.variants[index].snapshots.find(snapshot => snapshot.name === 'opened');
      const current = variant.snapshots.find(snapshot => snapshot.name === 'opened');
      assert.deepEqual(current.firstGroup.map(({alt, width, height, original, renderedWidth, renderedHeight, objectFit}) =>
        ({alt, width, height, original, renderedWidth, renderedHeight, objectFit})), old.firstGroup.map(({alt, width, height, original, renderedWidth, renderedHeight, objectFit}) =>
        ({alt, width, height, original, renderedWidth, renderedHeight, objectFit})), 'Finish identity, labels, source dimensions and framing remain unchanged.');
      assert.equal(current.finishRequests, old.finishRequests);
      return {viewport: variant.viewport, beforeFinishBytes: old.finishBytes, afterFinishBytes: current.finishBytes,
        reductionPercent: Number((100 * (1 - current.finishBytes / old.finishBytes)).toFixed(2))};
    });
  }
  report.passed = true;
} finally {
  await browser.close(); report.finishedAt = new Date().toISOString();
  await writeFile(resolve(output, `${stage}.json`), JSON.stringify(report, null, 2) + '\n');
}
console.log(JSON.stringify({passed: report.passed, comparison: report.comparison, output}));
