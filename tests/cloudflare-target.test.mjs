import assert from 'node:assert/strict';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { unstable_readConfig } from 'wrangler';
import { validateCloudflareTarget } from '../scripts/check-cloudflare-target.mjs';

// Read the actual source environment; no build, credentials or remote calls.
const config = fileURLToPath(new URL('../wrangler.jsonc', import.meta.url));
const approved = unstable_readConfig({ config, env: 'cattelan' }, { hideWarnings: true });
function fixture() {
  return {
    source: structuredClone(approved),
    built: {
      ...structuredClone(approved), main: 'entry.mjs', no_bundle: true,
      assets: { binding: 'ASSETS', directory: '../client' },
      images: { binding: 'IMAGES' },
    },
  };
}

test('the approved Cattelan environment and corresponding Astro build can deploy', () => {
  const { source, built } = fixture();
  const result = validateCloudflareTarget(source, built, {
    CLOUDFLARE_ACCOUNT_ID: source.account_id, CF_ACCOUNT_ID: source.account_id,
  });
  assert.equal(result.worker, 'cattelan-maroc-preview');
  assert.equal(result.origin, 'https://cattelan-maroc-preview.omar-8b8.workers.dev');
});

test('the local default configuration cannot be mistaken for an approved deployment', () => {
  const local = unstable_readConfig({ config }, { hideWarnings: true });
  const { built } = fixture();
  assert.throws(() => validateCloudflareTarget(local, built), /wrong account/);
});

// A copied build can agree with a mistakenly edited source. Both still must be
// rejected: equality alone must never authorize resources belonging to another site.
const unsafeTargets = [
  ['another account', value => { value.account_id = '11111111111111111111111111111111'; }, /wrong account/],
  ['another Worker', value => { value.name = 'another-site'; }, /wrong Worker/],
  ['another D1 database', value => { value.d1_databases[0].database_id = '11111111-1111-4111-8111-111111111111'; }, /unapproved D1 resource/],
  ['another session namespace', value => { value.kv_namespaces[0].id = '11111111111111111111111111111111'; }, /unapproved session namespace/],
  ['another media bucket', value => { value.r2_buckets[0].bucket_name = 'another-site-media'; }, /wrong R2 targets/],
  ['another Workers origin', value => { value.vars.EMDASH_SITE_URL = 'https://cattelan-maroc-preview.other-account.workers.dev'; }, /public origin differs/],
  ['a custom domain route', value => { value.routes = [{ pattern: 'another-site.example/*', zone_name: 'another-site.example' }]; }, /unexpected domain route/],
  ['a service binding to another Worker', value => { value.services = [{ binding: 'OTHER_SITE', service: 'another-site' }]; }, /unexpected external binding services/],
  ['request URL logging', value => { value.observability.logs.invocation_logs = true; }, /invocation URLs must not be logged/],
  ['a secret exposed as a plain variable', value => { value.vars.EMDASH_ENCRYPTION_KEY = 'synthetic-test-value-not-a-secret'; }, /unexpected or missing variable/],
];
for (const [name, alter, expectedError] of unsafeTargets) {
  test(`matching source and build cannot authorize ${name}`, () => {
    const { source, built } = fixture();
    alter(source);
    alter(built);
    assert.throws(() => validateCloudflareTarget(source, built), expectedError);
  });
}

for (const variable of ['CLOUDFLARE_ACCOUNT_ID', 'CF_ACCOUNT_ID']) {
  test(`${variable} cannot redirect an otherwise approved deployment`, () => {
    const { source, built } = fixture();
    assert.throws(() => validateCloudflareTarget(source, built, {
      [variable]: '11111111111111111111111111111111',
    }), /overrides the approved account/);
  });
}

test('a stale build targeting another Worker is rejected even when the source is correct', () => {
  const { source, built } = fixture();
  built.name = 'another-site';
  assert.throws(() => validateCloudflareTarget(source, built), /built configuration: wrong Worker/);
});
