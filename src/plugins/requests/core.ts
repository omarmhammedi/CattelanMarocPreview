/** Appointment, architect and private-project requests: pure validation, storage and export logic. */
import { CITIES, InputError, csvCell, isWhatsappNumber, type AtomicStore } from "../catalogue/core.ts";

export { CITIES, InputError };
export const PROJECT_TYPES = ["Appartement", "Villa", "Bureaux", "Hôtel", "Restaurant", "Boutique", "Autre"] as const;
export const PERIODS = { matin: "Matin", "apres-midi": "Après-midi" } as const;
export const STAGES = ["Esquisse", "Avant-projet", "Choix du mobilier", "Chantier en cours"] as const;
export const DEADLINES = ["Moins de 3 mois", "3 à 6 mois", "6 à 12 mois", "Plus de 12 mois"] as const;
/** The three routes of the Votre projet page. */
export const ROUTES = { piece: "Une pièce", ensemble: "Une pièce entière ou toute la maison", architecte: "Avec un architecte" } as const;
/** Every request is tagged for the CRM: architects use the professional form, everyone else is a private client. */
export const audience = (request: { kind: string }) => request.kind === "pro" ? "architecte" : "particulier";
const MAX_DAYS_AHEAD = 180;
/** Used until an address is saved in EmDash (Plugins › Rendez-vous et projets › Paramètres). */
export const DEFAULT_NOTIFY_TO = "omar@kreedns.com";
const EMAIL = /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/u;

/** The EmDash setting wins, then the REQUESTS_NOTIFY_TO secret, then the default; invalid values are skipped. */
export function notifyAddress(setting: unknown, secret: string | undefined): string {
  for (const value of [setting, secret]) {
    const address = typeof value === "string" ? value.trim() : "";
    if (address && EMAIL.test(address)) return address;
  }
  return DEFAULT_NOTIFY_TO;
}

type Common = { requestId: string; name: string; whatsapp: string; message: string; sourcePath: string; model: string | null };
type City = typeof CITIES[number];
export type AppointmentInput = Common & { kind: "rendez-vous"; day: string; period: keyof typeof PERIODS; city?: City | null };
export type ProInput = Common & {
  kind: "pro"; company: string; email: string; projectType: typeof PROJECT_TYPES[number]; city: City;
  // Requests saved before the Architectes & projets form have no stage, deadline or models.
  stage?: typeof STAGES[number]; deadline?: typeof DEADLINES[number]; models?: string;
};
export type ProjectInput = Common & { kind: "projet"; city: City; route: keyof typeof ROUTES };
export type RequestInput = AppointmentInput | ProInput | ProjectInput;
export type StoredRequest = RequestInput & {
  schemaVersion: 1;
  createdAt: number;
  notifyStatus: "sent" | "failed" | "skipped";
  // No CRM yet: the future SendPulse adapter picks up every waiting request.
  crmStatus: "waiting_configuration" | "delivered";
};

/** `today` is the showroom's calendar date (YYYY-MM-DD), supplied by the caller. */
export function validateRequest(value: unknown, today: string): RequestInput {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new InputError("INVALID_INPUT", "Veuillez compléter le formulaire.");
  const data = value as Record<string, unknown>;
  if (data.website !== undefined && data.website !== "") throw new InputError("INVALID_INPUT", "Le formulaire n’a pas pu être envoyé.");
  const text = (key: string, max: number, code: string, message: string, multiline = false) => {
    const raw = data[key] ?? "";
    const forbidden = multiline ? /[\u0000-\u0009\u000b\u000c\u000e-\u001f\u007f]/u : /[\u0000-\u001f\u007f]/u;
    if (typeof raw !== "string" || raw.length > max || forbidden.test(raw)) throw new InputError(code, message);
    return multiline ? raw.trim() : raw.trim().replace(/\s+/gu, " ");
  };
  const requestId = text("requestId", 36, "INVALID_REQUEST", "Rechargez la page avant de réessayer.").toLowerCase();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/u.test(requestId)) throw new InputError("INVALID_REQUEST", "Rechargez la page avant de réessayer.");
  const name = text("name", 120, "INVALID_NAME", "Indiquez votre nom.");
  if (name.length < 2) throw new InputError("INVALID_NAME", "Indiquez votre nom.");
  const whatsapp = text("whatsapp", 30, "INVALID_WHATSAPP", "Indiquez un numéro WhatsApp valide.");
  if (!isWhatsappNumber(whatsapp)) throw new InputError("INVALID_WHATSAPP", "Indiquez un numéro WhatsApp valide.");
  const message = text("message", 1000, "INVALID_MESSAGE", "Votre message est trop long (1 000 caractères au maximum).", true);
  const sourcePath = text("sourcePath", 300, "INVALID_SOURCE", "Rechargez la page avant de réessayer.") || "/";
  if (!sourcePath.startsWith("/") || sourcePath.startsWith("//") || /[?#]/u.test(sourcePath)) throw new InputError("INVALID_SOURCE", "Rechargez la page avant de réessayer.");
  const modelValue = text("model", 80, "INVALID_SOURCE", "Rechargez la page avant de réessayer.");
  const model = /^[a-z0-9-]{1,80}$/u.test(modelValue) ? modelValue : null;
  const common = { requestId, name, whatsapp, message, sourcePath, model };
  const choice = <T extends string>(key: string, options: readonly T[], code: string, message: string, optional = false): T | null => {
    const value = text(key, 60, code, message);
    if (optional && !value) return null;
    if (!(options as readonly string[]).includes(value)) throw new InputError(code, message);
    return value as T;
  };
  const city = (optional = false) => choice<City>("city", CITIES, "INVALID_CITY", "Choisissez une ville.", optional);

  if (data.kind === "rendez-vous") {
    const day = text("day", 10, "INVALID_DAY", "Choisissez un jour.");
    const date = new Date(`${day}T00:00:00Z`);
    const limit = new Date(`${today}T00:00:00Z`);
    limit.setUTCDate(limit.getUTCDate() + MAX_DAYS_AHEAD);
    if (!/^\d{4}-\d{2}-\d{2}$/u.test(day) || Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== day || day < today || date > limit) {
      throw new InputError("INVALID_DAY", "Choisissez un jour à partir d’aujourd’hui.");
    }
    const period = text("period", 20, "INVALID_PERIOD", "Choisissez un moment de la journée.");
    if (!(period in PERIODS)) throw new InputError("INVALID_PERIOD", "Choisissez un moment de la journée.");
    return { ...common, kind: "rendez-vous", day, period: period as keyof typeof PERIODS, city: city(true) };
  }
  if (data.kind === "pro") {
    const company = text("company", 120, "INVALID_COMPANY", "Indiquez votre société.");
    if (company.length < 2) throw new InputError("INVALID_COMPANY", "Indiquez votre société.");
    const email = text("email", 254, "INVALID_EMAIL", "Indiquez une adresse e-mail valide.").toLowerCase();
    if (!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/u.test(email)) throw new InputError("INVALID_EMAIL", "Indiquez une adresse e-mail valide.");
    const projectType = choice("projectType", PROJECT_TYPES, "INVALID_PROJECT", "Choisissez un type de projet.")!;
    const where = city()!;
    const stage = choice("stage", STAGES, "INVALID_STAGE", "Choisissez l’étape du projet.")!;
    const deadline = choice("deadline", DEADLINES, "INVALID_DEADLINE", "Choisissez une échéance.")!;
    const models = text("models", 300, "INVALID_MODELS", "La liste des modèles est trop longue (300 caractères au maximum).");
    return { ...common, kind: "pro", company, email, projectType, city: where, stage, deadline, models };
  }
  if (data.kind === "projet") {
    const route = choice("route", Object.keys(ROUTES) as (keyof typeof ROUTES)[], "INVALID_ROUTE", "Choisissez votre parcours.")!;
    return { ...common, kind: "projet", city: city()!, route };
  }
  throw new InputError("INVALID_INPUT", "Veuillez compléter le formulaire.");
}

/** A retried submission returns the saved request; changed details need a new form. */
export async function persistRequest(store: AtomicStore<StoredRequest>, input: RequestInput, now = Date.now()): Promise<{ request: StoredRequest; created: boolean }> {
  for (let attempt = 0; attempt < 4; attempt++) {
    const existing = await store.getVersioned(input.requestId);
    if (existing) {
      const { schemaVersion: _version, createdAt: _created, notifyStatus: _notify, crmStatus: _crm, ...saved } = existing.value;
      if (JSON.stringify(saved) !== JSON.stringify(input)) throw new InputError("REQUEST_CONFLICT", "Les informations ont changé. Rechargez le formulaire.");
      return { request: existing.value, created: false };
    }
    const request: StoredRequest = { ...input, schemaVersion: 1, createdAt: now, notifyStatus: "skipped", crmStatus: "waiting_configuration" };
    if ((await store.compareAndSet(input.requestId, null, request)).applied) return { request, created: true };
  }
  throw new Error("La demande n’a pas pu être enregistrée. Réessayez.");
}

export function describe(request: RequestInput): [string, string][] {
  const rows: [string, string][] = [["Public", audience(request)], ["Nom", request.name], ["WhatsApp", request.whatsapp]];
  if (request.kind === "rendez-vous") {
    rows.push(["Jour souhaité", request.day], ["Moment", PERIODS[request.period]]);
    if (request.city) rows.push(["Ville", request.city]);
  } else if (request.kind === "projet") rows.push(["Parcours", ROUTES[request.route]], ["Ville", request.city]);
  else {
    rows.push(["Cabinet", request.company], ["E-mail", request.email], ["Type de projet", request.projectType], ["Ville", request.city]);
    if (request.stage) rows.push(["Étape", request.stage]);
    if (request.deadline) rows.push(["Échéance", request.deadline]);
    if (request.models) rows.push(["Modèles", request.models]);
  }
  if (request.model) rows.push(["Modèle", request.model]);
  rows.push(["Page", request.sourcePath]);
  if (request.message) rows.push(["Message", request.message]);
  return rows;
}

export function notificationEmail(request: StoredRequest, to: string) {
  const subject = request.kind === "rendez-vous" ? `Demande de rendez-vous — ${request.name}`
    : request.kind === "projet" ? `Projet particulier (${request.city}) — ${request.name}`
    : `Architecte (${request.city}) — ${request.company}`;
  const escape = (value: string) => value.replace(/[&<>"']/gu, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
  const rows = describe(request);
  return {
    to, subject,
    text: `${subject}\n\n${rows.map(([label, value]) => `${label} : ${value}`).join("\n")}\n\nDemande ${request.requestId}`,
    html: `<div lang="fr" style="font:15px Arial,sans-serif;line-height:1.6;color:#292722"><h1 style="font-size:20px">${escape(subject)}</h1><table>${rows.map(([label, value]) => `<tr><th align="left" style="padding:4px 16px 4px 0;vertical-align:top">${escape(label)}</th><td style="white-space:pre-line">${escape(value)}</td></tr>`).join("")}</table></div>`,
  };
}

export const KIND_LABELS = { "rendez-vous": "Rendez-vous", pro: "Architecte", projet: "Projet particulier" } as const;

export function requestsToCsv(requests: StoredRequest[]): string {
  const header = ["Demande", "Date UTC", "Type", "Public", "Nom", "WhatsApp", "E-mail", "Cabinet", "Type de projet", "Étape", "Échéance", "Modèles", "Parcours", "Ville", "Jour souhaité", "Moment", "Modèle", "Page", "Message", "État CRM"];
  return "﻿" + [header, ...requests.map(r => [
    r.requestId, new Date(r.createdAt).toISOString(), KIND_LABELS[r.kind], audience(r), r.name, r.whatsapp,
    r.kind === "pro" ? r.email : "", r.kind === "pro" ? r.company : "", r.kind === "pro" ? r.projectType : "",
    r.kind === "pro" ? r.stage ?? "" : "", r.kind === "pro" ? r.deadline ?? "" : "", r.kind === "pro" ? r.models ?? "" : "",
    r.kind === "projet" ? ROUTES[r.route] : "", r.city ?? "",
    r.kind === "rendez-vous" ? r.day : "", r.kind === "rendez-vous" ? PERIODS[r.period] : "", r.model || "", r.sourcePath, r.message, r.crmStatus,
  ])].map(row => row.map(csvCell).join(";")).join("\r\n");
}

/** Calendar date in Casablanca, where the showroom takes the appointment. */
export function casablancaToday(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Casablanca", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}
