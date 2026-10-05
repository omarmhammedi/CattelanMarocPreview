import * as React from "react";
import type { PluginAdminExports } from "emdash";
import { apiFetch, parseApiResponse } from "emdash/plugin-utils";
import { matchesRecordSearch } from "../admin-records.ts";
import { useAdminRecords } from "../admin-use-records.tsx";
import { collectPages } from "../../lib/pagination.ts";

const BASE = "/_emdash/api/plugins/catalogue-leads";
type Contact = {
  requestId: string; name: string; email: string; whatsapp?: string; city?: string; createdAt: number;
  communicationsConsent: boolean; catalogueTitle: string; placeholder: boolean;
  crmStatus: string; crmAttempts: number; emailStatus?: string;
  sourcePath?: string; consentVersion?: string; emailSentAt?: number; crmLastError?: string;
};
type CatalogueItem = { id: string; slug?: string; status: string; data: Record<string, unknown> };
type CatalogueRevision = { item: CatalogueItem; _rev: string };
type CataloguePage = { items: CatalogueItem[]; nextCursor?: string };
const stateLabel: Record<string, string> = {
  pending: "En attente", processing: "Traitement en cours",
  sent: "E-mail envoyé", failed: "Échec de l’e-mail",
  waiting_configuration: "CRM à connecter", delivered: "Transmis au CRM",
};
const buttonStyle: React.CSSProperties = { padding: "8px 14px", border: "1px solid currentColor", borderRadius: 6, fontSize: 14 };
const fieldStyle: React.CSSProperties = { padding: 10, border: "1px solid currentColor", borderRadius: 6, width: "100%" };
const cell: React.CSSProperties = { padding: 12, verticalAlign: "top", borderBottom: "1px solid #8884" };

function ContactsPage() {
  const records = useAdminRecords<Contact>(`${BASE}/contacts`);
  const { items: contacts, hasMore, error, setError } = records;
  const [actionBusy, setBusy] = React.useState(false);
  const busy = records.loading || actionBusy;
  const [query, setQuery] = React.useState("");
  const [emailFilter, setEmailFilter] = React.useState("");
  const [crmFilter, setCrmFilter] = React.useState("");
  const [tab, setTab] = React.useState("catalogue-contacts");
  const [message, setMessage] = React.useState("");
  const [catalogues, setCatalogues] = React.useState<CatalogueItem[]>([]);
  const [catalogueId, setCatalogueId] = React.useState("");
  const [catalogueLoading, setCatalogueLoading] = React.useState(true);
  const [catalogueReady, setCatalogueReady] = React.useState(false);
  const [catalogueRevision, setCatalogueRevision] = React.useState<CatalogueRevision | null>(null);
  const [editionReload, setEditionReload] = React.useState(0);
  const [pdfFile, setPdfFile] = React.useState<File | null>(null);
  const [pdfBusy, setPdfBusy] = React.useState(false);
  const [pdfError, setPdfError] = React.useState("");
  const [placeholder, setPlaceholder] = React.useState(false);
  const [pdfSaved, setPdfSaved] = React.useState<{ id: string; title: string } | null>(null);
  const pdfInput = React.useRef<HTMLInputElement>(null);
  const pdfPending = React.useRef<AbortController | null>(null);

  React.useEffect(() => () => { pdfPending.current?.abort(); }, []);

  const visible = contacts.filter(contact => (!emailFilter || (contact.emailStatus || "not_requested") === emailFilter)
    && (!crmFilter || contact.crmStatus === crmFilter)
    && matchesRecordSearch(query, [contact.requestId, contact.name, contact.email, contact.whatsapp, contact.city, contact.catalogueTitle, contact.sourcePath]));
  React.useEffect(() => {
    const updateTab = () => setTab(window.location.hash === "#catalogue-pdf" ? "catalogue-pdf" : "catalogue-contacts");
    updateTab(); window.addEventListener("hashchange", updateTab);
    return () => window.removeEventListener("hashchange", updateTab);
  }, []);

  React.useEffect(() => {
    const controller = new AbortController();
    async function loadCatalogues() {
      try {
        const items = await collectPages<CatalogueItem>(async (cursor) => {
          const result = await parseApiResponse<CataloguePage>(await apiFetch(`/_emdash/api/content/catalogues?limit=100${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`, { signal: controller.signal }), "Impossible de charger les catalogues.");
          return { entries: result.items, nextCursor: result.nextCursor };
        }, 100);
        if (controller.signal.aborted) return;
        setCatalogues(items);
        const requestedId = new URLSearchParams(window.location.search).get("catalogue");
        const selected = requestedId ? items.find(item => item.id === requestedId || item.slug === requestedId) : items.find(item => item.status === "published") ?? items[0];
        setCatalogueId(selected?.id ?? "");
        if (!selected) {
          setCatalogueLoading(false);
          if (requestedId) setPdfError("Le catalogue demandé est introuvable. Choisissez une édition dans la liste.");
        }
      } catch {
        if (!controller.signal.aborted) { setPdfError("Les catalogues n’ont pas pu être chargés. Actualisez la page pour réessayer."); setCatalogueLoading(false); }
      }
    }
    void loadCatalogues();
    return () => { controller.abort(); };
  }, []);

  React.useEffect(() => {
    if (!catalogueId) return;
    let active = true;
    setCatalogueLoading(true); setCatalogueReady(false); setCatalogueRevision(null); setPdfError(""); setPdfSaved(null); setPdfFile(null);
    if (pdfInput.current) pdfInput.current.value = "";
    async function loadEdition() {
      try {
        const current = await parseApiResponse<CatalogueRevision>(await apiFetch(`/_emdash/api/content/catalogues/${encodeURIComponent(catalogueId)}`), "Impossible de charger cette édition.");
        if (active) { setCatalogueRevision(current); setPlaceholder(current.item.data.is_placeholder === true || current.item.data.is_placeholder === 1); setCatalogueReady(true); }
      } catch {
        if (active) setPdfError("Cette édition n’a pas pu être chargée. Sélectionnez à nouveau le catalogue pour réessayer.");
      } finally { if (active) setCatalogueLoading(false); }
    }
    void loadEdition();
    return () => { active = false; };
  }, [catalogueId, editionReload]);

  async function exportCsv() {
    setBusy(true); setError("");
    try {
      const response = await apiFetch(`${BASE}/export`);
      if (!response.ok) throw new Error("Impossible de préparer l’export CSV.");
      const url = URL.createObjectURL(await response.blob());
      const anchor = document.createElement("a");
      anchor.href = url; anchor.download = "contacts-catalogue.csv"; anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Une erreur est survenue."); }
    finally { setBusy(false); }
  }
  async function process() {
    setBusy(true); setError(""); setMessage("");
    try {
      const result = await parseApiResponse<{ message: string; processed: number }>(await apiFetch(`${BASE}/crm/process`, { method: "POST", headers: { "content-type": "application/json" }, body: "{}" }), "Impossible de traiter la file");
      setMessage(`${result.processed} demande(s) traitée(s). ${result.message}`);
      await records.refresh();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Une erreur est survenue."); }
    finally { setBusy(false); }
  }
  async function associatePdf(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!pdfFile || !catalogueId || !catalogueReady || !catalogueRevision || pdfBusy) return;
    if (pdfFile.size > 8 * 1024 * 1024) { setPdfError("Le PDF doit peser au maximum 8 Mio."); return; }
    setPdfBusy(true); setPdfError(""); setPdfSaved(null);
    const controller = new AbortController();
    pdfPending.current = controller;
    let uploaded = false;
    try {
      const result = await parseApiResponse<{ ok: boolean; private_file_key?: string }>(await apiFetch(`${BASE}/pdf/upload`, { method: "POST", headers: { "content-type": "application/pdf" }, body: pdfFile, signal: controller.signal }), "Impossible de charger le PDF.");
      controller.signal.throwIfAborted();
      if (!result.ok || !result.private_file_key) { setPdfError("Le fichier n’a pas été accepté. Choisissez un PDF valide de 8 Mio maximum."); return; }
      uploaded = true;
      // Use the revision the editor actually reviewed. A fresh read here would
      // hide concurrent edits to the demonstration checkbox or other draft data.
      const path = `/_emdash/api/content/catalogues/${encodeURIComponent(catalogueId)}`;
      const saved = await parseApiResponse<CatalogueRevision>(await apiFetch(path, {
        method: "PUT", headers: { "content-type": "application/json" }, signal: controller.signal,
        body: JSON.stringify({ _rev: catalogueRevision._rev, data: { private_file_key: result.private_file_key, is_placeholder: placeholder } }),
      }), "Impossible d’enregistrer le brouillon.");
      controller.signal.throwIfAborted();
      setCatalogueRevision(saved);
      setPdfSaved({ id: catalogueId, title: typeof saved.item.data.title === "string" ? saved.item.data.title : "ce catalogue" });
      setPdfFile(null);
      if (pdfInput.current) pdfInput.current.value = "";
    } catch {
      if (!controller.signal.aborted) {
        if (uploaded) { setCatalogueReady(false); setCatalogueRevision(null); }
        setPdfError(uploaded ? "Le PDF a été chargé, mais l’enregistrement du brouillon n’a pas été confirmé. Rechargez cette édition avant de réessayer." : "Le PDF n’a pas pu être chargé. Veuillez réessayer.");
      }
    } finally { if (!controller.signal.aborted) setPdfBusy(false); }
  }

  async function deleteContact(contact: Contact) {
    if (!window.confirm(`Supprimer la demande de ${contact.name} de ce site ? Son lien de téléchargement sera également désactivé.`)) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const result = await parseApiResponse<{ ok: boolean; message?: string }>(await apiFetch(`${BASE}/contacts/delete`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ requestId: contact.requestId }) }), "Impossible de supprimer la demande");
      if (!result.ok) throw new Error(result.message);
      records.removeLocal(contact.requestId);
      await records.refresh();
      setMessage("La demande et son événement CRM ont été supprimés de ce site.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Une erreur est survenue."); }
    finally { setBusy(false); }
  }

  return <section data-cattelan-ops style={{ maxWidth: 1280, padding: 24 }}>
    <style>{'[data-cattelan-ops] button { cursor: pointer; } [data-cattelan-ops] button:disabled { opacity: .45; cursor: not-allowed; }'}</style>
    <h1 style={{ fontSize: 28, fontWeight: 600, marginBottom: 10 }}>Contacts catalogue</h1>
    <p style={{ marginBottom: 20 }}>Consultez les demandes de catalogue ou remplacez le PDF d’une édition. Les documents restent privés jusqu’à leur téléchargement par un contact autorisé.</p>
    <nav aria-label="Gestion du catalogue" style={{ display: "flex", flexWrap: "wrap", gap: 12, borderBottom: "1px solid #8884", paddingBottom: 16, marginBottom: 24 }}>
      <a href="#catalogue-contacts" aria-current={tab === "catalogue-contacts" ? "page" : undefined} onClick={() => setTab("catalogue-contacts")} style={{ ...buttonStyle, fontWeight: tab === "catalogue-contacts" ? 700 : 400 }}>Demandes et envois</a>
      <a href="#catalogue-pdf" aria-current={tab === "catalogue-pdf" ? "page" : undefined} onClick={() => setTab("catalogue-pdf")} style={{ ...buttonStyle, fontWeight: tab === "catalogue-pdf" ? 700 : 400 }}>Remplacer un PDF</a>
    </nav>
    <section id="catalogue-contacts" hidden={tab !== "catalogue-contacts"} aria-label="Demandes et envois">
    <p style={{ marginBottom: 16 }}>Le CRM est en mode simulation. « Tester la file CRM » traite uniquement cette simulation ; cette action n’envoie aucun e-mail.</p>
    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
      <button style={buttonStyle} type="button" disabled={busy} onClick={() => void records.refresh()}>Actualiser</button>
      <button style={buttonStyle} type="button" disabled={busy} onClick={() => void exportCsv()}>Exporter toutes les demandes (CSV)</button>
      <button style={buttonStyle} type="button" disabled={busy} onClick={() => void process()}>Tester la file CRM</button>
    </div>
    <div role="search" aria-label="Filtrer les demandes chargées" style={{ display: "flex", flexWrap: "wrap", gap: 16, marginBottom: 12 }}>
      <label style={{ flex: "2 1 250px", display: "grid", gap: 6 }}>Rechercher
        <input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Nom, e-mail, ville, catalogue…" style={fieldStyle} />
      </label>
      <label style={{ flex: "1 1 180px", display: "grid", gap: 6 }}>Envoi du catalogue
        <select value={emailFilter} onChange={event => setEmailFilter(event.target.value)} style={fieldStyle}><option value="">Tous les états</option>{["pending", "processing", "sent", "failed"].map(value => <option key={value} value={value}>{stateLabel[value]}</option>)}<option value="not_requested">Non demandé</option></select>
      </label>
      <label style={{ flex: "1 1 180px", display: "grid", gap: 6 }}>CRM
        <select value={crmFilter} onChange={event => setCrmFilter(event.target.value)} style={fieldStyle}><option value="">Tous les états</option>{["pending", "processing", "waiting_configuration", "delivered"].map(value => <option key={value} value={value}>{stateLabel[value]}</option>)}</select>
      </label>
    </div>
    <p id="contacts-filter-scope" role="status" style={{ marginBottom: 12 }}>{visible.length} sur {contacts.length} demandes chargées. Les filtres portent sur les demandes chargées ; l’export CSV contient toutes les demandes.{hasMore && " Chargez les suivantes pour étendre la recherche."}</p>
    {(query || emailFilter || crmFilter) && <button type="button" style={{ ...buttonStyle, marginBottom: 12 }} onClick={() => { setQuery(""); setEmailFilter(""); setCrmFilter(""); }}>Effacer les filtres</button>}
    {error && <p role="alert" style={{ color: "#dc2626", marginBottom: 12 }}>{error}</p>}
    {message && <p role="status" style={{ marginBottom: 12 }}>{message}</p>}
    <div style={{ overflowX: "auto" }} aria-busy={busy} aria-describedby="contacts-filter-scope">
      <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: 14 }}>
        <caption style={{ textAlign: "left", paddingBottom: 8, opacity: .7 }}>Dates et heures du showroom · Casablanca</caption>
        <thead><tr>{["Date", "Contact", "Catalogue", "Envoi catalogue", "CRM", "Détails"].map((heading) => <th key={heading} scope="col" style={{ padding: 12, borderBottom: "1px solid #777" }}>{heading}</th>)}</tr></thead>
        <tbody>{visible.map((contact) => <tr key={contact.requestId}>
          <td style={cell}>{new Date(contact.createdAt).toLocaleString("fr-FR", { timeZone: "Africa/Casablanca" })}</td>
          <td style={cell}><strong>{contact.name}</strong><br />{contact.email}{contact.city && <><br />{contact.city}</>}</td>
          <td style={cell}>{contact.catalogueTitle}{contact.placeholder ? " (démonstration)" : ""}</td>
          <td style={cell}>{contact.emailStatus ? (stateLabel[contact.emailStatus] ?? contact.emailStatus) : "Non demandé"}</td>
          <td style={cell}>{stateLabel[contact.crmStatus] ?? contact.crmStatus}</td>
          <td style={{ ...cell, minWidth: 190 }}><details>
            <summary style={{ cursor: "pointer", textDecoration: "underline" }} aria-label={`Consulter la demande de ${contact.name}`}>Consulter</summary>
            <dl style={{ marginTop: 12, minWidth: 250, maxWidth: 400, overflowWrap: "anywhere" }}>
              {[
                ["Nom", contact.name], ["E-mail", contact.email], ["WhatsApp", contact.whatsapp || "Non renseigné"], ["Ville", contact.city || "Non renseignée"],
                ["Catalogue demandé", `${contact.catalogueTitle}${contact.placeholder ? " (démonstration)" : ""}`],
                ["Communications commerciales", contact.communicationsConsent ? "Acceptées" : "Non demandées"],
                ["Version du consentement", contact.consentVersion || "Non renseignée"], ["Page d’origine", contact.sourcePath || "Non renseignée"],
                ["E-mail envoyé le", contact.emailSentAt ? new Date(contact.emailSentAt).toLocaleString("fr-FR", { timeZone: "Africa/Casablanca" }) : "Pas d’envoi enregistré"],
                ["Tentatives CRM", String(contact.crmAttempts)], ["Dernière information CRM", contact.crmLastError || "—"], ["Identifiant", contact.requestId],
              ].map(([label, value]) => <React.Fragment key={label}><dt style={{ fontWeight: 600, marginTop: 10 }}>{label}</dt><dd style={{ whiteSpace: "pre-line", margin: 0 }}>{value}</dd></React.Fragment>)}
            </dl>
            <button type="button" style={{ ...buttonStyle, marginTop: 16 }} disabled={busy} onClick={() => void deleteContact(contact)}>Supprimer cette demande</button>
          </details></td>
        </tr>)}</tbody>
      </table>
    </div>
    {!visible.length && !busy && <p style={{ padding: 16 }}>{contacts.length ? "Aucune demande chargée ne correspond aux filtres." : "Aucune demande enregistrée pour le moment."}</p>}
    {records.loading && <p role="status" style={{ padding: 16 }}>Chargement des demandes…</p>}
    {hasMore && <button style={{ ...buttonStyle, marginTop: 16 }} type="button" disabled={busy} onClick={() => void records.loadMore()}>Charger les demandes suivantes</button>}
    </section>
    <section id="catalogue-pdf" hidden={tab !== "catalogue-pdf"} aria-labelledby="catalogue-pdf-title">
      <h2 id="catalogue-pdf-title" style={{ fontSize: 21, fontWeight: 600, marginBottom: 10 }}>Remplacer un catalogue PDF</h2>
      <p style={{ marginBottom: 14 }}>Choisissez le catalogue et son nouveau document. Le PDF sera associé au brouillon ; vous pourrez vérifier cette édition avant de la publier.</p>
      <form onSubmit={(event) => void associatePdf(event)} aria-busy={pdfBusy} style={{ display: "grid", gap: 16, maxWidth: 600 }}>
        <label style={{ display: "grid", gap: 8 }}>Catalogue
          <select name="catalogue" value={catalogueId} disabled={pdfBusy || !catalogues.length} onChange={(event) => { setCatalogueReady(false); setCatalogueRevision(null); setPdfFile(null); setCatalogueId(event.target.value); }} style={{ padding: 10, border: "1px solid currentColor", borderRadius: 6 }}>
            {!catalogues.length && <option value="">{catalogueLoading ? "Chargement…" : "Aucun catalogue disponible"}</option>}
            {catalogues.length > 0 && !catalogueId && <option value="">Choisir une édition</option>}
            {catalogues.map((item) => <option key={item.id} value={item.id}>{typeof item.data.title === "string" ? item.data.title : "Catalogue"}{typeof item.data.edition === "string" ? ` — ${item.data.edition}` : ""}</option>)}
          </select>
        </label>
        <label style={{ display: "grid", gap: 8 }}>Nouveau PDF (8 Mio maximum)
          <input ref={pdfInput} name="pdf" type="file" accept="application/pdf,.pdf" disabled={pdfBusy || catalogueLoading || !catalogueReady} onChange={(event) => { setPdfFile(event.target.files?.[0] ?? null); setPdfSaved(null); setPdfError(""); }} />
        </label>
        <label style={{ display: "flex", gap: 8, alignItems: "center" }}><input type="checkbox" name="is_placeholder" checked={placeholder} disabled={pdfBusy || catalogueLoading || !catalogueReady} onChange={(event) => setPlaceholder(event.target.checked)} /> Document de démonstration</label>
        <button type="submit" style={{ ...buttonStyle, justifySelf: "start" }} disabled={pdfBusy || catalogueLoading || !catalogueReady || !pdfFile}>{pdfBusy ? "Enregistrement…" : "Associer au brouillon"}</button>
      </form>
      {pdfError && <p role="alert" style={{ marginTop: 14, color: "#dc2626" }}>{pdfError}</p>}
      {pdfError && catalogueId && !catalogueReady && <button type="button" style={{ ...buttonStyle, marginTop: 12 }} disabled={pdfBusy || catalogueLoading} onClick={() => setEditionReload(value => value + 1)}>Recharger cette édition</button>}
      {pdfSaved && <div role="status" style={{ marginTop: 14 }}><p>PDF associé au brouillon « {pdfSaved.title} ». Publiez le catalogue pour le mettre en ligne.</p><a href={`/_emdash/admin/content/catalogues/${encodeURIComponent(pdfSaved.id)}`} style={{ textDecoration: "underline", display: "inline-block", marginTop: 8 }}>Vérifier et publier le catalogue</a></div>}
    </section>
  </section>;
}

export const pages: PluginAdminExports["pages"] = { "/contacts": ContactsPage };
