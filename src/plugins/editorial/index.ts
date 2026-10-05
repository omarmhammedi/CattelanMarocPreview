import { fileURLToPath } from "node:url";
import type { PluginDescriptor } from "emdash";

/** Task-oriented controls inside the native EmDash admin. */
export function editorialPlugin(): PluginDescriptor {
  return {
    id: "cattelan-editorial",
    version: "0.1.0",
    format: "native",
    entrypoint: fileURLToPath(new URL("./runtime.ts", import.meta.url)),
    adminEntry: "/src/plugins/editorial/admin.tsx",
  };
}
