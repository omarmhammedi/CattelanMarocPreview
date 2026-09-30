import assert from 'node:assert/strict';
import { test } from 'node:test';
import { deliverEmail } from '../src/plugins/email/transport.ts';

const message = { to: 'owner@example.test', subject: 'Sign in', text: 'Private one-time link', html: '<p>Private one-time link</p>' };

test('maps native CMS mail to Resend with the approved sender and stable retry key', async () => {
  const calls: { url: unknown; init: RequestInit }[] = [];
  const request = (async (url, init) => { calls.push({ url, init: init! }); return Response.json({ id: 'accepted-id' }); }) as typeof fetch;
  await deliverEmail({ ...message, cc: ['editor@example.test'] }, 're_test', request);
  await deliverEmail({ ...message, cc: ['editor@example.test'] }, 're_test', request);
  assert.equal(calls[0].url, 'https://api.resend.com/emails');
  const data = JSON.parse(calls[0].init.body as string);
  assert.equal(data.from, 'Cattelan Italia Maroc <cattelan@client.kreedns.com>');
  assert.equal(data.reply_to, 'cattelan@client.kreedns.com');
  assert.deepEqual(data.to, [message.to]);
  assert.deepEqual(data.cc, ['editor@example.test']);
  assert.equal(data.html, message.html);
  assert.equal(new Headers(calls[0].init.headers).get('Authorization'), 'Bearer re_test');
  assert.equal(new Headers(calls[0].init.headers).get('Idempotency-Key'), new Headers(calls[1].init.headers).get('Idempotency-Key'));
  assert.equal(calls[0].init.redirect, 'manual');
  assert.ok(calls[0].init.signal);
});

test('preserves explicit reply-to and different messages get different retry keys', async () => {
  const calls: RequestInit[] = [];
  const request = (async (_url, init) => { calls.push(init!); return Response.json({ id: 'accepted-id' }); }) as typeof fetch;
  await deliverEmail({ ...message, replyTo: 'support@example.test' }, 're_test', request);
  await deliverEmail({ ...message, text: 'Another one-time link' }, 're_test', request);
  assert.equal(JSON.parse(calls[0].body as string).reply_to, 'support@example.test');
  assert.notEqual(new Headers(calls[0].headers).get('Idempotency-Key'), new Headers(calls[1].headers).get('Idempotency-Key'));
});

test('missing configuration fails without making a network call', async () => {
  const request = (async () => { assert.fail('must not send'); }) as typeof fetch;
  await assert.rejects(deliverEmail(message, undefined, request), /not configured/);
});

test('rejections and network failures expose no provider body, token or recipient', async () => {
  await assert.rejects(deliverEmail(message, 're_private', (async () => Response.json({ message: 're_private owner@example.test' }, { status: 403 })) as typeof fetch), { message: 'Resend email delivery failed (HTTP 403).' });
  await assert.rejects(deliverEmail(message, 're_private', (async () => { throw new Error('re_private owner@example.test'); }) as typeof fetch), { message: 'Resend email delivery could not be confirmed.' });
});

test('a successful HTTP status must contain a valid delivery id', async () => {
  await assert.rejects(deliverEmail(message, 're_test', (async () => Response.json({})) as typeof fetch), /did not confirm/);
});


test('redirects are rejected without forwarding the sending key', async () => {
  await assert.rejects(deliverEmail(message, 're_test', (async (_url, init) => {
    assert.equal(init?.redirect, 'manual');
    return new Response(null, { status: 307, headers: { Location: 'https://untrusted.example' } });
  }) as typeof fetch), { message: 'Resend email delivery failed (HTTP 307).' });
});
