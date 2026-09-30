import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { parseArgs } from 'node:util';
import { unstable_readConfig } from 'wrangler';

const WORKER = 'cattelan-maroc-preview';
const TARGETS = {
  cattelan: {
    accountId: '8b8bdf3e76e55a18b03f4043effaf7c8',
    origin: 'https://cattelan-maroc-preview.omar-8b8.workers.dev',
    databaseId: 'ca2a675f-d0c6-4f12-b356-423c0018ad80',
    sessionNamespaceId: 'c5b29de1d2384476a027c6a22272bf48',
  },
  'cattelan-client': {
    accountId: 'dba3e3d7b3e2bfbdcca8acf3667916f6',
    origin: 'https://cattelan-maroc-preview.cattelan.workers.dev',
    databaseId: 'c636dd25-e3b1-4f1d-bc8c-e294ec20717e',
    sessionNamespaceId: '29a57d89be95411a962f810e0dbb74ac',
  },
};
const ALLOWED_VARS = ['EMDASH_PREVIEW_PATH_PATTERN', 'EMDASH_SITE_URL', 'SITE_INDEXABLE'];
const resource = (items, fields) => (items || []).map((item) => Object.fromEntries(fields.map((key) => [key, item[key]])));

// This is a read-only checkpoint. It does not authenticate, create resources or deploy.
export function validateCloudflareTarget(source, built, processEnvironment = {}, environment = 'cattelan') {
  assert.ok(Object.hasOwn(TARGETS, environment), 'Unapproved Cloudflare environment');
  const { accountId: ACCOUNT_ID, origin: ORIGIN, databaseId: DATABASE_ID, sessionNamespaceId: SESSION_NAMESPACE_ID } = TARGETS[environment];
  for (const key of ['CLOUDFLARE_ACCOUNT_ID', 'CF_ACCOUNT_ID']) {
    assert.ok(!processEnvironment[key] || processEnvironment[key] === ACCOUNT_ID, `${key} overrides the approved account`);
  }
  for (const [label, config] of [['source environment', source], ['built configuration', built]]) {
    assert.equal(config.account_id, ACCOUNT_ID, `${label}: wrong account`);
    assert.equal(config.name, WORKER, `${label}: wrong Worker`);
    assert.equal(config.workers_dev, true, `${label}: workers.dev must be enabled`);
    assert.equal(config.preview_urls, false, `${label}: version preview URLs must be disabled`);
    assert.ok(!config.route && (!config.routes || config.routes.length === 0), `${label}: unexpected domain route`);
    assert.equal(config.vars?.SITE_INDEXABLE, 'false', `${label}: indexing must remain disabled`);
    assert.equal(config.vars?.EMDASH_PREVIEW_PATH_PATTERN, '/preview/{collection}/{id}/', `${label}: incorrect CMS preview route`);
    assert.deepEqual(Object.keys(config.vars || {}).sort(), ALLOWED_VARS, `${label}: unexpected or missing variable`);
    assert.equal(config.vars.EMDASH_SITE_URL, ORIGIN, `${label}: public origin differs from the approved target`);
    const origin = new URL(config.vars.EMDASH_SITE_URL);
    assert.ok(origin.protocol === 'https:' && origin.hostname.startsWith(`${WORKER}.`) && origin.hostname.endsWith('.workers.dev'), `${label}: unexpected public origin`);
    assert.equal(origin.origin, config.vars.EMDASH_SITE_URL, `${label}: public origin must not contain a path, query or credentials`);
    assert.equal(config.d1_databases?.length, 1, `${label}: exactly one D1 database required`);
    const database = config.d1_databases[0];
    assert.equal(database.binding, 'DB', `${label}: incorrect D1 binding`);
    assert.equal(database.database_name, WORKER, `${label}: wrong database name`);
    assert.match(database.database_id || '', /^[a-f0-9]{8}(?:-[a-f0-9]{4}){3}-[a-f0-9]{12}$/i, `${label}: missing D1 ID`);
    assert.equal(database.database_id, DATABASE_ID, `${label}: unapproved D1 resource`);
    assert.deepEqual(resource(config.r2_buckets, ['binding', 'bucket_name']), [
      { binding: 'MEDIA', bucket_name: 'cattelan-maroc-media-preview' },
      { binding: 'CATALOGUES', bucket_name: 'cattelan-maroc-catalogues-preview' },
    ], `${label}: wrong R2 targets`);
    assert.equal(config.kv_namespaces?.length, 1, `${label}: exactly one KV namespace required`);
    assert.equal(config.kv_namespaces[0].binding, 'SESSION', `${label}: incorrect KV binding`);
    assert.match(config.kv_namespaces[0].id || '', /^[a-f0-9]{32}$/i, `${label}: missing session namespace ID`);
    assert.equal(config.kv_namespaces[0].id, SESSION_NAMESPACE_ID, `${label}: unapproved session namespace`);
    for (const key of ['services', 'send_email', 'workflows', 'dispatch_namespaces', 'worker_loaders', 'hyperdrive', 'vectorize', 'secrets_store_secrets', 'pipelines', 'analytics_engine_datasets', 'mtls_certificates', 'vpc_services', 'vpc_networks']) {
      assert.ok(!config[key] || config[key].length === 0, `${label}: unexpected external binding ${key}`);
    }
    assert.ok(!config.durable_objects?.bindings?.length, `${label}: unexpected Durable Object`);
    assert.ok(!config.queues?.producers?.length && !config.queues?.consumers?.length, `${label}: unexpected queue`);
    assert.equal(config.observability?.enabled, true, `${label}: observability missing`);
    assert.equal(config.observability?.logs?.enabled, true, `${label}: application logs missing`);
    assert.equal(config.observability?.logs?.invocation_logs, false, `${label}: invocation URLs must not be logged`);
    assert.equal(config.observability?.traces?.enabled, true, `${label}: trace configuration missing`);
    assert.equal(config.observability?.traces?.head_sampling_rate, 0, `${label}: trace sampling requires a separate privacy review`);
  }
  assert.deepEqual(built.vars, source.vars, 'Built variables differ from the approved source environment');
  assert.deepEqual(resource(built.d1_databases, ['binding', 'database_id', 'database_name']), resource(source.d1_databases, ['binding', 'database_id', 'database_name']), 'Built D1 target differs from source');
  assert.deepEqual(resource(built.kv_namespaces, ['binding', 'id']), resource(source.kv_namespaces, ['binding', 'id']), 'Built KV target differs from source');
  assert.equal(built.compatibility_date, source.compatibility_date, 'Built compatibility date differs from source');
  assert.deepEqual(built.compatibility_flags, source.compatibility_flags, 'Built compatibility flags differ from source');
  assert.deepEqual(built.triggers, source.triggers, 'Built schedules differ from source');
  assert.equal(built.assets?.binding, 'ASSETS', 'Missing Astro static assets');
  assert.ok(!built.images || built.images.binding === 'IMAGES', 'Unexpected image binding');
  assert.equal(built.no_bundle, true, 'Configuration does not describe an Astro build');
  assert.ok(typeof built.main === 'string' && built.main.endsWith('.mjs'), 'Expected compiled Worker entrypoint');
  return { accountId: ACCOUNT_ID, worker: WORKER, origin: built.vars.EMDASH_SITE_URL, database: source.d1_databases[0].database_name, media: source.r2_buckets.map(({ bucket_name }) => bucket_name) };
}

if (import.meta.url === pathToFileURL(resolve(process.argv[1] || '')).href) {
  try {
    const { values, positionals } = parseArgs({ options: { env: { type: 'string', default: 'cattelan' } }, allowPositionals: true });
    assert.ok(positionals.length <= 1, 'Usage: node scripts/check-cloudflare-target.mjs [built-wrangler.json] [--env cattelan|cattelan-client]');
    assert.ok(Object.hasOwn(TARGETS, values.env), 'Unapproved Cloudflare environment');
    const source = unstable_readConfig({ config: 'wrangler.jsonc', env: values.env }, { hideWarnings: true });
    const built = JSON.parse(await readFile(positionals[0] || 'dist/server/wrangler.json', 'utf8'));
    console.log(JSON.stringify({ ok: true, environment: values.env, ...validateCloudflareTarget(source, built, process.env, values.env) }, null, 2));
  } catch (error) {
    console.error(`Cloudflare deployment target check failed: ${error.message}`);
    process.exitCode = 1;
  }
}
