import test from "node:test";
import assert from "node:assert/strict";
import {
  DOWNLOAD_LIFETIME_MS, LEASE_MS, InputError, csvCell, dispatchLead,
  mockCrm, persistRequest, signDownload, validateInput, verifyDownload,
  type AtomicStore, type Catalogue, type Lead,
} from "../src/plugins/catalogue/core.ts";

const catalogue: Catalogue = { id: "edition-test", title: "Catalogue de démonstration", key: "catalogues/cattelan-demonstration.pdf", placeholder: true };
const rawInput = () => ({ requestId: crypto.randomUUID(), catalogueId: "edition-test", name: "  Salma   Test ", email: "SALMA@example.test", communicationsConsent: false, website: "", sourcePath: "/catalogue/" });
class MemoryStore implements AtomicStore<Lead> {
  values = new Map<string, { value: Lead; revision: string }>();
  sequence = 0;
  async getVersioned(id: string) { return structuredClone(this.values.get(id) ?? null); }
  async compareAndSet(id: string, revision: string | null, value: Lead) {
    if ((this.values.get(id)?.revision ?? null) !== revision) return { applied: false };
    this.values.set(id, { value: structuredClone(value), revision: String(++this.sequence) });
    return { applied: true };
  }
}

test("normalizes name and email without opting a visitor into communications", () => {
  const value = validateInput(rawInput());
  assert.equal(value.name, "Salma Test");
  assert.equal(value.email, "salma@example.test");
  assert.equal(value.communicationsConsent, false);
  const omitted = rawInput() as Record<string, unknown>; delete omitted.communicationsConsent;
  assert.equal(validateInput(omitted).communicationsConsent, false);
});

test("rejects bots, oversized values, control characters and coerced consent", () => {
  for (const change of [
    { website: "https://spam.test" }, { name: "x".repeat(121) },
    { name: "Name\r\nHeader" }, { email: "invalid" }, { communicationsConsent: "true" },
    { sourcePath: "//untrusted.test" }, { sourcePath: "/?email=private" }, { requestId: "untrusted" },
  ]) assert.throws(() => validateInput({ ...rawInput(), ...change }), InputError);
});

test("concurrent request retries produce one durable lead with its pending outbox event", async () => {
  const store = new MemoryStore();
  const input = validateInput(rawInput());
  const results = await Promise.all(Array.from({ length: 12 }, () => persistRequest(store, input, catalogue, 1000)));
  assert.equal(store.values.size, 1);
  assert.ok(results.every((lead) => lead.requestId === input.requestId));
  const lead = (await store.getVersioned(input.requestId))!.value;
  assert.equal(lead.crmStatus, "pending");
  assert.equal(lead.crmAttempts, 0);
  assert.equal(lead.consentVersion, "catalogue-fr-v1");
});

test("a reused request ID cannot overwrite a different contact or consent", async () => {
  const store = new MemoryStore();
  const input = validateInput(rawInput());
  await persistRequest(store, input, catalogue);
  await assert.rejects(persistRequest(store, { ...input, email: "another@example.test" }, catalogue), { code: "REQUEST_CONFLICT" });
  await assert.rejects(persistRequest(store, { ...input, communicationsConsent: true }, catalogue), { code: "REQUEST_CONFLICT" });
  assert.equal((await store.getVersioned(input.requestId))!.value.email, input.email);
});

test("database failure prevents a successful catalogue request", async () => {
  const store = new MemoryStore();
  store.compareAndSet = async () => { throw new Error("database unavailable"); };
  await assert.rejects(persistRequest(store, validateInput(rawInput()), catalogue), /database unavailable/u);
  assert.equal(store.values.size, 0);
});

test("mock CRM processing preserves the contact and never claims live delivery", async () => {
  const store = new MemoryStore(); const input = validateInput(rawInput());
  await persistRequest(store, input, catalogue, 1000);
  assert.equal(await dispatchLead(store, input.requestId, mockCrm, 1000), "waiting_configuration");
  const lead = (await store.getVersioned(input.requestId))!.value;
  assert.equal(lead.crmDeliveredAt, null);
  assert.equal(lead.email, input.email);
  assert.equal(await dispatchLead(store, input.requestId, mockCrm, 2000), "skipped");
});

test("failed CRM delivery preserves data and schedules a bounded exponential retry", async () => {
  const store = new MemoryStore(); const input = validateInput(rawInput());
  await persistRequest(store, input, catalogue, 1000);
  const adapter = { send: async () => { throw new Error("provider secret and personal details must not be stored"); } };
  assert.equal(await dispatchLead(store, input.requestId, adapter, 1000), "retry");
  const lead = (await store.getVersioned(input.requestId))!.value;
  assert.equal(lead.crmStatus, "pending"); assert.equal(lead.crmNextAttemptAt, 61_000);
  assert.equal(lead.crmLastError, "CRM_UNAVAILABLE"); assert.equal(lead.email, input.email);
  assert.equal(await dispatchLead(store, input.requestId, adapter, 60_999), "skipped");
});

test("concurrent workers dispatch once and pass a stable external idempotency key", async () => {
  const store = new MemoryStore(); const input = validateInput(rawInput());
  await persistRequest(store, input, catalogue, 1000);
  const calls: string[] = [];
  const adapter = { send: async (_lead: Lead, key: string) => { calls.push(key); return { mode: "live" as const }; } };
  await Promise.all(Array.from({ length: 10 }, () => dispatchLead(store, input.requestId, adapter, 1000)));
  assert.deepEqual(calls, [`catalogue-request:${input.requestId}`]);
  assert.equal((await store.getVersioned(input.requestId))!.value.crmStatus, "delivered");
});

test("an expired worker lease can be reclaimed after a crash", async () => {
  const store = new MemoryStore(); const input = validateInput(rawInput());
  const lead = await persistRequest(store, input, catalogue, 1000);
  const record = (await store.getVersioned(input.requestId))!;
  await store.compareAndSet(input.requestId, record.revision, { ...lead, crmStatus: "processing", crmLeaseId: "interrupted-worker", crmLeaseUntil: 1000 + LEASE_MS });
  assert.equal(await dispatchLead(store, input.requestId, mockCrm, 1000), "skipped");
  assert.equal(await dispatchLead(store, input.requestId, mockCrm, 1001 + LEASE_MS), "waiting_configuration");
});

test("download links expire, reject tampering and carry no personal information", async () => {
  const secret = "test-only-secret-with-more-than-thirty-two-characters";
  const id = crypto.randomUUID(); const now = 1000;
  const token = await signDownload(id, secret, now);
  assert.equal(await verifyDownload(token, secret, now), id);
  assert.equal(await verifyDownload(token, secret, now + DOWNLOAD_LIFETIME_MS), null);
  assert.equal(await verifyDownload(token.slice(0, -4) + "abcd", secret, now), null);
  assert.equal(await verifyDownload(token, secret + "wrong", now), null);
  assert.deepEqual(Object.keys(JSON.parse(Buffer.from(token.split(".")[0], "base64url").toString())), ["id", "expires"]);
});

test("CSV export quotes cells and neutralizes spreadsheet formulas", () => {
  assert.equal(csvCell('=HYPERLINK("bad")'), '"\'=HYPERLINK(""bad"")"');
  assert.equal(csvCell('Salma "Test"'), '"Salma ""Test"""');
});
