/** Bounded, read-only mobile observations on the development preview; not a CWV score. */
import { mkdir, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const base = process.env.SEO_AUDIT_URL || 'http://localhost:4321';
const output = process.env.SEO_AUDIT_OUTPUT || 'test-results/seo-audit';
await mkdir(`${output}/screenshots`, { recursive: true });
const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const results = [];
try {
  for (const path of ['/', '/showroom-casablanca/', '/modeles/greta/', '/journal/associer-table-chaises-salle-a-manger/']) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true });
    const writes = [];
    await context.route('**/*', route => {
      if (!['GET', 'HEAD'].includes(route.request().method())) { writes.push(route.request().method()); return route.abort(); }
      return route.continue();
    });
    await context.addInitScript(() => { localStorage.setItem('ci-mode', 'light'); });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const response = await page.goto(new URL(path, base).href, { waitUntil: 'load', timeout: 45000 });
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(1500);
    const data = await page.evaluate(() => ({
      visibleH1: [...document.querySelectorAll('h1')].filter(node => node.checkVisibility()).map(node => node.textContent.trim()),
      width: innerWidth, scrollWidth: document.documentElement.scrollWidth, theme: document.documentElement.dataset.mode,
      images: [...document.images].map(node => ({ src: node.currentSrc, naturalWidth: node.naturalWidth, naturalHeight: node.naturalHeight,
        displayWidth: Math.round(node.getBoundingClientRect().width), displayHeight: Math.round(node.getBoundingClientRect().height),
        top: Math.round(node.getBoundingClientRect().top), visible: node.checkVisibility(), loaded: node.complete && node.naturalWidth > 0,
        loading: node.loading, srcset: node.srcset })),
      resources: performance.getEntriesByType('resource').map(entry => ({ url: entry.name, type: entry.initiatorType, transferSize: entry.transferSize, encodedBodySize: entry.encodedBodySize, duration: Math.round(entry.duration) })),
      navigation: performance.getEntriesByType('navigation').map(entry => ({ responseStart: Math.round(entry.responseStart), domContentLoaded: Math.round(entry.domContentLoadedEventEnd), load: Math.round(entry.loadEventEnd) })),
      contactLinks: [...document.querySelectorAll('a[href]')].map(node => node.getAttribute('href')).filter(href => /^(tel:|mailto:)|wa.me|maps/.test(href)),
    }));
    const name = path === '/' ? 'home' : path.replace(/^\/+|\/+$/g, '').replaceAll('/', '__');
    await page.screenshot({ path: `${output}/screenshots/${name}-mobile-light.jpg`, type: 'jpeg', quality: 83 });
    results.push({ path, status: response.status(), errors, writes, ...data });
    console.log(JSON.stringify({ path, status: response.status(), imageRequests: data.resources.filter(r => r.type === 'img').length,
      imageBytes: data.resources.filter(r => r.type === 'img').reduce((sum,r) => sum + r.encodedBodySize, 0),
      loadedImages: data.images.filter(i => i.loaded).length, visibleH1: data.visibleH1, overflow: data.scrollWidth > data.width, errors, writes }));
    await context.close();
  }
  await writeFile(`${output}/mobile.json`, `${JSON.stringify({ capturedAt: new Date().toISOString(), timezone: 'America/Toronto',
    conditions: 'Chromium, 390x844 CSS pixels, DPR 3, light theme, fresh browser context per page, localhost Astro development server. No CPU/network throttling or scrolling. Resources captured 1.5 seconds after load and fonts. Development JS is not representative of production; these observations are not field Core Web Vitals or a Lighthouse score.', results }, null, 2)}\n`);
} finally { await browser.close(); }
