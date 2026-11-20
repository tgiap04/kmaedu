import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Loads one page at a time through a cached store fetcher; `failed` drives the retry message.
 * Only the latest request writes: a slower answer for a page the user already left is dropped.
 */
export function usePagedList<T>(fetchPage: (page: number) => Promise<T>) {
  const [page, setPage] = useState(1);
  const [data, setData] = useState<T | null>(null);
  const [failed, setFailed] = useState(false);
  const latest = useRef(0);

  const load = useCallback(
    async (target: number) => {
      const request = ++latest.current;
      setFailed(false);
      try {
        const result = await fetchPage(target);
        if (request === latest.current) setData(result);
      } catch {
        if (request === latest.current) setFailed(true);
      }
    },
    [fetchPage],
  );

  useEffect(() => {
    void load(page);
  }, [page, load]);

  return { page, setPage, data, setData, failed, reload: () => load(page) };
}
