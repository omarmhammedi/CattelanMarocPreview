import * as React from "react";
import type { PluginAdminExports } from "emdash";
import { apiFetch, parseApiResponse } from "emdash/plugin-utils";
import { describe, KIND_LABELS, type StoredRequest } from "./core.ts";
import { matchesRecordSearch } from "../admin-records.ts";
import { useAdminRecords } from "../admin-use-records.tsx";

const BASE = "/_emdash/api/plugins/contact-requests";
const crmLabel: Record<string, string> = { waiting_configuration: "CRM à connecter", delivered: "Transmis au CRM" };
const notifyLabel: Record<string, string> = { sent: "Envoyée", failed: "Échec", skipped: "Non configurée" };
const buttonStyle: React.CSSProperties = { padding: "8px 14px", border: "1px solid currentColor", borderRadius: 6, fontSize: 14 };
const fieldStyle: React.CSSProperties = { padding: 10, border: "1px solid currentColor", borderRadius: 6, width: "100%" };
const cell: React.CSSProperties = { padding: 12, verticalAlign: "top", borderBottom: "1px solid #8884" };

function RequestsPage() {
  const records = useAdminRecords<StoredRequest>(`${BASE}/list`);
  const [actionBusy, setActionBusy] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [kind, setKind] = React.useState("");
  const [notification, setNotification] = React.useState("");
  const [message, setMessage] = React.useState("");
  const busy = records.loading || actionBusy;
  const visible = records.items.filter(item => (!kind || item.kind === kind)
    && (!notification || item.notifyStatus === notification)
    && matchesRecordSearch(query, [item.requestId, KIND_LABELS[item.kind], ...describe(item).map(([, value]) => value)]));

  async function exportCsv() {
    setActionBusy(true); records.setError("");
    try {
      const response = await apiFetch(`${BASE}/export`);
      if (!response.ok) throw new Error("Impossible de préparer l’export CSV.");
      const url = URL.createObjectURL(await response.blob());
      const anchor = document.createElement("a");
      anchor.href = url; anchor.download = "demandes-rendez-vous-projets.csv"; anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (cause) { records.setError(cause instanceof Error ? cause.message : "Une erreur est survenue."); }
    finally { setActionBusy(false); }
  }

  async function remove(request: StoredRequest) {
    if (!window.confirm(`Supprimer définitivement la demande de ${request.name} de ce site ?`)) return;
    setActionBusy(true); records.setError(""); setMessage("");
    try {
      const result = await parseApiResponse<{ ok: boolean; message?: string }>(await apiFetch(`${BASE}/delete`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ requestId: request.requestId }) }), "Impossible de supprimer la demande");
      if (!result.ok) throw new Error(result.message || "Impossible de supprimer la demande.");
      records.removeLocal(request.requestId);
      await records.refresh();
      setMessage("La demande a été supprimée de ce site.");
    } catch (cause) { records.setError(cause instanceof Error ? cause.message : "Une erreur est survenue."); }
    finally { setActionBusy(false); }
  }

  return <section data-cattelan-ops style={{ maxWidth: 1200 }}>
    <style>{'[data-cattelan-ops] button { cursor: pointer; } [data-cattelan-ops] button:disabled { opacity: .45; cursor: not-allowed; }'}</style>
    <h1 style={{ fontSize: 28, fontWeight: 600, marginBottom: 8 }}>Rendez-vous et projets</h1>
    <p style={{ marginBottom: 16 }}>Rendez-vous au showroom, demandes d’architectes et projets de particuliers. Chaque demande est conservée sur ce site ; les états indiquent l’alerte e-mail et la transmission au CRM.</p>
    <div style={{ display: "flex", flexWrap: "wrap", gap: 12, marginBottom: 16 }}>
      <button style={buttonStyle} type="button" disabled={busy} onClick={() => void records.refresh()}>Actualiser</button>
      <button style={buttonStyle} type="button" disabled={busy} onClick={() => void exportCsv()}>Exporter toutes les demandes (CSV)</button>
    </div>
    <div role="search" aria-label="Filtrer les demandes chargées" style={{ display: "flex", flexWrap: "wrap", gap: 16, marginBottom: 12 }}>
      <label style={{ flex: "2 1 260px", display: "grid", gap: 6 }}>Rechercher
        <input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Nom, ville, téléphone, modèle…" style={fieldStyle} />
      </label>
      <label style={{ flex: "1 1 180px", display: "grid", gap: 6 }}>Type de demande
        <select value={kind} onChange={event => setKind(event.target.value)} style={fieldStyle}><option value="">Tous les types</option>{Object.entries(KIND_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
      </label>
      <label style={{ flex: "1 1 180px", display: "grid", gap: 6 }}>Alerte e-mail
        <select value={notification} onChange={event => setNotification(event.target.value)} style={fieldStyle}><option value="">Tous les états</option>{Object.entries(notifyLabel).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select>
      </label>
    </div>
    <p id="requests-filter-scope" role="status" style={{ marginBottom: 12 }}>
      {visible.length} sur {records.items.length} demandes chargées. Les filtres portent sur les demandes chargées ; l’export CSV contient toutes les demandes.
      {records.hasMore && " Chargez les suivantes pour étendre la recherche."}
    </p>
    {(query || kind || notification) && <button type="button" style={{ ...buttonStyle, marginBottom: 12 }} onClick={() => { setQuery(""); setKind(""); setNotification(""); }}>Effacer les filtres</button>}
    {records.error && <p role="alert" style={{ color: "#dc2626", marginBottom: 12 }}>{records.error}</p>}
    {message && <p role="status" style={{ marginBottom: 12 }}>{message}</p>}
    <div style={{ overflowX: "auto" }} aria-busy={busy} aria-describedby="requests-filter-scope">
      <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: 14 }}>
        <caption style={{ textAlign: "left", paddingBottom: 8, opacity: .7 }}>Dates et heures du showroom · Casablanca</caption>
        <thead><tr>{["Date", "Contact", "Demande", "Alerte e-mail", "CRM", "Détails"].map(heading => <th key={heading} scope="col" style={{ padding: 12, borderBottom: "1px solid #777" }}>{heading}</th>)}</tr></thead>
        <tbody>{visible.map(item => <tr key={item.requestId}>
          <td style={cell}>{new Date(item.createdAt).toLocaleString("fr-FR", { timeZone: "Africa/Casablanca" })}</td>
          <td style={cell}><strong>{item.name}</strong><br />{item.whatsapp}{item.kind === "pro" && <><br />{item.email}</>}{item.city && <><br />{item.city}</>}</td>
          <td style={cell}>{KIND_LABELS[item.kind]}<br />{describe(item).filter(([label]) => ["Jour souhaité", "Moment", "Type de projet", "Cabinet"].includes(label)).map(([label, value]) => <div key={label}>{value}</div>)}{item.model && <div>Modèle : {item.model}</div>}</td>
          <td style={cell}>{notifyLabel[item.notifyStatus] ?? item.notifyStatus}</td>
          <td style={cell}>{crmLabel[item.crmStatus] ?? item.crmStatus}</td>
          <td style={{ ...cell, minWidth: 190 }}><details>
            <summary style={{ cursor: "pointer", textDecoration: "underline" }} aria-label={`Consulter la demande de ${item.name}`}>Consulter</summary>
            <dl style={{ marginTop: 12, minWidth: 250, maxWidth: 400, overflowWrap: "anywhere" }}>
              {describe(item).map(([label, value]) => <React.Fragment key={label}><dt style={{ fontWeight: 600, marginTop: 10 }}>{label}</dt><dd style={{ whiteSpace: "pre-line", margin: 0 }}>{value}</dd></React.Fragment>)}
              <dt style={{ fontWeight: 600, marginTop: 10 }}>Identifiant</dt><dd style={{ margin: 0 }}>{item.requestId}</dd>
            </dl>
            <button type="button" style={{ ...buttonStyle, marginTop: 16 }} disabled={busy} onClick={() => void remove(item)}>Supprimer cette demande</button>
          </details></td>
        </tr>)}</tbody>
      </table>
    </div>
    {!visible.length && !busy && <p style={{ padding: 16 }}>{records.items.length ? "Aucune demande chargée ne correspond aux filtres." : "Aucune demande pour le moment."}</p>}
    {records.loading && <p role="status" style={{ padding: 16 }}>Chargement des demandes…</p>}
    {records.hasMore && <button style={{ ...buttonStyle, marginTop: 16 }} type="button" disabled={busy} onClick={() => void records.loadMore()}>Charger les demandes suivantes</button>}
  </section>;
}

export const pages: PluginAdminExports["pages"] = { "/requests": RequestsPage };
