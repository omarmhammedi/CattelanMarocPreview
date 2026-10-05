import type { APIRoute } from 'astro';
import { env } from 'cloudflare:workers';
import { getContentSeo } from 'emdash';
import { getPage, getSite } from '../lib/content';
import { llmsResponse } from '../lib/llms-content';

export const GET: APIRoute = async ({ url }) => {
  const indexable = (env as Record<string, unknown>).SITE_INDEXABLE === 'true';
  return llmsResponse({url, indexable, loadContent: async () => {
    const [site, faq] = await Promise.all([getSite(), getPage('faq')]);
    return {site, origin: site.settings?.url || url.origin, faq, faqSeo: faq ? getContentSeo(faq.entry) : undefined};
  }});
};
