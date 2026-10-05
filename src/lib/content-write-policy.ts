/**
 * EmDash 0.41 stages a slug only when an update also carries data/references.
 * Keep permanent page identities behind the normal draft + publication policy.
 * This is a request guard, not an authentication or authorization replacement.
 */
const protectedCollections = new Set(['pages', 'site_content']);
const asRecord = (value: unknown): Record<string, unknown> | null =>
  value !== null && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : null;

export function protectedUpdateProblem(collection: unknown, payload: unknown, transport: 'rest' | 'mcp'): string | null {
  if (typeof collection !== 'string' || !protectedCollections.has(collection)) return null;
  const body = asRecord(payload);
  if (!body) return null; // Native schema validation owns malformed bodies.
  if (transport === 'rest' && Object.hasOwn(body, 'status')) {
    return 'Utilisez les actions natives publier / dépublier. Le statut d’une page permanente ne se modifie pas par une mise à jour générique.';
  }
  if (Object.hasOwn(body, 'slug') && !asRecord(body.data) && !asRecord(body.references)) {
    return 'Un changement d’identifiant doit passer par un brouillon. Envoyez aussi data: {} (ou les champs modifiés), puis utilisez la publication native ; les identifiants permanents restent protégés.';
  }
  return null;
}

export type WriteTarget = { transport: 'rest'; collection: string } | { transport: 'mcp' };
export function contentWriteTarget(pathname: string, method: string): WriteTarget | null {
  let segments: string[];
  try { segments = pathname.replace(/\/$/u, '').split('/').map(part => decodeURIComponent(part)); }
  catch { return null; }
  if (segments[0] !== '' || segments[1] !== '_emdash' || segments[2] !== 'api') return null;
  if (method === 'PUT' && segments[3] === 'content' && segments.length === 6 && protectedCollections.has(segments[4])) {
    return { transport: 'rest', collection: segments[4] };
  }
  return method === 'POST' && segments.length === 4 && segments[3] === 'mcp' ? { transport: 'mcp' } : null;
}

type RpcError = { jsonrpc: '2.0'; id: string | number | null; error: { code: number; message: string } };
export function mcpWriteRefusal(body: unknown): { errors: RpcError | RpcError[] | null } | null {
  const batch = Array.isArray(body);
  const messages = batch ? body : [body];
  const reasons = messages.map(message => {
    const rpc = asRecord(message), params = asRecord(rpc?.params);
    if (rpc?.jsonrpc !== '2.0' || rpc.method !== 'tools/call' || params?.name !== 'content_update') return null;
    const args = asRecord(params.arguments);
    return protectedUpdateProblem(args?.collection, args, 'mcp');
  });
  if (!reasons.some(Boolean)) return null;
  // Reject the complete batch before any call executes. Return an error for
  // every request, never a response to a JSON-RPC notification.
  const errors: RpcError[] = [];
  for (const [index, message] of messages.entries()) {
    const rpc = asRecord(message);
    if (!rpc || !Object.hasOwn(rpc, 'id')) continue;
    errors.push({ jsonrpc: '2.0', id: typeof rpc.id === 'string' || typeof rpc.id === 'number' ? rpc.id : null,
      error: { code: reasons[index] ? -32602 : -32000, message: reasons[index] || 'Ce lot contient une modification d’identifiant non protégée. Aucun appel n’a été exécuté. Renvoyez les appels valides séparément.' } });
  }
  return { errors: errors.length ? batch ? errors : errors[0] : null };
}

const responseHeaders = { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'private, no-store' };

/** Read a clone with the same size limits as the native REST/MCP entrypoints. */
async function readJson(request: Request, max: number): Promise<{ tooLarge: boolean; value?: unknown }> {
  if (Number(request.headers.get('content-length')) > max) return { tooLarge: true };
  const stream = request.clone().body;
  if (!stream) return { tooLarge: false };
  const reader = stream.getReader(), decoder = new TextDecoder();
  let size = 0, text = '';
  try {
    for (;;) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.byteLength;
      if (size > max) { void reader.cancel().catch(() => {}); return { tooLarge: true }; }
      text += decoder.decode(value, { stream: true });
    }
    try { return { tooLarge: false, value: JSON.parse(text + decoder.decode()) }; }
    catch { return { tooLarge: false }; } // Native parser returns its own JSON error.
  } finally { reader.releaseLock(); }
}

export async function guardContentWrite(request: Request): Promise<Response | null> {
  const target = contentWriteTarget(new URL(request.url).pathname, request.method);
  if (!target) return null;
  let body: Awaited<ReturnType<typeof readJson>>;
  try { body = await readJson(request, target.transport === 'mcp' ? 4 * 1024 * 1024 : 10 * 1024 * 1024); }
  catch { return null; }
  if (body.tooLarge) return new Response(JSON.stringify(target.transport === 'mcp'
    ? { jsonrpc: '2.0', id: null, error: { code: -32000, message: 'Request body too large' } }
    : { success: false, error: { code: 'PAYLOAD_TOO_LARGE', message: 'Request body too large' } }), { status: 413, headers: responseHeaders });
  if (target.transport === 'rest') {
    const message = protectedUpdateProblem(target.collection, body.value, 'rest');
    return message ? new Response(JSON.stringify({ success: false, error: { code: 'VALIDATION_ERROR', message } }), { status: 400, headers: responseHeaders }) : null;
  }
  const refusal = mcpWriteRefusal(body.value);
  if (!refusal) return null;
  return new Response(refusal.errors ? JSON.stringify(refusal.errors) : null, { status: refusal.errors ? 400 : 202, headers: responseHeaders });
}
