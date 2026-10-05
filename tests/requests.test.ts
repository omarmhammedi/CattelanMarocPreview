import assert from 'node:assert/strict';
import test from 'node:test';
import { DEFAULT_NOTIFY_TO, audience, casablancaToday, describe, notificationEmail, notifyAddress, persistRequest, requestsToCsv, validateRequest, type StoredRequest } from '../src/plugins/requests/core.ts';

const id = '3f2b8c1e-4a5d-4e6f-9a7b-1c2d3e4f5a6b';
const appointment = { kind: 'rendez-vous', requestId: id, name: ' Salma  Benali ', whatsapp: '+212 600-000 001', day: '2026-10-05', period: 'matin', message: 'Voir Skorpio.\nMerci', sourcePath: '/modeles/skorpio/', model: 'skorpio', website: '' };
const pro = { kind: 'pro', requestId: id, name: 'Karim', company: 'Atelier K', whatsapp: '0600000002', email: 'K@Example.com', projectType: 'Hôtel', city: 'Marrakech', stage: 'Avant-projet', deadline: '3 à 6 mois', models: 'Butterfly Keramik, Craig', sourcePath: '/professionnels/' };
const project = { kind: 'projet', requestId: id, name: 'Nadia', whatsapp: '0600000003', city: 'Rabat', route: 'ensemble', sourcePath: '/votre-projet/' };

function memoryStore<T>() {
  const rows = new Map<string, { value: T; revision: string }>();
  let revision = 0;
  return {
    rows,
    async getVersioned(key: string) { return rows.get(key) ?? null; },
    async compareAndSet(key: string, expected: string | null, value: T) {
      if ((rows.get(key)?.revision ?? null) !== expected) return { applied: false };
      rows.set(key, { value, revision: String(++revision) }); return { applied: true };
    },
  };
}

test('accepts an appointment and normalises its fields', () => {
  const input = validateRequest(appointment, '2026-10-01');
  assert.deepEqual(input, { requestId: id, name: 'Salma Benali', whatsapp: '+212 600-000 001', message: 'Voir Skorpio.\nMerci', sourcePath: '/modeles/skorpio/', model: 'skorpio', kind: 'rendez-vous', day: '2026-10-05', period: 'matin', city: null });
  assert.equal(validateRequest({ ...appointment, city: 'Tanger' }, '2026-10-01').kind === 'rendez-vous' && validateRequest({ ...appointment, city: 'Tanger' }, '2026-10-01').city, 'Tanger');
});

test('accepts a professional request with its project type and city', () => {
  const input = validateRequest(pro, '2026-10-01');
  assert.equal(input.kind, 'pro');
  assert.equal(input.kind === 'pro' && input.email, 'k@example.com');
  assert.equal(input.model, null);
  assert.equal(input.kind === 'pro' && `${input.stage} · ${input.deadline} · ${input.models}`, 'Avant-projet · 3 à 6 mois · Butterfly Keramik, Craig');
});

test('accepts a private project with its route and city; every request is tagged', () => {
  const input = validateRequest(project, '2026-10-01');
  assert.equal(input.kind === 'projet' && `${input.route} ${input.city}`, 'ensemble Rabat');
  assert.equal(audience(input), 'particulier');
  assert.equal(audience(validateRequest(pro, '2026-10-01')), 'architecte');
  assert.equal(audience(validateRequest(appointment, '2026-10-01')), 'particulier');
  assert.deepEqual(describe(input).slice(0, 1), [['Public', 'particulier']]);
});

test('working with an architect is a separate choice from the project type', () => {
  const input = validateRequest({ ...project, route: 'piece', architect: 'oui' }, '2026-10-01');
  assert.equal(input.kind === 'projet' && input.architect, true);
  assert(describe(input).some(([label, value]) => label === 'Type de projet' && value === 'Un meuble · avec un architecte'));
  assert.equal('architect' in validateRequest(project, '2026-10-01'), false);
  assert.throws(() => validateRequest({ ...project, architect: 'peut-être' }, '2026-10-01'));
});

test('refuses incomplete or invalid requests with a field code', () => {
  const code = (change: Record<string, unknown>, base: Record<string, unknown> = appointment) => {
    try { validateRequest({ ...base, ...change }, '2026-10-01'); return 'accepted'; } catch (error) { return (error as { code: string }).code; }
  };
  assert.equal(code({ name: 'A' }), 'INVALID_NAME');
  assert.equal(code({ whatsapp: '12' }), 'INVALID_WHATSAPP');
  assert.equal(code({ whatsapp: '+212 6abc00000' }), 'INVALID_WHATSAPP');
  assert.equal(code({ day: '2026-09-30' }), 'INVALID_DAY');
  assert.equal(code({ day: '2026-02-30' }), 'INVALID_DAY');
  assert.equal(code({ day: '2027-12-01' }), 'INVALID_DAY');
  assert.equal(code({ day: '2026-10-01' }), 'accepted');
  assert.equal(code({ period: 'soir' }), 'INVALID_PERIOD');
  assert.equal(code({ message: 'x'.repeat(1001) }), 'INVALID_MESSAGE');
  assert.equal(code({ website: 'spam' }), 'INVALID_INPUT');
  assert.equal(code({ sourcePath: 'https://example.com/' }), 'INVALID_SOURCE');
  assert.equal(code({ kind: 'autre' }), 'INVALID_INPUT');
  assert.equal(code({ projectType: 'Usine' }, pro), 'INVALID_PROJECT');
  assert.equal(code({ city: 'Paris' }, pro), 'INVALID_CITY');
  assert.equal(code({ email: 'non' }, pro), 'INVALID_EMAIL');
  assert.equal(code({ company: '' }, pro), 'INVALID_COMPANY');
  assert.equal(code({ stage: '' }, pro), 'INVALID_STAGE');
  assert.equal(code({ deadline: 'Demain' }, pro), 'INVALID_DEADLINE');
  assert.equal(code({ models: 'x'.repeat(301) }, pro), 'INVALID_MODELS');
  assert.equal(code({ city: 'Paris' }), 'INVALID_CITY');
  assert.equal(code({ route: 'autre' }, project), 'INVALID_ROUTE');
  assert.equal(code({ city: '' }, project), 'INVALID_CITY');
  assert.equal(validateRequest({ ...appointment, model: '../x' }, '2026-10-01').model, null);
});

test('saves once, returns the same request on retry and refuses changed details', async () => {
  const store = memoryStore<StoredRequest>();
  const input = validateRequest(appointment, '2026-10-01');
  const first = await persistRequest(store, input, 1000);
  assert.equal(first.created, true);
  assert.equal(first.request.crmStatus, 'waiting_configuration');
  const retry = await persistRequest(store, input, 2000);
  assert.equal(retry.created, false);
  assert.equal(retry.request.createdAt, 1000);
  await assert.rejects(persistRequest(store, { ...input, name: 'Autre' }), /changé/u);
});

test('notification and export carry the request without formula injection', async () => {
  const store = memoryStore<StoredRequest>();
  const { request } = await persistRequest(store, validateRequest({ ...pro, name: '=HYPERLINK("x")', message: '<b>Hôtel</b>' }, '2026-10-01'), Date.UTC(2026, 9, 1));
  const email = notificationEmail(request, 'contact@cattelanitalia.ma');
  assert.equal(email.subject, 'Architecte (Marrakech) — Atelier K');
  assert(email.text.includes('Type de projet : Hôtel') && email.text.includes('Échéance : 3 à 6 mois') && email.html.includes('&lt;b&gt;Hôtel&lt;/b&gt;'));
  const csv = requestsToCsv([request]);
  assert(csv.includes(`"'=HYPERLINK(""x"")"`));
  assert(csv.includes('"Architecte";"architecte"') && csv.includes('"Marrakech"') && csv.includes('"Avant-projet"'));
  // A professional request saved before the Architectes & projets form still exports.
  const { stage: _s, deadline: _d, models: _m, ...older } = request as StoredRequest & { stage?: string; deadline?: string; models?: string };
  assert(requestsToCsv([older as StoredRequest]).includes('"Atelier K"'));
  const { request: privateProject } = await persistRequest(store, validateRequest({ ...project, requestId: '4f2b8c1e-4a5d-4e6f-9a7b-1c2d3e4f5a6b' }, '2026-10-01'));
  assert.equal(notificationEmail(privateProject, 'x@y.ma').subject, 'Projet particulier (Rabat) — Nadia');
  assert(requestsToCsv([privateProject]).includes('"Une pièce ou toute la maison"'));
});

test('uses the Casablanca calendar date across midnight, year and Ramadan boundaries', () => {
  // Historical rules are stable across tzdata 2026b/2026c, which disagree on
  // Morocco’s October 2026 offset. Current dates must follow the runtime’s IANA data.
  for (const [instant, expected] of [
    ['2025-10-01T22:59:59.999Z', '2025-10-01'],
    ['2025-10-01T23:00:00Z', '2025-10-02'],
    ['2024-12-31T23:30:00Z', '2025-01-01'],
    ['2025-03-01T23:30:00Z', '2025-03-01'],
    ['2025-03-02T00:00:00Z', '2025-03-02'],
  ]) assert.equal(casablancaToday(new Date(instant)), expected, instant);
});

test('alerts go to the EmDash setting, then the secret, then the default', () => {
  assert.equal(notifyAddress(' showroom@cattelanitalia.ma ', 'secret@x.ma'), 'showroom@cattelanitalia.ma');
  assert.equal(notifyAddress('', 'secret@x.ma'), 'secret@x.ma');
  assert.equal(notifyAddress('pas-une-adresse', undefined), DEFAULT_NOTIFY_TO);
  assert.equal(notifyAddress(null, undefined), 'omar@kreedns.com');
});
