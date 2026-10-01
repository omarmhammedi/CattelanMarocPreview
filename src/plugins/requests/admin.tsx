import * as React from "react";
import type { PluginAdminExports } from "emdash";
import { apiFetch, parseApiResponse } from "emdash/plugin-utils";

const BASE = "/_emdash/api/plugins/contact-requests";
type Request = {
  requestId: string; kind: "rendez-vous" | "pro"; createdAt: number; name: string; whatsapp: string;
  email?: string; company?: string; projectType?: string; city?: string; day?: string; period?: string;
  model: string | null; sourcePath: string; message: string; notifyStatus: string; crmStatus: string;
};
type RequestPage = { items: Request[]; cursor?: string; hasMore: boolean };
const periods: Record<string, string> = { matin: "Matin", "apres-midi": "Après-midi" };
const crmLabel: Record<string, string> = { waiting_configuration: "CRM à connecter", delivered: "Transmis au CRM" };
const notifyLabel: Record<string, string> = { sent: "Envoyée", failed: "Échec", skipped: "Non configurée" };
const buttonStyle: React.CSSProperties = { padding: "8px 14px", border: "1px solid currentColor", borderRadius: 6, cursor: "pointer", fontSize: 14 };
const cell: React.CSSProperties = { padding: 12, verticalAlign: "top" };

function RequestsPage() {
  const [items, setItems] = React.useState<Request[]>([]);
  const [cursor, setCursor] = React.useState<string>();
  const [hasMore, setHasMore] = React.useState(false);
  const [busy, setBusy] = React.useState(false);
  const [error, setError] = React.useState("");

  const load = React.useCallback(async (next?: string) => {
    setBusy(true); setError("");
    try {
      const result = await parseApiResponse<RequestPage>(await apiFetch(`${BASE}/list${next ? `?cursor=${encodeURIComponent(next)}` : ""}`), "Impossible de charger les demandes");
      setItems((previous) => next ? [...previous, ...result.items] : result.items);
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
      anchor.href = url; anchor.download = "demandes-rendez-vous-projets.csv"; anchor.click();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Une erreur est survenue."); }
    finally { setBusy(false); }
  }

  async function remove(request: Request) {
    if (!window.confirm(`Supprimer la demande de ${request.name} ?`)) return;
    setBusy(true); setError("");
    try {
      const result = await parseApiResponse<{ ok: boolean; message?: string }>(await apiFetch(`${BASE}/delete`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ requestId: request.requestId }) }), "Impossible de supprimer la demande");
      if (!result.ok) throw new Error(result.message);
      setItems((previous) => previous.filter((item) => item.requestId !== request.requestId));
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Une erreur est survenue."); }
    finally { setBusy(false); }
  }

  return <section style={{ maxWidth: 1200 }}>
    <h1 style={{ fontSize: 28, fontWeight: 600, marginBottom: 8 }}>Rendez-vous et projets</h1>
    <p style={{ marginBottom: 16 }}>Demandes de rendez-vous du showroom et demandes professionnelles. Elles restent sur ce site jusqu’au raccordement du CRM.</p>
    <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
      <button style={buttonStyle} type="button" disabled={busy} onClick={() => void load()}>Actualiser</button>
      <button style={buttonStyle} type="button" disabled={busy} onClick={() => void exportCsv()}>Exporter le CSV</button>
    </div>
    {error && <p role="alert" style={{ color: "#dc2626", marginBottom: 12 }}>{error}</p>}
    <div style={{ overflowX: "auto" }}>
      <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: 14 }}>
        <thead><tr>{["Date", "Type", "Contact", "Détails", "Message", "Alerte e-mail", "CRM", "Action"].map((heading) => <th key={heading} style={{ padding: 12, borderBottom: "1px solid #777" }}>{heading}</th>)}</tr></thead>
        <tbody>{items.map((item) => <tr key={item.requestId}>
          <td style={cell}>{new Date(item.createdAt).toLocaleString("fr-FR", { timeZone: "Africa/Casablanca" })}</td>
          <td style={cell}>{item.kind === "rendez-vous" ? "Rendez-vous" : "Professionnel"}</td>
          <td style={cell}>{item.name}<br />{item.whatsapp}{item.email && <><br />{item.email}</>}</td>
          <td style={cell}>{item.kind === "rendez-vous"
            ? `${item.day} · ${periods[item.period || ""] ?? item.period}`
            : `${item.company} · ${item.projectType} · ${item.city}`}
            {item.model && <><br />Modèle : {item.model}</>}<br /><span style={{ opacity: .7 }}>{item.sourcePath}</span></td>
          <td style={{ ...cell, whiteSpace: "pre-line", maxWidth: 320 }}>{item.message}</td>
          <td style={cell}>{notifyLabel[item.notifyStatus] ?? item.notifyStatus}</td>
          <td style={cell}>{crmLabel[item.crmStatus] ?? item.crmStatus}</td>
          <td style={cell}><button type="button" style={buttonStyle} disabled={busy} onClick={() => void remove(item)}>Supprimer</button></td>
        </tr>)}</tbody>
      </table>
    </div>
    {!items.length && !busy && <p style={{ padding: 16 }}>Aucune demande pour le moment.</p>}
    {hasMore && <button style={{ ...buttonStyle, marginTop: 16 }} type="button" disabled={busy} onClick={() => void load(cursor)}>Afficher la suite</button>}
  </section>;
}

export const pages: PluginAdminExports["pages"] = { "/requests": RequestsPage };
