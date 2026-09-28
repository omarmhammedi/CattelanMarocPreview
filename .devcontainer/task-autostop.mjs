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
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const activityGauges = ['core.turns.active', 'core.mailbox.pending', 'app.requests.queued', 'app.server_requests.pending'];

export class IdleCountdown {
  constructor(graceMs = GRACE_MS) { this.graceMs = graceMs; this.reset(); }
  reset() { this.since = null; this.fingerprint = null; }
  observe(snapshot, now) {
    if (!snapshot || snapshot.busy || !snapshot.completed) {
      this.reset();
      return { phase: 'waiting', remainingMs: null, due: false };
    }
    if (this.fingerprint !== snapshot.fingerprint || this.since === null || now < this.since) {
      this.fingerprint = snapshot.fingerprint;
      this.since = now;
    }
    const remainingMs = Math.max(0, this.graceMs - (now - this.since));
    return { phase: 'countdown', remainingMs, due: remainingMs === 0 };
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
      if (message.error) pending.reject(new Error('Codex status request rejected'));
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
      rpc.call('thread/turns/list', { threadId, limit: 1, sortDirection: 'desc', itemsView: 'notLoaded' }),
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
    const finished = last?.status === 'completed';
    completed ||= finished;
    busy ||= thread.status.type === 'active' || !!queue.data.length || !!queue.nextCursor
      || goal.goal?.status === 'active' || (!!last && !finished)
      || (thread.status.type === 'notLoaded' && !finished);
    rows.push([threadId, thread.updatedAt, last?.id, last?.status, last?.completedAt, goal.goal?.status, goal.goal?.updatedAt]);
  }
  const after = await loadedThreads(rpc);
  if ([...after].some(id => !loaded.has(id)) || [...loaded].some(id => !after.has(id))) throw new Error('Threads changed during inspection');
  const diagnostics = await rpc.call('server/diagnostics');
  const gauges = new Map(diagnostics?.gauges?.map(gauge => [gauge.name, gauge.value]));
  if (!Number.isInteger(diagnostics?.process?.id)) throw new Error('Missing server identity');
  for (const name of activityGauges) {
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
async function writeStatus(value) {
  const path = join(stateDir, 'status.json');
  await writePrivate(path + '.tmp', JSON.stringify({ ...value, checkedAt: new Date().toISOString() }) + '\n');
  await rename(path + '.tmp', path);
}
async function writePrivate(path, value) {
  const file = await open(path, 'w', 0o600);
  try { await file.writeFile(value); } finally { await file.close(); }
}
async function log(event) { await appendFile(join(stateDir, 'events.log'), `${new Date().toISOString()} ${event}\n`, { mode: 0o600 }); }

async function run() {
  const codespace = process.env.CODESPACE_NAME;
  if (process.env.CODESPACES !== 'true' || !/^[a-zA-Z0-9-]+$/.test(codespace || '')) throw new Error('Codespace identity missing');
  const countdown = new IdleCountdown();
  let rpc;
  let known = new Set();
  let lastPhase;
  let status = { pid: process.pid, codespace, graceMinutes: 15 };
  await log('monitor-started');
  for (;;) {
    try {
      if (await exists(join(stateDir, 'disabled'))) {
        countdown.reset();
        rpc?.close(); rpc = null; known = new Set();
        status = { ...status, phase: 'disabled', stopAt: null };
      } else {
        if (!rpc) { rpc = new CodexRpc(); await rpc.connect(); countdown.reset(); known = new Set(); }
        const snapshot = await collectSnapshot(rpc, known);
        const result = await checkAndStop({
          countdown, snapshot, now: () => performance.now(),
          readFresh: async () => {
            if (await exists(join(stateDir, 'disabled'))) throw new Error('Disabled before stop');
            return collectSnapshot(rpc, known);
          },
          stop: async () => {
            await log('requesting-codespace-stop-after-completed-tasks');
            // The official API stops the VM without deleting it. Never call
            // shutdown(8), delete a Codespace, or change local CMS files.
            try {
              await execute('gh', ['api', '--method', 'POST', `/user/codespaces/${codespace}/stop`, '--silent'], { timeout: 20_000 });
            } catch {
              const error = new Error('GitHub stop request failed');
              error.code = 'STOP_FAILED';
              throw error;
            }
          },
        });
        status = { ...status, phase: result.phase, stopAt: result.remainingMs === null ? null : new Date(Date.now() + result.remainingMs).toISOString(),
          observedThreads: snapshot.threadCount, taskActive: snapshot.busy };
        if (result.stopped) {
          await writeStatus(status);
          rpc.close();
          // An accepted stop is asynchronous. Do not make repeated stop calls.
          return;
        }
      }
    } catch (error) {
      countdown.reset();
      rpc?.close(); rpc = null; known = new Set();
      // Never expose RPC payloads, account details, GitHub credentials or stderr.
      status = { ...status, phase: error.code === 'STOP_FAILED' ? 'github-stop-failed' : 'unknown-state-no-shutdown', stopAt: null, taskActive: null };
    }
    await writeStatus(status);
    if (status.phase !== lastPhase) { await log(status.phase); lastPhase = status.phase; }
    await pause(POLL_MS);
  }
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
