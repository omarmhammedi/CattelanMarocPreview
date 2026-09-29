import { getRequestContext } from 'emdash';
import type { PublicPageContext } from 'emdash';
import { schemaProjection } from './structured-data.ts';

type Projection = ReturnType<typeof schemaProjection>;
type Store = WeakMap<object, Map<string, Projection>>;
// The native context is request-local. The symbol only shares the WeakMap
// between split bundles; no entry can be looked up by another request.
const storeKey = Symbol.for('cattelan:rendered-seo');
const globals = globalThis as Record<symbol, unknown>;
const store = (globals[storeKey] as Store | undefined) ?? new WeakMap<object, Map<string, Projection>>();
globals[storeKey] = store;
const key = (page: PublicPageContext) => JSON.stringify([page.url, page.content?.collection, page.content?.id]);

/** Pass the rendered CMS values to the native metadata hook without requerying. */
export function rememberRenderedSeo(page: PublicPageContext, site?: Record<string, any>, entry?: Record<string, any>): void {
  const context = getRequestContext();
  if (!context) return;
  const projection = schemaProjection(page, site, entry);
  if (!projection.entry) return;
  let pages = store.get(context);
  if (!pages) { pages = new Map(); store.set(context, pages); }
  pages.set(key(page), projection);
}

export function renderedSeo(page: PublicPageContext): Projection {
  const context = getRequestContext();
  return context ? store.get(context)?.get(key(page)) || {} : {};
}
