/** Shared list behavior for the two private operations panels. */
export type RecordPage<T> = { items: T[]; cursor?: string; hasMore: boolean };
type Identified = { requestId: string };

/** Search accents and multiple words consistently, without interpreting input as a pattern. */
export function matchesRecordSearch(query: string, values: unknown[]): boolean {
  const normalize = (value: string) => value.normalize("NFD").replace(/\p{M}/gu, "").toLocaleLowerCase("fr");
  const terms = normalize(query).trim().split(/\s+/u).filter(Boolean);
  const haystack = normalize(values.filter(value => typeof value === "string").join(" "));
  return terms.every(term => haystack.includes(term));
}

export function mergeRecordPages<T extends Identified>(previous: T[], incoming: T[]): T[] {
  const records = new Map(previous.map(item => [item.requestId, item]));
  for (const item of incoming) records.set(item.requestId, item);
  return [...records.values()];
}

/** Rebuild a loaded window from fresh cursors after a deletion or refresh. Native
 * storage cursors refer to a row, so a cursor cannot survive deleting that row. */
export async function readRecordWindow<T extends Identified>(
  fetchPage: (cursor?: string) => Promise<RecordPage<T>>,
  minimum = 1,
  startCursor?: string,
): Promise<RecordPage<T>> {
  const seen = new Set<string>();
  if (startCursor) seen.add(startCursor);
  let cursor = startCursor;
  let items: T[] = [];
  for (let pageNumber = 0; pageNumber < 200; pageNumber++) {
    const page = await fetchPage(cursor);
    items = mergeRecordPages(items, page.items);
    if (!page.hasMore) return { items, hasMore: false };
    if (!page.cursor || seen.has(page.cursor)) throw new Error("La pagination a changé. Actualisez la liste pour réessayer.");
    seen.add(page.cursor);
    cursor = page.cursor;
    if (items.length >= minimum) return { items, hasMore: true, cursor };
  }
  throw new Error("Trop de pages à actualiser. Rechargez le panneau pour reprendre depuis les demandes récentes.");
}
