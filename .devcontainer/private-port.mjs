import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

// GitHub already forwards new ports privately. Restore that visibility when
// reattaching to a Codespace that may have been used for a public design review.
// Older running containers still invoke only this file on editor attachment.
// Keep that installed entry point connected to the current startup helpers.
const name = process.env.CODESPACE_NAME;
if (process.env.CODESPACES === 'true' && /^[a-zA-Z0-9-]+$/.test(name || '')) {
  const root = fileURLToPath(new URL('../', import.meta.url));
  const result = spawnSync('gh', ['codespace', 'ports', 'visibility', '4321:private', '--codespace', name], {
    cwd: root,
    stdio: 'pipe',
    timeout: 15_000,
  });
  if (result.status !== 0) {
    console.warn('Vérifiez dans Ports que 4321 est Privé avant de configurer EmDash.');
  }

  // These helpers detach their own work, honor their disable flags, and use
  // locks to avoid duplicates with newer postStart/postAttach or SSH hooks.
  const monitor = spawnSync(process.execPath, [fileURLToPath(new URL('./task-autostop.mjs', import.meta.url)), 'start'], {
    cwd: root, stdio: 'pipe', timeout: 10_000,
  });
  if (monitor.status !== 0) console.warn('Le suivi de l’arrêt automatique n’a pas pu démarrer.');

  // A failed visibility check must not start an administration port that may
  // have been made public. Cost-control monitoring can still run independently.
  if (result.status === 0) {
    const preview = spawnSync('bash', [fileURLToPath(new URL('./preview-start.sh', import.meta.url)), 'start'], {
      cwd: root, stdio: 'pipe', timeout: 10_000,
    });
    if (preview.status !== 0) console.warn('La relance de l’aperçu a échoué ; consultez .astro/preview-start.log.');
  }
}
