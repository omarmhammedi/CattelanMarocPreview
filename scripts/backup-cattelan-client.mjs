/** Read-only Worker state backup, with optional D1 export. Only encrypted output leaves the runner. */
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { readFile, writeFile, mkdir, mkdtemp, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';

process.umask(0o077);
const account = 'dba3e3d7b3e2bfbdcca8acf3667916f6';
const database = 'c636dd25-e3b1-4f1d-bc8c-e294ec20717e';
const worker = 'cattelan-maroc-preview';
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const command = (file, args) => {
  try { return execFileSync(file, args, { stdio: ['ignore', 'pipe', 'pipe'], maxBuffer: 16 * 1024 * 1024,
    env: { ...process.env, CLOUDFLARE_ACCOUNT_ID: account, CF_ACCOUNT_ID: account } }); }
  catch (error) {
    // Wrangler export prints a signed download URL. Never forward its output.
    throw new Error(`${file.split('/').at(-1)} failed (exit ${error.status ?? 'unknown'}); private command output was not logged.`);
  }
};

async function main() {
  const config = JSON.parse(await readFile('wrangler.jsonc', 'utf8')).env['cattelan-client'];
  assert.equal(config.account_id, account, 'Unexpected Cloudflare account');
  assert.equal(config.name, worker, 'Unexpected Worker');
  assert.equal(config.d1_databases.find(item => item.binding === 'DB')?.database_id, database, 'Unexpected D1 database');
  for (const name of ['CLOUDFLARE_API_BASE_URL', 'CF_API_BASE_URL']) assert(!process.env[name], 'Cloudflare API endpoint overrides are not allowed');
  const token = process.env.CLOUDFLARE_API_TOKEN;
  assert(token, 'Repository CLOUDFLARE_API_TOKEN is unavailable');
  assert(process.env.BACKUP_OUTPUT_DIR, 'Set BACKUP_OUTPUT_DIR to a private runner output directory');
  const recipient = resolve('.github/cattelan-backup-recipient.pem');
  const recipientFingerprint = command('openssl', ['x509', '-in', recipient, '-noout', '-fingerprint', '-sha256']).toString().trim();
  command('openssl', ['x509', '-in', recipient, '-noout', '-checkend', '86400']);
  const api = async (path, label) => {
    const response = await fetch(`https://api.cloudflare.com/client/v4/accounts/${account}/${path}`, {
      headers: { Authorization: `Bearer ${token}` }, redirect: 'error', signal: AbortSignal.timeout(30000),
    });
    if (!response.ok) throw new Error(`Cloudflare ${label} failed: HTTP ${response.status}. Verify the repository token's account/resource permissions.`);
    const body = await response.json();
    assert(body.success, `Cloudflare ${label} was unsuccessful`);
    return body.result;
  };
  const deployments = await api(`workers/scripts/${worker}/deployments`, 'Worker deployment read');
  assert(deployments.deployments?.length, 'No deployed Worker version available for rollback');
  const settings = await api(`workers/scripts/${worker}/settings`, 'Worker settings read');
  assert.equal(settings.bindings?.find(item => item.name === 'DB' && item.type === 'd1')?.id, database, 'Live Worker uses a different D1 database');
  assert.equal(settings.bindings?.find(item => item.name === 'SITE_INDEXABLE')?.text, 'false', 'Expected a nonindexable preview');
  const includeDatabase = process.env.BACKUP_INCLUDE_DATABASE === 'true';
  const databaseInfo = includeDatabase ? await api(`d1/database/${database}`, 'D1 metadata read') : null;
  if (databaseInfo) assert.equal(databaseInfo.uuid, database, 'Cloudflare returned a different database');
  const privateDir = await mkdtemp(join(tmpdir(), 'cattelan-private-backup-'));
  try {
    let bytes = null;
    if (includeDatabase) {
      const sql = join(privateDir, 'database.sql');
      command(resolve('node_modules/.bin/wrangler'), ['d1', 'export', worker, '--remote', '--config', 'wrangler.jsonc', '--env', 'cattelan-client', '--skip-confirmation', '--output', sql]);
      assert((await stat(sql)).size > 0, 'Database export is empty');
      bytes = await readFile(sql);
      assert(bytes.includes(Buffer.from('CREATE TABLE')), 'Database export does not contain schema');
    }
    await writeFile(join(privateDir, 'cloudflare-state.json'), JSON.stringify({ database: databaseInfo, deployments, settings }, null, 2), { mode: 0o600 });
    const archive = join(privateDir, 'backup.tar.gz');
    command('tar', ['-czf', archive, '-C', privateDir, 'cloudflare-state.json', ...(includeDatabase ? ['database.sql'] : [])]);
    const output = resolve(process.env.BACKUP_OUTPUT_DIR);
    await mkdir(output, { recursive: false, mode: 0o700 });
    const encrypted = join(output, 'backup.cms');
    command('openssl', ['cms', '-encrypt', '-binary', '-aes-256-gcm', '-in', archive, '-outform', 'DER', '-out', encrypted, recipient]);
    const manifest = {
      createdAt: new Date().toISOString(), sourceCommit: process.env.GITHUB_SHA || null,
      account, database, worker, encryption: 'CMS AuthEnvelopedData AES-256-GCM', recipientFingerprint,
      includesDatabase: includeDatabase, databaseBytes: bytes?.length ?? null, databaseSha256: bytes ? hash(bytes) : null, encryptedSha256: hash(await readFile(encrypted)),
      deploymentId: deployments.deployments[0].id, versions: deployments.deployments[0].versions,
    };
    await writeFile(join(output, 'manifest.json'), JSON.stringify(manifest, null, 2), { mode: 0o600 });
    // Some managed workspaces cannot reach GitHub's artifact blob host. A small
    // encrypted Worker-state envelope can also be recovered through the logs API.
    // Never log a database archive, plaintext settings, or a private key.
    const ciphertext = await readFile(encrypted);
    if (!includeDatabase && process.env.BACKUP_LOG_ENVELOPE === 'true' && ciphertext.length <= 32768) {
      console.log(`CATTELAN_ENCRYPTED_ENVELOPE ${JSON.stringify({ manifest, ciphertext: ciphertext.toString('base64') })}`);
    }
    console.log(`Worker rollback state encrypted; D1 export included: ${includeDatabase}. Decrypt and verify before migration; a separate native CMS backup is required when D1 is not exported.`);
  } finally {
    await rm(privateDir, { recursive: true, force: true });
  }
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
