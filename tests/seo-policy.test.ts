import assert from 'node:assert/strict';
import test from 'node:test';
import { resolvePageTitle, robotsText, sitemapLocation } from '../src/lib/seo-policy.ts';
import { modelSeoTitle } from '../src/lib/model-seo.ts';

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
