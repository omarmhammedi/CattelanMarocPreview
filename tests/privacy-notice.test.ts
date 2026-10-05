import assert from 'node:assert/strict';
import test from 'node:test';
import { privacyNotice } from '../src/lib/privacy.ts';
import { applyCndpReceipt, field, planCndpReceipt } from '../scripts/migrations/0017-cndp-receipt.mjs';

test('the form notice names the controller, purpose, retention and rights', () => {
  const text = privacyNotice('rendez-vous', 'contact@cattelanitalia.ma');
  assert.match(text, /^Racha Home traite ces informations pour organiser votre rendez-vous et les conserve trois ans\./u);
  assert.match(text, /loi n° 09-08.*contact@cattelanitalia\.ma\.$/u);
  assert.doesNotMatch(text, /CNDP/u, 'no receipt claimed before it exists');
  assert.match(privacyNotice('pro', 'a@b.ma', ' D-123/2026 '), /déclaré à la CNDP sous le n° D-123\/2026\.$/u);
});

test('migration 0017 adds the receipt field once', async () => {
  const fields = [{ slug: 'public_email', type: 'string' }];
  const api = async (path: string, options: { method?: string; data?: unknown } = {}) => {
    if (options.method === 'POST') { fields.push(options.data as never); return {}; }
    return { item: { fields } };
  };
  await applyCndpReceipt(api, await planCndpReceipt(api));
  assert.equal(fields.at(-1), field);
  assert.equal((await planCndpReceipt(api)).addField, null);
  fields[1] = { slug: 'cndp_receipt', type: 'boolean' };
  await assert.rejects(planCndpReceipt(api), /another type/u);
});

test('privacy uses current CMS facts and the enabled processors without mutating the legal draft', async () => {
  const {privacyFacts, renderPrivacyContent, retentionLabel} = await import('../src/lib/privacy.ts');
  const {PRIVACY_PAGE, validatePrivacyContent} = await import('../src/lib/privacy-content.mjs');
  const before = structuredClone(PRIVACY_PAGE.data.content);
  assert.equal(validatePrivacyContent(before), null);
  const site = {publicEmail: 'rights@example.ma', address: 'Nouvelle adresse, Casablanca', cndpReceipt: 'D-123', analyticsToken: 'configured', editorial: {privacy_controller_name: 'Le responsable', privacy_controller: 'Le responsable, société au Maroc.', privacy_updated_label: '5 octobre 2026'}};
  const facts = privacyFacts(site, true);
  const rendered = renderPrivacyContent(before, facts) as any[];
  const text = rendered.flatMap(block => block.children.map((span: any) => span.text)).join(' ');
  assert.match(text, /Nouvelle adresse, Casablanca/u);
  assert.match(text, /rights@example\.ma/u);
  assert.match(text, /Resend pour l’envoi des e-mails/u);
  assert.match(text, /récépissé n° D-123/u);
  assert.match(text, /5 octobre 2026/u);
  assert.doesNotMatch(text, /\{\{|contact@cattelanitalia\.ma|Racha Home/u);
  assert.equal(facts.retention, retentionLabel());
  assert(rendered.some(block => block.markDefs.some((mark: any) => mark.href === 'mailto:rights@example.ma')));
  assert.deepEqual(PRIVACY_PAGE.data.content, before, 'rendering cannot edit the saved legal template');
  const disabled = privacyFacts({publicEmail: 'rights@example.ma'}, false);
  assert.doesNotMatch(disabled.processors, /Resend|audience/u);
  assert.equal(disabled.catalogue_email_purpose, '');
  const alertsOnly = privacyFacts(site, true, false);
  assert.match(alertsOnly.processors, /Resend/u);
  assert.equal(alertsOnly.catalogue_email_purpose, '', 'notification emails alone do not promise catalogue delivery');
  assert.match(disabled.cndp_notice, /en cours d’enregistrement/u);
  assert.equal(privacyNotice('pro', 'rights@example.ma', '', 'Le responsable').startsWith('Le responsable traite'), true);
});

test('legal edits preserve mandatory dynamic facts and never interpolate arbitrary attributes', async () => {
  const {renderPrivacyContent} = await import('../src/lib/privacy.ts');
  const {PRIVACY_PAGE, validatePrivacyContent} = await import('../src/lib/privacy-content.mjs');
  assert.match(validatePrivacyContent([])!, /informations légales/u);
  const missing = structuredClone(PRIVACY_PAGE.data.content).filter(block => block._key !== 'privacy-cookies');
  assert.match(validatePrivacyContent(missing)!, /analytics_notice/u);
  const split = structuredClone(PRIVACY_PAGE.data.content) as any[];
  const cookies = split.find(block => block._key === 'privacy-cookies')!;
  cookies.children = [{_type: 'span', _key: 'a', text: '{{analytics_', marks: []}, {_type: 'span', _key: 'b', text: 'notice}}', marks: ['strong']}];
  assert.match(validatePrivacyContent(split)!, /un seul segment/u);
  const unknown = structuredClone(PRIVACY_PAGE.data.content);
  unknown[0].children[0].text = '{{unrecognised}}';
  assert.match(validatePrivacyContent(unknown)!, /inconnue/u);
  const content = [{_type: 'block', children: [{_type: 'span', text: '{{contact_email}}', marks: []}], markDefs: [{_type: 'link', href: 'https://example.ma/{{contact_email}}'}, {_type: 'link', href: 'mailto:{{contact_email}}'}]}];
  const [rendered] = renderPrivacyContent(content, {contact_email: '<img src=x onerror=alert(1)>'}) as any[];
  assert.equal(rendered.children[0].text, '<img src=x onerror=alert(1)>', 'rich text remains plain text, not HTML');
  assert.equal(rendered.markDefs[0].href, 'https://example.ma/{{contact_email}}', 'custom link destinations are never templated');
  assert.equal(rendered.markDefs[1].href, '/showroom-casablanca/#showroom-contact', 'invalid email cannot become a link destination');
});
