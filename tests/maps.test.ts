import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeGoogleMapsEmbedUrl } from '../src/lib/maps.ts';

const source = 'https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d5270.840575588588!2d-7.6452543873414465!3d33.592700673222254!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0xda7d35811c87c9d%3A0x7c101e085d74e95e!2sCattelan%20Italia!5e1!3m2!1sen!2sca!4v1790641981144!5m2!1sen!2sca';

test('preserves the supplied Google Maps embed and accepts whitespace around the URL', () => {
  assert.equal(normalizeGoogleMapsEmbedUrl(source), source);
  assert.equal(normalizeGoogleMapsEmbedUrl(`  ${source}  `), source);
});

test('rejects raw HTML, executable URLs and unexpected origins or endpoints', () => {
  for (const value of [undefined, null, {}, '', `<iframe src="${source}"></iframe>`,
    'javascript:alert(1)', '//www.google.com/maps/embed?pb=!1m18',
    source.replace('https:', 'http:'), source.replace('www.google.com', 'evil.test'),
    source.replace('www.google.com', 'www.google.com.evil.test'),
    source.replace('www.google.com', 'evil.test@www.google.com'),
    source.replace('www.google.com', 'www.google.com:8443'),
    source.replace('/maps/embed?', '/maps?'), source.replace('/maps/embed?', '/maps/embed/v1/place?'),
    source.replace('google.com', 'goo\ngle.com')]) {
    assert.equal(normalizeGoogleMapsEmbedUrl(value), '', String(value));
  }
});

test('rejects missing, repeated or unexpected embed parameters and fragments', () => {
  for (const value of ['https://www.google.com/maps/embed', 'https://www.google.com/maps/embed?pb=',
    'https://www.google.com/maps/embed?pb=!', 'https://www.google.com/maps/embed?pb=arbitrary',
    `${source}&pb=!1m18`, `${source}&unexpected=true`, `${source}#fragment`]) {
    assert.equal(normalizeGoogleMapsEmbedUrl(value), '', value);
  }
});
