/**
 * Copy audit v3 (2 October 2026): applied from the EmDash admin session in the browser,
 * because the Worker refuses heavy API reads from outside under the Workers Free CPU limit.
 * Paste into the console of a signed-in admin tab, load content/copy-v3.json as `manifest`, then:
 *   await __CMS.run(manifest.entries)                 // dry run
 *   await __CMS.run(manifest.entries, { apply: true }) // write and publish
 *   await __CMS.menuAndSettings(manifest, true)        // menu labels and site tagline
 * Each item is read just before it is written; the version it replaces is kept in __CMS.state.backup.
 */
window.__CMS = (() => {
  const sleep = ms => new Promise(r => setTimeout(r, ms));
  const SKIP = new Set(['_key', '_type', 'id', 'src', 'url', 'href', 'cta_href', 'storageKey', 'filename', 'mimeType', 'provider', 'official_url', 'source_url', 'technical_sheet', 'style', 'section_key', 'markDefs', 'marks', 'blurhash', 'dominantColor']);
  const state = { log: [], backup: {}, done: [], errors: [], running: false };
  async function api(path, { method = 'GET', data } = {}) {
    for (let attempt = 0; attempt < 8; attempt++) {
      const res = await fetch(path, { method, credentials: 'include', cache: 'no-store',
        headers: { 'X-EmDash-Request': '1', ...(data === undefined ? {} : { 'Content-Type': 'application/json' }) },
        ...(data === undefined ? {} : { body: JSON.stringify(data) }) });
      if (res.status === 503 && method === 'GET') { await sleep(1500 * (attempt + 1)); continue; }
      const body = await res.json().catch(() => ({}));
      if (!res.ok || body.success === false) { const err = new Error(`${method} ${path}: HTTP ${res.status} ${body.error?.message || ''}`); err.status = res.status; throw err; }
      return body.data;
    }
    throw new Error(`${method} ${path}: still 503`);
  }
  const ids = {};
  async function idFor(collection, slug) {
    if (!ids[collection]) {
      ids[collection] = {};
      let cursor = '';
      do {
        const page = await api(`/_emdash/api/content/${collection}?limit=5${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ''}`);
        for (const item of page.items || []) ids[collection][item.slug] = item.id;
        cursor = page.nextCursor || '';
        await sleep(200);
      } while (cursor);
    }
    return ids[collection][slug];
  }
  function deepMap(value, fn, key) {
    if (typeof value === 'string') return SKIP.has(key) ? value : fn(value);
    if (Array.isArray(value)) return value.map(v => deepMap(v, fn, key));
    if (value && typeof value === 'object') { const out = {}; for (const [k, v] of Object.entries(value)) out[k] = SKIP.has(k) ? v : deepMap(v, fn, k); return out; }
    return value;
  }
  const spanText = block => (block.children || []).map(c => c.text || '').join('');
  function transform(item, e) {
    let data = JSON.parse(JSON.stringify(item.data));
    const changed = [];
    for (const [field, value] of Object.entries(e.set || {})) {
      const current = data[field] ?? '';
      if (current !== value) { data[field] = value; changed.push(field); }
    }
    for (const [field, value] of Object.entries(e.setJson || {})) {
      if (JSON.stringify(data[field] ?? null) !== JSON.stringify(value)) { data[field] = value; changed.push(field); }
    }
    if (e.replace?.length || e.replaceExact?.length) {
      const before = JSON.stringify(data);
      data = deepMap(data, s => {
        let out = s;
        for (const [from, to] of e.replaceExact || []) if (out === from) out = to;
        for (const [from, to] of e.replace || []) if (out.includes(from)) out = out.split(from).join(to);
        return out;
      });
      if (JSON.stringify(data) !== before) changed.push('text replacements');
    }
    if (e.removeBlocks?.length && Array.isArray(data.content)) {
      const out = []; let skipping = false;
      for (const block of data.content) {
        if (block.style === 'h2') skipping = e.removeBlocks.includes(spanText(block));
        if (!skipping) out.push(block);
      }
      if (out.length !== data.content.length) { data.content = out; changed.push('content blocks removed'); }
    }
    if (e.sections || e.sectionsOrder) {
      let sections = (data.sections || []).map(s => ({ ...s }));
      for (const [key, upd] of Object.entries(e.sections || {})) {
        const index = sections.findIndex(s => s.section_key === key);
        if (upd.remove) { if (index >= 0) { sections.splice(index, 1); changed.push(`sections.${key} removed`); } continue; }
        if (index < 0) {
          const fresh = { section_key: key, heading: upd.heading || '', text: upd.text || '', cta_label: upd.cta_label || '', cta_href: upd.cta_href || '' };
          const after = upd.add_after ? sections.findIndex(s => s.section_key === upd.add_after) : -1;
          sections.splice(after >= 0 ? after + 1 : sections.length, 0, fresh);
          changed.push(`sections.${key} added`);
          continue;
        }
        for (const field of ['heading', 'display_heading', 'text', 'cta_label', 'cta_href']) {
          if (upd[field] === undefined) continue;
          if ((sections[index][field] ?? '') !== upd[field]) { sections[index][field] = upd[field]; changed.push(`sections.${key}.${field}`); }
        }
      }
      if (e.sectionsOrder) {
        const ordered = [...e.sectionsOrder.map(k => sections.find(s => s.section_key === k)).filter(Boolean), ...sections.filter(s => !e.sectionsOrder.includes(s.section_key))];
        if (ordered.map(s => s.section_key).join() !== sections.map(s => s.section_key).join()) { sections = ordered; changed.push('sections order'); }
      }
      data.sections = sections;
    }
    if (e.dropSources && Array.isArray(data.sources)) {
      const kept = data.sources.filter(s => !e.dropSources.some(n => String(s.label || '').includes(`— ${n},`)));
      if (kept.length !== data.sources.length) { data.sources = kept; changed.push('sources'); }
    }
    return { data, changed };
  }
  async function one(e, apply) {
    const id = await idFor(e.collection, e.slug);
    if (!id) return { slug: e.slug, missing: true };
    const path = `/_emdash/api/content/${e.collection}/${encodeURIComponent(id)}`;
    const fresh = await api(path);
    const { data, changed } = transform(fresh.item, e);
    if (!changed.length) return { slug: e.slug, changed };
    if (!apply) return { slug: e.slug, changed };
    state.backup[`${e.collection}/${e.slug}`] = { _rev: fresh._rev, data: fresh.item.data, seo: fresh.item.seo };
    const seo = e.set?.seo_title && fresh.item.seo ? { ...fresh.item.seo, title: e.set.seo_title } : undefined;
    try {
      await api(path, { method: 'PUT', data: { _rev: fresh._rev, data, ...(seo ? { seo } : {}) } });
    } catch (err) {
      if (err.status !== 503) throw err;
      await sleep(3000);
      const check = await api(path);
      if (transform(check.item, e).changed.length) throw err; // not applied
    }
    const saved = await api(path);
    if (fresh.item.status === 'published') {
      try { await api(`${path}/publish`, { method: 'POST', data: { _rev: saved._rev } }); }
      catch (err) { if (err.status !== 503) throw err; await sleep(3000); await api(`${path}/publish`, { method: 'POST', data: { _rev: (await api(path))._rev } }); }
    }
    return { slug: e.slug, changed, applied: true };
  }
  async function run(manifest, { apply = false, only } = {}) {
    state.running = true; state.log = []; state.errors = [];
    for (const e of manifest.entries) {
      if (only && !only.includes(`${e.collection}/${e.slug}`)) continue;
      try { const r = await one(e, apply); state.log.push(`${e.collection}/${e.slug}: ${r.missing ? 'MISSING' : (r.changed.join(', ') || 'no change')}${r.applied ? ' ✓' : ''}`); }
      catch (err) { state.errors.push(`${e.collection}/${e.slug}: ${err.message}`); }
      await sleep(apply ? 600 : 250);
    }
    state.running = false;
  }
  async function menuAndSettings(manifest, apply) {
    const out = [];
    const menu = await api('/_emdash/api/menus/primary');
    for (const [from, to] of manifest.menu || []) {
      const item = (menu.items || []).find(i => i.label === from);
      if (!item) { out.push(`menu: “${from}” not found`); continue; }
      if (apply) await api(`/_emdash/api/menus/primary/items/${encodeURIComponent(item.id)}`, { method: 'PUT', data: { label: to } });
      out.push(`menu: ${from} → ${to}${apply ? ' ✓' : ''}`);
    }
    const settings = await api('/_emdash/api/settings');
    state.backup.settings = settings;
    for (const [k, v] of Object.entries(manifest.settings || {})) {
      out.push(`settings.${k}: “${settings[k]}” → “${v}”${apply ? ' ✓' : ''}`);
    }
    if (apply && manifest.settings) await api('/_emdash/api/settings', { method: 'POST', data: manifest.settings });
    return out;
  }
  return { state, run, menuAndSettings, transform, api, idFor };
})();
'applier ready';
