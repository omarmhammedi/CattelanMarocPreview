import { env } from 'cloudflare:workers';
import { definePlugin } from 'emdash';
import { deliverEmail } from './transport.ts';

export function createPlugin() {
  return definePlugin({
    id: 'cattelan-resend', version: '0.1.0',
    capabilities: ['hooks.email-transport:register'],
    hooks: {
      'email:deliver': async ({ message }) => {
        await deliverEmail(message, (env as unknown as { RESEND_API_KEY?: string }).RESEND_API_KEY);
      },
    },
  });
}
