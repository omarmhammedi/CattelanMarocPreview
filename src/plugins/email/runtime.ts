import { env } from 'cloudflare:workers';
import { createResendProvider } from './provider.ts';

export function createPlugin() {
  return createResendProvider(() => (env as unknown as { RESEND_API_KEY?: string }).RESEND_API_KEY);
}
