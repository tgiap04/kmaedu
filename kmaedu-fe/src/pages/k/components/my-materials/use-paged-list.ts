import { useCallback, useEffect, useState } from "react";

/** Loads one page at a time through a cached store fetcher; `failed` drives the retry message. */
export function usePagedList<T>(fetchPage: (page: number) => Promise<T>) {
  const [page, setPage] = useState(1);
  const [data, setData] = useState<T | null>(null);
  const [failed, setFailed] = useState(false);

  const load = useCallback(
    async (target: number) => {
      setFailed(false);
      try {
        setData(await fetchPage(target));
      } catch {
        setFailed(true);
      }
    },
    [fetchPage],
  );

  useEffect(() => {
    void load(page);
  }, [page, load]);

  return { page, setPage, data, setData, failed, reload: () => load(page) };
}
