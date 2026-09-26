import { randomBytes } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { chmod, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { parseEnv } from 'node:util';

const project = fileURLToPath(new URL('../', import.meta.url));
const target = new URL('../.dev.vars', import.meta.url);
const cli = fileURLToPath(new URL('../node_modules/emdash/dist/cli/index.mjs', import.meta.url));

let existing;
try {
  existing = await readFile(target, 'utf8');
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
  existing = '# Secrets locaux — ne pas versionner.\n';
}

const configured = parseEnv(existing);
let next = existing;
let created = 0;

function addMissing(name, value) {
  const pattern = new RegExp(`^(?:export\\s+)?${name}\\s*=.*$`, 'm');
  const line = `${name}=${value}`;
  if (pattern.test(next)) next = next.replace(pattern, line);
  else next += `${next.endsWith('\n') ? '' : '\n'}${line}\n`;
  created += 1;
}

if (!configured.EMDASH_ENCRYPTION_KEY) {
  // Use the installed EmDash release to produce its versioned encryption key.
  // Capture stdout: secret material must never appear in the setup log.
  const result = spawnSync(process.execPath, [cli, 'secrets', 'generate'], {
    cwd: project,
    encoding: 'utf8',
    stdio: 'pipe',
    timeout: 30_000,
  });
  const key = result.stdout?.trim();
  if (result.status !== 0 || !/^emdash_enc_v1_[A-Za-z0-9_-]+$/.test(key ?? '')) {
    throw new Error('Impossible de générer la clé EmDash. Exécutez npm ci puis relancez ce script.');
  }
  addMissing('EMDASH_ENCRYPTION_KEY', key);
}

if (!configured.CATALOGUE_TOKEN_SECRET) {
  addMissing('CATALOGUE_TOKEN_SECRET', randomBytes(32).toString('base64url'));
}

if (process.env.CODESPACES === 'true' && !configured.EMDASH_SITE_URL) {
  const name = process.env.CODESPACE_NAME;
  const domain = process.env.GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN || 'app.github.dev';
  if (name && /^[a-z0-9-]+$/i.test(name) && /^[a-z0-9.-]+$/i.test(domain)) {
    // Passkeys must use the browser-facing HTTPS origin, not the local HTTP
    // address behind the Codespaces reverse proxy.
    addMissing('EMDASH_SITE_URL', `https://${name}-4321.${domain}`);
  }
}

if (created) {
  await writeFile(target, next.endsWith('\n') ? next : `${next}\n`, { mode: 0o600 });
}
await chmod(target, 0o600);
console.log(created ? 'Configuration locale complétée dans .dev.vars ; valeurs existantes conservées.' : 'Configuration locale déjà prête ; aucune valeur modifiée.');
console.log('Démarrage : npm run dev. Administration : /_emdash/admin.');
