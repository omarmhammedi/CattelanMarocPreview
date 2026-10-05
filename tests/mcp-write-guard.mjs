/** Local-only authenticated MCP regression. Tokens stay in memory and are revoked.
 * CMS_TEST_URL=http://localhost:4331 node tests/mcp-write-guard.mjs
 */
import assert from 'node:assert/strict';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { integrationEnvironment } from './integration-environment.mjs';

const base = await integrationEnvironment();
const session = JSON.parse(await readFile('.wrangler/cms-sync-session.json', 'utf8'));
const cookie = session.cookies.filter(item => item.domain.replace(/^\./u, '') === base.hostname).map(item => `${item.name}=${item.value}`).join('; ');
assert(cookie, 'The disposable admin session is missing.');
const tokenPath = '/_emdash/api/admin/api-tokens';
const tokens = [], checks = [];
const report = { origin: base.origin, disposable: true, checks, createdTokens: 0, revokedTokens: 0, recordUnchanged: false, status: 'running' };
const note = message => { checks.push(message); console.log(`PASS ${message}`); };
const headers = { Cookie: cookie, Origin: base.origin, 'X-EmDash-Request': '1', 'Content-Type': 'application/json' };

async function admin(path, method = 'GET', body) {
  const response = await fetch(new URL(path, base), { method, headers, signal: AbortSignal.timeout(30_000), ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
  const result = await response.json();
  assert(response.ok && result.success !== false, `Disposable native admin ${method} failed (${response.status}).`);
  return result.data;
}
async function mint(scopes) {
  const result = await admin(tokenPath, 'POST', { name: `Disposable MCP guard ${Date.now()}`, scopes, expiresAt: new Date(Date.now() + 10 * 60_000).toISOString() });
  assert(typeof result.token === 'string' && result.token.startsWith('ec_pat_') && result.info?.id, 'Native API did not return the expected token shape.');
  tokens.push(result); report.createdTokens++;
  return result.token;
}
async function rpc(body, token) {
  const response = await fetch(new URL('/_emdash/api/mcp', base), { method: 'POST', signal: AbortSignal.timeout(30_000),
    headers: { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream', 'MCP-Protocol-Version': '2025-03-26', ...(token ? { Authorization: `Bearer ${token}` } : {}) }, body: JSON.stringify(body) });
  const text = await response.text();
  let value;
  if (response.headers.get('content-type')?.includes('text/event-stream')) {
    const messages = text.split(/\r?\n/u).filter(line => line.startsWith('data:')).map(line => JSON.parse(line.slice(5).trim()));
    value = messages.find(message => message.id === body.id) || messages.at(-1);
  } else value = text ? JSON.parse(text) : null;
  return { status: response.status, value };
}
const tool = (id, name, args) => ({ jsonrpc: '2.0', id, method: 'tools/call', params: { name, arguments: args } });

let target, before, failure;
try {
  before = await admin('/_emdash/api/content/pages/home');
  assert(before.item.status === 'published' && !before.item.draftRevisionId, 'Home must have no pending draft for this exclusive local test.');
  target = `/_emdash/api/content/pages/${encodeURIComponent(before.item.id)}`;
  const writeToken = await mint(['content:read', 'content:write']);
  const safeRead = tool('safe-read', 'content_get', { collection: 'pages', id: before.item.id });
  const anonymous = await rpc(safeRead);
  assert.equal(anonymous.status, 401, 'Native MCP must still require Bearer authentication.');
  note('Native MCP rejects anonymous calls before the application guard.');

  const read = await rpc(safeRead, writeToken);
  assert.equal(read.status, 200); assert.equal(read.value?.id, 'safe-read');
  assert(!read.value.result?.isError && Array.isArray(read.value.result?.content), 'Safe native content_get must work.');
  const loaded = JSON.parse(read.value.result.content.find(item => item.type === 'text').text);
  assert.equal(loaded.item.id, before.item.id); assert.equal(loaded._rev, before._rev);
  note('Authenticated native content_get still reads the expected record and revision.');

  const unsafe = tool('unsafe-slug', 'content_update', { collection: 'pages', id: before.item.id, slug: 'mcp-guard-must-not-change-home', _rev: before._rev });
  const denied = await rpc(unsafe, writeToken);
  assert.equal(denied.status, 400); assert.equal(denied.value?.id, 'unsafe-slug'); assert.equal(denied.value?.error?.code, -32602);
  assert.deepEqual(await admin(target), before, 'A rejected slug-only MCP call must not change the record or revision.');
  note('Authenticated slug-only content_update returns JSON-RPC -32602 with its request ID and leaves the record unchanged.');

  const batch = await rpc([unsafe, { ...safeRead, id: 'batch-read' }], writeToken);
  assert.equal(batch.status, 400); assert(Array.isArray(batch.value));
  assert.deepEqual(batch.value.map(message => [message.id, message.error?.code]), [['unsafe-slug', -32602], ['batch-read', -32000]]);
  assert.deepEqual(await admin(target), before, 'Rejected MCP batch must not execute a content update.');
  note('A mixed MCP batch rejects every request before execution and preserves the record.');

  const unrelatedScope = await mint(['media:read']);
  const forbidden = await rpc({ ...safeRead, id: 'wrong-scope' }, unrelatedScope);
  assert.equal(forbidden.status, 200); assert.equal(forbidden.value?.id, 'wrong-scope');
  assert.equal(forbidden.value?.result?.isError, true);
  assert.equal(forbidden.value?.result?._meta?.code, 'INSUFFICIENT_SCOPE');
  note('A valid token without content:read still receives the native INSUFFICIENT_SCOPE tool error.');
  assert.deepEqual(await admin(target), before);
  report.recordUnchanged = true;
  report.status = 'passed';
} catch (error) {
  failure = error;
  report.status = 'failed';
  // A regression must not strand the local fixture at a renamed public route.
  if (target && before) {
    const current = await admin(target);
    if (current.item.slug !== before.item.slug || current.item.status !== before.item.status) {
      const saved = await admin(target, 'PUT', { _rev: current._rev, slug: before.item.slug, data: before.item.data });
      await admin(`${target}/publish`, 'POST', { _rev: saved._rev });
      report.recoveredFixture = true;
    }
  }
} finally {
  for (const token of tokens) {
    await admin(`${tokenPath}/${encodeURIComponent(token.info.id)}`, 'DELETE');
    report.revokedTokens++;
    const rejected = await rpc(tool('revoked', 'content_get', { collection: 'pages', id: 'home' }), token.token);
    assert.equal(rejected.status, 401, 'A revoked temporary token must be rejected by native authentication.');
  }
  if (tokens.length) note('Every temporary token was revoked and rejected by native authentication afterwards.');
  const output = resolve('test-results/mcp-write-guard');
  await mkdir(output, { recursive: true });
  await writeFile(`${output}/report.json`, JSON.stringify(report, null, 2));
}
if (failure) throw failure;
