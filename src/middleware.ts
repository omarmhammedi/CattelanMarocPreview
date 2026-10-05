import { defineMiddleware } from 'astro:middleware';
import { guardContentWrite } from './lib/content-write-policy';
import { canonicalPublicResponse } from './lib/seo-policy';
import { renderedNativeCanonical } from './lib/seo-render-context';

// EmDash's integration installs authentication/scopes as pre-middleware. Keep
// that lifecycle and every native endpoint; refuse only the unsafe write shape.
export const onRequest = defineMiddleware(async ({ request, locals }, next) => {
  const refusal = locals.user ? await guardContentWrite(request) : null;
  if (refusal) return refusal;
  const response = await next();
  return canonicalPublicResponse(request, response, renderedNativeCanonical(request.url));
});
