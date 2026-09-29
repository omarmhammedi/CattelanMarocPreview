import { getEmDashCollection, getEmDashEntry, getEmDashReferences, getSiteSettings, getMenu, type ContentEntry } from 'emdash';

// This module is the only presentation adapter. Seed JSON is never imported at runtime.
type Data = Record<string, any>;
type Entry = ContentEntry<Data> & { _collection?: string };
export type Picture = {src: string; alt: string; width?: number; height?: number};
export function picture(value: any): Picture | null {
  if (!value) return null;
  if (typeof value === 'string') return {src: value, alt: ''};
  const key = value.meta?.storageKey || value.id || value.mediaId;
  const src = value.src || value.url || (key ? `/_emdash/api/media/file/${encodeURIComponent(key)}` : '');
  return src ? {src, alt: value.alt || '', width:value.width, height:value.height} : null;
}
export async function readEntry(collection: string, slug: string, references: Record<string, any> = {}): Promise<Entry | null> {
  const {entry, error} = await getEmDashEntry(collection, slug, {references});
  if (error) throw new Error(`Le CMS n’a pas pu lire ${collection}/${slug}`, {cause:error});
  if (!entry) return null;
  // Continue ordered relationships rather than silently losing selections past
  // the first page. Native queries retain published/signed-preview visibility.
  for (const [field, page] of Object.entries(entry.references || {})) {
    let cursor = page.nextCursor;
    while (cursor) {
      const next = await getEmDashReferences(collection, entry.id, field, {limit:100, cursor});
      if (next.error) throw next.error;
      page.entries.push(...next.entries);
      cursor = next.nextCursor;
    }
    delete page.nextCursor;
  }
  return Object.assign(entry, {_collection:collection}) as Entry;
}
const read=readEntry;
async function list(collection: string, orderBy: Record<string, 'asc'|'desc'>) {
  const {entries, error, hasMore} = await getEmDashCollection(collection, {orderBy, limit:100});
  if (error) throw new Error(`Le CMS n’a pas pu lire ${collection}`, {cause:error});
  if (hasMore) throw new Error(`La collection ${collection} nécessite une pagination.`);
  return entries.map(entry => Object.assign(entry,{_collection:collection}) as Entry);
}
function base(entry: Entry) {
  const d = entry.data;
  return {id:String(d.id || entry.id),slug:String(d.slug || entry.id),title:String(d.title || ''),
    intro:String(d.intro || ''),body:d.content || [],image:picture(d.hero_image || d.image),
    seoTitle:String(d.seo_title || d.title || ''),description:String(d.meta_description || d.excerpt || d.intro || ''),entry};
}
function sectionModel(section: Data) {
  return {
    key: String(section.section_key || ''),
    heading: String(section.heading || ''),
    displayHeading: String(section.display_heading || ''),
    text: String(section.text || ''),
    ctaLabel: String(section.cta_label || '').trim(),
    ctaHref: String(section.cta_href || '').trim(),
    image: picture(section.image),
  };
}
export function pageModel(entry: Entry) {
  const d=entry.data;
  return {...base(entry),eyebrow:String(d.eyebrow || ''),sections:(d.sections || []).map(sectionModel)};
}
export async function getPage(route: string) {const e=await read('pages',route==='showroom'?'showroom-casablanca':route);return e?pageModel(e):null;}
export function homeModel(entry:Entry) {
  const d=entry.data;
  const page=pageModel(entry);
  const section=(key:string)=>{
    const found=page.sections.find((item:ReturnType<typeof sectionModel>)=>item.key===key);
    const s=found || sectionModel({section_key:key});
    return {...s,present:!!found,heading:s.displayHeading || s.heading};
  };
  const brand=section('brand');
  const showroom=section('showroom');
  return {...page,heroImage:picture(d.hero_image),
    brand:{...brand,image:brand.image || picture(d.brand_image),imageField:brand.image ? 'sections' : 'brand_image',detailImage:picture(d.brand_detail_image),caption:d.brand_caption},
    collections:section('collections'),
    showroom:{...showroom,image:showroom.image || picture(d.showroom_image),imageField:showroom.image ? 'sections' : 'showroom_image',invitation:d.showroom_invitation},
    catalogue:section('catalogue'),journal:section('journal'),
    extraSections:page.sections.filter((item:ReturnType<typeof sectionModel>)=>!['brand','collections','showroom','catalogue','journal'].includes(item.key)),
  };
}
export async function getHome() {const e=await read('pages','home');return e?homeModel(e):null;}
export function postModel(e:Entry) {const d=e.data;const p=base(e);return {...p,href:`/journal/${p.slug}/`,excerpt:String(d.excerpt || ''),imageCaption:d.image_caption,category:(d.terms?.category || []).map((term:Data)=>String(term.label || '')).filter(Boolean).join(' · '),publishedAt:d.publishedAt || d.published_at,readingTime:d.reading_time,author:d.byline?.displayName || '',sources:d.sources || [],cta:{text:d.cta_text,label:String(d.cta_label || '').trim(),href:String(d.cta_href || '').trim()}};}
export async function getPosts(){return (await list('posts',{published_at:'desc'})).map(postModel);}
export async function getPost(slug:string){const e=await read('posts',slug);return e?postModel(e):null;}
export function modelModel(entry:Entry) {
  const d=entry.data;
  const p=base(Object.assign(entry,{_collection:'models'}));
  return {...p,href:`/modeles/${p.slug}/`,description:String(d.description || ''),
    imageCaption:String(d.image_caption || ''),availabilityNote:String(d.availability_note || ''),
    year:d.release_year || null,officialUrl:String(d.source_url || d.official_url || ''),
    gallery:(d.gallery || []).flatMap((item:Data)=>{const image=picture(item.image);return image?[{...image,caption:String(item.caption || '')}]:[];}),
    dimensions:(d.dimensions || []).map((item:Data)=>({label:String(item.label || ''),value:String(item.value || ''),seats:item.seats,largeSeats:item.large_seats})),
    drawings:(d.drawings || []).flatMap((item:Data)=>{const image=picture(item.image);return image?[{label:String(item.label || ''),row:item.row,column:item.column,image}]:[];}),
    finishes:(d.finishes || []).map((item:Data)=>({group:String(item.group || ''),materialGroup:String(item.material_group || ''),material:String(item.material || ''),name:String(item.name || ''),code:String(item.code || ''),image:picture(item.image)})),
    technicalSheet:d.technical_sheet ? {...picture(d.technical_sheet),filename:d.technical_sheet.filename} : null,technicalSheetLabel:String(d.technical_sheet_label || ''),
  };
}
export async function getModel(slug:string){const e=await read('models',slug);return e?modelModel(e):null;}
export function familyModel(e:Entry) {const d=e.data;const p=base(e);return {...p,href:`/collections/${p.slug}/`,shortTitle:String(d.short_title || d.title || ''),cardText:String(d.card_text || ''),summary:String(d.card_text || ''),imageCaption:d.image_caption,models:(e.references?.models?.entries || []).map(x=>modelModel(x as Entry)),relatedPost:e.references?.related_post?.entries[0]?postModel(e.references.related_post.entries[0] as Entry):null};}
export async function getFamilies(){return (await list('families',{sort_order:'asc'})).map(familyModel);}
export async function getFamily(slug:string){const e=await read('families',slug,{models:{limit:20},related_post:true});return e?familyModel(e):null;}
export async function getModelFamilies(slug:string){
  const families=await getFamilies();
  const selections=await Promise.all(families.map(family=>read('families',family.slug,{models:{limit:100}})));
  return families.filter((_,i)=>selections[i]?.references?.models?.entries.some(model=>model.data.slug===slug));
}
export function catalogueModel(e:Entry){const d=e.data;return {...base(e),edition:String(d.edition || ''),description:String(d.description || ''),cover:picture(d.cover),isPlaceholder:!!d.is_placeholder,downloadLabel:String(d.download_label || '')};}
export async function getCatalogue(){const global=await read('site_content','global',{active_catalogue:true});const ref=global?.references?.active_catalogue?.entries[0];if(!ref)return null;const e=await read('catalogues',String(ref.data.id || ref.id));return e?catalogueModel(e):null;}
export async function getSite(){
  const [e,settings,menu]=await Promise.all([read('site_content','global'),getSiteSettings(),getMenu('primary')]);
  if(!e) throw new Error('La configuration globale du site manque dans EmDash.');
  const d=e.data;
  return {name:String(settings.title || ''),tagline:String(settings.tagline || ''),city:d.city,location:d.city,
    logoLight:picture(d.logo_light || settings.logo),logoDark:picture(d.logo_dark || settings.logo),phone:d.contact_phone,whatsappUrl:d.whatsapp_url,whatsappHref:d.whatsapp_url,navigation:menu?.items || [],
    address:d.address,hours:d.hours,mapUrl:d.map_url,mapEmbedUrl:d.map_embed_url,mapNote:d.map_note,publicEmail:d.public_email,
    showroomLatitude:d.showroom_latitude,showroomLongitude:d.showroom_longitude,
    footerText:d.footer_text,footerNote:d.footer_text,previewNotice:d.preview_notice,modelNotice:d.model_notice,
    placeholderNotice:d.placeholder_notice,settings,
    labels:{collections:d.collections_label,showroom:d.showroom_label,journal:d.journal_label,catalogue:d.catalogue_label,contact:d.contact_label,allArticles:d.journal_label,readArticle:d.read_article_label,discover:d.discover_label,visit:d.showroom_label,appointment:d.contact_label,download:d.catalogue_label,scroll:d.scroll_label || 'Défiler'},
    form:{name:d.form_name_label,email:d.form_email_label,nameError:d.form_name_error,emailError:d.form_email_error,submit:d.catalogue_label,consent:d.form_opt_in_label,note:d.form_hint,privacy:d.form_privacy,pending:d.form_pending,error:d.form_error,successTitle:d.form_success_title,successText:d.form_success_text,unavailable:d.form_unavailable},entry:e};
}
