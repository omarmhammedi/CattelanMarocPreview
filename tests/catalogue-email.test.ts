import assert from 'node:assert/strict';
import { test } from 'node:test';
import { catalogueEmail, dispatchCatalogueEmail } from '../src/plugins/catalogue/email.ts';
import { EMAIL_DOWNLOAD_LIFETIME_MS, LEASE_MS, persistRequest, verifyDownload, type AtomicStore, type Lead } from '../src/plugins/catalogue/core.ts';
class Store implements AtomicStore<Lead> {
  row: { value: Lead; revision: string } | null = null;
  revision = 0;
  async getVersioned() { return structuredClone(this.row); }
  async compareAndSet(_id: string, revision: string | null, value: Lead) {
    if ((this.row?.revision ?? null) !== revision) return { applied: false };
    this.row = { value: structuredClone(value), revision: String(++this.revision) }; return { applied: true };
  }
}
const secret = 'catalogue-test-secret-more-than-thirty-two-characters';
async function setup(enabled = true) {
  const store = new Store();
  const input = { requestId: crypto.randomUUID(), name: '<Salma & Test>', email: 'test@example.test', whatsapp: '+212 600 000 007', city: 'Casablanca' as const, catalogueId: 'preview', communicationsConsent: false, sourcePath: '/catalogue/' };
  const lead = await persistRequest(store, input, { id: 'preview', key: 'catalogues/demo.pdf', title: 'Preview <PDF>', placeholder: true }, 1000, enabled);
  return { store, lead, input };
}

test('new requests opt into a transactional outbox without changing marketing consent', async () => {
  const { store, lead, input } = await setup();
  assert.equal(lead.emailStatus, 'pending'); assert.equal(lead.communicationsConsent, false);
  await persistRequest(store, input, lead.catalogue, 2000, true);
  assert.equal(store.row?.value.createdAt, 1000);
});

test('historical requests do not send emails when the provider is enabled', async () => {
  const { store, lead } = await setup(false);
  assert.equal(await dispatchCatalogueEmail(store, lead.requestId, async () => assert.fail('historical email'), 1000), 'skipped');
});

test('concurrent attempts send once, and delivered messages are not sent again', async () => {
  const { store, lead } = await setup(); let sent = 0;
  const send = async () => { sent++; };
  await Promise.all(Array.from({ length: 8 }, () => dispatchCatalogueEmail(store, lead.requestId, send, 1000)));
  assert.equal(sent, 1); assert.equal(store.row?.value.emailStatus, 'sent');
  assert.equal(await dispatchCatalogueEmail(store, lead.requestId, send, 2000), 'skipped');
});

test('provider failure schedules a retry and keeps the request usable', async () => {
  const { store, lead } = await setup();
  assert.equal(await dispatchCatalogueEmail(store, lead.requestId, async () => { throw Error('provider down'); }, 1000), 'pending');
  assert.equal(store.row?.value.emailNextAttemptAt, 61_000);
  assert.equal(store.row?.value.emailAttempts, 1);
  assert.equal(store.row?.value.emailSentAt, null);
  assert.equal(await dispatchCatalogueEmail(store, lead.requestId, async () => {}, 61_000), 'sent');
});

test('expired leases recover after a crash; expired retry windows stop sending', async () => {
  const { store, lead } = await setup();
  store.row!.value.emailStatus = 'processing'; store.row!.value.emailLeaseUntil = 1000 + LEASE_MS;
  assert.equal(await dispatchCatalogueEmail(store, lead.requestId, async () => assert.fail('lease active'), 1000), 'skipped');
  assert.equal(await dispatchCatalogueEmail(store, lead.requestId, async () => {}, 1001 + LEASE_MS), 'sent');
  const old = await setup();
  assert.equal(await dispatchCatalogueEmail(old.store, old.lead.requestId, async () => assert.fail('too old'), 1000 + 6 * 60 * 60_000), 'failed');
});

test('deleting a lead while sending does not resurrect it; CRM updates survive', async () => {
  const { store, lead } = await setup();
  await dispatchCatalogueEmail(store, lead.requestId, async () => {
    const latest = (await store.getVersioned())!;
    await store.compareAndSet(lead.requestId, latest.revision, { ...latest.value, crmStatus: 'waiting_configuration' });
  }, 1000);
  assert.equal(store.row?.value.crmStatus, 'waiting_configuration');
  const deleted = await setup();
  await dispatchCatalogueEmail(deleted.store, deleted.lead.requestId, async () => { deleted.store.row = null; }, 1000);
  assert.equal(deleted.store.row, null);
});

test('catalogue message escapes content, is stable for retry, and its signed link expires after 24 hours', async () => {
  const { lead } = await setup();
  const message = await catalogueEmail(lead, 'https://cattelan-maroc-preview.cattelan.workers.dev', secret);
  assert.deepEqual(message, await catalogueEmail(lead, 'https://cattelan-maroc-preview.cattelan.workers.dev', secret));
  assert.ok(message.html.includes('&lt;Salma &amp; Test&gt;'));
  assert.ok(message.html.includes('démonstration'));
  const url = message.text.match(/Télécharger le PDF : (https:\/\/\S+)/)![1];
  const token = new URL(url).searchParams.get('token');
  assert.equal(await verifyDownload(token, secret, 1000 + 20 * 60 * 60_000), lead.requestId);
  assert.equal(await verifyDownload(token, secret, 1000 + EMAIL_DOWNLOAD_LIFETIME_MS), null);
  assert.ok(!JSON.stringify(JSON.parse(Buffer.from(token!.split('.')[0], 'base64url').toString())).includes(lead.email));
});
