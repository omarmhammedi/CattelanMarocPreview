import type { PluginContext } from 'emdash';
type EmailMessage = Parameters<NonNullable<PluginContext['email']>['send']>[0];

const FROM = 'Cattelan Italia Maroc <cattelan@client.kreedns.com>';
const REPLY_TO = 'cattelan@client.kreedns.com';

/** Server-only transport: secrets and message bodies are never logged. */
export async function deliverEmail(message: EmailMessage, apiKey: string | undefined, request: typeof fetch = fetch): Promise<void> {
  if (!apiKey?.startsWith('re_')) throw new Error('Resend email is not configured.');
  const body = JSON.stringify({
    from: FROM, to: [message.to], subject: message.subject, text: message.text,
    ...(message.html ? { html: message.html } : {}),
    ...(message.cc?.length ? { cc: message.cc } : {}),
    reply_to: message.replyTo || REPLY_TO,
  });
  // An identical retry must not send a second copy, including after an ambiguous timeout.
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(body));
  const key = 'cattelan-' + Array.from(new Uint8Array(digest), n => n.toString(16).padStart(2, '0')).join('');
  let response: Response;
  try {
    response = await request('https://api.resend.com/emails', {
      method: 'POST', redirect: 'error', signal: AbortSignal.timeout(10_000),
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json', 'Idempotency-Key': key },
      body,
    });
  } catch {
    throw new Error('Resend email delivery could not be confirmed.');
  }
  // Provider responses can include recipient details; expose only the HTTP status.
  if (!response.ok) throw new Error(`Resend email delivery failed (HTTP ${response.status}).`);
  const result = await response.json().catch(() => null) as { id?: unknown } | null;
  if (typeof result?.id !== 'string' || !result.id) throw new Error('Resend did not confirm email acceptance.');
}
