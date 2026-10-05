import type {APIRoute} from 'astro';
import {env} from 'cloudflare:workers';
import {getEmDashCollection,getContentSeo,getSiteSettings} from 'emdash';
import {sitemapLocation} from '../lib/seo-policy';
const escape=(s:string)=>s.replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
export const GET:APIRoute=async({url})=>{
 const indexable=(env as Record<string,unknown>).SITE_INDEXABLE==='true';
 const headers={'Content-Type':'application/xml; charset=utf-8','Cache-Control':'no-store','X-Robots-Tag':'noindex'};
 const settings=await getSiteSettings();
 const origin=settings.url || url.origin;
 const locations=new Set<string>();
 if(indexable){
  for(const collection of ['pages','families','posts','models']){
   let cursor:string|undefined;
   const seenCursors=new Set<string>();
   do{
    const {entries,error,nextCursor}=await getEmDashCollection(collection,{limit:100,cursor});
    if(error)throw error;
    for(const entry of entries){
     const d=entry.data as Record<string,any>;
     const seo=getContentSeo(entry);
     if(seo?.noIndex)continue;
     const slug=String(d.slug || entry.id);
     const path=collection==='pages'?(slug==='home'?'/':`/${slug}/`):`/${collection==='posts'?'journal':collection==='models'?'modeles':'collections'}/${slug}/`;
     const location=sitemapLocation(path,origin,seo);
     if(location)locations.add(location);
    }
    cursor=nextCursor;
    if(cursor){
     if(seenCursors.has(cursor)||seenCursors.size>=10_000)throw new Error(`Invalid sitemap pagination for ${collection}`);
     seenCursors.add(cursor);
    }
   }while(cursor);
  }
 }
 return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${[...locations].map(location=>`<url><loc>${escape(location)}</loc></url>`).join('')}</urlset>`,{headers});
};
