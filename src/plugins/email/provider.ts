import { definePlugin } from 'emdash';
import { deliverEmail } from './transport.ts';

export function createResendProvider(getApiKey: () => string | undefined, request: typeof fetch = fetch) {
  return definePlugin({
    id: 'cattelan-resend', version: '0.1.0',
    capabilities: ['hooks.email-transport:register'],
    hooks: {
      'email:deliver': {
        exclusive: true,
        handler: async ({ message }) => { await deliverEmail(message, getApiKey(), request); },
      },
    },
  });
}
