/**
 * Real HTTP checks against the local EmDash/D1/R2 app, after tests/cms-sync.mjs.
 * Uses that test's genuine native passkey session from ignored .wrangler storage.
 * Run: node tests/catalogue-http.mjs
 * Test contacts are deleted and catalogue content restored in finally blocks.
 */
import assert from "node:assert/strict";
import { readFile, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";

const base = new URL(process.env.CMS_TEST_URL || "http://localhost:4321");
assert(["localhost", "127.0.0.1", "[::1]"].includes(base.hostname), "Local test only");
const session = JSON.parse(await readFile(".wrangler/cms-sync-session.json", "utf8"));
const cookie = session.cookies.filter((item) => [base.hostname, "." + base.hostname].includes(item.domain)).map((item) => `${item.name}=${item.value}`).join("; ");
assert(cookie, "Run the native CMS integration login first.");
const prefix = "/_emdash/api/plugins/catalogue-leads";
const report = [];
const record = (message) => { report.push(message); console.log(`PASS ${message}`); };
const created = [];
const pdfKeys = [];
async function request(path, { method = "GET", body, privateRoute = false, csrf = true, origin = base.origin, bytes = false } = {}) {
  const headers = { Origin: origin };
  if (privateRoute) headers.Cookie = cookie;
  if (csrf) headers["X-EmDash-Request"] = "1";
  if (body !== undefined) headers["Content-Type"] = bytes ? "application/pdf" : "application/json";
  return fetch(new URL(path, base), { method, headers, ...(body === undefined ? {} : { body: bytes ? body : JSON.stringify(body) }) });
}
async function api(path, options = {}) {
  const response = await request(path, options);
  const envelope = await response.json();
  assert(response.ok && envelope.success, `API failed (${response.status})`);
  return envelope.data;
}
const input = () => ({ requestId: crypto.randomUUID(), catalogueId: "demonstration", name: "Test catalogue local", email: "catalogue-integration@example.invalid", communicationsConsent: false, website: "", sourcePath: "/catalogue/" });
async function submit(data = input()) {
  created.push(data.requestId);
  return { input: data, result: await api(`${prefix}/request`, { method: "POST", body: data }) };
}
async function contact(id) {
  const page = await api(`${prefix}/contacts`, { privateRoute: true });
  return page.items.find((item) => item.requestId === id);
}
async function download(url) {
  const response = await request(url);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get("content-type"), "application/pdf");
  assert.match(response.headers.get("cache-control") || "", /no-store/u);
  assert.equal(Buffer.from(await response.arrayBuffer()).subarray(0, 5).toString(), "%PDF-");
  return response.headers.get("content-disposition");
}

let original; let cataloguePath; let catalogueChanged = false;
try {
  for (const path of ["contacts", "export"]) {
    const response = await request(`${prefix}/${path}`);
    assert([401, 403].includes(response.status), `${path} must reject anonymous access`);
  }
  const privatePost = await request(`${prefix}/contacts/delete`, { method: "POST", body: { requestId: crypto.randomUUID() } });
  assert([401, 403].includes(privatePost.status));
  const csrfFailure = await request(`${prefix}/contacts`, { privateRoute: true, csrf: false });
  assert.equal(csrfFailure.status, 403);
  record("Contacts, export et suppression protégés ; une session sans l’en-tête CSRF est refusée.");

  assert.equal((await request(`${prefix}/request`)).status, 405);
  const crossInput = input(); created.push(crossInput.requestId);
  const crossOrigin = await request(`${prefix}/request`, { method: "POST", body: crossInput, origin: "https://untrusted.example" });
  if (crossOrigin.status !== 403) {
    const rejected = (await crossOrigin.json()).data;
    assert.equal(rejected.ok, false); assert.equal(rejected.code, "ORIGIN_REJECTED");
  }
  const invalid = await submit({ ...input(), email: "invalid" });
  assert.equal(invalid.result.ok, false);
  assert.equal(await contact(invalid.input.requestId), undefined);
  record("Méthode incorrecte, origine étrangère et e-mail invalide refusés sans contact enregistré.");

  const first = await submit();
  assert.equal(first.result.ok, true, JSON.stringify(first.result));
  assert.equal(first.result.placeholder, true);
  assert.match(first.result.message, /téléchargé/u);
  assert.doesNotMatch(first.result.message, /envoyé|e-mail|courriel/u);
  const stored = await contact(first.input.requestId);
  assert(stored); assert.equal(stored.communicationsConsent, false);
  const repeated = await submit(first.input);
  assert.equal(repeated.result.ok, true);
  const page = await api(`${prefix}/contacts`, { privateRoute: true });
  assert.equal(page.items.filter((item) => item.requestId === first.input.requestId).length, 1);
  assert.match(await download(first.result.downloadUrl), /demonstration/u);
  record("Demande persistée dans D1 avant téléchargement R2 ; nouvelle tentative sans doublon ni abonnement implicite.");

  const invalidToken = await request(`${prefix}/download?token=invalid`);
  assert.equal(invalidToken.status, 410);
  const process = await api(`${prefix}/crm/process`, { method: "POST", privateRoute: true, body: {} });
  assert.equal(process.mode, "mock");
  assert.equal((await contact(first.input.requestId)).crmStatus, "waiting_configuration");
  const csv = await request(`${prefix}/export`, { privateRoute: true });
  assert.equal(csv.status, 200); assert.match(await csv.text(), /catalogue-integration@example\.invalid/u);
  record("Faux lien refusé ; export privé fonctionnel ; traitement CRM clairement en attente de configuration.");

  const badPdf = await api(`${prefix}/pdf/upload`, { privateRoute: true, method: "POST", body: Buffer.from("not a PDF document"), bytes: true });
  assert.equal(badPdf.ok, false);
  const pdf = await readFile("src/plugins/catalogue/assets/cattelan-demonstration.pdf");
  const uploaded = await api(`${prefix}/pdf/upload`, { privateRoute: true, method: "POST", body: pdf, bytes: true });
  assert.equal(uploaded.ok, true); pdfKeys.push(uploaded.private_file_key);
  const catalogues = await api("/_emdash/api/content/catalogues", { privateRoute: true });
  const entry = catalogues.items.find((item) => item.slug === "demonstration");
  assert(entry);
  cataloguePath = `/_emdash/api/content/catalogues/${entry.id}`;
  original = await api(cataloguePath, { privateRoute: true });
  assert(!original.item.draftRevisionId || original.item.draftRevisionId === original.item.liveRevisionId, "Pending editorial changes must not be replaced by this test.");
  await api(cataloguePath, { privateRoute: true, method: "PUT", body: { data: { ...original.item.data, title: "Catalogue synchronisation test", private_file_key: uploaded.private_file_key, is_placeholder: false }, _rev: original._rev } });
  catalogueChanged = true;
  const draftRequest = await submit();
  assert.equal(draftRequest.result.ok, true); assert.equal(draftRequest.result.placeholder, true);
  assert.equal((await contact(draftRequest.input.requestId)).catalogueTitle, original.item.data.title);
  const draft = await api(cataloguePath, { privateRoute: true });
  await api(`${cataloguePath}/publish`, { privateRoute: true, method: "POST", body: { _rev: draft._rev } });
  const published = await submit();
  assert.equal(published.result.ok, true); assert.equal(published.result.placeholder, false);
  assert.equal((await contact(published.input.requestId)).catalogueTitle, "Catalogue synchronisation test");
  assert.match(await download(published.result.downloadUrl), /cattelan-catalogue/u);
  record("PDF ajouté depuis l’API privée : le brouillon conserve l’ancienne édition ; la publication active le nouveau PDF dès la demande suivante.");

  await api(`${prefix}/contacts/delete`, { privateRoute: true, method: "POST", body: { requestId: first.input.requestId } });
  assert.equal(await contact(first.input.requestId), undefined);
  assert.equal((await request(first.result.downloadUrl)).status, 410);
  record("Suppression administrative retire la demande et son événement, puis révoque le téléchargement.");
} finally {
  if (catalogueChanged && original) {
    const latest = await api(cataloguePath, { privateRoute: true });
    await api(cataloguePath, { privateRoute: true, method: "PUT", body: { data: original.item.data, _rev: latest._rev } });
    const restored = await api(cataloguePath, { privateRoute: true });
    await api(`${cataloguePath}/publish`, { privateRoute: true, method: "POST", body: { _rev: restored._rev } });
    record("Fiche Catalogue restaurée et republiée après le test.");
  }
  for (const requestId of new Set(created)) await api(`${prefix}/contacts/delete`, { privateRoute: true, method: "POST", body: { requestId } });
  // Recover this harness's synthetic fixtures after an interrupted earlier run.
  let cursor;
  do {
    const page = await api(`${prefix}/contacts${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ""}`, { privateRoute: true });
    for (const item of page.items) {
      if (item.email === "catalogue-integration@example.invalid" && item.name === "Test catalogue local") {
        await api(`${prefix}/contacts/delete`, { privateRoute: true, method: "POST", body: { requestId: item.requestId } });
      }
    }
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);
  for (const key of pdfKeys) execFileSync("npx", ["wrangler", "r2", "object", "delete", `cattelan-maroc-catalogues-preview/${key}`, "--local"], { stdio: "ignore" });
  record("Contacts et PDF ajoutés par ce test supprimés de l’environnement local.");
}
await writeFile("docs/test-results-catalogue.md", `# Vérification HTTP du catalogue\n\nDate UTC : ${new Date().toISOString()}\n\nEmDash 0.41.0, D1 et R2 locaux ; session issue d’une connexion passkey native. Aucun service CRM externe contacté.\n\n${report.map((item) => `- ${item}`).join("\n")}\n`);
