import type { BreadcrumbItem, PageMetadataContribution, PublicPageContext } from 'emdash';

type Data = Record<string, any>;
type Graph = Record<string, unknown>;

const text = (value: unknown): string => typeof value === 'string' ? value.trim() : '';

/** Public metadata only accepts web URLs; empty editorial values stay empty. */
export function absoluteWebUrl(value: unknown, origin: string): string | undefined {
  const source = text(value);
  if (!source) return undefined;
  try {
    const url = new URL(source, origin);
    return ['http:', 'https:'].includes(url.protocol) ? url.href : undefined;
  } catch { return undefined; }
}

function mediaSource(value: any): string {
  if (typeof value === 'string') return value;
  const key = value?.meta?.storageKey || value?.id || value?.mediaId;
  return text(value?.src || value?.url) || (key ? `/_emdash/api/media/file/${encodeURIComponent(key)}` : '');
}

/**
 * Keep only schema fields from the entry the template has already rendered.
 * In particular, do not retain hundreds of finish images, content blocks,
 * relationship entries or settings. Native queries have already decided
 * published versus signed-preview visibility; metadata must use that result.
 */
export function schemaProjection(page: PublicPageContext, site?: Data, entry?: Data): {site?: Data; entry?: Data} {
  if (!entry) return {};
  if (page.content?.collection === 'models') return {entry: {
    title: text(entry.title), description: text(entry.description),
    image: mediaSource(entry.hero_image || entry.image),
    gallery: (entry.gallery || []).map((item: Data) => ({image: mediaSource(item.image)})),
    dimensions: (entry.dimensions || []).map((item: Data) => ({label: text(item.label), value: text(item.value)})),
  }};
  if (page.content?.collection !== 'pages' || !['home', 'showroom-casablanca'].includes(page.content.slug || '') || !site) return {};
  const isHome = page.content.slug === 'home';
  const section = (entry.sections || []).find((item: Data) => item.section_key === 'showroom');
  return {
    site: {
      name: text(site.name), address: text(site.address), phone: text(site.phone),
      publicEmail: text(site.publicEmail), hours: text(site.hours), mapUrl: text(site.mapUrl),
      showroomLatitude: coordinate(site.showroomLatitude, 90),
      showroomLongitude: coordinate(site.showroomLongitude, 180),
      logoLight: mediaSource(site.logoLight || site.logoDark),
    },
    entry: {
      slug: page.content.slug,
      ...(isHome ? {showroom_image: mediaSource(section?.image || entry.showroom_image)}
        : {image: mediaSource(entry.hero_image || entry.image)}),
    },
  };
}

export function socialImage(image: unknown, site: Data, path: string, origin: string,
  content?: {collection?: string; slug?: string | null}): string | undefined {
  // The native per-entry SEO image still overrides this template default.
  // Clearing a page image restores the configured site default. Journal alone
  // falls back to the existing brand asset when no editorial image is set.
  return absoluteWebUrl(mediaSource(image), origin)
    // Native setting references without a resolved URL are orphaned. Do not
    // fabricate a file URL from their mediaId and resurrect a broken image.
    || absoluteWebUrl(site.settings?.seo?.defaultOgImage?.url, origin)
    || ((/^\/journal\/?$/.test(path) || (content?.collection === 'pages' && content.slug === 'journal'))
      ? absoluteWebUrl(mediaSource(site.logoLight || site.logoDark), origin)
      : undefined);
}

export function fallbackFavicon(site: Data, origin: string): string | undefined {
  // EmDash renders its configured favicon itself; never emit a duplicate.
  if (site.settings?.favicon?.url) return undefined;
  return absoluteWebUrl(mediaSource(site.logoLight || site.logoDark), origin);
}

export function pageBreadcrumbs(input: {
  path: string; title: string; site: Data; supplied?: BreadcrumbItem[];
}): BreadcrumbItem[] {
  if (input.supplied) return input.supplied;
  const { path, title, site } = input;
  if (path === '/' || path === '/home/' || path.startsWith('/preview/')) return [];
  const crumbs: BreadcrumbItem[] = [];
  if (text(site.name)) crumbs.push({name: text(site.name), url: '/'});
  if (/^\/collections\/[^/]+\/?$/.test(path) && text(site.labels?.collections)) {
    crumbs.push({name: text(site.labels.collections), url: '/collections/'});
  } else if (/^\/journal\/[^/]+\/?$/.test(path) && text(site.labels?.journal)) {
    crumbs.push({name: text(site.labels.journal), url: '/journal/'});
  }
  if (text(title)) crumbs.push({name: text(title), url: path});
  return crumbs;
}

export function breadcrumbGraph(page: PublicPageContext): Graph | undefined {
  const origin = page.siteUrl || page.url;
  const items = (page.breadcrumbs || []).flatMap(item => {
    const url = absoluteWebUrl(item.url, origin);
    return text(item.name) && url ? [{name: text(item.name), url}] : [];
  });
  if (items.length < 2) return undefined;
  return {
    '@context': 'https://schema.org', '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem', position: index + 1, name: item.name,
      item: index === items.length - 1 ? absoluteWebUrl(page.canonical, origin) || item.url : item.url,
    })),
  };
}

const frenchDays = ['lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi', 'dimanche'];
const schemaDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

/** Recognize the documented French weekly-hours format, never guess prose. */
export function openingHours(value: unknown): Graph[] | undefined {
  const lines = text(value).split(/\r?\n/).map(line => line.trim()).filter(Boolean);
  const result: Graph[] = [];
  for (const rawLine of lines) {
    if (/^\(heure de [^()]+\)$/i.test(rawLine)) continue;
    const line = rawLine.toLowerCase().replace(/[–—−]/g, '-');
    const match = line.match(/^([a-zé]+)(?:\s*-\s*([a-zé]+))?\s*:\s*(.+)$/);
    if (!match) return undefined;
    const start = frenchDays.indexOf(match[1]);
    const end = match[2] ? frenchDays.indexOf(match[2]) : start;
    if (start < 0 || end < start) return undefined;
    const dayOfWeek = schemaDays.slice(start, end + 1);
    if (/^ferm[ée]$/.test(match[3])) {
      result.push({'@type': 'OpeningHoursSpecification', dayOfWeek, opens: '00:00', closes: '00:00'});
      continue;
    }
    const times = match[3].match(/^(\d{1,2})\s*(?:h|:)\s*(\d{1,2})?\s*-\s*(\d{1,2})\s*(?:h|:)\s*(\d{1,2})?$/);
    if (!times) return undefined;
    const [hourOpen, minuteOpen, hourClose, minuteClose] = [Number(times[1]), Number(times[2] || 0), Number(times[3]), Number(times[4] || 0)];
    if (hourOpen > 23 || hourClose > 23 || minuteOpen > 59 || minuteClose > 59) return undefined;
    const time = (hour: number, minute: number) => `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
    result.push({'@type': 'OpeningHoursSpecification', dayOfWeek, opens: time(hourOpen, minuteOpen), closes: time(hourClose, minuteClose)});
  }
  return result.length ? result : undefined;
}

function postalAddress(value: unknown): Graph | undefined {
  const address = text(value);
  if (!address) return undefined;
  const parts = address.split(',').map(part => part.trim());
  const locality = parts.length === 3 && parts[1].match(/^(.+?)\s+(\d{5})$/);
  if (locality && parts[0] && parts[2]) return {
    '@type': 'PostalAddress', streetAddress: parts[0], addressLocality: locality[1],
    postalCode: locality[2], addressCountry: parts[2],
  };
  // An unfamiliar format keeps the full published address instead of
  // silently retaining old city, postcode or country values.
  return {'@type': 'PostalAddress', streetAddress: address};
}

function coordinate(value: unknown, limit: number): number | undefined {
  if (typeof value !== 'number' && (typeof value !== 'string' || !value.trim())) return undefined;
  const number = typeof value === 'number' ? value : Number(text(value));
  return Number.isFinite(number) && Math.abs(number) <= limit ? number : undefined;
}

export function furnitureStoreGraph(site: Data, entry: Data, origin: string): Graph | undefined {
  if (!text(site.name)) return undefined;
  const address = postalAddress(site.address);
  const latitude = coordinate(site.showroomLatitude, 90);
  const longitude = coordinate(site.showroomLongitude, 180);
  const section = (Array.isArray(entry.sections) ? entry.sections : []).find((item: Data) => item.section_key === 'showroom');
  const isHome = entry.slug === 'home';
  const image = absoluteWebUrl(mediaSource(isHome ? section?.image || entry.showroom_image : entry.hero_image || entry.image), origin);
  const logo = absoluteWebUrl(mediaSource(site.logoLight || site.logoDark), origin);
  const map = absoluteWebUrl(site.mapUrl, origin);
  const hours = openingHours(site.hours);
  return {
    '@context': 'https://schema.org', '@type': 'FurnitureStore',
    '@id': new URL('/#showroom', origin).href,
    name: text(site.name), url: new URL('/showroom-casablanca/', origin).href,
    ...(address && {address}),
    ...(latitude !== undefined && longitude !== undefined && {geo: {'@type': 'GeoCoordinates', latitude, longitude}}),
    ...(text(site.phone) && {telephone: text(site.phone)}),
    ...(text(site.publicEmail) && {email: text(site.publicEmail)}),
    ...(map && {hasMap: map}), ...(hours && {openingHoursSpecification: hours}),
    ...(image && {image}), ...(logo && {logo}),
  };
}

export function productGraph(entry: Data, page: PublicPageContext): Graph | undefined {
  const name = text(entry.title);
  const origin = page.siteUrl || page.url;
  const url = absoluteWebUrl(page.canonical, origin);
  if (!name || !url) return undefined;
  const images = [...new Set([entry.hero_image || entry.image, ...(entry.gallery || []).map((item: Data) => item.image)]
    .map(image => absoluteWebUrl(mediaSource(image), origin)).filter((image): image is string => !!image))];
  const properties = (entry.dimensions || []).flatMap((item: Data) => text(item.value)
    ? [{'@type': 'PropertyValue', name: text(item.label) || 'Dimensions', value: text(item.value)}] : []);
  return {
    '@context': 'https://schema.org', '@type': 'Product', '@id': `${url}#product`, name, url,
    ...(text(entry.description) && {description: text(entry.description)}),
    ...(images.length && {image: images}),
    ...(properties.length && {additionalProperty: properties}),
    // Finish categories describe possible variants, not one material/offer
    // possessed by every configuration. No guessed brand, price or stock.
  };
}

export function articleGraph(page: PublicPageContext): Graph | undefined {
  const origin = page.siteUrl || page.url;
  const url = absoluteWebUrl(page.canonical, origin);
  const headline = text(page.pageTitle);
  if (!url || !headline) return undefined;
  const author = text(page.articleMeta?.author);
  const siteName = text(page.siteName);
  const image = absoluteWebUrl(page.seo?.ogImage || page.image, origin);
  const description = text(page.seo?.ogDescription || page.description);
  const published = text(page.articleMeta?.publishedTime);
  const modified = text(page.articleMeta?.modifiedTime) || published;
  return {
    '@context': 'https://schema.org', '@type': 'BlogPosting', headline, url,
    ...(description && {description}), ...(image && {image}),
    ...(published && {datePublished: published}), ...(modified && {dateModified: modified}),
    ...(author && {author: {'@type': author === siteName ? 'Organization' : 'Person', name: author}}),
    ...(siteName && {publisher: {'@type': 'Organization', name: siteName}}),
    mainEntityOfPage: {'@type': 'WebPage', '@id': url},
  };
}

/** Contributions go through EmDash's deduplication, escaping and CSP support. */
export function structuredDataContributions(page: PublicPageContext, site?: Data, entry?: Data): PageMetadataContribution[] {
  const contributions: PageMetadataContribution[] = [];
  const add = (id: string, graph: Graph | undefined) => { if (graph) contributions.push({kind: 'jsonld', id, graph}); };
  add('breadcrumbs', breadcrumbGraph(page));
  if (page.pageType === 'article') add('primary', articleGraph(page));
  if (page.content?.collection === 'models' && entry) add('product', productGraph(entry, page));
  if (page.content?.collection === 'pages' && ['home', 'showroom-casablanca'].includes(page.content.slug || '') && site && entry) {
    add('showroom', furnitureStoreGraph(site, {...entry, slug: page.content.slug}, page.siteUrl || page.url));
  }
  return contributions;
}
