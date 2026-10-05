/** A manual CRM simulation must never also deliver pending catalogue emails. */
export type CatalogueRun = "manual-crm" | "scheduled";
export async function runCatalogueQueues(mode: CatalogueRun, queues: {
  crm: () => Promise<number>;
  email: () => Promise<void>;
  cleanup: () => Promise<void>;
}): Promise<number> {
  const processed = await queues.crm();
  if (mode === "scheduled") await queues.email();
  await queues.cleanup();
  return processed;
}
