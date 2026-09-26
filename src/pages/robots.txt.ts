import type {APIRoute} from 'astro';
import {env} from 'cloudflare:workers';
import {getSiteSettings} from 'emdash';
export const GET:APIRoute=async({url})=>{
 const indexable=(env as Record<string,unknown>).SITE_INDEXABLE==='true';
 const settings=await getSiteSettings();
 const origin=settings.url || url.origin;
 const text=indexable?`User-agent: *\nAllow: /\nDisallow: /_emdash/\nDisallow: /preview/\n\nSitemap: ${origin}/sitemap.xml\n`:'User-agent: *\nDisallow: /\n';
 return new Response(text,{headers:{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store'}});
};
