import assert from 'node:assert/strict';
import test from 'node:test';
import { contentWriteTarget, guardContentWrite, mcpWriteRefusal, protectedUpdateProblem } from '../src/lib/content-write-policy.ts';

const call = (id: string | number, args: Record<string, unknown>) => ({ jsonrpc: '2.0', id, method: 'tools/call', params: { name: 'content_update', arguments: args } });

test('protected slug-only writes are rejected but native editor, relation and sparse SEO payloads pass', () => {
  for (const collection of ['pages', 'site_content']) {
    assert.match(protectedUpdateProblem(collection, { slug: 'changed', _rev: 'r' }, 'rest')!, /brouillon/u);
    assert.match(protectedUpdateProblem(collection, { slug: null }, 'rest')!, /brouillon/u);
    assert.equal(protectedUpdateProblem(collection, { slug: 'home', data: { title: 'Home' }, _rev: 'r' }, 'rest'), null);
    assert.equal(protectedUpdateProblem(collection, { slug: 'home', data: {} }, 'rest'), null);
    assert.equal(protectedUpdateProblem(collection, { slug: 'home', references: {} }, 'rest'), null);
    assert.equal(protectedUpdateProblem(collection, { seo: { title: 'Immediate metadata' }, _rev: 'r' }, 'rest'), null);
    assert.match(protectedUpdateProblem(collection, { status: 'draft', data: {} }, 'rest')!, /statut/u);
    assert.equal(protectedUpdateProblem(collection, { status: 'draft', _rev: 'r' }, 'mcp'), null); // MCP uses native unpublish policy.
  }
  assert.equal(protectedUpdateProblem('models', { slug: 'updated-model' }, 'rest'), null);
});

test('request targeting includes encoded collection names and excludes read/create/action endpoints', () => {
  assert.deepEqual(contentWriteTarget('/_emdash/api/content/%70ages/home/', 'PUT'), { transport: 'rest', collection: 'pages' });
  assert.equal(contentWriteTarget('/_emdash/api/content/pages/home', 'GET'), null);
  assert.equal(contentWriteTarget('/_emdash/api/content/pages', 'POST'), null);
  assert.equal(contentWriteTarget('/_emdash/api/content/pages/home/publish', 'POST'), null);
  assert.equal(contentWriteTarget('/_emdash/api/mcp', 'GET'), null);
});

test('MCP rejects unsafe batch before any operation and answers each request with its ID', () => {
  const unsafe = call('rename', { collection: 'pages', id: 'home', slug: 'elsewhere', _rev: 'r' });
  const safe = call(7, { collection: 'models', id: 'chair', data: { title: 'Chair' }, _rev: 'r' });
  const refusal = mcpWriteRefusal([unsafe, safe])!;
  assert(Array.isArray(refusal.errors));
  assert.deepEqual(refusal.errors.map(error => [error.id, error.error.code]), [['rename', -32602], [7, -32000]]);
  assert.equal(mcpWriteRefusal(safe), null);
  assert.equal(mcpWriteRefusal({ jsonrpc: '2.0', id: 1, method: 'tools/list' }), null);
  const { id: _id, ...notification } = unsafe;
  assert.deepEqual(mcpWriteRefusal(notification), { errors: null });
});

test('HTTP guard preserves the original request body and returns native/JSON-RPC error shapes', async () => {
  const original = { slug: 'wrong', _rev: 'r' };
  const request = new Request('https://example.com/_emdash/api/content/pages/home?locale=fr', { method: 'PUT', body: JSON.stringify(original) });
  const refusal = await guardContentWrite(request);
  assert.equal(refusal?.status, 400);
  assert(refusal);
  const restError = await refusal.json() as { error: { code: string } };
  assert.equal(restError.error.code, 'VALIDATION_ERROR');
  assert.deepEqual(await request.json(), original);
  const rpc = await guardContentWrite(new Request('https://example.com/_emdash/api/mcp', { method: 'POST', body: JSON.stringify(call(12, { collection: 'site_content', id: 'global', slug: 'wrong' })) }));
  assert.equal(rpc?.status, 400);
  assert(rpc);
  const rpcError = await rpc.json() as { id: number };
  assert.deepEqual([rpcError.id, rpc.headers.get('cache-control')], [12, 'private, no-store']);
});

test('malformed JSON reaches the native parser; oversized body cannot bypass bounded inspection', async () => {
  assert.equal(await guardContentWrite(new Request('https://example.com/_emdash/api/content/pages/home', { method: 'PUT', body: '{' })), null);
  const tooLarge = await guardContentWrite(new Request('https://example.com/_emdash/api/mcp', { method: 'POST', body: '{}', headers: { 'content-length': String(5 * 1024 * 1024) } }));
  assert.equal(tooLarge?.status, 413);
  const streamed = await guardContentWrite(new Request('https://example.com/_emdash/api/mcp', { method: 'POST', body: ' '.repeat(4 * 1024 * 1024 + 1) }));
  assert.equal(streamed?.status, 413);
});
