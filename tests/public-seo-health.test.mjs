import assert from 'node:assert/strict';
import test from 'node:test';
import { checkPage, checkRobots } from '../scripts/check-public-seo.mjs';

const body = `<html><head><title>Une page éditée</title><meta name="description" content="Description actuelle du CMS">
<link rel="canonical" href="https://example.com/une-url-choisie/">
<meta name="robots" content="noindex, nofollow"><meta property="og:image" content="https://example.com/photographie.jpg">
<script type="application/ld+json">{"@type":"WebPage","name":"Une page éditée"}</script></head><body><h1>Un titre visible</h1></body></html>`;
const response = { status: 200, headers: { 'content-type': 'text/html; charset=utf-8', 'x-robots-tag': 'noindex, nofollow' }, body };

test('deployment check accepts editorial titles/canonicals but catches accidental preview indexing', () => {
  assert.equal(checkPage(response, '/faq/', { image: true }).canonical, 'https://example.com/une-url-choisie/');
  assert.throws(() => checkPage({ ...response, headers: { 'content-type': 'text/html' } }, '/faq/'), /preview header/);
  assert.throws(() => checkPage({ ...response, body: body.replace('content="noindex, nofollow"', 'content="index, follow"') }, '/faq/'), /preview HTML/);
  assert.throws(() => checkRobots('User-agent: *\nDisallow: /\nAllow: /_emdash/\n'), /must not expose/);
  assert.throws(() => checkRobots('User-agent: *\nDisallow: /admin/\n'), /must remain closed/);
});

test('deployment check detects broken metadata or graph output, including HTTP-200 error pages', () => {
  assert.throws(() => checkPage({ ...response, body: '<html><title>Error</title><h1>Service unavailable</h1></html>' }, '/faq/'), /description/);
  assert.throws(() => checkPage({ ...response, body: body.replace('https://example.com/photographie.jpg', '/photographie.jpg') }, '/faq/', { image: true }), /sharing image/);
  assert.throws(() => checkPage({ ...response, body: body.replace('"@type":"WebPage"', '"@type":') }, '/faq/'), SyntaxError);
  assert.throws(() => checkPage({ ...response, body: body.replace('</head>', '<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Albert+Sans"></head>') }, '/faq/'), /Google Fonts/);
});
