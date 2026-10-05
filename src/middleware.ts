import { defineMiddleware } from 'astro:middleware';
import { guardContentWrite } from './lib/content-write-policy';

// EmDash's integration installs authentication/scopes as pre-middleware. Keep
// that lifecycle and every native endpoint; refuse only the unsafe write shape.
export const onRequest = defineMiddleware(async ({ request, locals }, next) => {
  if (!locals.user) return next();
  const refusal = await guardContentWrite(request);
  return refusal || next();
});
