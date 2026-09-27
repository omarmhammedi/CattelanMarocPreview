/** Pure domain logic. EmDash supplies the durable CAS storage adapter at runtime. */
export const DOWNLOAD_LIFETIME_MS = 15 * 60_000;
export const LEASE_MS = 60_000;
export const CONSENT_VERSION = "catalogue-fr-v1";

export type RequestInput = {
  requestId: string;
  catalogueId: string;
  name: string;
  email: string;
  communicationsConsent: boolean;
  sourcePath: string;
};
export type Catalogue = {
  id: string;
  key: string;
  title: string;
  placeholder: boolean;
};
export type Lead = RequestInput & {
  schemaVersion: 1;
  createdAt: number;
  consentVersion: string;
  catalogue: Catalogue;
  crmStatus: "pending" | "processing" | "waiting_configuration" | "delivered";
  crmAttempts: number;
  crmNextAttemptAt: number;
  crmLeaseUntil: number;
  crmLeaseId: string | null;
  crmLastError: string | null;
  crmDeliveredAt: number | null;
};
export type Versioned<T> = { value: T; revision: string };
export interface AtomicStore<T> {
  getVersioned(id: string): Promise<Versioned<T> | null>;
  compareAndSet(id: string, revision: string | null, data: T): Promise<{ applied: boolean }>;
}
export class InputError extends Error {
  code: string;
  constructor(code: string, message: string) {
    super(message);
    this.code = code;
  }
}

/** Use the operator-configured public origin when a proxy terminates HTTPS. */
export function validateRequestOrigin(origin: string | null, requestUrl: string, siteUrl?: string,
  proxy: { development?: boolean; referer?: string | null } = {}): void {
  const request = new URL(requestUrl);
  const expected = new URL(siteUrl || requestUrl);
  if (expected.protocol !== "http:" && expected.protocol !== "https:") {
    throw new Error("The catalogue public URL must use HTTP or HTTPS.");
  }
  if (!origin || origin === expected.origin) return;
  // Codespaces rewrites Origin to HTTP localhost but preserves the browser's
  // Referer. Accept that exact dev-only translation, never a production alias.
  if (proxy.development && siteUrl && expected.protocol === "https:"
    && expected.hostname.endsWith(".app.github.dev")
    && request.hostname === "localhost" && request.port === "4321"
    && origin === "http://localhost:4321") {
    try {
      if (new URL(proxy.referer || "").origin === expected.origin) return;
    } catch { /* A missing or malformed Referer cannot establish the public origin. */ }
  }
  throw new InputError("ORIGIN_REJECTED", "Veuillez utiliser le formulaire depuis ce site.");
}

export function validateInput(value: unknown): RequestInput {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new InputError("INVALID_INPUT", "Veuillez compléter le formulaire.");
  }
  const data = value as Record<string, unknown>;
  if (data.website !== undefined && data.website !== "") {
    throw new InputError("INVALID_INPUT", "Le formulaire n’a pas pu être envoyé.");
  }
  const text = (key: string, max: number) => {
    const raw = data[key];
    if (typeof raw !== "string" || raw.length > max || /[\u0000-\u001f\u007f]/u.test(raw)) {
      throw new InputError("INVALID_INPUT", "Veuillez vérifier les informations saisies.");
    }
    return raw.trim();
  };
  const requestId = text("requestId", 36).toLowerCase();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u.test(requestId)) {
    throw new InputError("INVALID_REQUEST", "Rechargez la page avant de réessayer.");
  }
  const catalogueId = text("catalogueId", 150);
  if (!/^[a-zA-Z0-9_-]{1,150}$/u.test(catalogueId)) {
    throw new InputError("INVALID_CATALOGUE", "Le catalogue n’est pas disponible.");
  }
  const name = text("name", 120).replace(/\s+/gu, " ");
  if (name.length < 2) throw new InputError("INVALID_NAME", "Indiquez votre nom.");
  const email = text("email", 254).toLowerCase();
  if (!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/u.test(email)) {
    throw new InputError("INVALID_EMAIL", "Indiquez une adresse e-mail valide.");
  }
  if (data.communicationsConsent !== undefined && typeof data.communicationsConsent !== "boolean") {
    throw new InputError("INVALID_CONSENT", "Veuillez vérifier votre choix de communication.");
  }
  const sourcePath = data.sourcePath === undefined ? "/catalogue/" : text("sourcePath", 300);
  if (!sourcePath.startsWith("/") || sourcePath.startsWith("//") || /[?#]/u.test(sourcePath)) {
    throw new InputError("INVALID_SOURCE", "Rechargez la page avant de réessayer.");
  }
  return { requestId, catalogueId, name, email, sourcePath, communicationsConsent: data.communicationsConsent === true };
}

/** Lead and outbox state are one value: a crash cannot leave a lead without its pending event. */
export async function persistRequest(store: AtomicStore<Lead>, input: RequestInput, catalogue: Catalogue, now = Date.now()): Promise<Lead> {
  for (let attempt = 0; attempt < 4; attempt++) {
    const existing = await store.getVersioned(input.requestId);
    if (existing) {
      const lead = existing.value;
      if (lead.email !== input.email || lead.name !== input.name || lead.catalogueId !== input.catalogueId || lead.communicationsConsent !== input.communicationsConsent) {
        throw new InputError("REQUEST_CONFLICT", "Les informations ont changé. Rechargez le formulaire.");
      }
      return lead;
    }
    const lead: Lead = {
      ...input,
      schemaVersion: 1,
      createdAt: now,
      consentVersion: CONSENT_VERSION,
      catalogue,
      crmStatus: "pending",
      crmAttempts: 0,
      crmNextAttemptAt: now,
      crmLeaseUntil: 0,
      crmLeaseId: null,
      crmLastError: null,
      crmDeliveredAt: null,
    };
    if ((await store.compareAndSet(input.requestId, null, lead)).applied) return lead;
  }
  throw new Error("La demande n’a pas pu être enregistrée. Réessayez.");
}

export interface CrmAdapter {
  send(lead: Lead, idempotencyKey: string): Promise<{ mode: "mock" | "live" }>;
}

/** Intentionally no network call while the CRM has not been selected. */
export const mockCrm: CrmAdapter = {
  async send() { return { mode: "mock" }; },
};

/** At-least-once delivery: the future CRM adapter must honour the stable idempotency key. */
export async function dispatchLead(store: AtomicStore<Lead>, id: string, adapter: CrmAdapter, now = Date.now(), retryWaiting = false): Promise<"skipped" | "waiting_configuration" | "delivered" | "retry"> {
  const current = await store.getVersioned(id);
  if (!current || current.value.crmStatus === "delivered") return "skipped";
  const lead = current.value;
  if (lead.crmStatus === "waiting_configuration" && !retryWaiting) return "skipped";
  if (lead.crmNextAttemptAt > now || lead.crmLeaseUntil > now) return "skipped";
  const leaseId = crypto.randomUUID();
  const claimed: Lead = { ...lead, crmStatus: "processing", crmAttempts: lead.crmAttempts + 1, crmLeaseUntil: now + LEASE_MS, crmLeaseId: leaseId };
  if (!(await store.compareAndSet(id, current.revision, claimed)).applied) return "skipped";
  let outcome: "waiting_configuration" | "delivered" | "retry";
  try {
    const result = await adapter.send(claimed, `catalogue-request:${id}`);
    outcome = result.mode === "mock" ? "waiting_configuration" : "delivered";
  } catch {
    outcome = "retry";
  }
  // A request may have reclaimed a timed-out lease. Never overwrite its result.
  const latest = await store.getVersioned(id);
  if (!latest || latest.value.crmLeaseId !== leaseId) return "skipped";
  const retryDelay = Math.min(24 * 60 * 60_000, 60_000 * 2 ** Math.min(claimed.crmAttempts - 1, 10));
  await store.compareAndSet(id, latest.revision, {
    ...latest.value,
    crmStatus: outcome === "retry" ? "pending" : outcome,
    crmLeaseUntil: 0,
    crmLeaseId: null,
    crmNextAttemptAt: outcome === "retry" ? now + retryDelay : now,
    crmLastError: outcome === "retry" ? "CRM_UNAVAILABLE" : null,
    crmDeliveredAt: outcome === "delivered" ? now : null,
  });
  return outcome;
}

function encode(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/u, "");
}
function decode(value: string): Uint8Array<ArrayBuffer> {
  const binary = atob(value.replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(binary, (c) => c.charCodeAt(0));
}
async function signingKey(secret: string): Promise<CryptoKey> {
  if (secret.length < 32) throw new Error("Le téléchargement est temporairement indisponible.");
  return crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}
export async function signDownload(id: string, secret: string, now = Date.now()): Promise<string> {
  const payload = encode(new TextEncoder().encode(JSON.stringify({ id, expires: now + DOWNLOAD_LIFETIME_MS })));
  const signature = await crypto.subtle.sign("HMAC", await signingKey(secret), new TextEncoder().encode(payload));
  return `${payload}.${encode(new Uint8Array(signature))}`;
}
export async function verifyDownload(token: unknown, secret: string, now = Date.now()): Promise<string | null> {
  if (typeof token !== "string" || token.length > 400) return null;
  try {
    const [payload, signature, extra] = token.split(".");
    if (!payload || !signature || extra || !/^[a-zA-Z0-9_-]+$/u.test(payload + signature)) return null;
    if (!await crypto.subtle.verify("HMAC", await signingKey(secret), decode(signature), new TextEncoder().encode(payload))) return null;
    const data = JSON.parse(new TextDecoder().decode(decode(payload)));
    if (typeof data.id !== "string" || !Number.isFinite(data.expires) || data.expires <= now || data.expires > now + DOWNLOAD_LIFETIME_MS) return null;
    return data.id;
  } catch { return null; }
}

export function csvCell(value: unknown): string {
  let text = String(value ?? "");
  // CSV opened in spreadsheets must not evaluate a contact's input as a formula.
  if (/^[=+@\-\t\r\n]/u.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

export function leadsToCsv(leads: Lead[]): string {
  return "\uFEFF" + [
    ["Demande", "Date UTC", "Nom", "E-mail", "Communications facultatives", "Version du consentement", "Catalogue", "Source", "État CRM"],
    ...leads.map((lead) => [lead.requestId, new Date(lead.createdAt).toISOString(), lead.name, lead.email, lead.communicationsConsent ? "oui" : "non", lead.consentVersion, lead.catalogue.title, lead.sourcePath, lead.crmStatus]),
  ].map((row) => row.map(csvCell).join(";")).join("\r\n");
}
