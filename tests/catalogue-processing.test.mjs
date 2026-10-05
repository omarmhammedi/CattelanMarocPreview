import assert from 'node:assert/strict';
import test from 'node:test';
import { registerHooks } from 'node:module';
import { persistRequest } from '../src/plugins/catalogue/core.ts';

// Exercise the actual route and cron handlers with an isolated in-memory store
// and a fake email transport. No provider or customer receives a message.
const modules = {
  'cloudflare:workers': `export const env = { RESEND_API_KEY: 'synthetic-test-provider', EMDASH_SITE_URL: 'https://example.test', CATALOGUE_TOKEN_SECRET: 'synthetic-test-secret-more-than-thirty-two-characters', CATALOGUES: {} };`,
  emdash: 'export const definePlugin = value => value; export const definePluginRoute = value => value; export const pluginResponse = value => value; export const getEmDashEntry = () => { throw Error("Unexpected public read"); };',
};
const hooks = registerHooks({
  resolve(specifier, context, nextResolve) {
    if (Object.hasOwn(modules, specifier)) return { shortCircuit: true, url: `data:text/javascript,${encodeURIComponent(modules[specifier])}` };
    return nextResolve(specifier, context);
  },
});
const { createPlugin } = await import('../src/plugins/catalogue/runtime.ts');
hooks.deregister();

async function fixture() {
  let row = null;
  let version = 0;
  const emailQueries = [];
  const messages = [];
  const store = {
    async getVersioned() { return structuredClone(row); },
    async compareAndSet(_id, expected, value) {
      if ((row?.revision ?? null) !== expected) return { applied: false };
      row = { value: structuredClone(value), revision: String(++version) };
      return { applied: true };
    },
    async query({ where }) {
      if (where.emailStatus) {
        emailQueries.push(where.emailStatus);
        return { items: row?.value.emailStatus === where.emailStatus ? [{ id: row.value.requestId, data: row.value }] : [] };
      }
      if (where.crmStatus && row?.value.crmStatus === where.crmStatus) return { items: [{ id: row.value.requestId, data: row.value }] };
      return { items: [] };
    },
  };
  await persistRequest(store, { requestId: crypto.randomUUID(), name: 'Synthetic contact', email: 'test@example.test', whatsapp: '+212600000001', city: 'Casablanca', catalogueId: 'test', communicationsConsent: false, sourcePath: '/catalogue/' }, { id: 'test', key: 'catalogues/test.pdf', title: 'Synthetic PDF', placeholder: true }, Date.now(), true);
  return { emailQueries, messages, get row() { return row; }, ctx: { storage: { leads: store, rates: { async query() { return { items: [] }; } } }, email: { async send(message) { messages.push(message); } } } };
}

test('manual CRM simulation never queries or sends the pending email outbox', async () => {
  const setup = await fixture();
  const plugin = createPlugin();
  const route = plugin.routes['crm/process'];
  assert.equal(route.permission, 'plugins:manage');
  const result = await route.handler(setup.ctx);
  assert.equal(result.mode, 'mock');
  assert.equal(result.processed, 1);
  assert.match(result.message, /Aucun e-mail/);
  assert.deepEqual(setup.emailQueries, []);
  assert.equal(setup.messages.length, 0);
  assert.equal(setup.row.value.emailStatus, 'pending');
  assert.equal(setup.row.value.crmStatus, 'waiting_configuration');
});

test('scheduled processing still delivers pending catalogue email once', async () => {
  const setup = await fixture();
  const plugin = createPlugin();
  await plugin.hooks.cron({ name: 'catalogue-crm' }, setup.ctx);
  assert.deepEqual(setup.emailQueries, ['pending', 'processing']);
  assert.equal(setup.messages.length, 1);
  assert.equal(setup.row.value.emailStatus, 'sent');
  await plugin.hooks.cron({ name: 'catalogue-crm' }, setup.ctx);
  assert.equal(setup.messages.length, 1);
});
