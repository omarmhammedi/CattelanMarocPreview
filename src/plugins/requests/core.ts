/** Appointment and professional requests: pure validation, storage and export logic. */
import { CITIES, InputError, csvCell, isWhatsappNumber, type AtomicStore } from "../catalogue/core.ts";

export { CITIES, InputError };
export const PROJECT_TYPES = ["Appartement", "Villa", "Bureaux", "Hôtel", "Restaurant", "Boutique", "Autre"] as const;
export const PERIODS = { matin: "Matin", "apres-midi": "Après-midi" } as const;
const MAX_DAYS_AHEAD = 180;

type Common = { requestId: string; name: string; whatsapp: string; message: string; sourcePath: string; model: string | null };
export type AppointmentInput = Common & { kind: "rendez-vous"; day: string; period: keyof typeof PERIODS };
export type ProInput = Common & { kind: "pro"; company: string; email: string; projectType: typeof PROJECT_TYPES[number]; city: typeof CITIES[number] };
export type RequestInput = AppointmentInput | ProInput;
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
    return { ...common, kind: "rendez-vous", day, period: period as keyof typeof PERIODS };
  }
  if (data.kind === "pro") {
    const company = text("company", 120, "INVALID_COMPANY", "Indiquez votre société.");
    if (company.length < 2) throw new InputError("INVALID_COMPANY", "Indiquez votre société.");
    const email = text("email", 254, "INVALID_EMAIL", "Indiquez une adresse e-mail valide.").toLowerCase();
    if (!/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/u.test(email)) throw new InputError("INVALID_EMAIL", "Indiquez une adresse e-mail valide.");
    const projectType = text("projectType", 40, "INVALID_PROJECT", "Choisissez un type de projet.");
    if (!(PROJECT_TYPES as readonly string[]).includes(projectType)) throw new InputError("INVALID_PROJECT", "Choisissez un type de projet.");
    const city = text("city", 40, "INVALID_CITY", "Choisissez une ville.");
    if (!(CITIES as readonly string[]).includes(city)) throw new InputError("INVALID_CITY", "Choisissez une ville.");
    return { ...common, kind: "pro", company, email, projectType: projectType as ProInput["projectType"], city: city as ProInput["city"] };
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
  const rows: [string, string][] = [["Nom", request.name], ["WhatsApp", request.whatsapp]];
  if (request.kind === "rendez-vous") rows.push(["Jour souhaité", request.day], ["Moment", PERIODS[request.period]]);
  else rows.push(["Société", request.company], ["E-mail", request.email], ["Type de projet", request.projectType], ["Ville", request.city]);
  if (request.model) rows.push(["Modèle", request.model]);
  rows.push(["Page", request.sourcePath]);
  if (request.message) rows.push(["Message", request.message]);
  return rows;
}

export function notificationEmail(request: StoredRequest, to: string) {
  const subject = request.kind === "rendez-vous" ? `Demande de rendez-vous — ${request.name}` : `Demande professionnelle — ${request.company}`;
  const escape = (value: string) => value.replace(/[&<>"']/gu, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
  const rows = describe(request);
  return {
    to, subject,
    text: `${subject}\n\n${rows.map(([label, value]) => `${label} : ${value}`).join("\n")}\n\nDemande ${request.requestId}`,
    html: `<div lang="fr" style="font:15px Arial,sans-serif;line-height:1.6;color:#292722"><h1 style="font-size:20px">${escape(subject)}</h1><table>${rows.map(([label, value]) => `<tr><th align="left" style="padding:4px 16px 4px 0;vertical-align:top">${escape(label)}</th><td style="white-space:pre-line">${escape(value)}</td></tr>`).join("")}</table></div>`,
  };
}

export function requestsToCsv(requests: StoredRequest[]): string {
  const header = ["Demande", "Date UTC", "Type", "Nom", "WhatsApp", "E-mail", "Société", "Type de projet", "Ville", "Jour souhaité", "Moment", "Modèle", "Page", "Message", "État CRM"];
  return "﻿" + [header, ...requests.map(r => [
    r.requestId, new Date(r.createdAt).toISOString(), r.kind === "rendez-vous" ? "Rendez-vous" : "Professionnel", r.name, r.whatsapp,
    r.kind === "pro" ? r.email : "", r.kind === "pro" ? r.company : "", r.kind === "pro" ? r.projectType : "", r.kind === "pro" ? r.city : "",
    r.kind === "rendez-vous" ? r.day : "", r.kind === "rendez-vous" ? PERIODS[r.period] : "", r.model || "", r.sourcePath, r.message, r.crmStatus,
  ])].map(row => row.map(csvCell).join(";")).join("\r\n");
}

/** Calendar date in Casablanca, where the showroom takes the appointment. */
export function casablancaToday(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Casablanca", year: "numeric", month: "2-digit", day: "2-digit" }).format(now);
}
