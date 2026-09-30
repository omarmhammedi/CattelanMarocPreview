/** Accept a Google Maps share/embed URL, never arbitrary iframe markup or origins. */
export function normalizeGoogleMapsEmbedUrl(value: unknown): string {
  if (typeof value !== 'string' || /[\u0000-\u001f\u007f]/.test(value)) return '';
  const input = value.trim();
  if (!input || input.length > 8192) return '';

  try {
    const url = new URL(input);
    if (url.protocol !== 'https:' || url.hostname !== 'www.google.com' || url.port ||
        url.username || url.password || url.pathname !== '/maps/embed' || url.hash) return '';
    const parameters = [...url.searchParams.entries()];
    if (parameters.length !== 1 || parameters[0][0] !== 'pb' || !parameters[0][1].startsWith('!') ||
        parameters[0][1].length < 2) return '';
    return url.href;
  } catch {
    return '';
  }
}
