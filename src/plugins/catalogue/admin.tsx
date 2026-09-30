import * as React from "react";
import type { PluginAdminExports } from "emdash";
import { apiFetch, parseApiResponse } from "emdash/plugin-utils";

const BASE = "/_emdash/api/plugins/catalogue-leads";
type Contact = {
  requestId: string; name: string; email: string; createdAt: number;
  communicationsConsent: boolean; catalogueTitle: string; placeholder: boolean;
  crmStatus: string; crmAttempts: number;
};
type ContactPage = { items: Contact[]; cursor?: string; hasMore: boolean };
type CatalogueItem = { id: string; status: string; data: Record<string, unknown> };
type CatalogueRevision = { item: CatalogueItem; _rev: string };
type CataloguePage = { items: CatalogueItem[]; cursor?: string; hasMore?: boolean };
const stateLabel: Record<string, string> = {
  pending: "En attente", processing: "Traitement en cours",
  waiting_configuration: "CRM à connecter", delivered: "Transmis au CRM",
};
const buttonStyle: React.CSSProperties = { padding: "8px 14px", border: "1px solid currentColor", borderRadius: 6, cursor: "pointer", fontSize: 14 };

function ContactsPage() {
  const [contacts, setContacts] = React.useState<Contact[]>([]);
  const [cursor, setCursor] = React.useState<string>();
  const [hasMore, setHasMore] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");
  const [message, setMessage] = React.useState("");
  const [catalogues, setCatalogues] = React.useState<CatalogueItem[]>([]);
  const [catalogueId, setCatalogueId] = React.useState("");
  const [catalogueLoading, setCatalogueLoading] = React.useState(true);
  const [catalogueReady, setCatalogueReady] = React.useState(false);
  const [pdfFile, setPdfFile] = React.useState<File | null>(null);
  const [pdfBusy, setPdfBusy] = React.useState(false);
  const [pdfError, setPdfError] = React.useState("");
  const [placeholder, setPlaceholder] = React.useState(false);
  const [pdfSaved, setPdfSaved] = React.useState<{ id: string; title: string } | null>(null);
  const pdfInput = React.useRef<HTMLInputElement>(null);

  const load = React.useCallback(async (next?: string) => {
    setBusy(true); setError("");
    try {
      const result = await parseApiResponse<ContactPage>(await apiFetch(`${BASE}/contacts${next ? `?cursor=${encodeURIComponent(next)}` : ""}`), "Impossible de charger les demandes");
      setContacts((previous) => next ? [...previous, ...result.items] : result.items);
      setCursor(result.cursor); setHasMore(result.hasMore);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Une erreur est survenue."); }
    finally { setBusy(false); }
  }, []);
  React.useEffect(() => { void load(); }, [load]);

  React.useEffect(() => {
    let active = true;
    async function loadCatalogues() {
      try {
        const result = await parseApiResponse<CataloguePage>(await apiFetch("/_emdash/api/content/catalogues?limit=100"), "Impossible de charger les catalogues.");
        if (!active) return;
        setCatalogues(result.items);
        setCatalogueId(result.items.find((item) => item.status === "published")?.id ?? result.items[0]?.id ?? "");
        if (!result.items.length) setCatalogueLoading(false);
      } catch {
        if (active) { setPdfError("Les catalogues n’ont pas pu être chargés. Actualisez la page pour réessayer."); setCatalogueLoading(false); }
      }
    }
    void loadCatalogues();
    return () => { active = false; };
  }, []);

  React.useEffect(() => {
    if (!catalogueId) return;
    let active = true;
    setCatalogueLoading(true); setCatalogueReady(false); setPdfError(""); setPdfSaved(null); setPdfFile(null);
    if (pdfInput.current) pdfInput.current.value = "";
    async function loadEdition() {
      try {
        const current = await parseApiResponse<CatalogueRevision>(await apiFetch(`/_emdash/api/content/catalogues/${encodeURIComponent(catalogueId)}`), "Impossible de charger cette édition.");
        if (active) { setPlaceholder(current.item.data.is_placeholder === true || current.item.data.is_placeholder === 1); setCatalogueReady(true); }
      } catch {
        if (active) setPdfError("Cette édition n’a pas pu être chargée. Sélectionnez à nouveau le catalogue pour réessayer.");
      } finally { if (active) setCatalogueLoading(false); }
    }
    void loadEdition();
    return () => { active = false; };
  }, [catalogueId]);

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
      await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Une erreur est survenue."); }
    finally { setBusy(false); }
  }
  async function associatePdf(event: React.SubmitEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!pdfFile || !catalogueId || !catalogueReady || pdfBusy) return;
    if (pdfFile.size > 8 * 1024 * 1024) { setPdfError("Le PDF doit peser au maximum 8 Mio."); return; }
    setPdfBusy(true); setPdfError(""); setPdfSaved(null);
    let uploaded = false;
    try {
      const result = await parseApiResponse<{ ok: boolean; private_file_key?: string }>(await apiFetch(`${BASE}/pdf/upload`, { method: "POST", headers: { "content-type": "application/pdf" }, body: pdfFile }), "Impossible de charger le PDF.");
      if (!result.ok || !result.private_file_key) { setPdfError("Le fichier n’a pas été accepté. Choisissez un PDF valide de 8 Mio maximum."); return; }
      uploaded = true;
      // Read immediately before saving: preserve all editorial fields and reject conflicting writes.
      const path = `/_emdash/api/content/catalogues/${encodeURIComponent(catalogueId)}`;
      const current = await parseApiResponse<CatalogueRevision>(await apiFetch(path), "Impossible de charger le catalogue.");
      await parseApiResponse(await apiFetch(path, {
        method: "PUT", headers: { "content-type": "application/json" },
        body: JSON.stringify({ _rev: current._rev, data: { ...current.item.data, private_file_key: result.private_file_key, is_placeholder: placeholder } }),
      }), "Impossible d’enregistrer le brouillon.");
      setPdfSaved({ id: catalogueId, title: typeof current.item.data.title === "string" ? current.item.data.title : "ce catalogue" });
      setPdfFile(null);
      if (pdfInput.current) pdfInput.current.value = "";
    } catch {
      setPdfError(uploaded ? "Le PDF a été chargé, mais le brouillon n’a pas pu être mis à jour. Actualisez le catalogue puis réessayez." : "Le PDF n’a pas pu être chargé. Veuillez réessayer.");
    } finally { setPdfBusy(false); }
  }

  async function deleteContact(contact: Contact) {
    if (!window.confirm(`Supprimer la demande de ${contact.name} de ce site ? Son lien de téléchargement sera également désactivé.`)) return;
    setBusy(true); setError(""); setMessage("");
    try {
      const result = await parseApiResponse<{ ok: boolean; message?: string }>(await apiFetch(`${BASE}/contacts/delete`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ requestId: contact.requestId }) }), "Impossible de supprimer la demande");
      if (!result.ok) throw new Error(result.message);
      setContacts((previous) => previous.filter((item) => item.requestId !== contact.requestId));
      setMessage("La demande et son événement CRM ont été supprimés de ce site.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Une erreur est survenue."); }
    finally { setBusy(false); }
  }

  return <section style={{ maxWidth: 1280, padding: 24 }}>
    <h1 style={{ fontSize: 28, fontWeight: 600, marginBottom: 10 }}>Contacts catalogue</h1>
    <p style={{ marginBottom: 20 }}>Les demandes sont conservées dans EmDash. Le connecteur CRM est en mode test : aucune donnée n’est envoyée à un service externe.</p>
    <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
      <button style={buttonStyle} type="button" disabled={busy} onClick={() => void load()}>Actualiser</button>
      <button style={buttonStyle} type="button" disabled={busy} onClick={() => void exportCsv()}>Exporter le CSV</button>
      <button style={buttonStyle} type="button" disabled={busy} onClick={() => void process()}>Tester la file CRM</button>
    </div>
    {error && <p role="alert" style={{ color: "#dc2626", marginBottom: 12 }}>{error}</p>}
    {message && <p role="status" style={{ marginBottom: 12 }}>{message}</p>}
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: 14 }}>
        <thead><tr>{["Date", "Nom", "E-mail", "Catalogue", "Communications", "CRM", "Action"].map((heading) => <th key={heading} style={{ padding: 12, borderBottom: "1px solid #777" }}>{heading}</th>)}</tr></thead>
        <tbody>{contacts.map((contact) => <tr key={contact.requestId}>
          <td style={{ padding: 12 }}>{new Date(contact.createdAt).toLocaleString("fr-FR", { timeZone: "Africa/Casablanca" })}</td>
          <td style={{ padding: 12 }}>{contact.name}</td><td style={{ padding: 12 }}>{contact.email}</td>
          <td style={{ padding: 12 }}>{contact.catalogueTitle}{contact.placeholder ? " (démonstration)" : ""}</td>
          <td style={{ padding: 12 }}>{contact.communicationsConsent ? "Acceptées" : "Non demandées"}</td>
          <td style={{ padding: 12 }}>{stateLabel[contact.crmStatus] ?? contact.crmStatus}</td>
          <td style={{ padding: 12 }}><button type="button" style={buttonStyle} disabled={busy} onClick={() => void deleteContact(contact)}>Supprimer</button></td>
        </tr>)}</tbody>
      </table>
    </div>
    {!contacts.length && !busy && <p style={{ padding: 16 }}>Aucune demande enregistrée pour le moment.</p>}
    {hasMore && <button style={{ ...buttonStyle, marginTop: 16 }} type="button" disabled={busy} onClick={() => void load(cursor)}>Afficher la suite</button>}
    <section style={{ marginTop: 40, borderTop: "1px solid #777", paddingTop: 24 }}>
      <h2 style={{ fontSize: 21, fontWeight: 600, marginBottom: 10 }}>Mettre à jour un catalogue PDF</h2>
      <p style={{ marginBottom: 14 }}>Choisissez le catalogue et son nouveau document. Le PDF sera associé au brouillon ; vous pourrez vérifier cette édition avant de la publier.</p>
      <form onSubmit={(event) => void associatePdf(event)} aria-busy={pdfBusy} style={{ display: "grid", gap: 16, maxWidth: 600 }}>
        <label style={{ display: "grid", gap: 8 }}>Catalogue
          <select name="catalogue" value={catalogueId} disabled={pdfBusy || !catalogues.length} onChange={(event) => setCatalogueId(event.target.value)} style={{ padding: 10, border: "1px solid currentColor", borderRadius: 6 }}>
            {!catalogues.length && <option value="">{catalogueLoading ? "Chargement…" : "Aucun catalogue disponible"}</option>}
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
      {pdfSaved && <div role="status" style={{ marginTop: 14 }}><p>PDF associé au brouillon « {pdfSaved.title} ». Publiez le catalogue pour le mettre en ligne.</p><a href={`/_emdash/admin/content/catalogues/${encodeURIComponent(pdfSaved.id)}`} style={{ textDecoration: "underline", display: "inline-block", marginTop: 8 }}>Vérifier et publier le catalogue</a></div>}
    </section>
  </section>;
}

export const pages: PluginAdminExports["pages"] = { "/contacts": ContactsPage };
