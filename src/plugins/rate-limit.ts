import type { PluginContext, StorageCollection } from "emdash";

/** Hourly counter per hashed identity; the identity itself (IP or address) is never stored. */
export async function rateLimit(ctx: PluginContext, identity: string, secret: string, limit = 30): Promise<boolean> {
  const now = Date.now();
  const hour = Math.floor(now / 3_600_000);
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${secret}:${identity}:${hour}`));
  const id = Array.from(new Uint8Array(hash), (n) => n.toString(16).padStart(2, "0")).join("");
  const store = ctx.storage.rates as StorageCollection<{ count: number; expiresAt: number }>;
  for (let attempt = 0; attempt < 5; attempt++) {
    const current = await store.getVersioned(id);
    if ((current?.value.count ?? 0) >= limit) return false;
    const write = await store.compareAndSet(id, current?.revision ?? null, {
      count: (current?.value.count ?? 0) + 1,
      expiresAt: (hour + 2) * 3_600_000,
    });
    if (write.applied) return true;
  }
  return false;
}

export async function pruneRates(ctx: PluginContext): Promise<void> {
  const expired = await ctx.storage.rates.query({ where: { expiresAt: { lt: Date.now() } }, limit: 100 });
  if (expired.items.length) await ctx.storage.rates.deleteMany(expired.items.map((item) => item.id));
}
