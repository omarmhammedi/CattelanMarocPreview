import assert from 'node:assert/strict';
import test from 'node:test';
import { privacyNotice } from '../src/lib/privacy.ts';
import { applyCndpReceipt, field, planCndpReceipt } from '../scripts/migrations/0017-cndp-receipt.mjs';

test('the form notice names the controller, purpose, retention and rights', () => {
  const text = privacyNotice('rendez-vous', 'contact@cattelanitalia.ma');
  assert.match(text, /^Racha Home traite ces informations pour organiser votre rendez-vous et les conserve trois ans\./u);
  assert.match(text, /loi n° 09-08.*contact@cattelanitalia\.ma\.$/u);
  assert.doesNotMatch(text, /CNDP/u, 'no receipt claimed before it exists');
  assert.match(privacyNotice('pro', 'a@b.ma', ' D-123/2026 '), /déclaré à la CNDP sous le n° D-123\/2026\.$/u);
});

test('migration 0017 adds the receipt field once', async () => {
  const fields = [{ slug: 'public_email', type: 'string' }];
  const api = async (path: string, options: { method?: string; data?: unknown } = {}) => {
    if (options.method === 'POST') { fields.push(options.data as never); return {}; }
    return { item: { fields } };
  };
  await applyCndpReceipt(api, await planCndpReceipt(api));
  assert.equal(fields.at(-1), field);
  assert.equal((await planCndpReceipt(api)).addField, null);
  fields[1] = { slug: 'cndp_receipt', type: 'boolean' };
  await assert.rejects(planCndpReceipt(api), /another type/u);
});
