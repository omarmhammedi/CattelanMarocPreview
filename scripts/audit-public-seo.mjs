/** Anonymous, read-only SEO inventory. No assets, scripts, forms or authentication run. */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { chromium } from 'playwright';

const base = new URL(process.env.SEO_AUDIT_URL || 'http://localhost:4321');
const output = process.env.SEO_AUDIT_OUTPUT || 'test-results/seo-audit';
const seed = JSON.parse(await readFile('seed/seed.json', 'utf8'));
const expected = ['/', '/collections/', '/showroom-casablanca/', '/catalogue/', '/journal/',
  ...seed.content.families.map(entry => `/collections/${entry.slug}/`),
  ...seed.content.models.map(entry => `/modeles/${entry.slug}/`),
  ...seed.content.posts.map(entry => `/journal/${entry.slug}/`), '/confidentialite/'];
const safePath = path => path === '/' || /^\/(collections|modeles|journal)(\/|$)/.test(path)
  || /^\/(home|showroom-casablanca|catalogue|confidentialite)\/?$/.test(path);
await mkdir(`${output}/html`, { recursive: true });
const browser = await chromium.launch({ args: ['--no-sandbox', '--disable-dev-shm-usage'] });
const context = await browser.newContext({ javaScriptEnabled: false });
await context.route('**/*', route => route.abort());
const page = await context.newPage();
const pages = [];
const queue = [...expected];
const visited = new Set();
const failure = [];
const filename = path => path === '/' ? 'home' : path.replace(/^\/+|\/+$/g, '').replaceAll('/', '__');
try {
  while (queue.length) {
    const path = queue.shift();
    if (visited.has(path)) continue;
    visited.add(path);
    try {
      const response = await fetch(new URL(path, base), { signal: AbortSignal.timeout(30000) });
      const html = await response.text();
      await writeFile(`${output}/html/${filename(path)}.html`, html);
      await page.setContent(html, { waitUntil: 'domcontentloaded' });
      const data = await page.evaluate(() => {
        const compact = value => value?.replace(/\s+/g, ' ').trim() || '';
        const main = document.querySelector('main') || document.body;
        const textRoot = main.cloneNode(true);
        textRoot.querySelectorAll('script,style,nav,header,footer').forEach(node => node.remove());
        const mainText = compact(textRoot.textContent);
        const meta = key => [...document.querySelectorAll('meta')].filter(node => node.name === key || node.getAttribute('property') === key).map(node => node.content);
        return {
          title: document.title, description: meta('description'), lang: document.documentElement.lang,
          canonical: [...document.querySelectorAll('link[rel="canonical"]')].map(node => node.getAttribute('href')),
          robots: meta('robots'), ogTitle: meta('og:title'), ogDescription: meta('og:description'), ogImage: meta('og:image'),
          h1: [...document.querySelectorAll('h1')].map(node => compact(node.textContent)),
          headings: [...main.querySelectorAll('h1,h2,h3,h4')].map(node => ({ level: node.tagName, text: compact(node.textContent) })),
          jsonLd: [...document.querySelectorAll('script[type="application/ld+json"]')].map(node => {
            try { return JSON.parse(node.textContent); } catch { return { parseError: true }; }
          }),
          mainText, wordCount: mainText.split(/\s+/).filter(Boolean).length,
          links: [...document.querySelectorAll('a[href]')].map(node => ({ href: node.getAttribute('href'), text: compact(node.textContent) || node.getAttribute('aria-label') || '', inMain: !!node.closest('main'), target: node.target, rel: node.rel })),
          images: [...document.querySelectorAll('img')].map(node => ({ src: node.getAttribute('src'), originalSrc: node.getAttribute('data-original-src'), alt: node.getAttribute('alt'), width: node.getAttribute('width'), height: node.getAttribute('height'), loading: node.loading, srcset: node.getAttribute('srcset'), sizes: node.getAttribute('sizes') })),
          forms: [...document.querySelectorAll('form')].map(node => ({ action: node.getAttribute('action'), method: node.getAttribute('method'), fields: [...node.querySelectorAll('input')].map(input => ({ name: input.name, type: input.type, required: input.required, checked: input.checked })) })),
          ids: [...document.querySelectorAll('[id]')].map(node => node.id), domNodes: document.querySelectorAll('*').length,
        };
      });
      pages.push({ path, status: response.status, finalUrl: response.url, bytes: Buffer.byteLength(html),
        headers: { robots: response.headers.get('x-robots-tag'), cacheControl: response.headers.get('cache-control') }, ...data });
      for (const link of data.links) {
        const url = new URL(link.href, new URL(path, base));
        if (url.origin === base.origin && safePath(url.pathname) && !visited.has(url.pathname) && !queue.includes(url.pathname)) queue.push(url.pathname);
      }
      console.log(`${response.status} ${path}: ${data.h1.length} H1, ${data.wordCount} words, ${data.images.length} images`);
    } catch (error) { failure.push({ path, message: error.message }); }
  }
  const variants = [];
  for (const path of ['/home/', '/home', '/collections', '/modeles/skorpio', '/collections/?view=desktop', '/robots.txt', '/sitemap.xml', '/seo-audit-page-that-does-not-exist/']) {
    try {
      const response = await fetch(new URL(path, base), { redirect: 'manual', signal: AbortSignal.timeout(30000) });
      const body = await response.text();
      variants.push({ path, status: response.status, location: response.headers.get('location'), robots: response.headers.get('x-robots-tag'),
        canonical: body.match(/<link\s+rel="canonical"\s+href="([^"]+)"/)?.[1] || null,
        body: path === '/robots.txt' || path === '/sitemap.xml' ? body : undefined });
    } catch (error) { failure.push({ path, message: error.message }); }
  }
  const byPath = new Map(pages.map(entry => [entry.path, entry]));
  const linkIssues = [];
  for (const entry of pages) for (const link of entry.links) {
    if (!link.href.trim() || link.href === '#' || /^javascript:/i.test(link.href)) {
      linkIssues.push({ page: entry.path, ...link, issue: 'empty or inactive target' }); continue;
    }
    const url = new URL(link.href, new URL(entry.path, base));
    if (url.origin !== base.origin || !safePath(url.pathname)) continue;
    const target = byPath.get(url.pathname);
    if (!target || target.status !== 200) linkIssues.push({ page: entry.path, ...link, issue: 'unavailable internal page' });
    else if (url.hash && !target.ids.includes(decodeURIComponent(url.hash.slice(1)))) linkIssues.push({ page: entry.path, ...link, issue: 'missing fragment' });
  }
  const groups = key => Object.entries(Object.groupBy(pages.filter(entry => entry[key]?.length), entry => JSON.stringify(entry[key])))
    .filter(([, entries]) => entries.length > 1).map(([value, entries]) => ({ value: JSON.parse(value), paths: entries.map(entry => entry.path) }));
  const report = { capturedAt: new Date().toISOString(), timezone: 'America/Toronto', base: base.href,
    method: 'Anonymous GET only; SSR DOM parsed with scripts disabled and all browser network blocked. Expected routes from seed plus discovered public navigation. No CMS reads requiring authentication, no form submission, no asset downloads.',
    expected, pages, variants, failure, linkIssues, duplicates: { titles: groups('title'), descriptions: groups('description'), h1: groups('h1') } };
  await writeFile(`${output}/report.json`, `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(`${output}/page-copy.txt`, pages.map(entry => `${entry.path}\nTitle: ${entry.title}\nDescription: ${entry.description.join(' | ')}\nH1: ${entry.h1.join(' | ')}\n${entry.mainText}\n\nMain links:\n${entry.links.filter(link => link.inMain).map(link => `${link.text} -> ${link.href}`).join('\n')}`).join('\n\n--------------------\n\n'));
  console.log(JSON.stringify({ pages: pages.length, failure, linkIssues, duplicates: report.duplicates, variants }, null, 2));
  if (failure.length || pages.some(entry => entry.status !== 200) || expected.some(path => !byPath.has(path))) process.exitCode = 1;
} finally { await context.close(); await browser.close(); }
