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
  const [pdfKey, setPdfKey] = React.useState("");

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
  async function uploadPdf(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) { setError("Le PDF doit peser au maximum 8 Mio."); return; }
    setBusy(true); setError(""); setPdfKey("");
    try {
      const result = await parseApiResponse<{ ok: boolean; private_file_key?: string; message: string }>(await apiFetch(`${BASE}/pdf/upload`, { method: "POST", headers: { "content-type": "application/pdf" }, body: file }), "Impossible de stocker le PDF");
      if (!result.ok) throw new Error(result.message);
      setPdfKey(result.private_file_key ?? ""); setMessage(result.message);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Une erreur est survenue."); }
    finally { setBusy(false); event.target.value = ""; }
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
      <h2 style={{ fontSize: 21, fontWeight: 600, marginBottom: 10 }}>Ajouter un PDF privé</h2>
      <p style={{ marginBottom: 14 }}>Chargez le document, puis copiez sa clé dans le champ « Clé du PDF privé » de la fiche Catalogue. La nouvelle édition sera utilisée après publication de cette fiche. La couverture se gère dans la médiathèque habituelle.</p>
      <input aria-label="Ajouter le catalogue PDF privé, 8 Mio maximum" type="file" accept="application/pdf,.pdf" disabled={busy} onChange={(event) => void uploadPdf(event)} />
      {pdfKey && <p style={{ marginTop: 14 }}>Clé à copier : <code style={{ userSelect: "all" }}>{pdfKey}</code></p>}
    </section>
  </section>;
}

export const pages: PluginAdminExports["pages"] = { "/contacts": ContactsPage };
