/** An explicit editor title is complete; only generated titles use the site separator. */
export function resolvePageTitle(input: { title: string; nativeTitle?: string | null; siteTitle?: string; separator?: string }): string {
  if (input.nativeTitle?.trim()) return input.nativeTitle;
  const title = input.title.trim();
  const site = input.siteTitle?.trim();
  if (!site || !title || title === site || title.endsWith(site)) return title;
  return `${title}${input.separator || ' · '}${site}`;
}

const protectedRules = ['Disallow: /_emdash/', 'Allow: /_emdash/api/media/file/', 'Disallow: /preview/'];

/**
 * Keep the native custom crawler rules, including separate user-agent groups.
 * Apply our admin/preview rules to every group (a specific bot ignores '*').
 * Public CMS images remain crawlable; robots rules are not access control.
 */
export function robotsText(indexable: boolean, origin: string, custom?: string): string {
  if (!indexable) return 'User-agent: *\nDisallow: /\n';
  const lines = (custom || 'User-agent: *\nAllow: /').replace(/\r\n?/gu, '\n').trim().split('\n');
  const output: string[] = [];
  let hasAgent = false, hasRule = false, wildcard = false;
  for (const line of lines) {
    const directive = line.match(/^\s*([\w-]+)\s*:\s*(.*?)(?:\s+#.*)?$/u);
    const name = directive?.[1]?.toLowerCase(), value = directive?.[2] || '';
    if (name === 'user-agent') {
      if (hasAgent && hasRule) { output.push(...protectedRules, ''); hasRule = false; }
      hasAgent = true;
      if (value === '*') wildcard = true;
    } else if (hasAgent && name && name !== 'sitemap') {
      hasRule = true;
      // Do not let an old broad admin allowance defeat the app's private-route rule.
      if (name === 'allow' && (/^\/(?:_emdash|preview)(?:\/|\$|$)/u.test(value)) && !value.startsWith('/_emdash/api/media/file/')) continue;
    }
    output.push(line);
  }
  if (hasAgent) output.push(...protectedRules);
  if (!wildcard) output.push('', 'User-agent: *', 'Allow: /', ...protectedRules);
  const sitemap = new URL('/sitemap.xml', origin).href;
  if (!lines.some(line => line.trim() === `Sitemap: ${sitemap}`)) output.push('', `Sitemap: ${sitemap}`);
  return `${output.join('\n').trim()}\n`;
}

/** Only the canonical, public URL belongs in this site's sitemap. */
export function sitemapLocation(path: string, origin: string, seo?: { noIndex?: boolean; canonical?: string | null }): string | null {
  if (seo?.noIndex) return null;
  const own = new URL(path, origin);
  if (!seo?.canonical) return own.href;
  try {
    // Match EmDash's root-relative resolution even for historic bare paths.
    const value = seo.canonical;
    const canonical = new URL(/^(?:https?:)?\/\//iu.test(value) ? value : `/${value.replace(/^\//u, '')}`, origin);
    canonical.hash = '';
    return canonical.href === own.href ? own.href : null;
  } catch { return null; }
}
