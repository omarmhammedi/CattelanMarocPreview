import { fileURLToPath } from "node:url";
import type { PluginDescriptor } from "emdash";

/** Build-time descriptor, separate from the Cloudflare-only runtime. */
export function cataloguePlugin(): PluginDescriptor {
  return {
    id: "catalogue-leads",
    version: "0.1.0",
    format: "native",
    entrypoint: fileURLToPath(new URL("./runtime.ts", import.meta.url)),
    adminEntry: "/src/plugins/catalogue/admin.tsx",
  };
}
