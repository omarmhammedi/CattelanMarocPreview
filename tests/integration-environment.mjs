import assert from 'node:assert/strict';
import { readFile, realpath } from 'node:fs/promises';
import { resolve, sep } from 'node:path';

// These tests create an administrator, revisions, and synthetic contacts.
// A disposable checkout must explicitly identify its own state and origin.
export async function integrationEnvironment() {
  assert(process.env.CMS_TEST_URL, 'Set CMS_TEST_URL to a dedicated disposable local server.');
  const base = new URL(process.env.CMS_TEST_URL);
  assert(base.protocol === 'http:' && ['localhost', '127.0.0.1', '[::1]'].includes(base.hostname), 'Integration tests require a local HTTP server.');
  assert(base.port && base.port !== '4321', 'Port 4321 belongs to the preserved preview; use a separate test port.');
  assert(base.pathname === '/' && !base.search && !base.hash && !base.username && !base.password, 'CMS_TEST_URL must contain only the isolated origin.');
  const projectRoot = await realpath('.');
  const stateRoot = await realpath('.wrangler');
  assert(stateRoot.startsWith(`${projectRoot}${sep}`), 'The disposable environment must own its .wrangler directory.');
  assert((await realpath('.dev.vars')).startsWith(`${projectRoot}${sep}`), 'The disposable environment must own its secrets file.');
  const marker = JSON.parse(await readFile(resolve(stateRoot, 'integration-test-environment.json'), 'utf8'));
  assert(marker.disposable === true && marker.projectRoot === projectRoot && marker.origin === base.origin,
    'Missing or mismatched disposable environment marker; never run these tests against the preserved preview.');
  return base;
}
