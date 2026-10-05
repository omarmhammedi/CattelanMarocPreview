import * as React from "react";
import { apiFetch, parseApiResponse } from "emdash/plugin-utils";
import { mergeRecordPages, readRecordWindow, type RecordPage } from "./admin-records.ts";

export function useAdminRecords<T extends { requestId: string }>(path: string) {
  const [items, setItems] = React.useState<T[]>([]);
  const [hasMore, setHasMore] = React.useState(false);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState("");
  const itemsRef = React.useRef<T[]>([]);
  const cursor = React.useRef<string | undefined>(undefined);
  const pending = React.useRef<AbortController | null>(null);
  const mounted = React.useRef(false);
  const seenCursors = React.useRef(new Set<string>());

  const load = React.useCallback(async (append: boolean) => {
    if (!mounted.current) return;
    if (append && !cursor.current) return;
    pending.current?.abort();
    const controller = new AbortController();
    pending.current = controller;
    const firstCursor = append ? cursor.current : undefined;
    const minimum = append ? 1 : Math.max(1, itemsRef.current.length);
    if (!append) { cursor.current = undefined; seenCursors.current.clear(); setHasMore(false); }
    setLoading(true); setError("");
    try {
      const page = await readRecordWindow<T>(async (next) => {
        const result = await apiFetch(`${path}${next ? `?cursor=${encodeURIComponent(next)}` : ""}`, { signal: controller.signal });
        return parseApiResponse<RecordPage<T>>(result, "Impossible de charger les demandes.");
      }, minimum, firstCursor);
      if (controller.signal.aborted || pending.current !== controller) return;
      if (page.cursor && seenCursors.current.has(page.cursor)) {
        cursor.current = undefined; setHasMore(false);
        throw new Error("La pagination a changé. Actualisez la liste pour réessayer.");
      }
      if (page.cursor) seenCursors.current.add(page.cursor);
      const nextItems = append ? mergeRecordPages(itemsRef.current, page.items) : page.items;
      itemsRef.current = nextItems; setItems(nextItems);
      cursor.current = page.cursor; setHasMore(page.hasMore);
    } catch (cause) {
      if (!controller.signal.aborted && pending.current === controller) setError(cause instanceof Error ? cause.message : "Une erreur est survenue.");
    } finally {
      if (!controller.signal.aborted && pending.current === controller) setLoading(false);
    }
  }, [path]);
  React.useEffect(() => { mounted.current = true; void load(false); return () => { mounted.current = false; pending.current?.abort(); }; }, [load]);

  const removeLocal = (id: string) => {
    itemsRef.current = itemsRef.current.filter(item => item.requestId !== id);
    setItems(itemsRef.current);
  };
  return { items, hasMore, loading, error, setError, refresh: () => load(false), loadMore: () => load(true), removeLocal };
}
