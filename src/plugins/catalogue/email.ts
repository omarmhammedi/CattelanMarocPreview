import { LEASE_MS, signDownload, type AtomicStore, type Lead } from './core.ts';

const RETRY_WINDOW_MS = 6 * 60 * 60_000;
const escapeHtml = (value: string) => value.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

export async function catalogueEmail(lead: Lead, origin: string, secret: string) {
  const url = new URL('/_emdash/api/plugins/catalogue-leads/download', origin);
  url.searchParams.set('token', await signDownload(lead.requestId, secret, lead.createdAt, 'email'));
  const note = lead.catalogue.placeholder ? 'Ce PDF est un catalogue de démonstration pour la prévisualisation du site.' : '';
  return {
    to: lead.email,
    subject: `Votre catalogue — Cattelan Italia Maroc`,
    text: `Bonjour ${lead.name},\n\nVoici le catalogue que vous avez demandé : ${lead.catalogue.title}.\n\nTélécharger le PDF : ${url}\n\nCe lien est valable 24 heures à partir de votre demande. S’il expire, vous pouvez refaire une demande sur ${new URL('/catalogue/', origin)}\n\n${note}\n\nCet e-mail répond uniquement à votre demande de catalogue et ne vous inscrit pas à des communications commerciales.\n\nCattelan Italia Maroc`,
    html: `<div lang="fr" style="font:16px Arial,sans-serif;line-height:1.6;max-width:600px;margin:auto;color:#292722"><h1 style="font-size:24px">Votre catalogue Cattelan Italia</h1><p>Bonjour ${escapeHtml(lead.name)},</p><p>Voici le catalogue que vous avez demandé : ${escapeHtml(lead.catalogue.title)}.</p><p><a href="${escapeHtml(url.toString())}" style="display:inline-block;padding:14px 22px;background:#292722;color:#fff;text-decoration:none">Télécharger le PDF</a></p><p>Ce lien est valable 24 heures à partir de votre demande. Vous pourrez ensuite <a href="${escapeHtml(new URL('/catalogue/', origin).toString())}">refaire une demande</a>.</p>${note ? `<p>${escapeHtml(note)}</p>` : ''}<p style="font-size:12px;color:#666">Cet e-mail répond uniquement à votre demande de catalogue et ne vous inscrit pas à des communications commerciales.</p></div>`,
  };
}

/** A bounded durable outbox, created only for new requests after email is enabled. */
export async function dispatchCatalogueEmail(store: AtomicStore<Lead>, id: string, send: (lead: Lead) => Promise<void>, now = Date.now()): Promise<'skipped' | 'sent' | 'pending' | 'failed'> {
  const current = await store.getVersioned(id);
  if (!current || !['pending', 'processing'].includes(current.value.emailStatus || '')) return 'skipped';
  const lead = current.value;
  if ((lead.emailNextAttemptAt || 0) > now || (lead.emailLeaseUntil || 0) > now) return 'skipped';
  if (now >= lead.createdAt + RETRY_WINDOW_MS || (lead.emailAttempts || 0) >= 8) {
    await store.compareAndSet(id, current.revision, { ...lead, emailStatus: 'failed', emailLeaseId: null, emailLeaseUntil: 0 });
    return 'failed';
  }
  const leaseId = crypto.randomUUID();
  const attempts = (lead.emailAttempts || 0) + 1;
  const claimed: Lead = { ...lead, emailStatus: 'processing', emailAttempts: attempts, emailLeaseId: leaseId, emailLeaseUntil: now + LEASE_MS };
  if (!(await store.compareAndSet(id, current.revision, claimed)).applied) return 'skipped';
  let status: 'sent' | 'pending' = 'sent';
  try { await send(claimed); } catch { status = 'pending'; }
  // A concurrent CRM update must not erase the email result, or vice versa.
  for (let attempt = 0; attempt < 4; attempt++) {
    const latest = await store.getVersioned(id);
    if (!latest || latest.value.emailLeaseId !== leaseId) return 'skipped';
    if ((await store.compareAndSet(id, latest.revision, {
      ...latest.value, emailStatus: status, emailLeaseId: null, emailLeaseUntil: 0,
      emailNextAttemptAt: now + Math.min(60 * 60_000, 60_000 * 2 ** (attempts - 1)),
      emailSentAt: status === 'sent' ? now : null,
    })).applied) return status;
  }
  return 'pending';
}
