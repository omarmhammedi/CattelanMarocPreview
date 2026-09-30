import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';
import { promisify } from 'node:util';
import { GRACE_MS, runMonitor } from './task-autostop.mjs';

const execute = promisify(execFile);
const WALL_START = Date.parse('2026-09-28T12:00:00Z');
const completed = (overrides = {}) => ({
  state: 'idle', turn: { id: 'turn-1', status: 'completed', completedAt: 100 },
  queue: [], goal: null, ...overrides,
});
const unfinished = () => completed({
  state: 'active', turn: { id: 'turn-2', status: 'inProgress', completedAt: null },
});

async function isolatedState(t) {
  const path = await mkdtemp(join(tmpdir(), 'cattelan-autostop-lifecycle-'));
  t.after(() => rm(path, { recursive: true, force: true }));
  return path;
}

function server(rows = { root: completed() }) {
  return { rows, loaded: Object.keys(rows), pid: 123, reads: [], connections: 0, failNext: null };
}

function connectTo(model) {
  model.connections++;
  return {
    close() {},
    async call(method, params = {}) {
      if (model.failNext === method) {
        model.failNext = null;
        throw new Error('Simulated RPC disconnection');
      }
      model.beforeCall?.(method, params);
      const row = model.rows[params.threadId];
      switch (method) {
        case 'thread/loaded/list': return { data: [...model.loaded], nextCursor: null };
        case 'thread/read':
          model.reads.push(params.threadId);
          assert.ok(row, `Unexpected thread ${params.threadId}`);
          return { thread: { id: params.threadId, status: { type: row.state } } };
        case 'thread/turns/list': return { data: row.turn ? [row.turn] : [], nextCursor: null };
        case 'thread/queue/list': return { data: row.queue, nextCursor: null };
        case 'thread/goal/get': return { goal: row.goal };
        case 'server/diagnostics': return {
          process: { id: model.pid },
          // A fresh server has not registered mailbox telemetry yet.
          gauges: ['core.turns.active', 'app.requests.queued', 'app.server_requests.pending']
            .map(name => ({ name, value: 0 })),
        };
        default: throw new Error(`Unexpected RPC method ${method}`);
      }
    },
  };
}

async function runScenario({ stateDir, model = server(), bootId = 'boot-1', onPause,
  readState = () => 'Available', onStop, startAt = 0 }) {
  const controller = new AbortController();
  const result = { time: startAt, ticks: 0, stops: [], stateReads: [], statuses: [] };
  await runMonitor({
    stateDir, codespace: 'isolated-test-codespace', bootId,
    connect: async () => connectTo(model),
    requestStop: async () => {
      result.stops.push(result.time);
      await onStop?.(result);
    },
    readCodespaceState: async () => {
      result.stateReads.push(result.time);
      return readState(result);
    },
    now: () => result.time,
    wallNow: () => WALL_START + result.time,
    signal: controller.signal,
    pause: async ms => {
      result.ticks++;
      assert.ok(result.ticks <= 400, 'Monitor exceeded the isolated test iteration budget');
      const status = JSON.parse(await readFile(join(stateDir, 'status.json'), 'utf8'));
      result.statuses.push(status);
      await onPause?.({ ...result, status, abort: () => controller.abort(),
        advanceTo: time => { result.time = time - ms; } });
      result.time += ms;
    },
  });
  return result;
}

test('restart reloads known completed threads when the new server has no loaded threads', async t => {
  const stateDir = await isolatedState(t);
  const initial = server();
  const first = await runScenario({ stateDir, model: initial, onPause: ({ abort }) => abort() });
  assert.equal(first.stops.length, 0);
  assert.equal(first.statuses[0].observedThreads, 1);

  const restarted = server({ root: completed({ state: 'notLoaded' }) });
  restarted.loaded = [];
  restarted.pid = 456;
  const second = await runScenario({
    stateDir, model: restarted, bootId: 'boot-2',
    onPause: ({ stops, status, abort }) => {
      assert.equal(status.observedThreads, 1);
      if (stops.length) abort();
    },
  });
  assert.ok(restarted.reads.includes('root'), 'Saved thread identity must be inspected after restart');
  assert.deepEqual(second.stops, [GRACE_MS]);
});

test('separate monitor processes recover known threads using only their isolated state directory', async t => {
  const stateDir = await isolatedState(t);
  const fixture = `
    import assert from 'node:assert/strict';
    import { runMonitor } from ${JSON.stringify(new URL('./task-autostop.mjs', import.meta.url).href)};
    const phase = process.argv[2];
    const model = ${JSON.stringify(server())};
    if (phase === 'second') { model.loaded = []; model.rows.root.state = 'notLoaded'; }
    ${connectTo.toString()}
    const controller = new AbortController();
    let time = 0, ticks = 0;
    const stops = [];
    await runMonitor({
      stateDir: process.argv[1], codespace: 'isolated-test-codespace', bootId: phase,
      connect: async () => connectTo(model),
      requestStop: async () => { stops.push(time); },
      readCodespaceState: async () => 'Available',
      now: () => time, wallNow: () => ${WALL_START} + time,
      signal: controller.signal,
      pause: async ms => {
        assert.ok(++ticks < 200, 'Child monitor exceeded its iteration budget');
        if (phase === 'first' || stops.length) controller.abort();
        time += ms;
      },
    });
    console.log(JSON.stringify({ stops, reads: model.reads, loaded: model.loaded }));
  `;
  const launch = async phase => {
    const { stdout } = await execute(process.execPath,
      ['--input-type=module', '-e', fixture, stateDir, phase], { timeout: 10_000 });
    return JSON.parse(stdout);
  };
  assert.deepEqual((await launch('first')).stops, []);
  const restarted = await launch('second');
  assert.deepEqual(restarted.loaded, []);
  assert.ok(restarted.reads.includes('root'));
  assert.deepEqual(restarted.stops, [GRACE_MS]);
});

test('an RPC disconnection retains unfinished known work when loaded threads become empty', async t => {
  const stateDir = await isolatedState(t);
  const model = server({ root: completed(), child: unfinished() });
  const result = await runScenario({ stateDir, model, onPause: ({ ticks, status, advanceTo, abort }) => {
    if (ticks === 1) {
      model.loaded = [];
      model.rows.child.state = 'notLoaded';
      model.failNext = 'server/diagnostics';
    }
    if (ticks === 2) {
      assert.equal(status.phase, 'unknown-state-no-shutdown');
      advanceTo(GRACE_MS * 2);
    }
    if (ticks === 3) {
      assert.equal(status.observedThreads, 2);
      assert.equal(status.taskActive, true);
      abort();
    }
  } });
  assert.equal(result.stops.length, 0);
  assert.ok(model.connections >= 2);
  assert.ok(model.reads.filter(id => id === 'child').length >= 3);
});

test('accepted stop keeps monitoring and never repeats while GitHub reports ShuttingDown', async t => {
  const stateDir = await isolatedState(t);
  let checkedAfterStop = false;
  const result = await runScenario({
    stateDir, readState: () => 'ShuttingDown',
    onPause: ({ time, stops, abort }) => {
      if (stops.length && time > GRACE_MS) checkedAfterStop = true;
      if (time >= GRACE_MS + 180_000) abort();
    },
  });
  assert.equal(checkedAfterStop, true, 'An accepted asynchronous stop must not terminate the monitor');
  assert.deepEqual(result.stops, [GRACE_MS]);
  assert.ok(result.stateReads.some(time => time > GRACE_MS));
});

test('restarting the monitor within the same boot resumes checking an accepted stop', async t => {
  const stateDir = await isolatedState(t);
  const first = await runScenario({
    stateDir,
    onPause: ({ stops, abort }) => { if (stops.length) abort(); },
  });
  assert.deepEqual(first.stops, [GRACE_MS]);

  const restarted = await runScenario({
    stateDir, startAt: GRACE_MS + 10_000, readState: () => 'ShuttingDown',
    onPause: ({ time, stateReads, abort }) => {
      assert.ok(stateReads.length > 0, 'An accepted stop must be checked immediately after monitor restart');
      if (time >= GRACE_MS * 2 + 10_000) abort();
    },
  });
  assert.deepEqual(restarted.stops, []);
});

test('two monitor starts on a new boot cannot revive the previous boot accepted stop', async t => {
  const stateDir = await isolatedState(t);
  const previousBoot = await runScenario({
    stateDir, bootId: 'previous-boot',
    onPause: ({ stops, abort }) => { if (stops.length) abort(); },
  });
  assert.deepEqual(previousBoot.stops, [GRACE_MS]);
  const newBoot = await runScenario({
    stateDir, bootId: 'new-boot', startAt: GRACE_MS + 10_000,
    onPause: ({ abort }) => abort(),
  });
  assert.deepEqual(newBoot.stops, []);
  assert.deepEqual(newBoot.stateReads, []);

  const secondStartAt = GRACE_MS + 20_000;
  const restartedMonitor = await runScenario({
    stateDir, bootId: 'new-boot', startAt: secondStartAt, readState: () => 'ShuttingDown',
    onPause: ({ stateReads, stops, status, abort }) => {
      assert.deepEqual(stateReads, [], 'A stop from the previous boot must remain historical');
      if (stops.length) {
        assert.equal(status.lastStop.attempt, 1);
        abort();
      }
    },
  });
  assert.deepEqual(restartedMonitor.stops, [secondStartAt + GRACE_MS]);
});

test('an accepted but dropped stop retries after at least one minute with a fresh idle check', async t => {
  const stateDir = await isolatedState(t);
  const model = server();
  const readCounts = [];
  const result = await runScenario({
    stateDir, model, readState: () => 'Available',
    onStop: () => readCounts.push(model.reads.length),
    onPause: ({ stops, abort }) => { if (stops.length === 2) abort(); },
  });
  assert.equal(result.stops.length, 2);
  assert.equal(result.stops[0], GRACE_MS);
  assert.ok(result.stops[1] - result.stops[0] >= 60_000);
  assert.ok(readCounts[1] > readCounts[0], 'The retry must reread task lifecycle state');
});

test('repeated dropped stop requests are bounded to three attempts', async t => {
  const stateDir = await isolatedState(t);
  const result = await runScenario({
    stateDir, readState: () => 'Available',
    onPause: ({ time, abort }) => { if (time >= GRACE_MS + 360_000) abort(); },
  });
  assert.equal(result.stops.length, 3);
  for (let index = 1; index < result.stops.length; index++) {
    assert.ok(result.stops[index] - result.stops[index - 1] >= 60_000);
  }
});

test('rejected stop requests are bounded and never expose exception details in saved logs', async t => {
  const stateDir = await isolatedState(t);
  const privateDetail = 'SIMULATED_PRIVATE_TOKEN_MUST_NOT_APPEAR';
  const result = await runScenario({
    stateDir,
    onStop: () => { throw new Error(privateDetail); },
    onPause: ({ time, abort }) => { if (time >= GRACE_MS * 4 + 60_000) abort(); },
  });
  assert.equal(result.stops.length, 3);
  for (let index = 1; index < result.stops.length; index++) {
    assert.ok(result.stops[index] - result.stops[index - 1] >= GRACE_MS,
      'An uncertain failed request must receive a new full idle grace before another attempt');
  }
  const persisted = await Promise.all(['events.log', 'status.json', 'checkpoint.json']
    .map(file => readFile(join(stateDir, file), 'utf8')));
  assert.ok(persisted.every(value => !value.includes(privateDetail)));
  assert.ok(persisted[0].includes('github-stop-failed'));
});

test('a task completed between polls gets a fresh grace and retry budget after three old attempts', async t => {
  const stateDir = await isolatedState(t);
  const model = server();
  let changedAt = null;
  const result = await runScenario({
    stateDir, model,
    onPause: ({ time, stops, status, abort }) => {
      if (stops.length === 3 && changedAt === null) {
        changedAt = time + 10_000;
        model.rows.root = completed({ turn: { id: 'quick-new-task', status: 'completed', completedAt: 200 } });
      }
      if (stops.length === 4) {
        assert.equal(status.lastStop.attempt, 1, 'The new task must receive a fresh stop attempt budget');
        abort();
      }
    },
  });
  assert.deepEqual(result.stops.slice(0, 3), [GRACE_MS, GRACE_MS + 60_000, GRACE_MS + 120_000]);
  assert.equal(result.stops[3], changedAt + GRACE_MS);
});

test('same-boot restart after a newer completed task replaces the exhausted old request budget', async t => {
  const stateDir = await isolatedState(t);
  const oldTask = await runScenario({
    stateDir,
    onPause: ({ stops, abort }) => { if (stops.length === 3) abort(); },
  });
  assert.equal(oldTask.stops.length, 3);

  const newerTask = server({ root: completed({
    turn: { id: 'completed-before-monitor-restarted', status: 'completed', completedAt: 200 },
  }) });
  const startedAt = oldTask.stops.at(-1) + 10_000;
  const restarted = await runScenario({
    stateDir, model: newerTask, startAt: startedAt,
    onPause: ({ stops, status, abort }) => {
      if (stops.length) {
        assert.equal(status.lastStop.attempt, 1);
        abort();
      }
    },
  });
  assert.ok(restarted.stateReads.length > 0, 'The earlier accepted request must first be checked against GitHub');
  assert.deepEqual(restarted.stops, [startedAt + GRACE_MS]);
});

test('a new completed task discovered by the final recheck cancels the old retry budget', async t => {
  const stateDir = await isolatedState(t);
  const model = server();
  const changeAt = GRACE_MS + 120_000;
  let nextPollAt = 0;
  let duePollReads = 0;
  model.beforeCall = method => {
    if (method === 'thread/read' && nextPollAt === changeAt && ++duePollReads === 2) {
      model.rows.root = completed({ turn: { id: 'finished-during-final-check', status: 'completed', completedAt: 200 } });
    }
  };
  const result = await runScenario({
    stateDir, model,
    onPause: ({ time, stops, status, abort }) => {
      nextPollAt = time + 10_000;
      if (stops.length === 3) {
        assert.equal(status.lastStop.attempt, 1, 'A final-check task change must reset the old retry budget');
        abort();
      }
    },
  });
  assert.ok(duePollReads >= 2);
  assert.deepEqual(result.stops, [GRACE_MS, GRACE_MS + 60_000, changeAt + GRACE_MS]);
});

test('new work after an accepted stop prevents retry while GitHub remains Available', async t => {
  const stateDir = await isolatedState(t);
  const model = server();
  const result = await runScenario({
    stateDir, model, readState: () => 'Available',
    onStop: () => { model.rows.root = unfinished(); },
    onPause: ({ time, abort }) => { if (time >= GRACE_MS + 180_000) abort(); },
  });
  assert.deepEqual(result.stops, [GRACE_MS]);
  assert.ok(result.statuses.some(status => status.taskActive === true));
});

test('a disabled marker appearing at the deadline prevents shutdown', async t => {
  const stateDir = await isolatedState(t);
  const result = await runScenario({ stateDir, onPause: async ({ time, status, abort }) => {
    if (time === GRACE_MS - 10_000) await writeFile(join(stateDir, 'disabled'), 'disabled\n');
    if (time >= GRACE_MS) {
      assert.equal(status.phase, 'disabled');
      abort();
    }
  } });
  assert.equal(result.stops.length, 0);
});

test('a disabled marker after an accepted stop prevents retries', async t => {
  const stateDir = await isolatedState(t);
  const result = await runScenario({
    stateDir, readState: () => 'Available',
    onStop: async () => writeFile(join(stateDir, 'disabled'), 'disabled\n'),
    onPause: ({ time, status, abort }) => {
      if (time >= GRACE_MS + 120_000) {
        assert.equal(status.phase, 'disabled');
        abort();
      }
    },
  });
  assert.deepEqual(result.stops, [GRACE_MS]);
});
