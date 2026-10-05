import { env } from "cloudflare:workers";
import { definePlugin, definePluginRoute, getEmDashEntry, pluginResponse } from "emdash";
import type { PluginContext, StorageCollection } from "emdash";
import {
  InputError, dispatchLead, leadsToCsv, mockCrm, persistRequest,
  signDownload, validateInput, validateRequestOrigin, verifyDownload,
  type Catalogue, type Lead,
} from "./core.ts";

import { catalogueEmail, dispatchCatalogueEmail } from "./email.ts";
import { runCatalogueQueues, type CatalogueRun } from "./processing.ts";
import { rateLimit } from "../rate-limit.ts";
import { purgeExpired } from "../retention.ts";

const PLUGIN_ID = "catalogue-leads";
const PREFIX = `/_emdash/api/plugins/${PLUGIN_ID}`;
const MAX_PDF_BYTES = 8 * 1024 * 1024;
const PRIVATE_KEY = /^catalogues\/[a-zA-Z0-9_-]+\.pdf$/u;

function emailSettings() {
  const values = env as unknown as { RESEND_API_KEY?: string; EMDASH_SITE_URL?: string };
  return values.RESEND_API_KEY && values.EMDASH_SITE_URL ? { origin: values.EMDASH_SITE_URL } : null;
}
async function sendCatalogue(ctx: PluginContext, id: string) {
  const settings = emailSettings();
  if (!settings) return 'skipped';
  return dispatchCatalogueEmail(leads(ctx), id, async lead => {
    if (!ctx.email) throw new Error('Email provider unavailable');
    await ctx.email.send(await catalogueEmail(lead, settings.origin, bindings().secret));
  });
}
function bindings() {
  const values = env as unknown as { CATALOGUES?: R2Bucket; CATALOGUE_TOKEN_SECRET?: string };
  if (!values.CATALOGUES || !values.CATALOGUE_TOKEN_SECRET || values.CATALOGUE_TOKEN_SECRET.length < 32) {
    throw new Error("Le catalogue est temporairement indisponible.");
  }
  return { bucket: values.CATALOGUES, secret: values.CATALOGUE_TOKEN_SECRET };
}
function leads(ctx: PluginContext): StorageCollection<Lead> {
  return ctx.storage.leads as StorageCollection<Lead>;
}
function queryString(input: unknown, name: string, max = 512): string | undefined {
  if (!input || typeof input !== "object") return undefined;
  const value = (input as Record<string, unknown>)[name];
  return typeof value === "string" && value.length <= max ? value : undefined;
}
function publicLead(lead: Lead) {
  return {
    requestId: lead.requestId, name: lead.name, email: lead.email, whatsapp: lead.whatsapp, city: lead.city,
    createdAt: lead.createdAt, communicationsConsent: lead.communicationsConsent,
    consentVersion: lead.consentVersion, sourcePath: lead.sourcePath,
    catalogueTitle: lead.catalogue.title, placeholder: lead.catalogue.placeholder,
    emailStatus: lead.emailStatus, emailSentAt: lead.emailSentAt,
    crmStatus: lead.crmStatus, crmAttempts: lead.crmAttempts, crmLastError: lead.crmLastError,
  };
}

async function publishedCatalogue(id: string): Promise<Catalogue> {
  // Public query API resolves the live revision. ctx.content.get is an editorial API.
  const result = await getEmDashEntry<"catalogues", Record<string, unknown>>("catalogues", id);
  if (result.error) throw new Error("Le catalogue est temporairement indisponible.");
  const data = result.entry?.data;
  if (!data || result.isPreview || data.status !== "published" || typeof data.private_file_key !== "string" || !PRIVATE_KEY.test(data.private_file_key)) {
    throw new InputError("CATALOGUE_UNAVAILABLE", "Ce catalogue n’est pas disponible pour le moment.");
  }
  return {
    id: typeof data.id === "string" ? data.id : id,
    key: data.private_file_key,
    title: typeof data.title === "string" ? data.title : "Catalogue Cattelan Italia",
    placeholder: data.is_placeholder === true || data.is_placeholder === 1,
  };
}

export async function processPending(ctx: PluginContext, mode: CatalogueRun) {
  const store = leads(ctx);
  const now = Date.now();
  const processed = await runCatalogueQueues(mode, {
    crm: async () => {
      let count = 0;
      // Each run is bounded; expired leases are reclaimed after an interrupted execution.
      for (const status of ["pending", "processing"] as const) {
        const page = await store.query({ where: { crmStatus: status, crmNextAttemptAt: { lte: now } }, orderBy: { crmNextAttemptAt: "asc" }, limit: 25 });
        for (const item of page.items) {
          if (await dispatchLead(store, item.id, mockCrm, now) !== "skipped") count++;
        }
      }
      return count;
    },
    email: async () => {
      if (!emailSettings()) return;
      for (const emailStatus of ['pending', 'processing'] as const) {
        const page = await store.query({ where: { emailStatus, emailNextAttemptAt: { lte: now } }, orderBy: { emailNextAttemptAt: 'asc' }, limit: 5 });
        for (const item of page.items) await sendCatalogue(ctx, item.id);
      }
    },
    cleanup: async () => {
      const expired = await ctx.storage.rates.query({ where: { expiresAt: { lt: now } }, limit: 100 });
      if (expired.items.length) await ctx.storage.rates.deleteMany(expired.items.map((item) => item.id));
    },
  });
  return { processed, mode: "mock", message: `Aucune donnée n’a été envoyée à un CRM externe.${mode === "manual-crm" ? " Aucun e-mail n’a été envoyé par cette action." : ""}` };
}

export function createPlugin() {
  return definePlugin({
    id: PLUGIN_ID,
    version: "0.1.0",
    capabilities: ["content:read", "email:send"],
    storage: {
      leads: { indexes: ["createdAt", "email", "crmStatus", "crmNextAttemptAt", ["crmStatus", "crmNextAttemptAt"], "emailStatus", "emailNextAttemptAt", ["emailStatus", "emailNextAttemptAt"]] },
      rates: { indexes: ["expiresAt"] },
    },
    admin: {
      entry: "/src/plugins/catalogue/admin.tsx",
      pages: [{ path: "/contacts", label: "Contacts catalogue", icon: "address-book" }],
    },
    hooks: {
      "plugin:activate": async (_event, ctx) => {
        await ctx.cron?.schedule("catalogue-crm", { schedule: "*/5 * * * *" });
      },
      "plugin:deactivate": async (_event, ctx) => { await ctx.cron?.cancel("catalogue-crm"); },
      cron: async (event, ctx) => { if (event.name === "catalogue-crm") { await processPending(ctx, "scheduled"); await purgeExpired(leads(ctx)); } },
    },
    routes: {
      request: definePluginRoute({
        public: true,
        methods: ["POST"],
        request: { body: "json", maxBytes: 4096, headers: ["origin", "referer"] },
        handler: async (ctx) => {
          try {
            const siteUrl = (env as unknown as { EMDASH_SITE_URL?: string }).EMDASH_SITE_URL;
            validateRequestOrigin(ctx.request.headers.get("origin"), ctx.request.url, siteUrl, {
              development: import.meta.env.DEV,
              referer: ctx.request.headers.get("referer"),
            });
            const input = validateInput(ctx.input);
            const { bucket, secret } = bindings();
            // A retry of a saved request does not consume the abuse allowance.
            const saved = await leads(ctx).get(input.requestId);
            if (!saved && !await rateLimit(ctx, ctx.requestMeta.ip ?? input.email, secret)) {
              return { ok: false, code: "RATE_LIMITED", message: "Trop de demandes. Veuillez réessayer plus tard." };
            }
            const catalogue = await publishedCatalogue(input.catalogueId);
            const object = await bucket.head(catalogue.key);
            if (!object || object.size > MAX_PDF_BYTES) {
              return { ok: false, code: "CATALOGUE_UNAVAILABLE", message: "Le catalogue est momentanément indisponible. Veuillez réessayer plus tard." };
            }
            const emailEnabled = Boolean(emailSettings());
            if (!saved && emailEnabled && !await rateLimit(ctx, `email:${input.email}`, secret, 3)) {
              return { ok: false, code: "RATE_LIMITED", message: "Trop de demandes pour cette adresse. Veuillez réessayer plus tard." };
            }
            const lead = await persistRequest(leads(ctx), input, catalogue, Date.now(), emailEnabled);
            // A failed provider leaves a durable retry; the on-page PDF stays available.
            let emailStatus: string | undefined;
            if (emailEnabled) {
              try { await sendCatalogue(ctx, lead.requestId); } catch { /* Retry is already durable. */ }
              emailStatus = (await leads(ctx).get(lead.requestId))?.emailStatus;
            }
            // The URL is minted only after the durable lead + event write succeeds.
            const token = await signDownload(lead.requestId, secret);
            return {
              ok: true,
              downloadUrl: `${PREFIX}/download?token=${encodeURIComponent(token)}`,
              emailStatus,
              placeholder: lead.catalogue.placeholder,
              message: "Votre demande est enregistrée. Le catalogue est prêt à être téléchargé.",
            };
          } catch (error) {
            if (error instanceof InputError) return { ok: false, code: error.code, message: error.message };
            // Never log the request body, contact details or token.
            ctx.log.error("Catalogue request could not be completed");
            return { ok: false, code: "TEMPORARILY_UNAVAILABLE", message: "Votre demande n’a pas pu être finalisée. Veuillez réessayer." };
          }
        },
      }),
      download: definePluginRoute({
        public: true,
        methods: ["GET"],
        request: { body: "none" },
        response: "raw",
        cacheControl: "private, no-store",
        handler: async (ctx) => {
          const { bucket, secret } = bindings();
          const id = await verifyDownload(queryString(ctx.input, "token"), secret);
          const lead = id ? await leads(ctx).get(id) : null;
          if (!lead) return pluginResponse({ status: 410, headers: { "content-type": "text/plain; charset=utf-8" }, body: { kind: "text", value: "Ce lien a expiré ou n’est pas valide. Veuillez refaire votre demande de catalogue." } });
          const object = await bucket.get(lead.catalogue.key);
          if (!object || object.size > MAX_PDF_BYTES) return pluginResponse({ status: 404, body: { kind: "text", value: "Catalogue temporairement indisponible." } });
          return pluginResponse({
            headers: { "content-type": "application/pdf", "content-disposition": `attachment; filename="${lead.catalogue.placeholder ? "cattelan-demonstration" : "cattelan-catalogue"}.pdf"` },
            body: { kind: "bytes", value: new Uint8Array(await object.arrayBuffer()) },
          });
        },
      }),
      contacts: definePluginRoute({
        permission: "plugins:manage",
        methods: ["GET"],
        request: { body: "none" },
        handler: async (ctx) => {
          const page = await leads(ctx).query({ orderBy: { createdAt: "desc" }, limit: 50, cursor: queryString(ctx.input, "cursor", 4096) });
          return { items: page.items.map(({ data }) => publicLead(data)), cursor: page.cursor, hasMore: page.hasMore };
        },
      }),
      export: definePluginRoute({
        permission: "plugins:manage",
        methods: ["GET"],
        request: { body: "none" },
        response: "raw",
        handler: async (ctx) => {
          const all: Lead[] = [];
          let cursor: string | undefined;
          do {
            const page = await leads(ctx).query({ orderBy: { createdAt: "desc" }, limit: 100, cursor });
            all.push(...page.items.map(({ data }) => data));
            cursor = page.hasMore ? page.cursor : undefined;
            // Keep the response inside the host's 8 MiB raw-response limit.
            if (all.length > 5000) return pluginResponse({ status: 413, body: { kind: "text", value: "Plus de 5 000 demandes : utilisez l’export paginé de l’API privée." } });
          } while (cursor);
          return pluginResponse({ headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": 'attachment; filename="contacts-catalogue.csv"' }, body: { kind: "text", value: leadsToCsv(all) } });
        },
      }),
      "crm/process": definePluginRoute({
        permission: "plugins:manage",
        methods: ["POST"],
        request: { body: "json", maxBytes: 128 },
        handler: (ctx) => processPending(ctx, "manual-crm"),
      }),
      "contacts/delete": definePluginRoute({
        permission: "plugins:manage",
        methods: ["POST"],
        request: { body: "json", maxBytes: 256 },
        handler: async (ctx) => {
          const id = queryString(ctx.input, "requestId", 36);
          if (!id || !/^[0-9a-f-]{36}$/u.test(id)) return { ok: false, message: "Identifiant de demande invalide." };
          const store = leads(ctx);
          const current = await store.getVersioned(id);
          if (!current) return { ok: true };
          if (!(await store.compareAndDelete(id, current.revision)).applied) {
            return { ok: false, message: "La demande a changé pendant l’opération. Actualisez puis réessayez." };
          }
          // The outbox is embedded in this row, so deletion also revokes the link and pending event.
          return { ok: true };
        },
      }),
      "pdf/upload": definePluginRoute({
        permission: "plugins:manage",
        methods: ["POST"],
        request: { body: "bytes", maxBytes: MAX_PDF_BYTES },
        handler: async (ctx) => {
          const bytes = ctx.input;
          if (bytes.byteLength < 10 || new TextDecoder().decode(bytes.slice(0, 5)) !== "%PDF-") {
            return { ok: false, message: "Sélectionnez un fichier PDF valide (8 Mio maximum)." };
          }
          const key = `catalogues/${crypto.randomUUID()}.pdf`;
          await bindings().bucket.put(key, bytes, { httpMetadata: { contentType: "application/pdf" } });
          return { ok: true, private_file_key: key, message: "PDF stocké. Copiez cette clé dans la fiche Catalogue, puis publiez la modification." };
        },
      }),
    },
  });
}
