/**
 * Narrow anonymous image-transfer measurement; no scrolling or form submissions.
 * Run before/after on the same deployed origin:
 *   node tests/seo-image-transfer.mjs before
 *   node tests/seo-image-transfer.mjs after
 * Every page gets a fresh Chromium context, disabled browser cache, and the same
 * 390x844 / DPR 1 / dark layout. CDP reports encoded transfer bytes, including
 * response headers; these are not a Lighthouse score or a real-iPhone benchmark.
 */
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium } from 'playwright';

const stage = process.argv[2];
assert(['before', 'after'].includes(stage), 'Choose before or after.');
assert.equal(process.argv.length, 3);
const origin = 'https://cattelan-maroc-preview.omar-8b8.workers.dev';
const output = resolve('test-results/seo-image-transfer');
const routes = ['/modeles/greta/', '/'];
const settings = {
  viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, theme: 'dark',
  browserCacheDisabled: true, serviceWorkers: 'block', freshContextPerPage: true,
  networkThrottling: 'none', scroll: false, stableIntervalMs: 3000,
};
const report = {
  stage, origin, startedAt: new Date().toISOString(), readOnly: true, settings,
  method: 'Chromium CDP Network.loadingFinished.encodedDataLength for HTTP image responses; includes response headers.',
  limits: [
    'One controlled run per page, not a statistical loading-time or Core Web Vitals assessment.',
    'Viewport emulation at DPR 1; no physical iPhone or cellular network measurement.',
    'Browser cache is disabled; Cloudflare edge-cache state is observed but not reset.',
    'Lazy images requested automatically near the initial viewport are included; there is no scrolling.',
  ],
  pages: [], errors: [], attemptedWrites: [], blockedPrivateRequests: [],
};
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-dev-shm-usage'] });
report.browserVersion = browser.version();

try {
  for (const path of routes) {
    const context = await browser.newContext({ viewport: settings.viewport, deviceScaleFactor: settings.deviceScaleFactor, serviceWorkers: 'block', reducedMotion: 'no-preference' });
    await context.addInitScript(theme => localStorage.setItem('ci-mode', theme), settings.theme);
    await context.route('**/*', route => {
      const request = route.request(), url = new URL(request.url());
      if (!['GET', 'HEAD'].includes(request.method())) {
        report.attemptedWrites.push(`${request.method()} ${url.origin}${url.pathname}`);
        return route.abort();
      }
      if (url.pathname.startsWith('/_emdash/') && !url.pathname.startsWith('/_emdash/api/media/file/')) {
        report.blockedPrivateRequests.push(url.pathname);
        return route.abort();
      }
      return route.continue();
    });
    const page = await context.newPage();
    page.on('pageerror', error => report.errors.push({ path, message: error.message }));
    const cdp = await context.newCDPSession(page);
    await cdp.send('Network.enable');
    await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });
    const requests = new Map(), pending = new Set();
    let lastActivity = Date.now();
    const touch = () => { lastActivity = Date.now(); };
    cdp.on('Network.requestWillBeSent', event => {
      if (!/^https?:/u.test(event.request.url)) return;
      requests.set(event.requestId, { requestId: event.requestId, url: event.request.url, type: event.type, method: event.request.method, fromDiskCache: false, fromServiceWorker: false, fromPrefetchCache: false, servedFromCache: false });
      pending.add(event.requestId); touch();
    });
    cdp.on('Network.requestServedFromCache', event => {
      const request = requests.get(event.requestId);
      if (request) request.servedFromCache = true;
    });
    cdp.on('Network.responseReceived', event => {
      const request = requests.get(event.requestId);
      if (!request) return;
      const response = event.response;
      const headers = Object.fromEntries(Object.entries(response.headers).map(([key, value]) => [key.toLowerCase(), value]));
      Object.assign(request, {
        type: event.type, status: response.status, mimeType: response.mimeType,
        fromDiskCache: response.fromDiskCache || false,
        fromServiceWorker: response.fromServiceWorker || false,
        fromPrefetchCache: response.fromPrefetchCache || false,
        cacheControl: headers['cache-control'] || null,
        edgeCacheStatus: headers['cf-cache-status'] || null,
        contentLength: headers['content-length'] || null,
        contentEncoding: headers['content-encoding'] || null,
      });
      touch();
    });
    cdp.on('Network.loadingFinished', event => {
      const request = requests.get(event.requestId);
      if (request) Object.assign(request, { completed: true, encodedTransferBytes: event.encodedDataLength });
      pending.delete(event.requestId); touch();
    });
    cdp.on('Network.loadingFailed', event => {
      const request = requests.get(event.requestId);
      if (request) Object.assign(request, { completed: false, error: event.errorText });
      pending.delete(event.requestId); touch();
    });

    try {
      const response = await page.goto(origin + path, { waitUntil: 'load', timeout: 45000 });
      assert.equal(response.status(), 200, path);
      const loadedAt = Date.now();
      while (pending.size || Date.now() - lastActivity < settings.stableIntervalMs || Date.now() - loadedAt < settings.stableIntervalMs) {
        assert(Date.now() - loadedAt < 30000, `${path}: network did not settle within 30 seconds after load`);
        await page.waitForTimeout(100);
      }
      const images = [...requests.values()].filter(request => request.type === 'Image' || /^image\//u.test(request.mimeType || ''));
      const position = await page.evaluate(() => ({ x: scrollX, y: scrollY }));
      assert.deepEqual(position, { x: 0, y: 0 }, 'Initial viewport must remain unscrolled');
      assert(images.length > 0);
      assert(images.every(request => request.completed && request.status === 200), `${path}: incomplete image response`);
      assert(images.every(request => !request.fromDiskCache && !request.fromServiceWorker && !request.fromPrefetchCache && !request.servedFromCache), `${path}: browser cache must stay cold`);
      const result = {
        path, measuredAt: new Date().toISOString(), status: response.status(), scroll: position,
        settleMsAfterLoad: Date.now() - loadedAt, pendingRequests: pending.size,
        imageRequestCount: images.length,
        uniqueImageUrlCount: new Set(images.map(request => request.url)).size,
        encodedImageTransferBytes: images.reduce((sum, request) => sum + request.encodedTransferBytes, 0),
        browserCachedImageCount: images.filter(request => request.fromDiskCache || request.fromServiceWorker || request.fromPrefetchCache || request.servedFromCache).length,
        images,
      };
      report.pages.push(result);
      console.log(JSON.stringify({ stage, path, imageRequestCount: result.imageRequestCount, encodedImageTransferBytes: result.encodedImageTransferBytes, browserCachedImageCount: result.browserCachedImageCount }));
    } finally {
      await cdp.detach();
      await context.close();
    }
  }
  assert.deepEqual(report.errors, []);
  assert.deepEqual(report.attemptedWrites, []);
  assert.deepEqual(report.blockedPrivateRequests, []);
  report.passed = true;
} finally {
  await browser.close();
  report.finishedAt = new Date().toISOString();
  await writeFile(resolve(output, `${stage}.json`), JSON.stringify(report, null, 2) + '\n');
}

if (stage === 'after') {
  const before = JSON.parse(await readFile(resolve(output, 'before.json'), 'utf8'));
  assert.equal(before.origin, report.origin);
  assert.equal(before.browserVersion, report.browserVersion, 'Use the same Chromium build');
  assert.deepEqual(before.settings, report.settings, 'Measurement conditions must match');
  const comparison = {
    origin, settings, browserVersion: report.browserVersion,
    beforeMeasuredAt: before.finishedAt, afterMeasuredAt: report.finishedAt,
    method: report.method, limits: report.limits,
    pages: report.pages.map(page => {
      const old = before.pages.find(item => item.path === page.path);
      assert(old, page.path);
      return {
        path: page.path, beforeImageRequests: old.imageRequestCount, afterImageRequests: page.imageRequestCount,
        beforeEncodedBytes: old.encodedImageTransferBytes, afterEncodedBytes: page.encodedImageTransferBytes,
        encodedBytesSaved: old.encodedImageTransferBytes - page.encodedImageTransferBytes,
        reductionPercent: Number(((1 - page.encodedImageTransferBytes / old.encodedImageTransferBytes) * 100).toFixed(2)),
      };
    }),
  };
  await writeFile(resolve(output, 'comparison.json'), JSON.stringify(comparison, null, 2) + '\n');
  console.log(JSON.stringify(comparison.pages, null, 2));
}
