import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import http from 'node:http';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { WebSocketServer } from 'ws';
import { CodexRpc, GRACE_MS, IdleCountdown, checkAndStop, collectSnapshot, decodeRpcError } from './task-autostop.mjs';

const counters = ['core.turns.active', 'core.mailbox.pending', 'app.requests.queued', 'app.server_requests.pending'];
const idle = (fingerprint = 'completed-task') => ({ busy: false, completed: true, fingerprint });
const done = (overrides = {}) => ({
  state: 'idle', updatedAt: 100, turn: { id: 'turn-1', status: 'completed', completedAt: 100 },
  queue: [], queueCursor: null, goal: null, ...overrides,
});

function fakeRpc({ rows = { root: done() }, loaded = Object.keys(rows), pages, pid = 123, gauges = {}, intercept } = {}) {
  const calls = [];
  return {
    calls,
    async call(method, params = {}) {
      calls.push({ method, params });
      if (intercept) {
        const response = await intercept(method, params, calls);
        if (response !== undefined) return response;
      }
      const row = rows[params.threadId];
      switch (method) {
        case 'thread/loaded/list': return pages ? pages[params.cursor ?? 'first'] : { data: loaded, nextCursor: null };
        case 'thread/read': return { thread: { id: params.threadId, status: { type: row.state }, updatedAt: row.updatedAt } };
        case 'thread/turns/list': return { data: row.turn ? [row.turn] : [], nextCursor: null };
        case 'thread/queue/list': return { data: row.queue, nextCursor: row.queueCursor };
        case 'thread/goal/get': return { goal: row.goal };
        case 'server/diagnostics': return {
          process: { id: pid },
          gauges: counters.filter(name => gauges[name] !== null).map(name => ({ name, value: gauges[name] ?? 0 })),
        };
        default: throw new Error(`Unexpected method: ${method}`);
      }
    },
  };
}

test('the full 15-minute grace starts only after confirmed completion', () => {
  assert.equal(GRACE_MS, 15 * 60 * 1000);
  const countdown = new IdleCountdown();
  assert.equal(countdown.observe({ busy: true, completed: false }, 0).phase, 'waiting');
  assert.equal(countdown.observe({ busy: true, completed: false }, GRACE_MS * 5).due, false);
  const completedAt = GRACE_MS * 6;
  assert.equal(countdown.observe(idle(), completedAt).remainingMs, GRACE_MS);
  assert.equal(countdown.observe(idle(), completedAt + GRACE_MS - 1).due, false);
  assert.equal(countdown.observe(idle(), completedAt + GRACE_MS).due, true);
});

test('activity, uncertainty, reset, and a backwards clock require a fresh grace', () => {
  for (const uncertain of [null, { busy: true, completed: true }, { busy: false, completed: false }]) {
    const countdown = new IdleCountdown();
    countdown.observe(idle(), 0);
    assert.equal(countdown.observe(uncertain, GRACE_MS - 1).phase, 'waiting');
    assert.equal(countdown.observe(idle(), GRACE_MS).remainingMs, GRACE_MS);
  }
  const countdown = new IdleCountdown();
  countdown.observe(idle(), 100);
  assert.equal(countdown.observe(idle(), 99).remainingMs, GRACE_MS);
  countdown.reset();
  assert.equal(countdown.observe(idle(), GRACE_MS * 2).remainingMs, GRACE_MS);
});

test('snapshot requests only lifecycle metadata, and paginates all loaded threads', async () => {
  const rpc = fakeRpc({
    rows: { root: done(), child: done() },
    pages: { first: { data: ['root'], nextCursor: 'page-2' }, 'page-2': { data: ['child'], nextCursor: null } },
  });
  const snapshot = await collectSnapshot(rpc);
  assert.equal(snapshot.threadCount, 2);
  assert.equal(snapshot.completed, true);
  assert.equal(snapshot.busy, false);
  assert.equal(rpc.calls.filter(call => call.method === 'thread/loaded/list').length, 4);
  for (const call of rpc.calls) {
    if (call.method === 'thread/read') assert.equal(call.params.includeTurns, false);
    if (call.method === 'thread/turns/list') assert.deepEqual(call.params, {
      threadId: call.params.threadId, limit: 1, sortDirection: 'desc', itemsView: 'notLoaded',
    });
  }
});

test('running, queued, and goal work blocks shutdown, including a subagent', async t => {
  const cases = {
    'active thread': done({ state: 'active' }),
    'in-progress turn': done({ turn: { id: 'turn-2', status: 'inProgress', completedAt: null } }),
    'queued input': done({ queue: [{ id: 'next-message' }] }),
    'another queue page': done({ queueCursor: 'more' }),
    'active goal': done({ goal: { status: 'active', updatedAt: 100 } }),
  };
  for (const [label, child] of Object.entries(cases)) {
    await t.test(label, async () => {
      const snapshot = await collectSnapshot(fakeRpc({ rows: { root: done(), child } }));
      assert.equal(snapshot.busy, true);
      assert.equal(new IdleCountdown().observe(snapshot, 0).phase, 'waiting');
    });
  }
  for (const name of counters) {
    await t.test(name, async () => {
      assert.equal((await collectSnapshot(fakeRpc({ gauges: { [name]: 1 } }))).busy, true);
    });
  }
});

test('an empty server has no completion proof; terminal failed or interrupted attempts can become idle', async () => {
  const empty = await collectSnapshot(fakeRpc({ rows: {} }));
  assert.equal(empty.completed, false);
  assert.equal(new IdleCountdown().observe(empty, GRACE_MS).phase, 'waiting');
  for (const status of ['failed', 'interrupted']) {
    const snapshot = await collectSnapshot(fakeRpc({ rows: {
      root: done(), child: done({ turn: { id: 'unfinished', status, completedAt: 100 } }),
    } }));
    assert.equal(snapshot.busy, false);
    const countdown = new IdleCountdown();
    assert.equal(countdown.observe(snapshot, 0).due, false);
    assert.equal(countdown.observe(snapshot, GRACE_MS).due, true);
  }
});

test('unloading a previously observed unfinished thread does not imply completion', async () => {
  const known = new Set();
  const child = done({ state: 'active', turn: { id: 'child-turn', status: 'inProgress', completedAt: null } });
  await collectSnapshot(fakeRpc({ rows: { root: done(), child } }), known);
  assert.deepEqual([...known].sort(), ['child', 'root']);
  const snapshot = await collectSnapshot(fakeRpc({
    rows: { root: done(), child: { ...child, state: 'notLoaded' } }, loaded: ['root'],
  }), known);
  assert.equal(snapshot.threadCount, 2);
  assert.equal(snapshot.busy, true);
  assert.equal(new IdleCountdown().observe(snapshot, GRACE_MS).due, false);
});

test('a rapid new completed task between polls resets the entire countdown', async () => {
  const first = await collectSnapshot(fakeRpc());
  const next = await collectSnapshot(fakeRpc({ rows: {
    root: done({ turn: { id: 'turn-2', status: 'completed', completedAt: 101 } }),
  } }));
  const countdown = new IdleCountdown();
  countdown.observe(first, 0);
  assert.notEqual(first.fingerprint, next.fingerprint);
  assert.equal(countdown.observe(next, GRACE_MS - 1).remainingMs, GRACE_MS);
});

test('a settings refresh nine minutes after completion preserves the shutdown deadline', async () => {
  const first = await collectSnapshot(fakeRpc());
  const settingsRefresh = await collectSnapshot(fakeRpc({ rows: {
    root: done({ updatedAt: 100 + 9 * 60 }),
  } }));
  assert.equal(settingsRefresh.fingerprint, first.fingerprint);
  const countdown = new IdleCountdown();
  assert.equal(countdown.observe(first, 0).resetReason, 'completed-work-observed');
  const afterRefresh = countdown.observe(settingsRefresh, 9 * 60 * 1000);
  assert.equal(afterRefresh.remainingMs, 6 * 60 * 1000);
  assert.equal(afterRefresh.resetReason, null);
  assert.equal(countdown.observe(settingsRefresh, GRACE_MS).due, true);
});

test('inactive goal metadata changes preserve the shutdown deadline', async () => {
  for (const status of ['paused', 'blocked', 'usageLimited', 'budgetLimited', 'complete']) {
    const first = await collectSnapshot(fakeRpc({ rows: {
      root: done({ goal: { id: 'goal-1', status, updatedAt: 100 } }),
    } }));
    const metadataRefresh = await collectSnapshot(fakeRpc({ rows: {
      root: done({ goal: { id: 'goal-1', status, updatedAt: 101 } }),
    } }));
    assert.equal(metadataRefresh.fingerprint, first.fingerprint, status);
    const countdown = new IdleCountdown();
    countdown.observe(first, 0);
    const afterRefresh = countdown.observe(metadataRefresh, GRACE_MS);
    assert.equal(afterRefresh.due, true, status);
    assert.equal(afterRefresh.resetReason, null, status);
  }
});

test('a new server PID cannot inherit the previous server countdown', async () => {
  const countdown = new IdleCountdown();
  countdown.observe(await collectSnapshot(fakeRpc({ pid: 100 })), 0);
  const restarted = await collectSnapshot(fakeRpc({ pid: 101 }));
  assert.equal(countdown.observe(restarted, GRACE_MS).remainingMs, GRACE_MS);
});

test('a fresh server with sparse telemetry still stops after verified completion and the full grace', async () => {
  const rpc = fakeRpc({ gauges: Object.fromEntries(counters.map(name => [name, null])) });
  const snapshot = await collectSnapshot(rpc);
  assert.equal(snapshot.busy, false);
  assert.equal(snapshot.completed, true);
  const countdown = new IdleCountdown();
  let time = 0, stops = 0, freshReads = 0;
  const options = {
    countdown, snapshot, now: () => time,
    readFresh: async () => { freshReads++; return collectSnapshot(rpc); },
    stop: async () => { stops++; },
  };
  assert.equal((await checkAndStop(options)).remainingMs, GRACE_MS);
  time = GRACE_MS - 1;
  assert.equal((await checkAndStop(options)).stopped, false);
  assert.equal(stops, 0);
  time = GRACE_MS;
  assert.equal((await checkAndStop(options)).stopped, true);
  assert.equal(freshReads, 1);
  assert.equal(stops, 1);
});

test('malformed, unsupported, missing, and changing state fails closed', async t => {
  const cases = {
    'system error': fakeRpc({ rows: { root: done({ state: 'systemError' }) } }),
    'unknown thread state': fakeRpc({ rows: { root: done({ state: 'newProtocolState' }) } }),
    'unknown turn state': fakeRpc({ rows: { root: done({ turn: { id: 'x', status: 'unknown' } }) } }),
    'missing completion timestamp': fakeRpc({ rows: { root: done({ turn: { id: 'x', status: 'completed' } }) } }),
    'unknown goal status': fakeRpc({ rows: { root: done({ goal: { status: 'unknown' } }) } }),
    'missing gauges array': fakeRpc({ intercept: method => method === 'server/diagnostics' ? { process: { id: 123 } } : undefined }),
    'invalid gauges array': fakeRpc({ intercept: method => method === 'server/diagnostics' ? { process: { id: 123 }, gauges: [null] } : undefined }),
    'negative activity gauge': fakeRpc({ gauges: { 'core.turns.active': -1 } }),
    'invalid activity gauge': fakeRpc({ gauges: { 'core.turns.active': '0' } }),
    'negative mailbox gauge': fakeRpc({ gauges: { 'core.mailbox.pending': -1 } }),
    'string mailbox gauge': fakeRpc({ gauges: { 'core.mailbox.pending': '0' } }),
    'non-finite mailbox gauge': fakeRpc({ gauges: { 'core.mailbox.pending': Infinity } }),
    'invalid mailbox gauge': fakeRpc({ gauges: { 'core.mailbox.pending': NaN } }),
    'present null mailbox gauge': fakeRpc({ intercept: method => {
      if (method === 'server/diagnostics') return {
        process: { id: 123 },
        gauges: counters.map(name => ({ name, value: name === 'core.mailbox.pending' ? null : 0 })),
      };
    } }),
    'missing server PID': fakeRpc({ pid: null }),
    'protocol failure': fakeRpc({ intercept: method => { if (method === 'thread/read') throw new Error('RPC failed'); } }),
    'thread disappears during inspection': fakeRpc({ intercept: (method, params, calls) => {
      if (method === 'thread/loaded/list' && calls.filter(call => call.method === method).length > 1) return { data: [], nextCursor: null };
    } }),
    'repeated pagination cursor': fakeRpc({ pages: {
      first: { data: ['root'], nextCursor: 'loop' }, loop: { data: ['root'], nextCursor: 'loop' },
    } }),
  };
  for (const [label, rpc] of Object.entries(cases)) await t.test(label, () => assert.rejects(collectSnapshot(rpc)));
});

test('a healthy blank chat does not become a persisted task or restart an existing deadline', async () => {
  const known = new Set();
  const first = await collectSnapshot(fakeRpc(), known);
  const rpc = fakeRpc({ rows: { root: done(), blank: done({ turn: null }) }, intercept: (method, params) => {
    if (method === 'thread/turns/list' && params.threadId === 'blank') {
      throw decodeRpcError({ code: -32600, message: 'thread is not materialized yet; unavailable before first user message' });
    }
  } });
  const after = await collectSnapshot(rpc, known);
  assert.deepEqual([...known], ['root']);
  assert.equal(after.fingerprint, first.fingerprint);
  assert.equal(after.busy, false);
});

test('only the precise native unmaterialized-thread error is recognized', () => {
  assert.equal(decodeRpcError({ code: -32600, message: 'not materialized yet; unavailable before first user message' }).code, 'THREAD_UNMATERIALIZED');
  for (const error of [
    { code: -32601, message: 'not materialized yet; unavailable before first user message' },
    { code: -32600, message: 'unsupported method' },
    { code: -32600, message: 'not materialized yet' },
  ]) assert.equal(decodeRpcError(error).code, undefined);
});

test('stop is called only after the deadline and a second successful fresh check', async () => {
  const countdown = new IdleCountdown();
  let time = 0, reads = 0, stops = 0;
  const options = { countdown, snapshot: idle(), now: () => time,
    readFresh: async () => { reads++; return idle(); }, stop: async () => { stops++; } };
  assert.equal((await checkAndStop(options)).stopped, false);
  assert.equal(reads, 0);
  time = GRACE_MS - 1;
  assert.equal((await checkAndStop(options)).stopped, false);
  assert.equal(stops, 0);
  time = GRACE_MS;
  assert.equal((await checkAndStop(options)).stopped, true);
  assert.equal(reads, 1);
  assert.equal(stops, 1);
});

test('a new active or completed task at the final recheck prevents stop', async () => {
  for (const fresh of [{ busy: true, completed: true, fingerprint: 'new-active' }, idle('new-completed')]) {
    const countdown = new IdleCountdown();
    countdown.observe(idle(), 0);
    let stops = 0;
    const result = await checkAndStop({ countdown, snapshot: idle(), now: () => GRACE_MS,
      readFresh: async () => fresh, stop: async () => { stops++; } });
    assert.equal(result.stopped, false);
    assert.equal(stops, 0);
    assert.equal(countdown.observe(idle('later-completed'), GRACE_MS + 1).remainingMs, GRACE_MS);
  }
});

test('a metadata-only refresh at the final recheck still permits shutdown', async () => {
  const first = await collectSnapshot(fakeRpc({ rows: {
    root: done({ goal: { id: 'goal-1', status: 'complete', updatedAt: 100 } }),
  } }));
  const fresh = await collectSnapshot(fakeRpc({ rows: {
    root: done({ updatedAt: 101, goal: { id: 'goal-1', status: 'complete', updatedAt: 101 } }),
  } }));
  const countdown = new IdleCountdown();
  countdown.observe(first, 0);
  let stops = 0;
  const result = await checkAndStop({ countdown, snapshot: first, now: () => GRACE_MS,
    readFresh: async () => fresh, stop: async () => { stops++; } });
  assert.equal(result.stopped, true);
  assert.equal(stops, 1);
});

test('final-check failure never stops and requires a new full grace', async () => {
  const countdown = new IdleCountdown();
  countdown.observe(idle(), 0);
  let stops = 0;
  await assert.rejects(checkAndStop({ countdown, snapshot: idle(), now: () => GRACE_MS,
    readFresh: async () => { throw new Error('Codex disconnected'); }, stop: async () => { stops++; } }));
  assert.equal(stops, 0);
  assert.equal(countdown.observe(idle(), GRACE_MS + 1).remainingMs, GRACE_MS);
});

async function localRpcServer(t, respond) {
  const dir = await mkdtemp(join(tmpdir(), 'cattelan-autostop-test-'));
  const socket = join(dir, 'rpc.sock');
  const server = http.createServer();
  const websocket = new WebSocketServer({ server });
  websocket.on('connection', peer => peer.on('message', bytes => {
    const message = JSON.parse(bytes.toString());
    if (message.method === 'initialize') peer.send(JSON.stringify({ id: message.id, result: {} }));
    else if (message.id !== undefined) respond(peer, message);
  }));
  await new Promise(resolve => server.listen(socket, resolve));
  const rpc = new CodexRpc(socket);
  t.after(async () => {
    rpc.close();
    for (const peer of websocket.clients) peer.terminate();
    await new Promise(resolve => websocket.close(resolve));
    await new Promise(resolve => server.close(resolve));
    await rm(dir, { recursive: true, force: true });
  });
  await rpc.connect();
  return rpc;
}

test('CodexRpc reads through Unix WebSocket transport without starting another Codex server', async t => {
  const rpc = await localRpcServer(t, (peer, request) => {
    assert.equal(request.method, 'thread/loaded/list');
    peer.send(JSON.stringify({ id: request.id, result: { data: ['fixture-thread'], nextCursor: null } }));
  });
  assert.deepEqual(await rpc.call('thread/loaded/list'), { data: ['fixture-thread'], nextCursor: null });
});

test('CodexRpc rejects server errors, malformed data, and lost connections', async t => {
  await t.test('server rejects request', async t => {
    const rpc = await localRpcServer(t, (peer, request) => peer.send(JSON.stringify({ id: request.id, error: { code: -32600, message: 'unsupported' } })));
    await assert.rejects(rpc.call('thread/loaded/list'), /rejected/);
  });
  await t.test('malformed response closes connection', async t => {
    const rpc = await localRpcServer(t, peer => peer.send('not JSON'));
    await assert.rejects(rpc.call('thread/loaded/list'), /connection lost/);
  });
  await t.test('non-object JSON closes connection safely', async t => {
    const rpc = await localRpcServer(t, peer => peer.send('null'));
    await assert.rejects(rpc.call('thread/loaded/list'), /connection lost/);
  });
  await t.test('disconnect rejects pending and future calls', async t => {
    const rpc = await localRpcServer(t, peer => peer.terminate());
    await assert.rejects(rpc.call('thread/loaded/list'), /connection lost/);
    await assert.rejects(rpc.call('thread/loaded/list'), /unavailable/);
  });
});
