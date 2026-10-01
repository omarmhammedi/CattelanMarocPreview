import assert from 'node:assert/strict';
import test from 'node:test';
import { applySocial, socialChanges } from '../scripts/migrations/0020-social-profiles.mjs';

test('adds Instagram only when the field is empty', async () => {
  assert.deepEqual(socialChanges({ social: { instagram: 'https://www.instagram.com/autre/' } }), {});
  let settings = { title: 'T', social: { facebook: 'https://facebook.com/x' } };
  const api = async (path, { method = 'GET', data } = {}) => { if (method === 'POST') settings = { ...settings, ...data }; return settings; };
  await applySocial(api);
  assert.deepEqual(settings.social, { facebook: 'https://facebook.com/x', instagram: 'https://www.instagram.com/cattelanitalia.ma/' });
  assert.deepEqual(await applySocial(api), {});
});
