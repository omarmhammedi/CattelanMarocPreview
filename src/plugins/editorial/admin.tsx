import * as React from "react";
import type { PluginAdminExports } from "emdash";
import { apiFetch, parseApiResponse } from "emdash/plugin-utils";
import { changedSettings, isScalarField, SETTING_GROUPS, settingsFields, settingsGroup, validateSettings, type SettingsField } from "./settings-model.ts";
import { editorialCopyProblem, editorialData } from "../../lib/editorial-storage.mjs";

const ADMIN = "/_emdash/admin";
const SETTINGS_API = "/_emdash/api/content/site_content/global";
const PDF_PAGE = `${ADMIN}/plugins/catalogue-leads/contacts#catalogue-pdf`;
const SETTINGS_PAGE = `${ADMIN}/plugins/cattelan-editorial/settings`;
const button: React.CSSProperties = { display: "inline-block", padding: "9px 14px", border: "1px solid currentColor", borderRadius: 6, fontSize: 14, lineHeight: 1.5, textDecoration: "none", cursor: "pointer" };
const link: React.CSSProperties = { textDecoration: "underline", textUnderlineOffset: 3 };
const panel: React.CSSProperties = { border: "1px solid color-mix(in srgb, currentColor 24%, transparent)", borderRadius: 8, padding: 20 };
const control: React.CSSProperties = { width: "100%", padding: "10px 12px", border: "1px solid color-mix(in srgb, currentColor 45%, transparent)", borderRadius: 6, background: "transparent", color: "inherit", font: "inherit", boxSizing: "border-box" };
const row: React.CSSProperties = { display: "flex", flexWrap: "wrap", gap: 12, alignItems: "center" };

function TaskLink({ href, children }: { href: string; children: React.ReactNode }) {
  return <a href={href} style={link}>{children}</a>;
}

function TaskCards() {
  return <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 280px), 1fr))", gap: 16 }}>
    <section style={panel}><h2 style={{ fontSize: 19, fontWeight: 600, marginBottom: 8 }}>Pages du site</h2><p style={{ marginBottom: 14 }}>Titres, textes, images et sections de chaque page.</p><div style={{ display: "grid", gap: 10 }}><TaskLink href={`${ADMIN}/content/pages/home`}>Modifier l’accueil</TaskLink><TaskLink href={`${ADMIN}/content/pages`}>Toutes les pages</TaskLink><TaskLink href={`${ADMIN}/content/pages/mentions-legales`}>Mentions légales</TaskLink><TaskLink href={`${ADMIN}/content/pages/confidentialite`}>Politique de confidentialité</TaskLink></div></section>
    <section style={panel}><h2 style={{ fontSize: 19, fontWeight: 600, marginBottom: 8 }}>Mobilier</h2><p style={{ marginBottom: 14 }}>Collections, sélection de modèles, visuels et fiches techniques.</p><div style={{ display: "grid", gap: 10 }}><TaskLink href={`${ADMIN}/content/families`}>Collections</TaskLink><TaskLink href={`${ADMIN}/content/models`}>Modèles et présence au showroom</TaskLink></div></section>
    <section style={panel}><h2 style={{ fontSize: 19, fontWeight: 600, marginBottom: 8 }}>Journal</h2><p style={{ marginBottom: 14 }}>Articles, catégories, auteurs et références.</p><TaskLink href={`${ADMIN}/content/posts`}>Gérer les articles</TaskLink></section>
    <section style={panel}><h2 style={{ fontSize: 19, fontWeight: 600, marginBottom: 8 }}>Catalogue et demandes</h2><p style={{ marginBottom: 14 }}>Éditions du catalogue, PDF privé et messages des visiteurs.</p><div style={{ display: "grid", gap: 10 }}><TaskLink href={PDF_PAGE}>Remplacer le PDF du catalogue</TaskLink><TaskLink href={`${ADMIN}/content/catalogues`}>Éditions et couverture</TaskLink><TaskLink href={`${ADMIN}/plugins/catalogue-leads/contacts`}>Demandes de catalogue</TaskLink><TaskLink href={`${ADMIN}/plugins/contact-requests/requests`}>Rendez-vous et projets</TaskLink></div></section>
    <section style={panel}><h2 style={{ fontSize: 19, fontWeight: 600, marginBottom: 8 }}>Réglages du site</h2><p style={{ marginBottom: 14 }}>Coordonnées, horaires, services, formulaires, confidentialité et mesure d’audience.</p><div style={{ display: "grid", gap: 10 }}><TaskLink href={SETTINGS_PAGE}>Modifier les réglages par thème</TaskLink><TaskLink href={`${ADMIN}/settings/general`}>Nom et signature du site</TaskLink></div></section>
    <section style={panel}><h2 style={{ fontSize: 19, fontWeight: 600, marginBottom: 8 }}>SEO et navigation</h2><p style={{ marginBottom: 14 }}>Le SEO d’une page se règle dans son panneau SEO natif.</p><div style={{ display: "grid", gap: 10 }}><TaskLink href={`${ADMIN}/menus`}>Navigation et menus</TaskLink><TaskLink href={`${ADMIN}/settings/seo`}>Réglages SEO généraux</TaskLink><TaskLink href={`${ADMIN}/redirects`}>Redirections</TaskLink><TaskLink href={`${ADMIN}/content/pages/catalogue`}>SEO de la page Catalogue</TaskLink></div></section>
  </div>;
}

function EditorialTasksWidget() {
  return <div style={{ padding: 12 }}><p style={{ marginBottom: 16 }}>Retrouvez chaque contenu à son emplacement et préparez les modifications dans un brouillon avant publication.</p><a style={button} href={`${ADMIN}/plugins/cattelan-editorial/site`}>Ouvrir les tâches du site</a><a style={{ ...button, marginLeft: 12 }} href={SETTINGS_PAGE}>Réglages du site</a></div>;
}

function SitePage() {
  return <main style={{ maxWidth: 1180, margin: "0 auto", padding: 24 }}>
    <h1 style={{ fontSize: 28, fontWeight: 600, marginBottom: 8 }}>Piloter le site Cattelan</h1>
    <p style={{ marginBottom: 24, maxWidth: 820 }}>Choisissez ce que vous souhaitez mettre à jour. Les contenus restent dans EmDash, avec leurs brouillons, leurs révisions et leur prévisualisation.</p>
    <TaskCards />
    <section style={{ ...panel, marginTop: 24 }}><h2 style={{ fontSize: 19, fontWeight: 600, marginBottom: 12 }}>Avant de publier</h2><ol style={{ paddingLeft: 24, display: "grid", gap: 8, listStyle: "decimal" }}><li>Enregistrez le brouillon, puis ouvrez la prévisualisation.</li><li>Vérifiez les images, les liens et les informations pratiques sur la page concernée.</li><li>Publiez le contenu vérifié. Les réglages communs s’appliquent à plusieurs pages.</li></ol><p style={{ marginTop: 16 }}><strong>SEO natif :</strong> ses modifications sont enregistrées immédiatement, indépendamment du brouillon de contenu. Le SEO du catalogue appartient à la page Catalogue ; le SEO de l’accueil appartient à la page Accueil.</p></section>
    <section style={{ ...panel, marginTop: 16 }}><h2 style={{ fontSize: 19, fontWeight: 600, marginBottom: 12 }}>Repères de l’accueil</h2><p>Les sections repérées <code>brand</code>, <code>collections</code>, <code>showroom</code>, <code>catalogue</code> et <code>journal</code> correspondent aux emplacements fixes de l’accueil. Les déplacer dans la liste ne déplace pas ces emplacements. Les autres sections suivent leur ordre dans la liste.</p><p style={{ marginTop: 12 }}>Pour la présentation de marque et l’invitation au showroom, l’image de la section est prioritaire. Si elle est vide, l’image dédiée de l’accueil prend le relais. Pour masquer le visuel, videz les deux champs. Les champs marqués « Accueil uniquement » ne servent pas aux autres pages.</p><p style={{ marginTop: 12 }}>Les anciens champs de source ou de disponibilité signalés « Référence interne » servent à la documentation. Le choix « Présent au showroom » est le contrôle public de présentation des modèles.</p></section>
  </main>;
}

type SettingsEntry = { id: string; status: string; draftRevisionId?: string | null; data: Record<string, unknown> };
type SettingsResponse = { item: SettingsEntry; _rev?: string };

function SettingsPage() {
  const [snapshot, setSnapshot] = React.useState<SettingsResponse | null>(null);
  const [fields, setFields] = React.useState<SettingsField[]>([]);
  const [data, setData] = React.useState<Record<string, unknown>>({});
  const [busy, setBusy] = React.useState(false);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState("");
  const [message, setMessage] = React.useState("");
  const [preview, setPreview] = React.useState("");
  const [openGroups, setOpenGroups] = React.useState<string[]>(["contact"]);
  const loadController = React.useRef<AbortController | null>(null);
  const changes = React.useMemo(() => changedSettings(snapshot?.item.data || {}, data, fields), [snapshot, data, fields]);
  const dirty = Object.keys(changes).length > 0;

  const load = React.useCallback(async () => {
    loadController.current?.abort();
    const controller = new AbortController();
    loadController.current = controller;
    setLoading(true); setError(""); setMessage(""); setPreview("");
    try {
      const [content, schema] = await Promise.all([
        apiFetch(SETTINGS_API, { signal: controller.signal }).then(response => parseApiResponse<SettingsResponse>(response, "Impossible de charger la configuration du site")),
        apiFetch("/_emdash/api/schema/collections/site_content?includeFields=true", { signal: controller.signal }).then(response => parseApiResponse<{ item: { fields: SettingsField[] } }>(response, "Impossible de charger les champs de configuration")),
      ]);
      if (controller.signal.aborted) return;
      setSnapshot(content); setData(editorialData(content.item.data)); setFields(settingsFields(schema.item.fields).sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)));
    } catch (cause) {
      if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Chargement impossible.");
    } finally { if (!controller.signal.aborted) setLoading(false); }
  }, []);
  React.useEffect(() => { void load(); return () => loadController.current?.abort(); }, [load]);
  React.useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  function change(slug: string, value: unknown) {
    setData(previous => ({ ...previous, [slug]: value })); setMessage(""); setPreview("");
  }
  async function save(event: React.SyntheticEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!snapshot?._rev || busy || !dirty) return;
    const invalid = validateSettings(data, fields);
    if (invalid) {
      const field = fields.find(item => item.slug === invalid.field);
      if (field) setOpenGroups(previous => [...new Set([...previous, settingsGroup(field)])]);
      setError(invalid.message);
      requestAnimationFrame(() => document.getElementById(`setting-${invalid.field}`)?.focus());
      return;
    }
    if (Object.hasOwn(changes, "editorial_copy")) {
      const problem = editorialCopyProblem(changes.editorial_copy);
      if (problem) { setError(problem); return; }
    }
    setBusy(true); setError(""); setMessage("");
    try {
      const saved = await parseApiResponse<SettingsResponse>(await apiFetch(SETTINGS_API, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ _rev: snapshot._rev, data: changes }) }), "Impossible d’enregistrer le brouillon");
      setSnapshot(saved); setData(editorialData(saved.item.data)); setPreview("");
      setMessage("Brouillon enregistré. Vérifiez la prévisualisation, puis publiez les réglages pour les rendre visibles sur le site.");
    } catch (cause) { setError(`${cause instanceof Error ? cause.message : "Enregistrement impossible."} Vos modifications sont conservées dans ce formulaire. En cas de conflit, copiez-les avant de recharger la configuration.`); }
    finally { setBusy(false); }
  }
  async function makePreview() {
    if (!snapshot || busy || dirty) return;
    setBusy(true); setError("");
    try {
      const result = await parseApiResponse<{ url: string }>(await apiFetch(`${SETTINGS_API}/preview-url`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ pathPattern: "/preview/{collection}/{id}" }) }), "Impossible de préparer la prévisualisation");
      const url = new URL(result.url, window.location.origin);
      if (url.origin !== window.location.origin) throw new Error("L’origine de prévisualisation ne correspond pas à ce site.");
      setPreview(url.href);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Prévisualisation impossible."); }
    finally { setBusy(false); }
  }
  async function publish() {
    if (!snapshot?._rev || busy || dirty) return;
    setBusy(true); setError(""); setMessage("");
    try {
      await parseApiResponse<unknown>(await apiFetch(`${SETTINGS_API}/publish`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ _rev: snapshot._rev }) }), "Impossible de publier les réglages");
      // Publication changes the revision token. Never reuse the previous token.
      setSnapshot(null);
      const updated = await parseApiResponse<SettingsResponse>(await apiFetch(SETTINGS_API), "Publication effectuée, mais rechargement impossible");
      setSnapshot(updated); setData(editorialData(updated.item.data)); setPreview("");
      setMessage("Réglages publiés. Ils sont maintenant utilisés par les pages du site.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Publication impossible."); }
    finally { setBusy(false); }
  }

  const nativeLink = `${ADMIN}/content/site_content/${encodeURIComponent(snapshot?.item.id || "global")}`;
  return <main data-cattelan-editorial="settings" style={{ maxWidth: 980, margin: "0 auto", padding: 24 }}>
    <style>{'[data-cattelan-editorial="settings"] button:disabled { opacity: .45; cursor: not-allowed !important; }'}</style>
    <a style={link} href={`${ADMIN}/plugins/cattelan-editorial/site`}>← Piloter le site</a>
    <h1 style={{ fontSize: 28, fontWeight: 600, marginTop: 18, marginBottom: 8 }}>Réglages du site</h1>
    <p style={{ marginBottom: 16 }}>Ces thèmes modifient l’unique configuration commune du site. Chaque enregistrement prépare un brouillon ; la publication applique l’ensemble du brouillon à toutes les pages concernées.</p>
    <div style={{ ...row, marginBottom: 20 }}><a style={link} href={nativeLink}>Éditeur complet et historique des révisions</a><a style={link} href={`${ADMIN}/settings/general`}>Nom et signature</a><a style={link} href={`${ADMIN}/content/pages/home`}>SEO de l’accueil</a></div>
    {loading && <p role="status">Chargement des réglages…</p>}
    {error && <p role="alert" style={{ ...panel, marginBottom: 16, borderColor: "#c2410c" }}>{error}</p>}
    {message && <p role="status" style={{ ...panel, marginBottom: 16 }}>{message}</p>}
    {!loading && !snapshot && <button type="button" style={button} disabled={busy} onClick={() => void load()}>Recharger la configuration</button>}
    {!loading && snapshot && <form onSubmit={event => void save(event)} noValidate aria-busy={busy}>
      <div style={{ ...panel, marginBottom: 20 }}>
        <p style={{ marginBottom: 12 }}><strong>{dirty ? "Des modifications ne sont pas encore enregistrées" : snapshot.item.draftRevisionId ? "Brouillon enregistré, en attente de publication" : snapshot.item.status === "published" ? "Configuration publiée" : "Configuration en brouillon"}</strong></p>
        <div style={row}>
          <button style={button} type="submit" disabled={busy || !dirty || !snapshot._rev}>{busy ? "Opération en cours…" : "Enregistrer le brouillon"}</button>
          <button style={button} type="button" disabled={busy || dirty} onClick={() => void makePreview()}>Préparer la prévisualisation</button>
          <button style={button} type="button" disabled={busy || dirty || !snapshot._rev || (snapshot.item.status === "published" && !snapshot.item.draftRevisionId)} onClick={() => void publish()}>Publier les réglages</button>
        </div>
        {preview && <p style={{ marginTop: 12 }}><a href={preview} target="_blank" rel="noopener noreferrer" style={link}>Ouvrir le brouillon dans un nouvel onglet</a></p>}
        {dirty && <p style={{ marginTop: 12, fontSize: 14 }}>Enregistrez les changements avant de prévisualiser ou de publier. Les boutons ci-dessus concernent tous les thèmes.</p>}
        {!snapshot._rev && <p role="alert" style={{ marginTop: 12 }}>La révision native manque. Rechargez la configuration avant de l’enregistrer.</p>}
      </div>
      <nav aria-label="Thèmes des réglages" style={{ ...row, marginBottom: 20 }}>{SETTING_GROUPS.filter(group => fields.some(field => settingsGroup(field) === group.id)).map(group => <a key={group.id} style={link} href={`#settings-${group.id}`} onClick={() => setOpenGroups(previous => [...new Set([...previous, group.id])])}>{group.title}</a>)}</nav>
      {SETTING_GROUPS.map(group => {
        const groupFields = fields.filter(field => settingsGroup(field) === group.id);
        if (!groupFields.length) return null;
        return <details key={group.id} id={`settings-${group.id}`} open={openGroups.includes(group.id)} onToggle={event => { const open = event.currentTarget.open; setOpenGroups(previous => open ? [...new Set([...previous, group.id])] : previous.filter(id => id !== group.id)); }} style={{ ...panel, marginBottom: 14, scrollMarginTop: 24 }}>
          <summary style={{ fontSize: 19, fontWeight: 600, cursor: "pointer" }}>{group.title}</summary>
          <p style={{ marginTop: 12, marginBottom: 22, lineHeight: 1.6 }}>{group.description}</p>
          <fieldset disabled={busy} style={{ display: "grid", gap: 24, border: 0, padding: 0, minWidth: 0 }}><legend style={{ position: "absolute", width: 1, height: 1, overflow: "hidden", clipPath: "inset(50%)" }}>{group.title}</legend>{groupFields.map(field => <SettingsInput key={field.slug} field={field} value={data[field.slug]} onChange={value => change(field.slug, value)} nativeLink={nativeLink} />)}</fieldset>
          {group.id === "catalogue-form" && <p style={{ marginTop: 20 }}><a href={PDF_PAGE} style={link}>Remplacer le PDF privé du catalogue</a> · <a href={`${ADMIN}/content/pages/catalogue`} style={link}>Page et SEO du catalogue</a></p>}
          {group.id === "privacy" && <div style={{ marginTop: 20 }}><p>La rédaction de la politique appartient à la page Confidentialité. Conservez ses variables <code>{"{{…}}"}</code> : elles relient le texte aux coordonnées, au récépissé CNDP et aux durées de conservation effectives.</p><p style={{ marginTop: 12 }}><a href={`${ADMIN}/content/pages/confidentialite`} style={link}>Modifier la politique de confidentialité</a> · <a href={`${ADMIN}/content/pages/mentions-legales`} style={link}>Modifier les mentions légales</a></p></div>}
        </details>;
      })}
      <div style={{ ...row, marginTop: 20 }}><button style={button} type="submit" disabled={busy || !dirty || !snapshot._rev}>Enregistrer le brouillon</button><button style={button} type="button" disabled={busy || dirty} onClick={() => void load()}>Actualiser les valeurs</button>{dirty && <button style={button} type="button" disabled={busy} onClick={() => { setData(editorialData(snapshot.item.data)); setError(""); setMessage("Les changements non enregistrés de ce formulaire ont été annulés. Le brouillon enregistré est conservé."); }}>Annuler mes changements non enregistrés</button>}</div>
    </form>}
  </main>;
}

function SettingsInput({ field, value, onChange, nativeLink }: { field: SettingsField; value: unknown; onChange: (value: unknown) => void; nativeLink: string }) {
  const id = `setting-${field.slug}`;
  const label = <label htmlFor={id} style={{ display: "block", fontWeight: 600, marginBottom: 8 }}>{field.label}{field.required ? " *" : ""}</label>;
  const hint = typeof field.options?.helpText === "string" ? field.options.helpText : "";
  const common = { id, name: field.slug, required: !!field.required, "aria-describedby": hint ? `${id}-help` : undefined };
  if (field.widget === "cattelan-editorial:retired-reference") return <RetiredReference id={id} label={field.label} value={value} />;
  if (!isScalarField(field)) return <div><p style={{ fontWeight: 600, marginBottom: 8 }}>{field.label}</p><p style={{ marginBottom: 8 }}>{field.type === "image" ? "Sélectionnez ou retirez l’image dans la médiathèque de l’éditeur complet." : "Modifiez cette sélection dans l’éditeur complet pour conserver les liens natifs entre contenus."}</p><a href={nativeLink} style={link}>Ouvrir l’éditeur complet</a></div>;
  let input: React.ReactNode;
  if (field.type === "text") input = <textarea {...common} style={{ ...control, resize: "vertical", minHeight: 108 }} rows={4} maxLength={field.validation?.maxLength} value={typeof value === "string" ? value : ""} onChange={event => onChange(event.target.value)} />;
  else if (field.type === "boolean") input = <input {...common} type="checkbox" checked={value === true || value === 1} onChange={event => onChange(event.target.checked)} />;
  else if (field.type === "select") input = <select {...common} style={control} value={typeof value === "string" ? value : ""} onChange={event => onChange(event.target.value)}><option value="">Choisir…</option>{field.validation?.options?.map(option => <option key={option} value={option}>{option}</option>)}</select>;
  else input = <input {...common} style={control} type={field.type === "url" ? "url" : ["number", "integer"].includes(field.type) ? "number" : field.slug === "public_email" ? "email" : "text"} min={field.validation?.min} max={field.validation?.max} minLength={field.validation?.minLength} maxLength={field.validation?.maxLength} pattern={field.slug === "analytics_token" ? "[0-9a-fA-F]{32}" : field.validation?.pattern} step={field.type === "integer" ? 1 : "any"} value={typeof value === "string" || typeof value === "number" ? value : ""} onChange={event => onChange(["number", "integer"].includes(field.type) ? event.target.value === "" ? null : event.target.valueAsNumber : event.target.value)} />;
  return <div>{label}{input}{hint && <p id={`${id}-help`} style={{ marginTop: 7, fontSize: 14, lineHeight: 1.5 }}>{hint}</p>}</div>;
}

type WidgetProps = { value: unknown; label?: string; id?: string };
function RouteIdentity({ value, label, id }: WidgetProps) {
  return <div style={panel}><p id={id} style={{ fontWeight: 600 }}>{label || "Page du site"} : <code>{String(value || "Non définie")}</code></p><p style={{ marginTop: 8 }}>Cette identité relie le contenu à une adresse existante du site. Elle ne se modifie pas depuis l’éditeur.</p>{value === "home" && <p style={{ marginTop: 8 }}>Les champs « Accueil uniquement » et les repères de section appartiennent à cette page.</p>}{value === "confidentialite" && <p style={{ marginTop: 8 }}>Vous pouvez modifier la rédaction. Conservez chaque variable <code>{"{{…}}"}</code> entière, sans mise en forme à l’intérieur : elle fournit les faits à jour. Modifiez l’identité juridique, les coordonnées, la date et le récépissé dans les <a style={link} href={SETTINGS_PAGE}>réglages par thème</a>.</p>}<a href={`${ADMIN}/plugins/cattelan-editorial/site`} style={{ ...link, display: "inline-block", marginTop: 8 }}>Voir les repères de contenu et d’images</a></div>;
}
function PrivatePdf({ value, label, id }: WidgetProps) {
  const entry = typeof window === "undefined" ? undefined : window.location.pathname.match(/\/content\/catalogues\/([^/]+)\/?$/u)?.[1];
  let href = PDF_PAGE;
  if (entry && entry !== "new") {
    try { href = `${ADMIN}/plugins/catalogue-leads/contacts?catalogue=${encodeURIComponent(decodeURIComponent(entry))}#catalogue-pdf`; }
    catch { /* A malformed path leaves catalogue selection to the safe uploader. */ }
  }
  return <div style={panel}><p id={id} style={{ fontWeight: 600 }}>{label || "PDF privé"}</p><p style={{ marginTop: 8, marginBottom: 12 }}>{value ? "Un PDF privé est associé à ce catalogue." : "Aucun PDF privé n’est associé à ce catalogue."} Utilisez le chargement sécurisé pour le remplacer, puis vérifiez et publiez le brouillon.</p><a style={button} href={href}>Remplacer le PDF privé</a><p style={{ marginTop: 12 }}><a style={link} href={`${ADMIN}/content/pages/catalogue`}>Modifier la page publique et son SEO</a></p></div>;
}
function RetiredReference({ value, label, id }: WidgetProps) {
  const seo = id?.endsWith("seo_title") || id?.endsWith("meta_description");
  return <div style={panel}><p id={id} style={{ fontWeight: 600 }}>{label || "Référence interne"}</p><p style={{ marginTop: 8 }}>Archive en lecture seule — sans effet sur le site. {seo ? "Le panneau SEO natif est la source des métadonnées ; ses changements sont enregistrés immédiatement, indépendamment du brouillon." : "Cette valeur est conservée pour référence et n’apparaît pas aux visiteurs."}</p><p style={{ marginTop: 8, whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>{typeof value === "string" && value ? value : "Aucune valeur archivée."}</p></div>;
}
function EditorialCopy({ label, id }: WidgetProps) {
  return <div style={panel}><p id={id} style={{ fontWeight: 600 }}>{label || "Textes et informations du site"}</p><p style={{ marginTop: 8, marginBottom: 12 }}>Modifiez les boutons, formulaires, services et informations de confidentialité dans les réglages par thème. Ils utilisent le même brouillon et les mêmes révisions que cette configuration.</p><a href={SETTINGS_PAGE} style={button}>Modifier les textes par thème</a></div>;
}

export const pages: PluginAdminExports["pages"] = { "/site": SitePage, "/settings": SettingsPage };
export const widgets: PluginAdminExports["widgets"] = { "editorial-tasks": EditorialTasksWidget };
export const fields: PluginAdminExports["fields"] = { "route-identity": RouteIdentity, "private-pdf": PrivatePdf, "retired-reference": RetiredReference, "editorial-copy": EditorialCopy };
