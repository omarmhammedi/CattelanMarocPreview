import type { StorageCollection } from "emdash";

/** Form submissions are kept three years, as the privacy page states, then deleted. */
export const RETENTION_MS = 3 * 365 * 24 * 3_600_000;

/** Deletes up to 100 entries older than the retention period per run; the next run takes the rest. */
export async function purgeExpired(store: StorageCollection<{ createdAt: number }>, now = Date.now()): Promise<number> {
  const expired = await store.query({ where: { createdAt: { lt: now - RETENTION_MS } }, limit: 100 });
  if (expired.items.length) await store.deleteMany(expired.items.map((item) => item.id));
  return expired.items.length;
}
