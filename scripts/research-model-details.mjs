#!/usr/bin/env node
/**
 * Read-only research against public Cattelan Italia pages and metadata endpoints.
 * Raw source HTML/JSON is cached only under ignored test-results/model-sources.
 * This script never opens EmDash, authentication endpoints, or the local database.
 * Run: node scripts/research-model-details.mjs [--refresh] [--write-manifest]
 * --write-manifest refreshes factual fields while retaining the authored French
 * summary/content already reviewed in content/model-details.json.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { parse } from 'parse5';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cache = path.join(root, 'test-results/model-sources');
const destination = path.join(root, 'content/model-details.json');
const refresh = process.argv.includes('--refresh');
const writeManifest = process.argv.includes('--write-manifest');
const runVerifiedAt = new Date().toISOString();
await fs.mkdir(cache, { recursive: true });
const inventory = JSON.parse(await fs.readFile(path.join(root, 'seed/seed.json'), 'utf8')).content.models;
const verificationPath = path.join(cache, 'source-verification.json');
async function optionalJson(filename) {
  try { return JSON.parse(await fs.readFile(filename, 'utf8')); }
  catch (error) { if (error.code === 'ENOENT') return null; throw error; }
}
const previousManifest = await optionalJson(destination);
const previousFacts = await optionalJson(path.join(cache, 'facts.json'));
const sourceVerification = (await optionalJson(verificationPath))?.sources || {};
const recordedModelTimes = new Map([
  ...(previousFacts?.models || []), ...(previousManifest?.models || []),
].map((model) => [model.slug, model.source_verified_at]));
const attr = (node, name) => node?.attrs?.find((item) => item.name === name)?.value || '';
const walk = (node, predicate) => node ? [ ...(predicate(node) ? [node] : []), ...(node.childNodes || []).flatMap((child) => walk(child, predicate)) ] : [];
const byId = (node, id) => walk(node, (item) => attr(item, 'id') === id)[0];
const hasClass = (node, name) => attr(node, 'class').split(/\s+/).includes(name);
const textContent = (node) => node?.nodeName === '#text' ? node.value : (node?.childNodes || []).map(textContent).join(' ');
const clean = (text) => text.replace(/\s+/g, ' ').trim();
const textOf = (node) => clean(textContent(node));
const publicUrl = (url) => {
  const result = new URL(url, 'https://download.cattelanitalia.com/');
  if (result.protocol !== 'https:' || !['www.cattelanitalia.com', 'download.cattelanitalia.com'].includes(result.hostname)) throw new Error(`Unexpected source host: ${result.hostname}`);
  return result.href;
};
const media = (url, filename, alt) => ({ $media: { url: publicUrl(url), filename, ...(alt ? { alt } : {}) } });
const assetId = (url) => path.basename(new URL(url).pathname).replace(/\.[^.]+$/, '');
const extension = (url) => path.extname(new URL(url).pathname) || '.jpg';

async function cached(name, url, init = {}, slug) {
  const target = path.join(cache, name);
  if (!refresh) {
    let data;
    try { data = await fs.readFile(target, 'utf8'); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
    if (data !== undefined) {
      const recordedAt = sourceVerification[name] || recordedModelTimes.get(slug);
      if (!recordedAt || Number.isNaN(Date.parse(recordedAt))) throw new Error(`Cached source ${name} has no recorded verification timestamp; use --refresh.`);
      sourceVerification[name] = recordedAt;
      return data;
    }
  }
  const response = await fetch(url, { ...init, signal: AbortSignal.timeout(90000) });
  if (!response.ok) throw new Error(`${response.status} ${url}`);
  const data = await response.text();
  await fs.writeFile(target, data);
  sourceVerification[name] = runVerifiedAt;
  return data;
}

const models = [];
const excerpts = [];
for (const entry of inventory) {
  const { slug, data: { title, official_url } } = entry;
  const id = official_url.match(/products\/([A-F0-9-]{36})/i)?.[1];
  if (!id) throw new Error(`No official product identifier for ${slug}`);
  const sourceUrl = `https://www.cattelanitalia.com/fr/products/${id}`;
  const html = await cached(`${slug}.html`, sourceUrl, {}, slug);
  const dom = parse(html);
  const pageTitle = textOf(walk(dom, (n) => n.tagName === 'h1')[0]);
  if (pageTitle.toLowerCase().replace(/\s+/g, '') !== title.toLowerCase().replace(/\s+/g, '')) throw new Error(`Product title mismatch: ${slug}: ${pageTitle}`);
  const pdfPath = html.match(new RegExp(`fr/products/generaPDF/${id}/(\\d+)`, 'i'))?.[0];
  if (!pdfPath) throw new Error(`Missing public technical PDF for ${slug}`);
  const category = pdfPath.split('/').at(-1);
  const endpoint = `https://www.cattelanitalia.com/fr/products/productInfo/${id}`;
  const [technical, finishes] = await Promise.all(['scheda', 'finiture'].map(async (sheet) => JSON.parse(await cached(`${slug}-${sheet}.json`, endpoint, {
    method: 'POST', headers: { 'content-type': 'application/x-www-form-urlencoded' }, body: new URLSearchParams({ sheet, c: category }),
  }, slug))));
  const sheet = technical.result[0];
  const panorama = byId(dom, 'panoramica');
  const year = Number(textOf(walk(panorama, (n) => hasClass(n, 'anno'))[0]).match(/\d{4}/)?.[0]);
  if (!year) throw new Error(`Missing public year for ${slug}`);
  const gallery = [];
  const seenPhotos = new Set();
  const photoNodes = [
    ...walk(byId(dom, 'imgTecnicaPan'), (n) => n.tagName === 'img'),
    ...walk(byId(dom, 'gallery'), (n) => n.tagName === 'img' && hasClass(n, 'imgSlide')),
  ];
  for (const node of photoNodes) {
    const source = attr(node, 'data-src') || attr(node, 'src');
    if (!source) continue;
    // Panorama images do not necessarily have an HD derivative. Use their exact
    // official download URL; gallery images already declare their display URL.
    const url = publicUrl(attr(node, 'data-download') || source);
    const key = assetId(url);
    if (seenPhotos.has(key)) continue;
    seenPhotos.add(key);
    const downloadUrl = attr(node, 'data-fotohd') || attr(node, 'data-download');
    gallery.push({ image: media(url, `cattelan-${slug}-${key}${extension(url)}`, `${title} — photographie officielle ${gallery.length + 1}`), caption: '', ...(downloadUrl ? { original_url: publicUrl(downloadUrl) } : {}) });
  }
  const drawings = [];
  if (sheet.draw && sheet.draw !== -1 && sheet.draw.imgDisegnoTecnicoProdotto) {
    const url = publicUrl(sheet.draw.imgDisegnoTecnicoProdotto);
    drawings.push({ label: `${title} — dessin technique`, image: media(url, `cattelan-${slug}-drawing-${assetId(url)}${extension(url)}`, `${title} — dessin technique`) });
  }
  for (const item of sheet.imgDisegniTecniciProdotto || []) {
    const url = publicUrl(item.draw);
    if (drawings.some((d) => d.image.$media.url === url)) continue;
    drawings.push({ label: `${title} — plan ${drawings.length + 1}`, ...(item.row ? { row: Number(item.row.replace(/^DT#/, '')) } : {}), ...(item.col ? { column: Number(item.col) } : {}), image: media(url, `cattelan-${slug}-drawing-${assetId(url)}${extension(url)}`, `${title} — dessin technique ${drawings.length + 1}`) });
  }
  const finishRows = [];
  for (const group of finishes.result) for (const materialGroup of group.materialsGroup) for (const material of materialGroup.materials) for (const color of material.colors) {
    // The visible code comes from the public color label. AS400 is an internal
    // ordering identifier, not the code shown beside the official swatch.
    const code = color.colorName.match(/^(?:fr[A-Z]+|[A-Z]*\d+[A-Z]?|NC|RB)(?=\s|$)/)?.[0] || color.colorName.match(/\((MIST)\)/)?.[1] || '';
    const swatchUrl = color.imgColorProdottoZoom || color.imgColorProdotto;
    finishRows.push({ group: group.genericName, material_group: materialGroup.materialGroupName || '', material: material.materialName, name: color.colorName, code,
      image: media(swatchUrl, `cattelan-finish-${color.colorId}-detail${extension(swatchUrl)}`, color.colorName),
      ...(color.imgColorProdottoZoom ? { zoom_url: publicUrl(color.imgColorProdottoZoom) } : {}),
      ...(color.imgColorProdottoHD ? { original_url: publicUrl(color.imgColorProdottoHD) } : {}),
    });
  }
  const dimensions = (sheet.measure || []).map((measure) => ({ label: 'Dimensions (cm)', value: measure.sFeatureName,
    ...(measure.numSeats > 0 ? { seats: measure.numSeats } : {}), ...(measure.numSeatsSedieGrandi > 0 ? { large_seats: measure.numSeatsSedieGrandi } : {}),
  }));
  const videos = [...new Set(walk(dom, (n) => n.tagName === 'source' && attr(n, 'type').startsWith('video/')).map((n) => attr(n, 'src')).filter((url) => url.startsWith('https://download.cattelanitalia.com/') && /\.(mp4|webm)(?:\?|$)/i.test(url)))];
  const anchors = [...new Set(walk(dom, (n) => Boolean(attr(n, 'data-anchor'))).map((n) => attr(n, 'data-anchor')))];
  const model = {
    // Keep the oldest source timestamp when cached and fresh inputs are mixed.
    // Reading a cached source must never advance its verification date.
    slug, source_url: sourceUrl, source_verified_at: [`${slug}.html`, `${slug}-scheda.json`, `${slug}-finiture.json`].map((name) => sourceVerification[name]).sort()[0], release_year: year,
    image: gallery[0]?.image, dimensions, drawings, finishes: finishRows, gallery,
    technical_sheet: { $media: { url: `https://www.cattelanitalia.com/${pdfPath}`, filename: `cattelan-${slug}-fiche-technique-fr.pdf`, mimeType: 'application/pdf' } },
    technical_sheet_label: 'Télécharger la fiche technique',
  };
  if (!gallery.length || !dimensions.length || !drawings.length || !finishRows.length) throw new Error(`Incomplete official metadata: ${slug}`);
  models.push(model);
  excerpts.push({ slug, overview: textOf(walk(panorama, (n) => hasClass(n, 'text-scheda'))[0]), technical: textOf(walk(byId(dom, 'scheda'), (n) => hasClass(n, 'descr'))[0]), finish_groups: [...new Set(finishRows.map((f) => `${f.group} / ${f.material_group} / ${f.material}`))], features: { official_configurator: anchors.includes('3D'), official_video_section: anchors.includes('video'), video_urls: videos } });
  console.log(`${slug}: ${gallery.length} photos, ${dimensions.length} dimensions, ${drawings.length} drawings, ${finishRows.length} finishes`);
}
const verifiedAt = models.map((model) => model.source_verified_at).sort()[0].slice(0, 10);
await fs.writeFile(verificationPath, JSON.stringify({ version: 1, sources: sourceVerification }, null, 2) + '\n');
await fs.writeFile(path.join(cache, 'facts.json'), JSON.stringify({ version: 1, verified_at: verifiedAt, models }, null, 2) + '\n');
await fs.writeFile(path.join(cache, 'excerpts.json'), JSON.stringify(excerpts, null, 2) + '\n');
if (writeManifest) {
  const previous = previousManifest;
  if (!previous) throw new Error('Reviewed content/model-details.json is required before writing a manifest.');
  const reviewed = models.map((model) => {
    const authored = previous.models.find((entry) => entry.slug === model.slug);
    if (!authored?.content?.length) throw new Error(`Reviewed French content missing for ${model.slug}`);
    return { ...model, content: authored.content };
  });
  await fs.writeFile(destination, JSON.stringify({ version: 1, verified_at: verifiedAt, metadata: { ...previous.metadata, features: Object.fromEntries(excerpts.map((item) => [item.slug, item.features])) }, models: reviewed }, null, 2) + '\n');
}
