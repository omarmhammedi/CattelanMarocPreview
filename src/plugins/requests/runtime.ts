import { env } from "cloudflare:workers";
import { definePlugin, definePluginRoute, pluginResponse } from "emdash";
import type { PluginContext, StorageCollection } from "emdash";
import { validateRequestOrigin } from "../catalogue/core.ts";
import { pruneRates, rateLimit } from "../rate-limit.ts";
import { purgeExpired } from "../retention.ts";
import { InputError, casablancaToday, notificationEmail, persistRequest, requestsToCsv, validateRequest, type StoredRequest } from "./core.ts";

const PLUGIN_ID = "contact-requests";

function requests(ctx: PluginContext): StorageCollection<StoredRequest> {
  return ctx.storage.requests as StorageCollection<StoredRequest>;
}
function settings() {
  const values = env as unknown as { CATALOGUE_TOKEN_SECRET?: string; EMDASH_SITE_URL?: string; REQUESTS_NOTIFY_TO?: string };
  if (!values.CATALOGUE_TOKEN_SECRET || values.CATALOGUE_TOKEN_SECRET.length < 32) throw new Error("Rate-limit secret unavailable");
  const notifyTo = values.REQUESTS_NOTIFY_TO?.trim();
  return { secret: values.CATALOGUE_TOKEN_SECRET, siteUrl: values.EMDASH_SITE_URL, notifyTo: notifyTo && /^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/u.test(notifyTo) ? notifyTo : null };
}
function queryString(input: unknown, name: string, max = 4096): string | undefined {
  const value = input && typeof input === "object" ? (input as Record<string, unknown>)[name] : undefined;
  return typeof value === "string" && value.length <= max ? value : undefined;
}

/** The showroom learns about a request at once; a failure leaves the request saved and marked. */
async function notify(ctx: PluginContext, request: StoredRequest, to: string | null) {
  if (!to || !ctx.email) return;
  const store = requests(ctx);
  let status: StoredRequest["notifyStatus"] = "sent";
  try { await ctx.email.send(notificationEmail(request, to)); } catch { status = "failed"; }
  const current = await store.getVersioned(request.requestId);
  if (current) await store.compareAndSet(request.requestId, current.revision, { ...current.value, notifyStatus: status });
}

export function createPlugin() {
  return definePlugin({
    id: PLUGIN_ID,
    version: "0.1.0",
    capabilities: ["email:send"],
    storage: {
      requests: { indexes: ["createdAt", "kind", "crmStatus"] },
      rates: { indexes: ["expiresAt"] },
    },
    admin: {
      entry: "/src/plugins/requests/admin.tsx",
      pages: [{ path: "/requests", label: "Rendez-vous et projets", icon: "calendar" }],
    },
    hooks: {
      "plugin:activate": async (_event, ctx) => { await ctx.cron?.schedule("requests-cleanup", { schedule: "0 * * * *" }); },
      "plugin:deactivate": async (_event, ctx) => { await ctx.cron?.cancel("requests-cleanup"); },
      cron: async (event, ctx) => { if (event.name === "requests-cleanup") { await pruneRates(ctx); await purgeExpired(requests(ctx)); } },
    },
    routes: {
      submit: definePluginRoute({
        public: true,
        methods: ["POST"],
        request: { body: "json", maxBytes: 8192, headers: ["origin", "referer"] },
        handler: async (ctx) => {
          try {
            const { secret, siteUrl, notifyTo } = settings();
            validateRequestOrigin(ctx.request.headers.get("origin"), ctx.request.url, siteUrl, {
              development: import.meta.env.DEV, referer: ctx.request.headers.get("referer"),
            });
            const input = validateRequest(ctx.input, casablancaToday());
            const saved = await requests(ctx).get(input.requestId);
            if (!saved && !await rateLimit(ctx, `requests:${ctx.requestMeta.ip ?? input.whatsapp}`, secret, 10)) {
              return { ok: false, code: "RATE_LIMITED", message: "Trop de demandes. Veuillez réessayer plus tard." };
            }
            const { request, created } = await persistRequest(requests(ctx), input);
            if (created) await notify(ctx, request, notifyTo);
            return { ok: true, kind: request.kind };
          } catch (error) {
            if (error instanceof InputError) return { ok: false, code: error.code, message: error.message };
            // Never log the request body or contact details.
            ctx.log.error("Contact request could not be completed");
            return { ok: false, code: "TEMPORARILY_UNAVAILABLE", message: "Votre demande n’a pas pu être envoyée. Veuillez réessayer." };
          }
        },
      }),
      list: definePluginRoute({
        permission: "plugins:manage",
        methods: ["GET"],
        request: { body: "none" },
        handler: async (ctx) => {
          const page = await requests(ctx).query({ orderBy: { createdAt: "desc" }, limit: 50, cursor: queryString(ctx.input, "cursor") });
          return { items: page.items.map(({ data }) => data), cursor: page.cursor, hasMore: page.hasMore };
        },
      }),
      export: definePluginRoute({
        permission: "plugins:manage",
        methods: ["GET"],
        request: { body: "none" },
        response: "raw",
        handler: async (ctx) => {
          const all: StoredRequest[] = [];
          let cursor: string | undefined;
          do {
            const page = await requests(ctx).query({ orderBy: { createdAt: "desc" }, limit: 100, cursor });
            all.push(...page.items.map(({ data }) => data));
            cursor = page.hasMore ? page.cursor : undefined;
            if (all.length > 5000) return pluginResponse({ status: 413, body: { kind: "text", value: "Plus de 5 000 demandes : exportez-les depuis le CRM." } });
          } while (cursor);
          return pluginResponse({ headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": 'attachment; filename="demandes-rendez-vous-projets.csv"' }, body: { kind: "text", value: requestsToCsv(all) } });
        },
      }),
      delete: definePluginRoute({
        permission: "plugins:manage",
        methods: ["POST"],
        request: { body: "json", maxBytes: 256 },
        handler: async (ctx) => {
          const id = queryString(ctx.input, "requestId", 36);
          if (!id || !/^[0-9a-f-]{36}$/u.test(id)) return { ok: false, message: "Identifiant de demande invalide." };
          const current = await requests(ctx).getVersioned(id);
          if (!current) return { ok: true };
          return (await requests(ctx).compareAndDelete(id, current.revision)).applied
            ? { ok: true } : { ok: false, message: "La demande a changé pendant l’opération. Actualisez puis réessayez." };
        },
      }),
    },
  });
}
