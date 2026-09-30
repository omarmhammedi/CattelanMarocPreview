// Integration probes against the installed Codex executable, never the user's
// server. No authentication/configuration is copied. A completed-turn fixture
// uses a deterministic localhost Responses server, never an external model.
import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { mkdtemp, rm, stat } from 'node:fs/promises';
import http from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { CodexRpc, collectSnapshot, GRACE_MS, IdleCountdown } from './task-autostop.mjs';

const available = spawnSync('codex', ['--version'], { timeout: 5000, stdio: 'ignore' }).status === 0;
const options = { skip: !available && 'Codex CLI is not installed', timeout: 20_000 };
const testServers = new WeakMap();
const allowedMethods = new Set([
  'initialize', 'thread/start', 'thread/loaded/list', 'thread/read',
  'thread/turns/list', 'thread/queue/list', 'thread/goal/get', 'server/diagnostics',
]);
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));

async function isolatedServer(t, codexHome, mockConfig = []) {
  const socket = join(codexHome, `app-server-${Date.now()}.sock`);
  const child = spawn('codex', ['app-server', '--listen', `unix://${socket}`, ...mockConfig], {
    cwd: codexHome,
    env: { PATH: process.env.PATH, CODEX_HOME: codexHome, LANG: 'C.UTF-8' },
    stdio: 'ignore',
  });
  let spawnError;
  child.once('error', error => { spawnError = error; });
  const exited = new Promise(resolve => child.once('exit', resolve));
  const native = new CodexRpc(socket);
  const rpc = {
    call(method, params = {}) {
      assert.ok(allowedMethods.has(method) || (mockConfig.length && method === 'turn/start'),
        `No unconfigured model/auth/external operation allowed: ${method}`);
      return native.call(method, params).catch(error => {
        error.message += ` on ${method}`;
        throw error;
      });
    },
    async close() {
      native.close();
      if (child.exitCode !== null || child.signalCode !== null) return;
      child.kill('SIGTERM');
      const force = setTimeout(() => child.kill('SIGKILL'), 2000);
      try { await exited; } finally { clearTimeout(force); }
    },
  };
  testServers.get(t)?.add(rpc);
  t.after(() => rpc.close());
  const deadline = Date.now() + 5000;
  while (!(await stat(socket).catch(() => null))) {
    if (spawnError) throw spawnError;
    if (child.exitCode !== null || child.signalCode !== null || Date.now() > deadline) {
      throw new Error('Isolated Codex server did not open its socket');
    }
    await delay(20);
  }
  await native.connect();
  return rpc;
}

async function disposableHome(t) {
  const directory = await mkdtemp(join(tmpdir(), 'cattelan-autostop-codex-'));
  const servers = new Set();
  testServers.set(t, servers);
  t.after(async () => {
    for (const rpc of servers) await rpc.close();
    await rm(directory, { recursive: true, force: true });
  });
  return directory;
}

test('real fresh Codex diagnostics are sparse; no task means no completion countdown', options, async t => {
  const home = await disposableHome(t);
  const rpc = await isolatedServer(t, home);
  try {
    const diagnostics = await rpc.call('server/diagnostics');
    assert.ok(Number.isInteger(diagnostics.process.id));
    assert.ok(Array.isArray(diagnostics.gauges));
    const snapshot = await collectSnapshot(rpc);
    assert.equal(snapshot.threadCount, 0);
    assert.equal(snapshot.busy, false);
    assert.equal(snapshot.completed, false);
    assert.equal(new IdleCountdown().observe(snapshot, GRACE_MS).due, false);
  } finally { await rpc.close(); }
});

test('real new idle thread does not require telemetry for activity that never happened', options, async t => {
  const home = await disposableHome(t);
  const rpc = await isolatedServer(t, home);
  try {
    const { thread } = await rpc.call('thread/start', { cwd: home, ephemeral: false });
    assert.equal(thread.status.type, 'idle');
    const known = new Set();
    const snapshot = await collectSnapshot(rpc, known);
    assert.equal(known.has(thread.id), false, 'A blank chat must not create a permanent saved dependency');
    assert.equal(snapshot.threadCount, 0);
    assert.equal(snapshot.busy, false);
    assert.equal(snapshot.completed, false);
    assert.equal(new IdleCountdown().observe(snapshot, GRACE_MS).due, false);
  } finally { await rpc.close(); }
});

test('real server restart cannot silently turn a missing known thread into completion', options, async t => {
  const home = await disposableHome(t);
  const original = await isolatedServer(t, home);
  const { thread } = await original.call('thread/start', { cwd: home, ephemeral: false });
  const known = new Set([thread.id]);
  await original.close();
  const restarted = await isolatedServer(t, home);
  try {
    assert.deepEqual((await restarted.call('thread/loaded/list')).data, []);
    // A blank thread has no saved turn/rollout yet. Keeping its observed ID is
    // conservative; a server restart is not proof that work completed.
    await assert.rejects(collectSnapshot(restarted, known));
    assert.ok(known.has(thread.id));
  } finally { await restarted.close(); }
});

async function mockResponses(t) {
  let requests = 0;
  const server = http.createServer(async (request, response) => {
    for await (const _chunk of request) { /* Drain only fixture input. */ }
    if (request.method !== 'POST' || request.url !== '/v1/responses') {
      response.writeHead(404).end();
      return;
    }
    requests++;
    const item = { id: 'msg_autostop_fixture', type: 'message', role: 'assistant',
      status: 'completed', content: [{ type: 'output_text', text: 'Fixture complete.', annotations: [] }] };
    const result = { id: 'resp_autostop_fixture', object: 'response', created_at: Math.floor(Date.now() / 1000),
      status: 'completed', output: [item], usage: { input_tokens: 1, output_tokens: 1, total_tokens: 2 } };
    const events = [
      { type: 'response.created', response: { ...result, status: 'in_progress', output: [] } },
      { type: 'response.output_item.added', output_index: 0, item: { ...item, status: 'in_progress', content: [] } },
      { type: 'response.output_text.delta', item_id: item.id, output_index: 0, content_index: 0, delta: 'Fixture complete.' },
      { type: 'response.output_item.done', output_index: 0, item },
      { type: 'response.completed', response: result },
    ];
    response.writeHead(200, { 'Content-Type': 'text/event-stream' });
    for (const event of events) response.write(`event: ${event.type}\ndata: ${JSON.stringify(event)}\n\n`);
    response.end();
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise(resolve => { server.closeAllConnections(); server.close(resolve); }));
  const port = server.address().port;
  return {
    config: [
      '-c', 'model_provider="autostop_fixture"', '-c', 'model="autostop-fixture-model"',
      '-c', 'model_providers.autostop_fixture.name="Local deterministic fixture"',
      '-c', `model_providers.autostop_fixture.base_url="http://127.0.0.1:${port}/v1"`,
      '-c', 'model_providers.autostop_fixture.wire_api="responses"',
      '-c', 'model_providers.autostop_fixture.requires_openai_auth=false',
    ],
    requests: () => requests,
  };
}

test('real completed thread remains observable after server restart without resuming it', options, async t => {
  const home = await disposableHome(t);
  const mock = await mockResponses(t);
  const original = await isolatedServer(t, home, mock.config);
  const { thread } = await original.call('thread/start', { cwd: home, ephemeral: false });
  await original.call('turn/start', {
    threadId: thread.id,
    input: [{ type: 'text', text: 'Return the deterministic local fixture.', text_elements: [] }],
  });
  const deadline = Date.now() + 8000;
  let turns;
  do {
    // During initial materialization Codex can briefly reject list_turns.
    // Only fixture preparation retries; post-restart assertions must succeed.
    turns = await original.call('thread/turns/list', {
      threadId: thread.id, limit: 1, sortDirection: 'desc', itemsView: 'notLoaded',
    }).catch(() => null);
    if (turns?.data[0]?.status === 'completed') break;
    assert.notEqual(turns?.data[0]?.status, 'failed', 'Deterministic localhost fixture failed');
    assert.ok(Date.now() < deadline, 'Local fixture turn did not complete');
    await delay(20);
  } while (true);
  assert.equal(mock.requests(), 1, 'Exactly one localhost request, no real model service');
  const known = new Set([thread.id]);
  await original.close();
  const restarted = await isolatedServer(t, home, mock.config);
  try {
    assert.deepEqual((await restarted.call('thread/loaded/list')).data, []);
    const snapshot = await collectSnapshot(restarted, known);
    assert.equal(snapshot.threadCount, 1);
    assert.equal(snapshot.busy, false);
    assert.equal(snapshot.completed, true);
    const countdown = new IdleCountdown();
    assert.equal(countdown.observe(snapshot, 0).due, false);
    assert.equal(countdown.observe(snapshot, GRACE_MS).due, true);
    assert.deepEqual((await restarted.call('thread/loaded/list')).data, [], 'Metadata reads never resume work');
    assert.equal(mock.requests(), 1, 'Restart/inspection cannot invoke the local model again');
  } finally { await restarted.close(); }
});
