#!/usr/bin/env node
// Copy linter for the Cattelan Italia Maroc website.
// Scans drafts (Markdown, JSON or text) against the fact and style rules in .agents/product-marketing.md.
// It checks rules, not taste: a clean result does not make a text good, a blocking finding makes it unfit to send.
//
//   node scripts/copy-lint.mjs docs/copy-drafts/a-propos-2026-10-04.md
//   node scripts/copy-lint.mjs draft.md other.json --all      also list review-level findings
//   node scripts/copy-lint.mjs draft.md --json                machine-readable output
//   node scripts/copy-lint.mjs draft.md --brief brief.md      also check word limits and fixed items of the brief
//
// Exit code 1 when there is at least one blocking finding.
// Markdown drafts: only the part under "## Page copy" is checked when that heading exists.
// JSON: [{ page, tag, text }] blocks, or a CMS-style object (title, intro, sections[].heading/text, ...).

import { readFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, extname, join } from 'node:path';

const HERE = dirname(fileURLToPath(import.meta.url));
export const ALLOW_FILE = join(HERE, 'copy-lint-allow.txt');
export const PHONE = '212771105490';

const w = (src) => new RegExp(`(?<![\\p{L}\\p{N}_])(?:${src})(?![\\p{L}\\p{N}_])`, 'giu');
const ALL = ['heading', 'short', 'button', 'body'];
const SHORT = ['heading', 'short', 'button'];
const NUM = '\\d+(?:[.,]\\d+)?|un|deux|trois|quatre|cinq|six|sept|huit|neuf|dix|vingt|trente|quarante|cinquante|soixante|cent|mille';

const CLICHES = [
  'iconiques?', 'incontournables?', 'raffin\\p{L}*', 'élégan\\p{L}*', 'fascin\\p{L}*', 'harmoni\\p{L}*',
  'intemporel\\p{L}*', 'univers', 'signatures?', 'savoir[- ]faire', 'sublim\\p{L}*', 'découvr\\p{L}*',
  'expériences?', 'inspir\\p{L}*', 'épuré\\p{L}*', 'véritables?', 'généreu\\p{L}*', 'légèreté', 'accompagn\\p{L}*',
  'pièces? fortes?', 'mis(?:e)?s? en scène', 'à portée de main', 'côte à côte', 'entièrement consacré\\p{L}*',
  'comme chez vous', 'en situation', 'à votre disposition', 'vous attend\\p{L}*', 'voici comment', 'de quoi',
  'pensé(?:e|s|es)? pour', 'votre intérieur', 'point central', 'laisser parler', 'qui comptent', 'sophistiqu\\p{L}*',
].join('|');

export const RULES = [
  // ---- blocking: style and AI tells ----
  { id: 'cliche', level: 'block', scope: ALL, re: w(CLICHES), msg: 'Banned cliché word or phrase (product-marketing.md, section 5).' },
  { id: 'exclamation', level: 'block', scope: ALL, re: /!/gu, msg: 'No exclamation marks.' },
  { id: 'dash-short', level: 'block', scope: SHORT, re: /[—–]/gu, msg: 'No dash in headings, buttons, titles or meta text.' },
  { id: 'contrast-reveal', level: 'block', scope: ALL, re: /\bce n[’']est pas\b[^.!?]*?\b(?:c[’']est|mais)\b|\bn[’']est pas (?:seulement|simplement|juste|uniquement)\b|\bnon seulement\b|\bpas seulement\b|\bpas uniquement\b/giu, msg: 'Contrast reveal ("ce n’est pas X, c’est Y"). State the point directly.' },
  { id: 'negation-list', level: 'block', scope: ALL, re: /\b(?:sans|ni|aucune?|pas de)\b[^.;:!?]*,\s*\b(?:sans|ni|aucune?|pas de)\b[^.;:!?]*,\s*\b(?:sans|ni|aucune?|pas de)\b/giu, msg: 'Negation list ("sans X, sans Y, sans Z"). Say what does happen.' },
  { id: 'colon-reveal', level: 'block', scope: ['body'], re: /(?:le résultat|la meilleure partie|le plus beau|l[’']essentiel|bonne nouvelle|résultat)\s*:/giu, msg: 'Colon reveal. Write a normal sentence.' },
  { id: 'self-answered-question', level: 'block', scope: ['body'], re: /\?\s+(?:oui|non|simple|résultat|réponse)\b/giu, msg: 'Self-answered question. Keep the answer, drop the question.' },
  { id: 'stock-opener', level: 'block', scope: ALL, re: /\bque vous soyez\b|\bdans un monde\b|\bà l[’']ère\b|\bne cherchez plus\b|\bdites adieu\b/giu, msg: 'Stock opener.' },
  { id: 'guarantee', level: 'block', scope: ALL, re: /\baucun genou\b|\bquels? que soient?\b|\bne craint ni\b|\bsans contraintes?\b|\bs[’']impose\b/giu, msg: 'Promise nobody can give.' },
  { id: 'heading-vous', level: 'block', scope: ['heading'], test: (t) => !t.trim().endsWith('?'), re: /\b(?:vous|votre|vos)\b/giu, msg: 'Headings are not built on "vous/votre" (questions are fine).' },
  { id: 'heading-order', level: 'block', scope: ['heading'], re: /^(?:choisir|regarder|découvrir|explorer|trouver|voir|préparer|venir|contacter|demander|prendre|télécharger|imaginer|composer|créer|profiter|laissez|choisissez|venez|contactez|demandez|prenez|téléchargez|découvrez|explorez|trouvez|préparez)\b/iu, msg: 'Heading starts with an order or an infinitive.' },
  // ---- blocking: facts ----
  { id: 'official-status', level: 'block', scope: ALL, re: /\b(?:représentant|revendeur|distributeur|concessionnaire)s?\s+(?:officiel|agréé|exclusif)\w*/giu, msg: 'Official reseller status is not claimed until the licence is signed.' },
  { id: 'delay-wording', level: 'block', scope: ALL, re: /\bfabriqu\p{L}*\s+en\s+10\s*(?:à|-)\s*12\s+semaines\b/giu, msg: 'The delay runs 10 to 12 weeks after order validation, not "made in 10 to 12 weeks".' },
  { id: 'term-bahut', level: 'block', scope: ALL, re: w('bahuts?'), msg: 'Say "buffet", not "bahut".' },
  { id: 'unit-m2', level: 'block', scope: ALL, re: /\b\d+\s?m2\b/giu, msg: 'Write m², not m2.' },
  // ---- review ----
  { id: 'dash-body', level: 'review', scope: ['body'], re: /[—–]/gu, msg: 'Dash in body copy: at most one or two per page.' },
  { id: 'vague-quantity', level: 'review', scope: ALL, re: new RegExp(`\\b(?:près de|presque|environ|plus de)\\s+(?:${NUM})\\b|\\b(?:plusieurs|nombreux|nombreuses|divers|diverses|large (?:sélection|choix|gamme)|grand choix)\\b`, 'giu'), msg: 'Vague quantity: give the exact number if one exists.' },
  { id: 'warranty', level: 'review', scope: ALL, re: /\bgarantie?s?\b|\bSAV\b|\bservice après-vente\b/giu, msg: 'Warranty and after-sales are not confirmed: do not publish.' },
  { id: 'stock-phrase', level: 'review', scope: ALL, re: /\bn[’']hésitez pas\b|\bil est important de noter\b|\ben conclusion\b|\bplus qu[’']un\b|\bau cœur de\b/giu, msg: 'Stock phrase.' },
  { id: 'range-dash', level: 'review', scope: ALL, re: /\b\d+\s?-\s?\d+\s+semaines\b/giu, msg: 'Write "10 à 12 semaines".' },
  { id: 'heading-period', level: 'review', scope: ['heading'], re: /\.$/u, msg: 'Heading ends with a full stop (tagline style).' },
  { id: 'trailing-negation', level: 'review', scope: ['body'], re: /[^,.;]{40,},\s+(?:sans|ni|aucune?)\s[^.]*\./giu, msg: 'Trailing clause of negations after a full claim: end the sentence at the claim.' },
];

// ---------- extraction ----------

const stripMd = (s) => s.replace(/`[^`]*`/g, '').replace(/\*\*|__/g, '').replace(/(^|\s)\*(?=\S)|(?<=\S)\*(?=\s|$)/g, '$1').trim();
const slotType = (label) => {
  const k = label.toLowerCase().split('.').pop().trim().replace(/[ -]/g, '_');
  if (/^(h1|heading|title|titre|display_heading|short_title|question)$/.test(k)) return 'heading';
  if (/^(button|cta|cta_label|bouton)$/.test(k)) return 'button';
  if (/^(eyebrow|seo_title|meta_description|caption|brand_caption|image_caption|label|alt)$/.test(k)) return 'short';
  return 'body';
};

export function extractMarkdown(content) {
  let lines = content.split('\n');
  const startIdx = lines.findIndex((l) => /^## Page copy\s*$/.test(l));
  let offset = 0;
  if (startIdx >= 0) {
    let end = lines.findIndex((l, i) => i > startIdx && /^## (?!#)/.test(l));
    if (end < 0) end = lines.length;
    offset = startIdx + 1;
    lines = lines.slice(startIdx + 1, end);
  }
  const blocks = [];
  let para = null;
  const flush = () => { if (para && para.text.trim()) blocks.push({ line: para.line, type: 'body', text: stripMd(para.text) }); para = null; };
  let fence = false;
  lines.forEach((raw, i) => {
    const line = raw.trimEnd();
    const n = i + 1 + offset;
    if (/^```/.test(line)) { fence = !fence; flush(); return; }
    if (fence) return;
    if (!line.trim()) { flush(); return; }
    if (/^\s*\|/.test(line)) { flush(); return; }
    let m;
    if ((m = line.match(/^(#{1,6})\s+(.*)$/))) { flush(); blocks.push({ line: n, type: 'heading', text: stripMd(m[2]) }); return; }
    if ((m = line.match(/^\*\*([^*]+?):?\*\*:?\s*(.*)$/)) && m[2]) {
      flush();
      const type = slotType(m[1].replace(/\s*\(.*\)\s*$/, ''));
      const text = m[2].replace(/\s*→.*$/, '');
      blocks.push({ line: n, type, text: stripMd(text), slot: m[1].replace(/\s*\(.*\)\s*$/, '').trim() });
      return;
    }
    if ((m = line.match(/^\s*[-*]\s+(.*)$/))) { flush(); blocks.push({ line: n, type: 'body', text: stripMd(m[1]) }); return; }
    if (para) para.text += ' ' + line.trim(); else para = { line: n, text: line.trim() };
  });
  flush();
  return blocks;
}

const JSON_HEADING = new Set(['title', 'heading', 'display_heading', 'short_title']);
const JSON_SHORT = new Set(['eyebrow', 'seo_title', 'meta_description', 'caption', 'brand_caption', 'image_caption', 'alt']);
const JSON_BUTTON = new Set(['cta_label']);
const JSON_BODY = new Set(['intro', 'text', 'excerpt', 'card_text', 'description', 'cta_text']);

export function extractJson(content) {
  const data = JSON.parse(content);
  const blocks = [];
  if (Array.isArray(data) && data.length && data.every((d) => d && typeof d === 'object' && 'text' in d)) {
    data.forEach((d, i) => blocks.push({ line: `#${i + 1}${d.page ? ' ' + d.page : ''}`, type: /^h[1-6]$/i.test(d.tag || '') ? 'heading' : /^(a|button)$/i.test(d.tag || '') ? 'button' : 'body', text: String(d.text) }));
    return blocks;
  }
  const walk = (node, path) => {
    if (Array.isArray(node)) return node.forEach((v, i) => walk(v, `${path}[${i}]`));
    if (!node || typeof node !== 'object') return;
    for (const [k, v] of Object.entries(node)) {
      const p = path ? `${path}.${k}` : k;
      if (typeof v === 'string' && v.trim()) {
        if (k === 'content') extractMarkdown(v).forEach((b) => blocks.push({ ...b, line: `${p}:${b.line}` }));
        else if (JSON_HEADING.has(k)) blocks.push({ line: p, type: 'heading', text: v });
        else if (JSON_BUTTON.has(k)) blocks.push({ line: p, type: 'button', text: v });
        else if (JSON_SHORT.has(k)) blocks.push({ line: p, type: 'short', text: v });
        else if (JSON_BODY.has(k)) blocks.push({ line: p, type: 'body', text: v });
      } else walk(v, p);
    }
  };
  walk(data, '');
  return blocks;
}

export function extractBlocks(filename, content) {
  const ext = extname(filename).toLowerCase();
  if (ext === '.json') return extractJson(content);
  if (ext === '.md' || ext === '.markdown') return extractMarkdown(content);
  return content.split(/\n\s*\n/).map((t, i) => ({ line: i + 1, type: 'body', text: t.trim() })).filter((b) => b.text);
}

// ---------- linting ----------

export function loadAllow(file = ALLOW_FILE) {
  if (!existsSync(file)) return [];
  return readFileSync(file, 'utf8').split('\n').map((l) => l.replace(/#.*$/, '').trim().toLowerCase()).filter(Boolean);
}

const normPhone = (raw) => {
  let d = raw.replace(/\D/g, '');
  if (d.startsWith('00')) d = d.slice(2);
  if (d.startsWith('0')) d = '212' + d.slice(1);
  if (d.startsWith('2120')) d = '212' + d.slice(4);
  return d;
};
const PHONE_RE = /(?:\+|00)?212[\s.()-]*0?[\s.()-]*[5-7](?:[\s.-]*\d){8}|\b0[5-7](?:[\s.-]?\d{2}){4}\b/g;

const sentences = (text) => text.split(/(?<=[.!?…])\s+(?=[A-ZÀ-ÖØ-Þ0-9«"“])/u).map((s) => s.trim()).filter(Boolean);
const words = (s) => s.split(/\s+/).filter(Boolean).length;

export function lintBlocks(blocks, { allow = [] } = {}) {
  const findings = [];
  const add = (b, level, id, msg, match) => {
    const m = String(match).toLowerCase();
    const text = b.text.toLowerCase();
    if (allow.some((a) => a.includes(m) && text.includes(a))) return;
    findings.push({ level, id, line: b.line, msg, match: String(match), block: b.text.length > 90 ? b.text.slice(0, 87) + '...' : b.text });
  };
  const seen = new Map();
  for (const b of blocks) {
    for (const r of RULES) {
      if (!r.scope.includes(b.type)) continue;
      if (r.test && !r.test(b.text)) continue;
      const re = r.re.global ? r.re : new RegExp(r.re.source, r.re.flags + 'g');
      for (const m of b.text.matchAll(re)) add(b, r.level, r.id, r.msg, m[0]);
    }
    for (const m of b.text.matchAll(PHONE_RE)) {
      if (normPhone(m[0]) !== PHONE) add(b, 'block', 'wrong-phone', `Only +212 771 105 490 is used on the site.`, m[0]);
    }
    if (b.type === 'body') {
      for (const s of sentences(b.text)) {
        const n = words(s);
        if (n > 28) add(b, 'review', 'long-sentence', `Sentence of ${n} words: read it aloud, split if it trails.`, s.slice(0, 60));
        if ((s.match(/,/g) || []).length >= 4) add(b, 'review', 'many-commas', 'Four or more commas: check for a trailing pile-on.', s.slice(0, 60));
        const key = s.toLowerCase().replace(/\W+/g, ' ').trim();
        if (key.length > 25) seen.set(key, (seen.get(key) || 0) + 1);
      }
    }
  }
  for (const [key, n] of seen) if (n > 1) findings.push({ level: 'review', id: 'repeat', line: '-', msg: `Sentence appears ${n} times in this text.`, match: key.slice(0, 60), block: '' });
  return findings;
}

// ---------- brief checks: word limits and fixed items ----------

const unq = (s) => s.replace(/[’‘]/g, "'").replace(/[“”«»]/g, '"').replace(/\s+/g, ' ').trim();
export const countWords = (t) => t.split(/\s+/).filter((x) => /[\p{L}\p{N}]/u.test(x)).length;

export function parseBrief(md) {
  const slots = new Map();
  const set = (name, v) => slots.set(name, { ...(slots.get(name) || {}), ...v });
  for (const line of md.split('\n')) {
    let m;
    if ((m = line.match(/^-\s*`([^`]+)`\s*:\s*(\d+)\s*mots/))) { set(m[1], { limit: { n: +m[2], unit: 'words' } }); continue; }
    if (!/^\|/.test(line) || /^\|\s*-/.test(line)) continue;
    const cells = line.split('|').slice(1, -1).map((c) => c.trim());
    if (cells.length < 3 || /^Slot$/i.test(cells[0])) continue;
    let names = [...cells[0].matchAll(/`([^`]+)`/g)].map((x) => x[1]);
    const range = cells[0].match(/`([^`]*?)(\d+)([^`]*)`\s+to\s+`[^`]*?(\d+)[^`]*`/);
    if (range) { names = []; for (let i = +range[2]; i <= +range[4]; i++) names.push(`${range[1]}${i}${range[3]}`); }
    if (!names.length) continue;
    if (/\*\*FIXED\*\*/.test(cells[1])) {
      const q = (cells[3] || cells[2] || '').match(/"([^"]+)"/);
      if (q) names.forEach((nm) => set(nm, { fixed: q[1] }));
      continue;
    }
    const limits = [...(cells[2] || '').matchAll(/(\d+)\s*(words|word|characters|mots|caractères)/g)].map((x) => ({ n: +x[1], unit: /char|carac/.test(x[2]) ? 'characters' : 'words' }));
    if (!limits.length) continue;
    names.forEach((nm, i) => set(nm, { limit: limits.length === names.length ? limits[i] : limits[0] }));
  }
  return slots;
}

export function checkAgainstBrief(blocks, brief) {
  const out = [];
  const bySlot = new Map(blocks.filter((b) => b.slot).map((b) => [b.slot, b]));
  for (const [name, spec] of brief) {
    const b = bySlot.get(name);
    if (!b) { out.push({ level: 'review', id: 'missing-slot', line: '-', msg: 'Slot of the brief not found in the draft.', match: name, block: '' }); continue; }
    if (spec.fixed && unq(b.text).replace(/^"|"$/g, '') !== unq(spec.fixed)) out.push({ level: 'block', id: 'fixed-changed', line: b.line, msg: `Fixed item must read exactly: "${spec.fixed}".`, match: name, block: b.text });
    if (spec.limit) {
      const n = spec.limit.unit === 'characters' ? b.text.length : countWords(b.text);
      if (n > spec.limit.n) out.push({ level: 'block', id: 'over-limit', line: b.line, msg: `${n} ${spec.limit.unit}, limit ${spec.limit.n}.`, match: name, block: b.text });
    }
  }
  return out;
}

// ---------- CLI ----------

function main(argv) {
  let files;
  const showAll = argv.includes('--all');
  const bi = argv.indexOf('--brief');
  const brief = bi >= 0 ? parseBrief(readFileSync(argv[bi + 1], 'utf8')) : null;
  if (bi >= 0) argv = argv.filter((_, i) => i !== bi + 1);
  files = argv.filter((a) => !a.startsWith('--'));
  const asJson = argv.includes('--json');
  if (!files.length) { console.error('Usage: node scripts/copy-lint.mjs <file.md|json|txt> [...] [--all] [--json]'); return 2; }
  const allow = loadAllow();
  let blocking = 0, review = 0;
  const out = [];
  for (const f of files) {
    const blocks = extractBlocks(f, readFileSync(f, 'utf8'));
    const findings = [...lintBlocks(blocks, { allow }), ...(brief ? checkAgainstBrief(blocks, brief) : [])];
    blocking += findings.filter((x) => x.level === 'block').length;
    review += findings.filter((x) => x.level === 'review').length;
    out.push({ file: f, findings });
  }
  if (asJson) console.log(JSON.stringify(out, null, 2));
  else {
    for (const { file, findings } of out) {
      console.log(file);
      const shown = findings.filter((x) => showAll || x.level === 'block');
      if (!shown.length) console.log('  no blocking finding');
      for (const x of shown) console.log(`  ${x.level === 'block' ? 'BLOCK ' : 'review'} L${x.line}  ${x.id}  "${x.match}"  ${x.msg}`);
    }
    console.log(`\n${blocking} blocking, ${review} review${!showAll && review ? ' (use --all to list review findings)' : ''}`);
  }
  return blocking ? 1 : 0;
}

if (process.argv[1] === fileURLToPath(import.meta.url)) process.exit(main(process.argv.slice(2)));
