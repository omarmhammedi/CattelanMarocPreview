import assert from 'node:assert/strict';
import { test } from 'node:test';
import { createResendProvider } from '../src/plugins/email/provider.ts';

test('the native provider registers as an exclusive transport and delivers system mail', async () => {
  let calls = 0;
  const provider = createResendProvider(() => 're_test', (async () => { calls++; return Response.json({ id: 'accepted' }); }) as typeof fetch);
  assert.ok(provider.capabilities.includes('hooks.email-transport:register'));
  const hook = provider.hooks['email:deliver'];
  assert.ok(hook?.exclusive, 'EmDash only selects exclusive email transports');
  await hook.handler({ message: { to: 'owner@example.test', subject: 'Sign in', text: 'Token' }, source: 'system' }, {} as never);
  assert.equal(calls, 1);
});
