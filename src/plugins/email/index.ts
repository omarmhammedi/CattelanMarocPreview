import { fileURLToPath } from 'node:url';
import type { PluginDescriptor } from 'emdash';

export function resendEmailPlugin(): PluginDescriptor {
  return {
    id: 'cattelan-resend', version: '0.1.0', format: 'native',
    entrypoint: fileURLToPath(new URL('./runtime.ts', import.meta.url)),
  };
}
