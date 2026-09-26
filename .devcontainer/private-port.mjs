import { spawnSync } from 'node:child_process';

// GitHub already forwards new ports privately. Restore that visibility when
// reattaching to a Codespace that may have been used for a public design review.
const name = process.env.CODESPACE_NAME;
if (process.env.CODESPACES === 'true' && name) {
  const result = spawnSync('gh', ['codespace', 'ports', 'visibility', '4321:private', '--codespace', name], {
    stdio: 'pipe',
    timeout: 15_000,
  });
  if (result.status !== 0) {
    console.warn('Vérifiez dans Ports que 4321 est Privé avant de configurer EmDash.');
  }
}
