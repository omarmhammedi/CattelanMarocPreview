type Site = {
  name?: unknown;
  tagline?: unknown;
  address?: unknown;
  hours?: unknown;
  phone?: unknown;
  publicEmail?: unknown;
};
type Faq = {
  sections?: Array<{key?: string; heading?: unknown; displayHeading?: unknown; text?: unknown}>;
};
type Seo = {noIndex?: boolean; canonical?: string | null};

const pages = [
  ['Collections', '/collections/'], ['Sur-mesure et matières', '/sur-mesure/'], ['Showroom de Casablanca', '/showroom-casablanca/'],
  ['Commande et livraison', '/votre-projet/'], ['Architectes & projets', '/professionnels/'], ['Questions fréquentes', '/faq/'],
  ['À propos', '/a-propos/'], ['Catalogue', '/catalogue/'], ['Journal', '/journal/'],
] as const;

const text = (value: unknown) => typeof value === 'string' ? value.trim() : '';
const lineText = (value: unknown) => text(value).replace(/\s*\n\s*/gu, ' ; ');

/** Follow the native canonical when it is a public web URL, never a private protocol. */
function faqUrl(origin: string, canonical?: string | null): string {
  const fallback = new URL('/faq/', origin).href;
  if (!canonical?.trim()) return fallback;
  try {
    const source = canonical.trim();
    const url = new URL(/^[a-z][a-z\d+.-]*:|^\/\//iu.test(source) ? source : `/${source.replace(/^\//u, '')}`, origin);
    return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password ? url.href : fallback;
  } catch { return fallback; }
}

/**
 * Optional reader aid, not a ranking mechanism. Business answers are copied
 * from the same published FAQ sections as the website, never a second set of
 * payment, delivery or personalization promises maintained in source code.
 */
export function llmsText({site, origin, faq, faqSeo}: {site: Site; origin: string; faq?: Faq | null; faqSeo?: Seo | null}): string {
  const line = (label: string, value: unknown) => lineText(value) ? [`- ${label} : ${lineText(value)}`] : [];
  const source = faqUrl(origin, faqSeo?.canonical);
  const includeFaq = !!faq && !faqSeo?.noIndex;
  const questions = includeFaq ? (faq.sections || []).flatMap(section => {
    const heading = lineText(section.displayHeading) || lineText(section.heading);
    const answer = text(section.text);
    return section.key?.startsWith('faq_') && heading && answer ? [`### ${heading}`, '', answer, ''] : [];
  }) : [];
  return [
    `# ${lineText(site.name)}`, '',
    ...(text(site.tagline) ? [`> ${lineText(site.tagline)}`, ''] : []),
    '## Showroom',
    ...line('Adresse', site.address), ...line('Horaires', site.hours),
    ...line('Téléphone', site.phone), ...line('E-mail', site.publicEmail), '',
    ...(questions.length ? ['## Questions fréquentes', '', `Source : [FAQ du site](${source})`, '', ...questions] : []),
    '## Pages',
    ...pages.flatMap(([label, path]) => path === '/faq/' && !includeFaq ? [] : [`- [${label}](${path === '/faq/' ? source : new URL(path, origin).href})`]), '',
  ].join('\n');
}

/** The discovery endpoint only serves published content, even with a valid preview token. */
export async function llmsResponse({url, indexable, loadContent}: {
  url: URL;
  indexable: boolean;
  loadContent: () => Promise<Parameters<typeof llmsText>[0]>;
}): Promise<Response> {
  if (url.searchParams.has('_preview')) return new Response('Not found', {
    status: 404,
    headers: {'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'private, no-store', 'X-Robots-Tag': 'noindex, nofollow'},
  });
  const text = llmsText(await loadContent());
  return new Response(text, {headers: {
    'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store',
    ...(indexable ? {} : {'X-Robots-Tag': 'noindex'}),
  }});
}
