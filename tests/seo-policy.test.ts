import assert from 'node:assert/strict';
import test from 'node:test';
import { canonicalPublicPath, canonicalPublicResponse, resolvePageTitle, robotsText, sitemapLocation } from '../src/lib/seo-policy.ts';
import { modelSeoTitle } from '../src/lib/model-seo.ts';
import { runWithContext } from 'emdash';
import { createPublicPageContext } from 'emdash/page';
import { rememberRenderedSeo, renderedNativeCanonical } from '../src/lib/seo-render-context.ts';

test('native SEO titles stay exact while generated titles honor the separator', () => {
  assert.equal(resolvePageTitle({ title: 'Tables', nativeTitle: 'Un titre choisi', siteTitle: 'Cattelan', separator: ' | ' }), 'Un titre choisi');
  assert.equal(resolvePageTitle({ title: 'Tables', siteTitle: 'Cattelan', separator: ' | ' }), 'Tables | Cattelan');
  assert.equal(resolvePageTitle({ title: 'Tables · Cattelan', siteTitle: 'Cattelan', separator: ' | ' }), 'Tables · Cattelan');
  assert.equal(modelSeoTitle('Skorpio', 'skorpio', 'tables', ' — ', 'Cattelan Maroc'), 'Skorpio — Table Cattelan Italia — Cattelan Maroc');
});

test('preview robots cannot be opened by a custom setting', () => {
  assert.equal(robotsText(false, 'https://example.com', 'User-agent: *\nAllow: /'), 'User-agent: *\nDisallow: /\n');
});

test('native custom robots groups keep rules and the public media exception', () => {
  const text = robotsText(true, 'https://example.com/', 'User-agent: ExampleBot\nDisallow: /restricted/\n\nUser-agent: *\nAllow: /\nAllow: /_emdash/admin/settings$\nCrawl-delay: 2');
  assert.match(text, /Disallow: \/restricted\//u);
  assert.match(text, /Crawl-delay: 2/u);
  assert.equal(text.match(/Disallow: \/preview\//gu)?.length, 2);
  assert.equal(text.match(/Allow: \/_emdash\/api\/media\/file\//gu)?.length, 2);
  assert.doesNotMatch(text, /Allow: \/_emdash\/admin/u);
  assert.match(text, /Sitemap: https:\/\/example.com\/sitemap.xml/u);
});

test('a bot-specific custom robots file still provides wildcard protections', () => {
  const text = robotsText(true, 'https://example.com', 'User-agent: ExampleBot\nDisallow: /');
  assert.match(text, /User-agent: \*/u);
  assert.equal(text.match(/Disallow: \/_emdash\//gu)?.length, 2);
});

test('sitemap excludes aliases, external canonicals, query variants and noindex pages', () => {
  const url = 'https://example.com/modeles/skorpio/';
  assert.equal(sitemapLocation('/modeles/skorpio/', 'https://example.com'), url);
  assert.equal(sitemapLocation('/modeles/skorpio/', 'https://example.com', { canonical: url }), url);
  assert.equal(sitemapLocation('/modeles/skorpio/', 'https://example.com', { canonical: 'modeles/skorpio/' }), url);
  assert.equal(sitemapLocation('/modeles/skorpio/', 'https://example.com', { canonical: '/modeles/other/' }), null);
  assert.equal(sitemapLocation('/modeles/skorpio/', 'https://example.com', { canonical: 'https://other.example/modeles/skorpio/' }), null);
  assert.equal(sitemapLocation('/modeles/skorpio/', 'https://example.com', { canonical: `${url}?variant=1` }), null);
  assert.equal(sitemapLocation('/modeles/skorpio/', 'https://example.com', { noIndex: true }), null);
});

// Canonical redirects are deliberately separate from Astro's global slash
// setting: EmDash has extensionless write endpoints and signed preview URLs.

const html = (status = 200) => new Response('<h1>Public content</h1>', {
  status, headers: { 'Content-Type': 'text/html; charset=utf-8', 'X-Robots-Tag': 'noindex, nofollow', 'Cache-Control': 'no-store', 'Content-Length': '23', 'ETag': '"body-tag"' },
});

test('public defaults use the same slashed paths as internal links and the sitemap', () => {
  for (const path of ['/collections', '/showroom-casablanca', '/catalogue', '/journal', '/sur-mesure', '/professionnels', '/a-propos', '/votre-projet', '/faq', '/mentions-legales', '/confidentialite', '/collections/tables', '/modeles/skorpio', '/journal/choisir-une-table']) {
    const canonical = canonicalPublicPath(path);
    assert.equal(canonical, `${path}/`, path);
    assert.equal(canonicalPublicPath(canonical), canonical, 'Normalization is idempotent');
    assert.equal(sitemapLocation(canonical, 'https://example.com'), `https://example.com${canonical}`);
  }
  assert.equal(canonicalPublicPath('/'), '/');
});

test('GET and HEAD redirect only successful public HTML, retaining queries and preview exclusion headers', async () => {
  for (const method of ['GET', 'HEAD']) {
    const request = new Request('https://example.com/modeles/skorpio?view=desktop&utm_source=journal', { method });
    const result = canonicalPublicResponse(request, html());
    assert.equal(result.status, 301);
    assert.equal(result.headers.get('Location'), '/modeles/skorpio/?view=desktop&utm_source=journal');
    assert.equal(result.headers.get('X-Robots-Tag'), 'noindex, nofollow');
    assert.equal(result.headers.get('Cache-Control'), 'no-store');
    assert.equal(result.headers.get('Content-Length'), null);
    assert.equal(result.headers.get('ETag'), null);
    assert.equal(await result.text(), '');
  }
});

test('write methods retain their body and response without slash redirects', async () => {
  for (const method of ['POST', 'PUT', 'PATCH', 'DELETE']) {
    const request = new Request('https://example.com/collections', { method, body: 'draft=keep' });
    const response = html();
    assert.equal(canonicalPublicResponse(request, response), response);
    assert.equal(await request.text(), 'draft=keep');
  }
});

test('private routes, signed previews, non-HTML, errors and native redirects are preserved', () => {
  for (const path of ['/_emdash/api/content/pages', '/_emdash/admin', '/_image', '/cartographie/casablanca.json', '/preview/models/entry', '/robots.txt', '/sitemap.xml', '/llms.txt', '/unknown', '/modeles', '/modeles/a/b', '/collections/tables/', '/modeles/%2F', '/modeles/skorpio?_preview=signed-token']) {
    const response = html();
    assert.equal(canonicalPublicResponse(new Request(`https://example.com${path}`), response), response, path);
  }
  for (const status of [301, 302, 401, 403, 404, 500]) {
    const response = html(status);
    assert.equal(canonicalPublicResponse(new Request('https://example.com/modeles/missing'), response), response, String(status));
  }
  const json = new Response('{}', { headers: { 'Content-Type': 'application/json' } });
  assert.equal(canonicalPublicResponse(new Request('https://example.com/catalogue'), json), json);
});


test('a rendered native canonical bypasses automatic slash redirects, including pages without schema projection', async () => {
  const request = new Request('https://example.com/collections?view=desktop');
  const page = createPublicPageContext({ url: request.url, kind: 'content', content: { collection: 'pages', id: 'collections', slug: 'collections' } });
  for (const canonical of ['/collections', 'collections', 'https://example.com/collections', '/another-page/', 'https://other.example/collections/']) {
    await runWithContext({ editMode: false }, async () => {
      // Same hand-off as SeoHead, including a page with no custom JSON-LD.
      rememberRenderedSeo(page, undefined, undefined, canonical);
      const response = html();
      assert.equal(canonicalPublicResponse(request, response, renderedNativeCanonical(request.url)), response, canonical);
      assert.equal(renderedNativeCanonical('https://example.com/faq'), undefined, 'A second page cannot inherit the override');
      rememberRenderedSeo(page, undefined, undefined, '');
      assert.equal(canonicalPublicResponse(request, html(), renderedNativeCanonical(request.url)).status, 301, 'Clearing the native canonical restores the default redirect');
    });
  }
  assert.equal(renderedNativeCanonical(request.url), undefined, 'The canonical cannot escape its request');
});

test('simultaneous responses cannot inherit another request’s native canonical', async () => {
  const request = new Request('https://example.com/collections');
  const page = createPublicPageContext({ url: request.url, kind: 'custom' });
  let release: () => void = () => {};
  const ready = new Promise<void>(resolve => { release = resolve; });
  await Promise.all([
    runWithContext({ editMode: false }, async () => {
      rememberRenderedSeo(page, undefined, undefined, '/collections');
      await ready;
      const response = html();
      assert.equal(canonicalPublicResponse(request, response, renderedNativeCanonical(request.url)), response);
    }),
    runWithContext({ editMode: false }, async () => {
      assert.equal(renderedNativeCanonical(request.url), undefined);
      release();
      assert.equal(canonicalPublicResponse(request, html(), renderedNativeCanonical(request.url)).status, 301);
    }),
  ]);
});
