import assert from 'node:assert/strict';
import test from 'node:test';
import { editorPreviewFramePolicy } from '../src/lib/editor-preview.ts';

const editorOrigin = 'https://example-codespace-123.github.dev';

test('development preview permits its editor and default or Codespaces-hosted webviews', () => {
  assert.equal(editorPreviewFramePolicy({ development: true, editorOrigin, cmsPreview: false }),
    `frame-ancestors 'self' ${editorOrigin} https://*.vscode-cdn.net https://*.vscode-webview.net`);
});

test('production and signed CMS previews never receive the editor frame allowance', () => {
  assert.equal(editorPreviewFramePolicy({ development: false, editorOrigin, cmsPreview: false }), undefined);
  assert.equal(editorPreviewFramePolicy({ development: true, editorOrigin, cmsPreview: true }), undefined);
});

test('invalid or absent editor origins cannot inject or broaden the frame policy', () => {
  for (const origin of [undefined, '', 'https://evil.test', 'https://*.github.dev',
    'http://example.github.dev', 'https://example.github.dev/extra',
    'https://example.github.dev.evil.test', "https://example.github.dev; frame-ancestors *"]) {
    assert.equal(editorPreviewFramePolicy({ development: true, editorOrigin: origin, cmsPreview: false }), undefined);
  }
});
