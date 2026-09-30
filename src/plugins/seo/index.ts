import { fileURLToPath } from 'node:url';
import type { PluginDescriptor } from 'emdash';

/** First-party metadata hook; no routes, secrets, storage or network access. */
export function siteSeoPlugin(): PluginDescriptor {
  return {
    id: 'cattelan-seo', version: '0.1.0', format: 'native',
    entrypoint: fileURLToPath(new URL('./runtime.ts', import.meta.url)),
  };
}
