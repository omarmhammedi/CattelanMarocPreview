import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { access, chmod, copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

const helper = fileURLToPath(new URL('./preview-start.sh', import.meta.url));
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const fakeAstro = String.raw`
import { appendFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { spawn } from 'node:child_process';
const base = process.cwd();
const record = {
  args: process.argv.slice(2), cwd: base,
  rayon: process.env.RAYON_NUM_THREADS, nodeOptions: process.env.NODE_OPTIONS,
};
if (process.env.FIXTURE_RECORD_SESSION === '1') {
  const stat = readFileSync('/proc/self/stat', 'utf8');
  record.session = Number(stat.slice(stat.lastIndexOf(')') + 2).split(' ')[3]);
}
appendFileSync(base + '/calls.jsonl', JSON.stringify(record) + '\n');
if (process.env.FIXTURE_CHILD === '1') {
  const child = spawn(process.execPath, ['-e', 'setTimeout(() => {}, 15000)'], {
    detached: true, stdio: 'ignore',
  });
  appendFileSync(base + '/children.jsonl', JSON.stringify(child.pid) + '\n');
  child.unref();
}
await new Promise((resolve) => setTimeout(resolve, Number(process.env.FIXTURE_DELAY || 0)));
if (process.env.FIXTURE_FAIL === '1') process.exit(7);
if (!existsSync(base + '/fake-native-server')) {
  writeFileSync(base + '/fake-native-server', 'fake server; no listener\n');
  appendFileSync(base + '/server-starts.jsonl', '1\n');
}
appendFileSync(base + '/completed.jsonl', '1\n');
`;

async function lines(path) {
  try { return (await readFile(path, 'utf8')).trim().split('\n').filter(Boolean); }
  catch (error) { if (error.code === 'ENOENT') return []; throw error; }
}

async function until(predicate, description, timeout = 5_000) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    if (await predicate()) return;
    await pause(25);
  }
  assert.fail(`Timed out waiting for ${description}`);
}

async function fixture(t) {
  const directory = await mkdtemp(join(tmpdir(), 'cattelan preview fixture '));
  const root = join(directory, 'project with spaces');
  const script = join(root, '.devcontainer', 'preview-start.sh');
  const astro = join(root, 'node_modules', 'astro', 'bin', 'astro.mjs');
  await mkdir(dirname(script), { recursive: true });
  await mkdir(dirname(astro), { recursive: true });
  await mkdir(join(root, '.wrangler', 'state', 'v3', 'd1'), { recursive: true });
  await copyFile(helper, script);
  await chmod(script, 0o700);
  await writeFile(astro, fakeAstro);
  await writeFile(join(root, '.dev.vars'), '# disposable fixture only\n');
  const environment = {
    ...process.env,
    CODESPACES: 'true', CODESPACE_NAME: 'disposable-preview-fixture',
    RAYON_NUM_THREADS: '4', NODE_OPTIONS: '--max-old-space-size=2048',
  };
  t.after(async () => {
    // Only PIDs created and recorded by this fixture may be terminated.
    for (const value of await lines(join(root, 'children.jsonl'))) {
      try { process.kill(JSON.parse(value), 'SIGTERM'); }
      catch (error) { if (error.code !== 'ESRCH') throw error; }
    }
    await rm(directory, { recursive: true, force: true });
  });
  return {
    root, script, environment,
    calls: async () => (await lines(join(root, 'calls.jsonl'))).map(JSON.parse),
    completed: async () => (await lines(join(root, 'completed.jsonl'))).length,
    launches: async () => (await lines(join(root, 'server-starts.jsonl'))).length,
    async run(command = 'start', overrides = {}) {
      const child = spawn('bash', [script, command], {
        cwd: tmpdir(), env: { ...environment, ...overrides }, stdio: ['ignore', 'pipe', 'pipe'],
      });
      let output = '';
      child.stdout.on('data', (value) => { output += value; });
      child.stderr.on('data', (value) => { output += value; });
      const timer = setTimeout(() => child.kill('SIGKILL'), 6_000);
      const [code, signal] = await once(child, 'close');
      clearTimeout(timer);
      assert.equal(signal, null, `helper did not finish within its test deadline: ${output}`);
      return { code, output };
    },
  };
}

test('startup passes literal native arguments, project cwd, and bounded resource settings', async (t) => {
  const f = await fixture(t);
  assert.equal((await f.run()).code, 0);
  await until(async () => await f.completed() === 1, 'native startup completion');
  assert.deepEqual(await f.calls(), [{
    args: ['dev', '--host', '0.0.0.0', '--port', '4321', '--background'],
    cwd: f.root, rayon: '1', nodeOptions: '--max-old-space-size=1024',
  }]);
});

test('simultaneous hooks serialize startup and a later hook reuses the native server', async (t) => {
  const f = await fixture(t);
  const results = await Promise.all(Array.from({ length: 8 }, () => f.run('start', { FIXTURE_DELAY: '700' })));
  assert.ok(results.every(({ code }) => code === 0));
  await until(async () => await f.completed() === 1, 'first native startup completion');
  assert.equal((await f.calls()).length, 1, 'overlapping hooks must not spawn multiple native starts');
  assert.equal(await f.launches(), 1);
  // Completion is recorded just before the process exits and releases flock.
  await pause(100);
  assert.equal((await f.run()).code, 0);
  await until(async () => await f.completed() === 2, 'later native status/start invocation');
  assert.equal(await f.launches(), 1, 'native server must be reused');
});

test('detached native child cannot retain the short-lived startup lock', async (t) => {
  const f = await fixture(t);
  assert.equal((await f.run('start', { FIXTURE_CHILD: '1' })).code, 0);
  await until(async () => await f.completed() === 1, 'first native startup completion');
  await pause(100);
  const pids = (await lines(join(f.root, 'children.jsonl'))).map(JSON.parse);
  assert.equal(pids.length, 1);
  assert.doesNotThrow(() => process.kill(pids[0], 0), 'fake detached server must still be alive');
  assert.equal((await f.run()).code, 0);
  await until(async () => await f.completed() === 2, 'lock release while detached child remains alive');
  assert.equal(await f.launches(), 1);
});

test('one-shot native startup runs outside the short-lived launcher session', async (t) => {
  const f = await fixture(t);
  const stat = await readFile('/proc/self/stat', 'utf8');
  const launcherSession = Number(stat.slice(stat.lastIndexOf(')') + 2).split(' ')[3]);
  // The test's ordinary spawn inherits this session; the helper must detach
  // its startup work before the native Astro CLI itself creates a server.
  assert.equal((await f.run('start', { FIXTURE_RECORD_SESSION: '1' })).code, 0);
  await until(async () => await f.completed() === 1, 'detached startup completion');
  const [{ session }] = await f.calls();
  assert.ok(Number.isInteger(session) && session > 0);
  assert.notEqual(session, launcherSession, 'startup must survive cleanup of the SSH/editor execution session');
});

test('missing prerequisites never trigger native setup, installation, or startup', async (t) => {
  for (const missing of ['.dev.vars', 'node_modules/astro/bin/astro.mjs', '.wrangler/state/v3/d1']) {
    await t.test(missing, async (t) => {
      const f = await fixture(t);
      await rm(join(f.root, missing), { recursive: true, force: true });
      await f.run('start');
      await f.run('run');
      assert.deepEqual(await f.calls(), []);
    });
  }
});

test('outside Codespaces and unsafe Codespace identities never start the preview', async (t) => {
  const f = await fixture(t);
  for (const overrides of [
    { CODESPACES: '' }, { CODESPACES: 'false' }, { CODESPACE_NAME: '' },
    { CODESPACE_NAME: 'bad/name' }, { CODESPACE_NAME: 'bad name' },
    { CODESPACE_NAME: '$(touch injected)' },
  ]) {
    await f.run('start', overrides);
    await f.run('run', overrides);
  }
  assert.deepEqual(await f.calls(), []);
  await assert.rejects(access(join(f.root, 'injected')));
});

test('disable persists across hooks and enable starts once without changing CMS state', async (t) => {
  const f = await fixture(t);
  const varsBefore = await readFile(join(f.root, '.dev.vars'));
  assert.equal((await f.run('disable')).code, 0);
  await access(join(f.root, '.astro', 'preview-autostart.disabled'));
  await f.run('start');
  await f.run('run');
  assert.deepEqual(await f.calls(), []);
  assert.equal((await f.run('enable')).code, 0);
  await until(async () => await f.completed() === 1, 'enabled startup');
  await assert.rejects(access(join(f.root, '.astro', 'preview-autostart.disabled')));
  assert.deepEqual(await readFile(join(f.root, '.dev.vars')), varsBefore);
  await access(join(f.root, '.wrangler', 'state', 'v3', 'd1'));
});

test('a failed native start is bounded and retried only by the next startup event', async (t) => {
  const f = await fixture(t);
  assert.equal((await f.run('start', { FIXTURE_FAIL: '1' })).code, 0);
  await until(async () => (await f.calls()).length === 1, 'failed native invocation');
  await pause(350);
  assert.equal((await f.calls()).length, 1, 'startup must not loop after failure');
  assert.equal(await f.launches(), 0);
  assert.equal((await f.run()).code, 0);
  await until(async () => await f.completed() === 1, 'successful next startup event');
  assert.equal((await f.calls()).length, 2);
  assert.equal(await f.launches(), 1);
});

test('a hung native start receives the 60-second bound and exits without a restart loop', async (t) => {
  const f = await fixture(t);
  const commands = join(f.root, 'fixture commands');
  await mkdir(commands);
  const timeout = join(commands, 'timeout');
  // Keep the production timeout contract while accelerating only this fixture.
  await writeFile(timeout, '#!/usr/bin/env bash\nset -eu\nprintf "%s\\n" "$1" > "$FIXTURE_TIMEOUT_FILE"\nshift\nexec /usr/bin/timeout 0.2s "$@"\n');
  await chmod(timeout, 0o700);
  const limitFile = join(f.root, 'timeout-limit');
  const result = await f.run('run', {
    PATH: `${commands}:${process.env.PATH}`,
    FIXTURE_TIMEOUT_FILE: limitFile, FIXTURE_DELAY: '15000',
  });
  assert.equal(result.code, 1);
  assert.equal((await readFile(limitFile, 'utf8')).trim(), '60s');
  assert.match(result.output, /failed/i);
  await pause(250);
  assert.equal((await f.calls()).length, 1);
  assert.equal(await f.launches(), 0);
  assert.equal((await f.run()).code, 0);
  await until(async () => await f.completed() === 1, 'startup after a bounded failure');
  assert.equal((await f.calls()).length, 2);
});
