/** One native JSON field keeps the global entry within D1's public-query column limit. */
import { EDITORIAL_FIELDS, EDITORIAL_DEFAULTS } from './editorial-copy.mjs';
import { NAVIGATION_FIELDS, NAVIGATION_DEFAULTS } from './navigation-copy.mjs';
export const EDITORIAL_COPY_FIELD = 'editorial_copy';
export const LEGACY_REQUIRED_GLOBAL_LABELS = ['form_name_label', 'form_email_label', 'form_opt_in_label', 'catalogue_label', 'form_pending', 'form_name_error', 'form_email_error', 'form_error', 'form_success_title', 'form_success_text', 'form_unavailable', 'discover_label', 'public_email'];
export const EDITORIAL_COPY_FIELDS = [...new Map([...NAVIGATION_FIELDS, ...EDITORIAL_FIELDS].map(field => [field.slug, field])).values()].map(field => ({ ...field, validation: { maxLength: field.type === 'text' ? 5000 : 255 } }));
export const EDITORIAL_COPY_MAX_BYTES = 64 * 1024;
export const EDITORIAL_COPY_DEFAULTS = { ...NAVIGATION_DEFAULTS, ...EDITORIAL_DEFAULTS };
export const EDITORIAL_COPY_SCHEMA = { slug: EDITORIAL_COPY_FIELD, label: 'Textes des formulaires, services et boutons', type: 'json', required: false, widget: 'cattelan-editorial:editorial-copy' };
const object = value => value && typeof value === 'object' && !Array.isArray(value) ? value : {};
const virtualKeys = new Set(EDITORIAL_COPY_FIELDS.map(field => field.slug));

/** Flatten for the grouped editor; absence remains absence so clear and default stay distinct.
 * @param {Record<string, unknown>} data
 * @returns {Record<string, unknown>}
 */
export function editorialData(data = {}) {
  const copy = object(data[EDITORIAL_COPY_FIELD]);
  return { ...data, ...Object.fromEntries(Object.entries(copy).filter(([key]) => virtualKeys.has(key))) };
}

/** Native JSON writes replace the whole value; keep unknown keys and untouched draft copy.
 * @param {Record<string, unknown>} before
 * @param {Record<string, unknown>} flatChanges
 * @returns {Record<string, unknown>}
 */
export function editorialChanges(before, flatChanges) {
  /** @type {Record<string, unknown>} */
  const changes = {};
  const copy = { ...object(before?.[EDITORIAL_COPY_FIELD]) };
  let changedCopy = false;
  for (const [key, value] of Object.entries(flatChanges)) {
    if (virtualKeys.has(key)) { copy[key] = value; changedCopy = true; }
    else changes[key] = value;
  }
  if (changedCopy) changes[EDITORIAL_COPY_FIELD] = copy;
  return changes;
}

/** Semantic validation for the native JSON value, shared by the UI and save policy. */
export function editorialCopyProblem(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return 'Les textes du site doivent être une configuration structurée. Utilisez Réglages du site.';
  try {
    if (new TextEncoder().encode(JSON.stringify(value)).byteLength > EDITORIAL_COPY_MAX_BYTES) return 'Les textes du site dépassent la limite de 64 Ko. Réduisez les textes avant de les enregistrer.';
  } catch { return 'Les textes du site doivent contenir des valeurs JSON valides.'; }
  for (const field of EDITORIAL_COPY_FIELDS) {
    if (!Object.hasOwn(value, field.slug)) {
      if (field.required) return `Complétez le texte obligatoire « ${field.label} » dans Réglages du site.`;
      continue;
    }
    const text = value[field.slug];
    // A deliberate null is the existing CMS convention for clearing an optional field.
    if (text === null && !field.required) continue;
    if (typeof text !== 'string') return `Le champ « ${field.label} » doit contenir du texte.`;
    if (field.required && !text.trim()) return `Le champ « ${field.label} » est obligatoire.`;
    if (text.length > field.validation.maxLength) return `Le champ « ${field.label} » est limité à ${field.validation.maxLength} caractères.`;
  }
  return null;
}
