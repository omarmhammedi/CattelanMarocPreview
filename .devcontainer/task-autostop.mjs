#!/usr/bin/env node
// Local Codespaces helper. Never reads or changes the website's CMS storage.
import { appendFile, mkdir, open, readFile, rename, unlink } from 'node:fs/promises';
import { spawn, execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { performance } from 'node:perf_hooks';
import WebSocket from 'ws';

const execute = promisify(execFile);
const script = fileURLToPath(import.meta.url);
const stateDir = join(homedir(), '.local/state/cattelan-task-autostop');
const socketPath = join(process.env.CODEX_HOME || join(homedir(), '.codex'), 'app-server-control/app-server-control.sock');
export const GRACE_MS = 15 * 60 * 1000;
const POLL_MS = 10_000;
const STOP_RETRY_MS = 60_000;
const MAX_STOP_ATTEMPTS = 3;
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const activityGauges = ['core.turns.active', 'core.mailbox.pending', 'app.requests.queued', 'app.server_requests.pending'];

export function decodeRpcError(error) {
  const result = new Error('Codex status request rejected');
  if (error?.code === -32600 && typeof error.message === 'string'
    && error.message.includes('not materialized yet') && error.message.includes('first user message')) {
    result.code = 'THREAD_UNMATERIALIZED';
  }
  return result;
}

export class IdleCountdown {
  constructor(graceMs = GRACE_MS) { this.graceMs = graceMs; this.reset(); }
  reset() { this.since = null; this.fingerprint = null; }
  observe(snapshot, now) {
    if (!snapshot || snapshot.busy || !snapshot.completed) {
      this.reset();
      return { phase: 'waiting', remainingMs: null, due: false, resetReason: null };
    }
    let resetReason = null;
    if (this.fingerprint !== snapshot.fingerprint || this.since === null || now < this.since) {
      resetReason = this.since === null ? 'completed-work-observed'
        : now < this.since ? 'clock-reset' : 'completed-work-changed';
      this.fingerprint = snapshot.fingerprint;
      this.since = now;
    }
    const remainingMs = Math.max(0, this.graceMs - (now - this.since));
    return { phase: 'countdown', remainingMs, due: remainingMs === 0, resetReason };
  }
}

export class CodexRpc {
  constructor(path = socketPath) { this.path = path; this.pending = new Map(); this.nextId = 0; }
  async connect() {
    this.ws = new WebSocket(`ws+unix://${this.path}:/`, { handshakeTimeout: 8000, maxPayload: 8 * 1024 * 1024 });
    this.ws.on('message', bytes => {
      let message;
      try { message = JSON.parse(bytes.toString()); } catch { this.close(); return; }
      if (!message || typeof message !== 'object' || Array.isArray(message)) { this.close(); return; }
      const pending = this.pending.get(message.id);
      if (!pending) return; // Do not persist notifications, prompts, or account metadata.
      this.pending.delete(message.id);
      clearTimeout(pending.timer);
      if (message.error) pending.reject(decodeRpcError(message.error));
      else pending.resolve(message.result);
    });
    const disconnected = () => {
      for (const pending of this.pending.values()) {
        clearTimeout(pending.timer);
        pending.reject(new Error('Codex status connection lost'));
      }
      this.pending.clear();
    };
    this.ws.on('close', disconnected);
    this.ws.on('error', disconnected);
    await new Promise((resolve, reject) => { this.ws.once('open', resolve); this.ws.once('error', reject); });
    await this.call('initialize', {
      clientInfo: { name: 'cattelan_task_autostop', title: 'Cattelan task completion monitor', version: '1.0.0' },
      capabilities: { experimentalApi: true, requestAttestation: false },
    });
    this.ws.send(JSON.stringify({ method: 'initialized' }));
  }
  call(method, params = {}) {
    if (this.ws?.readyState !== WebSocket.OPEN) return Promise.reject(new Error('Codex status unavailable'));
    return new Promise((resolve, reject) => {
      const id = ++this.nextId;
      const timer = setTimeout(() => { this.pending.delete(id); reject(new Error('Codex status timeout')); this.close(); }, 8000);
      this.pending.set(id, { resolve, reject, timer });
      this.ws.send(JSON.stringify({ id, method, params }));
    });
  }
  close() { this.ws?.terminate(); }
}

async function loadedThreads(rpc) {
  const ids = new Set();
  let cursor = null;
  const cursors = new Set();
  do {
    const page = await rpc.call('thread/loaded/list', { cursor, limit: 100 });
    if (!Array.isArray(page?.data) || page.data.some(id => typeof id !== 'string')) throw new Error('Invalid thread list');
    page.data.forEach(id => ids.add(id));
    cursor = page.nextCursor;
    if (cursor && cursors.has(cursor)) throw new Error('Repeated thread cursor');
    cursors.add(cursor);
  } while (cursor);
  return ids;
}

// Read only lifecycle metadata. Retain observed IDs so disconnect/unload cannot
// turn an unfinished task into an apparently empty, idle server.
export async function collectSnapshot(rpc, known = new Set()) {
  const loaded = await loadedThreads(rpc);
  loaded.forEach(id => known.add(id));
  const rows = [];
  let busy = false;
  let completed = false;
  for (const threadId of [...known].sort()) {
    const [metadata, turns, queue, goal] = await Promise.all([
      rpc.call('thread/read', { threadId, includeTurns: false }),
      rpc.call('thread/turns/list', { threadId, limit: 1, sortDirection: 'desc', itemsView: 'notLoaded' })
        .catch(error => { if (error.code === 'THREAD_UNMATERIALIZED') return { data: [] }; throw error; }),
      rpc.call('thread/queue/list', { threadId, limit: 1 }),
      rpc.call('thread/goal/get', { threadId }),
    ]);
    const thread = metadata?.thread;
    if (!thread || !['active', 'idle', 'notLoaded'].includes(thread.status?.type)
      || !Array.isArray(turns?.data) || !Array.isArray(queue?.data) || !Object.hasOwn(goal || {}, 'goal')) {
      throw new Error('Uncertain task state');
    }
    const last = turns.data[0];
    if (last && !['completed', 'inProgress', 'failed', 'interrupted'].includes(last.status)) throw new Error('Unknown turn status');
    if (last?.status === 'completed' && !Number.isFinite(last.completedAt)) throw new Error('Missing completion timestamp');
    if (goal.goal && !['active', 'paused', 'blocked', 'usageLimited', 'budgetLimited', 'complete'].includes(goal.goal.status)) throw new Error('Unknown goal status');
    const finished = !!last && ['completed', 'failed', 'interrupted'].includes(last.status);
    completed ||= finished;
    busy ||= thread.status.type === 'active' || !!queue.data.length || !!queue.nextCursor
      || goal.goal?.status === 'active' || (!!last && !finished)
      || (thread.status.type === 'notLoaded' && !finished);
    // Opening a blank, idle chat is not work and need not survive in the
    // checkpoint. It may never be materialized on disk. Loaded-list stability
    // and the global activity check still protect a turn starting during this read.
    if (!last && thread.status.type === 'idle' && !queue.data.length && !queue.nextCursor && !goal.goal) {
      known.delete(threadId);
      continue;
    }
    // Settings refreshes also update thread/goal timestamps without new work.
    // Only lifecycle identity changes may restart the completed-task countdown.
    rows.push([threadId, last?.id, last?.status, last?.completedAt, goal.goal?.id, goal.goal?.status]);
  }
  const after = await loadedThreads(rpc);
  if ([...after].some(id => !loaded.has(id)) || [...loaded].some(id => !after.has(id))) throw new Error('Threads changed during inspection');
  const diagnostics = await rpc.call('server/diagnostics');
  if (!Array.isArray(diagnostics?.gauges)
    || diagnostics.gauges.some(gauge => typeof gauge?.name !== 'string')) throw new Error('Invalid activity counters');
  const gauges = new Map(diagnostics?.gauges?.map(gauge => [gauge.name, gauge.value]));
  if (!Number.isInteger(diagnostics?.process?.id)) throw new Error('Missing server identity');
  for (const name of activityGauges) {
    // The native server registers all of these gauges lazily, as verified with
    // a fresh isolated server. Missing gauges have never recorded activity;
    // malformed present values are errors. Direct thread checks remain required.
    if (!gauges.has(name)) continue;
    const value = gauges.get(name);
    if (!Number.isFinite(value) || value < 0) throw new Error('Missing activity counter');
    busy ||= value > 0;
  }
  return { busy, completed, threadCount: known.size, serverPid: diagnostics.process.id,
    fingerprint: JSON.stringify([diagnostics.process.id, rows]) };
}

export async function checkAndStop({ countdown, snapshot, now, readFresh, stop }) {
  try {
    const decision = countdown.observe(snapshot, now());
    if (!decision.due) return { ...decision, stopped: false };
    const fresh = await readFresh();
    const confirmed = countdown.observe(fresh, now());
    if (!confirmed.due) return { ...confirmed, stopped: false };
    await stop();
    return { ...confirmed, phase: 'stop-requested', stopped: true };
  } catch (error) {
    countdown.reset();
    throw error;
  }
}

async function exists(path) { try { await readFile(path); return true; } catch (error) { if (error.code === 'ENOENT') return false; throw error; } }
async function writeJson(path, value) {
  await writePrivate(path + '.tmp', JSON.stringify(value) + '\n');
  await rename(path + '.tmp', path);
}
async function writePrivate(path, value) {
  const file = await open(path, 'w', 0o600);
  try { await file.writeFile(value); } finally { await file.close(); }
}
async function readCheckpoint(directory, codespace) {
  let value;
  try { value = JSON.parse(await readFile(join(directory, 'checkpoint.json'), 'utf8')); }
  catch (error) {
    if (error.code === 'ENOENT') return { version: 1, codespace, knownThreads: [], lastStop: null };
    throw new Error('Invalid saved monitor state');
  }
  if (value?.version !== 1 || value.codespace !== codespace || !Array.isArray(value.knownThreads)
    || value.knownThreads.some(id => typeof id !== 'string' || !id || id.length > 200)) {
    throw new Error('Invalid saved monitor state');
  }
  if (value.lastStop && (!Number.isInteger(value.lastStop.attempt) || value.lastStop.attempt < 1
    || value.lastStop.attempt > MAX_STOP_ATTEMPTS || !Number.isFinite(Date.parse(value.lastStop.requestedAt))
    || (value.lastStop.acceptedAt !== null && !Number.isFinite(Date.parse(value.lastStop.acceptedAt)))
    || !['requested', 'accepted', 'failed', 'Available', 'ShuttingDown', 'Shutdown', 'superseded'].includes(value.lastStop.outcome))) {
    throw new Error('Invalid saved monitor state');
  }
  return value;
}

function failureReason(error) {
  if (error.code === 'STOP_FAILED') return 'github-stop-failed';
  if (error.code === 'STATUS_FAILED') return 'github-state-unavailable';
  if (/counter|server identity/.test(error.message)) return 'invalid-runtime-diagnostics';
  if (/saved monitor state/.test(error.message)) return 'invalid-saved-state';
  if (/connection|timeout|unavailable|ENOENT|ECONNREFUSED/.test(error.message)) return 'codex-unavailable';
  if (/thread|Thread|turn|task|goal|completion/i.test(error.message)) return 'task-state-unavailable';
  return 'monitor-check-failed';
}

// Dependency injection is solely an importable test interface. The CLI always
// uses the real Codespace identity and 15-minute grace; no short test timer can
// accidentally call GitHub against the user's running machine.
export async function runMonitor({
  stateDir: directory = stateDir, codespace, bootId,
  connect = async () => {
    const rpc = new CodexRpc();
    try { await rpc.connect(); return rpc; }
    catch (error) { rpc.close(); throw error; }
  },
  requestStop, readCodespaceState, now = () => performance.now(), wallNow = Date.now,
  pause: wait = pause, signal,
}) {
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const log = event => appendFile(join(directory, 'events.log'), `${new Date(wallNow()).toISOString()} ${event}\n`, { mode: 0o600 });
  let checkpoint;
  try { checkpoint = await readCheckpoint(directory, codespace); }
  catch (error) {
    await writeJson(join(directory, 'status.json'), { pid: process.pid, codespace, graceMinutes: 15,
      phase: 'unknown-state-no-shutdown', reason: failureReason(error), stopAt: null,
      checkedAt: new Date(wallNow()).toISOString() });
    await log('unknown-state-no-shutdown reason=invalid-saved-state');
    throw error;
  }
  const known = new Set(checkpoint.knownThreads);
  const save = async () => {
    checkpoint.knownThreads = [...known].sort();
    await writeJson(join(directory, 'checkpoint.json'), checkpoint);
  };
  const sameBoot = checkpoint.bootId === bootId;
  if (!sameBoot) {
    await log(`codespace-started previousStop=${checkpoint.lastStop?.acceptedAt || checkpoint.lastStop?.requestedAt || 'none'}`);
    checkpoint.bootId = bootId;
    checkpoint.lastStartAt = new Date(wallNow()).toISOString();
  }
  await save();
  const countdown = new IdleCountdown();
  let rpc;
  let lastPhase;
  let pendingStop = sameBoot && checkpoint.lastStop?.bootId === bootId && checkpoint.lastStop?.requestedAt
    && ['requested', 'accepted', 'failed', 'Available', 'ShuttingDown'].includes(checkpoint.lastStop.outcome)
    ? { at: now(), attempt: checkpoint.lastStop.attempt, fingerprint: checkpoint.lastStop.taskFingerprint, state: null } : null;
  let status = { pid: process.pid, codespace, graceMinutes: 15, observedThreads: known.size };
  await log('monitor-started');
  try { while (!signal?.aborted) {
    try {
      if (await exists(join(directory, 'disabled'))) {
        countdown.reset();
        rpc?.close?.(); rpc = null;
        status = { ...status, phase: 'disabled', reason: 'disabled-by-user', stopAt: null, taskActive: null };
      } else {
        if (!rpc) { rpc = await connect(); countdown.reset(); }
        const snapshot = await collectSnapshot(rpc, known);
        let decision = countdown.observe(snapshot, now());
        let state = null;
        if (pendingStop) {
            try {
              state = await readCodespaceState();
              if (!['Available', 'ShuttingDown', 'Shutdown'].includes(state)) throw new Error('Unknown GitHub state');
            } catch { const error = new Error('GitHub state check failed'); error.code = 'STATUS_FAILED'; throw error; }
            if (state !== pendingStop.state) {
              await log(`github-state state=${state}`);
              pendingStop.state = state;
              checkpoint.lastStop.outcome = state;
              await save();
            }
            if (state === 'Shutdown') {
              await writeJson(join(directory, 'status.json'), { ...status, phase: 'shutdown-confirmed', reason: 'github-confirmed',
                stopAt: null, checkedAt: new Date(wallNow()).toISOString() });
              await log('shutdown-confirmed');
              return;
            }
            // New work cancels retries; an already accepted GitHub shutdown
            // cannot be canceled by this process.
            if (state === 'Available' && (snapshot.busy || pendingStop.fingerprint !== snapshot.fingerprint)) {
              pendingStop = null;
              checkpoint.lastStop.outcome = 'superseded';
            }
        }
        const retryReady = !pendingStop || (state === 'Available'
          && now() - pendingStop.at >= STOP_RETRY_MS && pendingStop.attempt < MAX_STOP_ATTEMPTS);
        let result = { ...decision, stopped: false };
        if (decision.due && retryReady) {
          result = await checkAndStop({
            countdown, snapshot, now,
            readFresh: async () => {
              if (await exists(join(directory, 'disabled'))) throw new Error('Disabled before stop');
              return collectSnapshot(rpc, known);
            },
            stop: async () => {
              const attempt = (pendingStop?.attempt || 0) + 1;
              pendingStop = { at: now(), attempt, fingerprint: snapshot.fingerprint, state: null };
              checkpoint.lastStop = { bootId, taskFingerprint: snapshot.fingerprint,
                requestedAt: new Date(wallNow()).toISOString(), acceptedAt: null, attempt, outcome: 'requested' };
              await save();
              await log(`requesting-codespace-stop-after-completed-tasks attempt=${attempt}`);
              try { await requestStop(); }
              catch {
                checkpoint.lastStop.outcome = 'failed';
                await save();
                await log(`github-stop-rejected attempt=${attempt}`);
                const error = new Error('GitHub stop request failed'); error.code = 'STOP_FAILED'; throw error;
              }
              checkpoint.lastStop.acceptedAt = new Date(wallNow()).toISOString();
              checkpoint.lastStop.outcome = 'accepted';
              await save();
              await log(`github-stop-accepted attempt=${attempt}`);
            },
          });
        }
        if (pendingStop && state === 'Available' && !result.stopped
          && (result.phase === 'waiting' || result.resetReason === 'completed-work-changed')) {
          pendingStop = null;
          checkpoint.lastStop.outcome = 'superseded';
        }
        let phase = result.phase;
        let reason = snapshot.busy ? 'work-active' : !snapshot.completed ? 'no-finished-task-observed' : 'completed-work-idle';
        if (pendingStop) {
          phase = state === 'Available' && pendingStop.attempt >= MAX_STOP_ATTEMPTS
            && now() - pendingStop.at >= STOP_RETRY_MS ? 'github-stop-unconfirmed' : 'stop-requested';
          reason = state === 'ShuttingDown' ? 'github-shutting-down' : 'awaiting-github-shutdown';
        }
        status = { ...status, phase, reason, stopAt: result.remainingMs === null ? null : new Date(wallNow() + result.remainingMs).toISOString(),
          observedThreads: snapshot.threadCount, taskActive: snapshot.busy };
        // The first observe call can start a countdown before checkAndStop.
        result.resetReason ||= decision.resetReason;
        if (result.resetReason) {
          await log(`countdown-started reason=${result.resetReason} stopAt=${status.stopAt}`);
        }
      }
    } catch (error) {
      countdown.reset();
      rpc?.close?.(); rpc = null;
      // Never expose RPC payloads, account details, GitHub credentials or stderr.
      status = { ...status, phase: error.code === 'STOP_FAILED' ? 'github-stop-failed' : 'unknown-state-no-shutdown',
        reason: failureReason(error), stopAt: null, taskActive: null };
    }
    await save();
    await writeJson(join(directory, 'status.json'), { ...status, observedThreads: known.size,
      lastStop: checkpoint.lastStop, checkedAt: new Date(wallNow()).toISOString() });
    const phase = `${status.phase} reason=${status.reason}`;
    if (phase !== lastPhase) { await log(phase); lastPhase = phase; }
    if (!signal?.aborted) await wait(POLL_MS);
  } } finally { rpc?.close?.(); }
}

async function run() {
  const codespace = process.env.CODESPACE_NAME;
  if (process.env.CODESPACES !== 'true' || !/^[a-zA-Z0-9-]+$/.test(codespace || '')) throw new Error('Codespace identity missing');
  const hostBoot = (await readFile('/proc/sys/kernel/random/boot_id', 'utf8')).trim();
  const initStat = await readFile('/proc/1/stat', 'utf8');
  const containerStart = initStat.slice(initStat.lastIndexOf(')') + 2).split(' ')[19];
  return runMonitor({ codespace, bootId: `${hostBoot}:${containerStart}`,
    requestStop: () => execute('gh', ['api', '--method', 'POST', `/user/codespaces/${codespace}/stop`, '--silent'], { timeout: 20_000 }),
    readCodespaceState: async () => {
      const { stdout } = await execute('gh', ['api', `/user/codespaces/${codespace}`, '--jq', '.state'], { timeout: 20_000 });
      return stdout.trim();
    },
  });
}

async function start() {
  if (process.env.CODESPACES !== 'true') return;
  await mkdir(stateDir, { recursive: true, mode: 0o700 });
  // Kernel-held lock survives the exec and prevents duplicates across SSH and
  // editor connections. A crash releases it without stale PID-file decisions.
  const child = spawn('flock', ['-n', '-F', join(stateDir, 'monitor.lock'), process.execPath, script, 'run'], {
    detached: true, stdio: 'ignore', cwd: dirname(script),
  });
  child.on('error', () => {});
  child.unref();
}

async function main() {
  const command = process.argv[2] || 'status';
  if (command === 'start') return start();
  if (command === 'run') { await mkdir(stateDir, { recursive: true, mode: 0o700 }); return run(); }
  if (command === 'disable') { await mkdir(stateDir, { recursive: true, mode: 0o700 }); await writePrivate(join(stateDir, 'disabled'), 'disabled\n'); console.log('Automatic task shutdown disabled. GitHub idle timeout still applies.'); return; }
  if (command === 'enable') { await unlink(join(stateDir, 'disabled')).catch(error => { if (error.code !== 'ENOENT') throw error; }); await start(); console.log('Automatic task shutdown enabled. Waiting for verified task completion.'); return; }
  if (command === 'status') {
    let status;
    try { status = JSON.parse(await readFile(join(stateDir, 'status.json'), 'utf8')); }
    catch { console.log('Task shutdown monitor has not started.'); return; }
    let running = false;
    try { const args = await readFile(`/proc/${status.pid}/cmdline`, 'utf8'); running = args.split('\0').includes(script); } catch {}
    console.log(JSON.stringify({ ...status, running, disabled: await exists(join(stateDir, 'disabled')) }, null, 2));
    return;
  }
  throw new Error('Use start, status, disable, or enable');
}

if (process.argv[1] && fileURLToPath(import.meta.url) === fileURLToPath(new URL(process.argv[1], 'file:'))) {
  main().catch(() => { console.error('Task shutdown monitor could not start; no shutdown was requested.'); process.exitCode = 1; });
}
