import { EDITORIAL_COPY_FIELDS, LEGACY_REQUIRED_GLOBAL_LABELS, editorialChanges, editorialData } from "../../lib/editorial-storage.mjs";

export type SettingsField = {
  slug: string;
  label: string;
  type: string;
  widget?: string;
  required?: boolean;
  sortOrder?: number;
  options?: Record<string, unknown>;
  validation?: { min?: number; max?: number; maxLength?: number; minLength?: number; pattern?: string; options?: string[] };
};

export const SETTING_GROUPS = [
  { id: "identity", title: "Identité et présentation", description: "Logos, ville affichée et présentation du pied de page. Le nom du site et sa signature se règlent dans les réglages généraux natifs." },
  { id: "contact", title: "Showroom et contacts", description: "Une seule source pour les coordonnées, les horaires et la carte utilisés sur le site." },
  { id: "actions", title: "Boutons et liens", description: "Libellés des actions commerciales ; leurs destinations correspondent aux parcours du site. Les liens des menus principal et de pied de page, dont le lien Catalogue de l’en-tête, se règlent dans Navigation." },
  { id: "model-services", title: "Services et conditions", description: "Informations de livraison, de devis et de service affichées aux visiteurs." },
  { id: "catalogue-form", title: "Catalogue et formulaire", description: "Catalogue actif, libellés et messages du formulaire. Les champs Nom et E-mail servent aussi aux demandes de rendez-vous et de projet." },
  { id: "request-form", title: "Rendez-vous et projets", description: "Libellés et messages des formulaires. Les valeurs techniques des choix restent contrôlées pour conserver des demandes cohérentes." },
  { id: "privacy", title: "Confidentialité et mentions", description: "Textes de confidentialité et récépissé CNDP. Vérifiez leur cohérence avec les traitements réellement effectués." },
  { id: "analytics", title: "Mesure d’audience", description: "Le jeton public Cloudflare Web Analytics comporte 32 caractères hexadécimaux. Videz-le pour désactiver le chargement de la mesure d’audience." },
  { id: "internal", title: "Repères internes", description: "Nom de la configuration et anciens champs conservés pour référence. Les notes signalées comme internes ne sont pas affichées aux visiteurs." },
] as const;

const GROUP_BY_FIELD: Record<string, string> = {
  title: "internal", model_notice: "internal",
  city: "identity", brand_location: "identity", logo_light: "identity", logo_dark: "identity", footer_text: "identity", preview_notice: "identity",
  contact_phone: "contact", whatsapp_url: "contact", public_email: "contact", address: "contact", hours: "contact", map_url: "contact", map_embed_url: "contact", map_note: "contact", showroom_latitude: "contact", showroom_longitude: "contact",
  cndp_receipt: "privacy", analytics_token: "analytics", active_catalogue: "catalogue-form", placeholder_notice: "catalogue-form", catalogue_label: "catalogue-form",
  contact_label: "actions", collections_label: "actions", showroom_label: "actions", journal_label: "actions", read_article_label: "actions", discover_label: "actions", scroll_label: "actions",
};
for (const field of EDITORIAL_COPY_FIELDS) GROUP_BY_FIELD[field.slug] = field.group;

/** Expose structured copy through ordinary controls without creating D1 columns. */
export function settingsFields(nativeFields: SettingsField[]): SettingsField[] {
  const native = nativeFields.map(field => LEGACY_REQUIRED_GLOBAL_LABELS.includes(field.slug) ? { ...field, required: true } : field);
  if (!native.some(field => field.slug === "editorial_copy")) return native;
  const virtual = new Set(EDITORIAL_COPY_FIELDS.map(field => field.slug));
  return [
    ...native.filter(field => field.slug !== "editorial_copy" && !virtual.has(field.slug)),
    ...EDITORIAL_COPY_FIELDS.map((field, index) => ({ ...field, sortOrder: 1000 + index })),
  ];
}

export function settingsGroup(field: SettingsField): string {
  return GROUP_BY_FIELD[field.slug] || (field.slug.startsWith("form_") ? "catalogue-form" : "internal");
}

export function isScalarField(field: SettingsField): boolean {
  return field.widget !== "cattelan-editorial:retired-reference" && ["string", "text", "url", "number", "integer", "boolean", "select"].includes(field.type);
}

/** Preserve sparse records and only send deliberately edited fields. */
export function changedSettings(original: Record<string, unknown>, edited: Record<string, unknown>, fields: SettingsField[]): Record<string, unknown> {
  const before = editorialData(original);
  const changes = Object.fromEntries(fields.filter(isScalarField).filter(field =>
    Object.hasOwn(edited, field.slug) && !Object.is(before[field.slug], edited[field.slug]),
  ).map(field => [field.slug, edited[field.slug]]));
  return editorialChanges(original, changes);
}

export function validateSettings(data: Record<string, unknown>, fields: SettingsField[]): { field: string; message: string } | null {
  for (const field of fields.filter(isScalarField)) {
    const value = data[field.slug];
    if (field.required && (value == null || (typeof value === "string" && !value.trim()))) {
      return { field: field.slug, message: `Le champ « ${field.label} » est obligatoire.` };
    }
    if (["string", "text", "url", "select"].includes(field.type) && value != null && typeof value !== "string") {
      return { field: field.slug, message: `Le champ « ${field.label} » doit contenir du texte.` };
    }
    if (typeof value === "string" && field.validation?.maxLength != null && value.length > field.validation.maxLength) {
      return { field: field.slug, message: `Le champ « ${field.label} » est limité à ${field.validation.maxLength} caractères.` };
    }
    if (field.slug === "public_email" && (typeof value !== "string" || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/u.test(value) || value.length > 320)) {
      return { field: field.slug, message: "L’adresse e-mail publique doit être une adresse complète valide." };
    }
    if (field.slug === "analytics_token" && value && !/^[0-9a-f]{32}$/iu.test(String(value))) {
      return { field: field.slug, message: "Le jeton Cloudflare Web Analytics doit contenir exactement 32 caractères hexadécimaux, sans espace, ou être vide." };
    }
    if ((field.type === "number" || field.type === "integer") && value != null && value !== "") {
      if (typeof value !== "number" || !Number.isFinite(value) || (field.type === "integer" && !Number.isInteger(value))) {
        return { field: field.slug, message: `Le champ « ${field.label} » doit contenir un nombre valide.` };
      }
      if ((field.validation?.min != null && value < field.validation.min) || (field.validation?.max != null && value > field.validation.max)) {
        return { field: field.slug, message: `La valeur de « ${field.label} » est hors des limites autorisées.` };
      }
    }
  }
  return null;
}
