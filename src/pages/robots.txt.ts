import type {APIRoute} from 'astro';
import {env} from 'cloudflare:workers';
import {getSiteSettings} from 'emdash';
import {robotsText} from '../lib/seo-policy';
export const GET:APIRoute=async({url})=>{
 const indexable=(env as Record<string,unknown>).SITE_INDEXABLE==='true';
 const settings=await getSiteSettings();
 const origin=settings.url || url.origin;
 const text=robotsText(indexable,origin,settings.seo?.robotsTxt);
 return new Response(text,{headers:{'Content-Type':'text/plain; charset=utf-8','Cache-Control':'no-store'}});
};
