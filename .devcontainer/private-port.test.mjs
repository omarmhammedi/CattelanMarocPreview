import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { chmod, copyFile, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';

// Exercise the exact legacy postAttach entry point in a disposable directory.
// All three external helpers are fixtures: no GitHub, CMS, listener or monitor.
async function fixture(t) {
  const dir = await mkdtemp(join(tmpdir(), 'cattelan attach fixture '));
  const root = join(dir, 'project with spaces');
  const hooks = join(root, '.devcontainer');
  const bin = join(dir, 'bin');
  await mkdir(hooks, { recursive: true });
  await mkdir(bin);
  await copyFile(fileURLToPath(new URL('./private-port.mjs', import.meta.url)), join(hooks, 'private-port.mjs'));
  const recorder = (kind, failure) => `
import { appendFileSync } from 'node:fs';
appendFileSync(process.env.FIXTURE_EVENTS, JSON.stringify({kind:${JSON.stringify(kind)}, args:process.argv.slice(2), cwd:process.cwd()})+'\\n');
if (process.env.${failure} === '1') { console.error('fixture-private-output-must-not-leak'); process.exit(1); }
`;
  await writeFile(join(bin, 'gh'), '#!/usr/bin/env node\n' + recorder('privacy', 'FIXTURE_GH_FAIL'));
  await chmod(join(bin, 'gh'), 0o700);
  await writeFile(join(hooks, 'task-autostop.mjs'), recorder('monitor', 'FIXTURE_MONITOR_FAIL'));
  await writeFile(join(hooks, 'preview-fixture.mjs'), recorder('preview', 'FIXTURE_PREVIEW_FAIL'));
  await writeFile(join(hooks, 'preview-start.sh'), '#!/usr/bin/env bash\nexec node "$(dirname -- "$0")/preview-fixture.mjs" "$@"\n');
  const events = join(dir, 'events.jsonl');
  const env = { ...process.env, CODESPACES: 'true', CODESPACE_NAME: 'disposable-attach-fixture',
    FIXTURE_EVENTS: events, PATH: `${bin}:${process.env.PATH}` };
  t.after(() => rm(dir, { recursive: true, force: true }));
  return {
    root,
    async run(overrides = {}) {
      await writeFile(events, '');
      const child = spawn(process.execPath, [join(hooks, 'private-port.mjs')], {
        cwd: tmpdir(), env: { ...env, ...overrides }, stdio: ['ignore', 'pipe', 'pipe'],
      });
      let output = '';
      child.stdout.on('data', value => { output += value; });
      child.stderr.on('data', value => { output += value; });
      const timer = setTimeout(() => child.kill('SIGKILL'), 5000);
      const [code, signal] = await once(child, 'close');
      clearTimeout(timer);
      assert.equal(signal, null, 'Attach entry must finish, not remain as a watchdog.');
      assert.equal(code, 0, output);
      const calls = (await readFile(events, 'utf8')).trim().split('\n').filter(Boolean).map(JSON.parse);
      assert(!output.includes('fixture-private-output-must-not-leak'));
      return { calls, output };
    },
  };
}

test('legacy editor attach makes the port private then launches both existing helpers from the repository', async t => {
  const f = await fixture(t);
  const { calls, output } = await f.run();
  assert.equal(output, '');
  assert.deepEqual(calls, [
    { kind: 'privacy', args: ['codespace', 'ports', 'visibility', '4321:private', '--codespace', 'disposable-attach-fixture'], cwd: f.root },
    { kind: 'monitor', args: ['start'], cwd: f.root },
    { kind: 'preview', args: ['start'], cwd: f.root },
  ]);
});

test('unconfirmed private visibility skips preview but preserves cost-control startup', async t => {
  const f = await fixture(t);
  const { calls, output } = await f.run({ FIXTURE_GH_FAIL: '1' });
  assert.deepEqual(calls.map(call => call.kind), ['privacy', 'monitor']);
  assert.match(output, /4321 est Privé/);
});

test('failure of one helper is reported without suppressing the other or leaking its output', async t => {
  const f = await fixture(t);
  const monitor = await f.run({ FIXTURE_MONITOR_FAIL: '1' });
  assert.deepEqual(monitor.calls.map(call => call.kind), ['privacy', 'monitor', 'preview']);
  assert.match(monitor.output, /arrêt automatique/);
  const preview = await f.run({ FIXTURE_PREVIEW_FAIL: '1' });
  assert.deepEqual(preview.calls.map(call => call.kind), ['privacy', 'monitor', 'preview']);
  assert.match(preview.output, /relance de l’aperçu a échoué/);
});

test('outside Codespaces or with an invalid identity the legacy entry performs no actions', async t => {
  const f = await fixture(t);
  for (const env of [{ CODESPACES: '' }, { CODESPACES: 'false' }, { CODESPACE_NAME: '' },
    { CODESPACE_NAME: 'invalid/name' }, { CODESPACE_NAME: '$(touch injected)' }]) {
    assert.deepEqual(await f.run(env), { calls: [], output: '' });
  }
});
