import { useCallback, useEffect, useMemo, useState } from "react";
import { useFlashcardSetStore } from "@/stores/useFlashcardSetStore";
import { useStatsStore } from "@/stores/useStatsStore";
import { useDebounce } from "@/hooks/useDebounce";
import { pageAfterDelete, pageInRange, searchTerm, type SortKey } from "./flashcard-list-logic";
import type { FlashcardRow } from "./flashcard-row";

export const PAGE_SIZE = 10;

export const SORT_OPTIONS: { value: SortKey; label: string }[] = [
  { value: "recent", label: "Mới nhất" },
  { value: "name", label: "Tên A-Z" },
  { value: "cards", label: "Số thẻ" },
  { value: "views", label: "Lượt xem" },
];

export const STATUS_OPTIONS = [
  { value: "all", label: "Tất cả trạng thái" },
  { value: "public", label: "Công khai" },
  { value: "private", label: "Riêng tư" },
];

/** Server-paged list with debounced search, a status filter and a server-side sort (every page follows it). */
export function useFlashcardListData() {
  const { flashcardSetsK, loading, fetchFlashcardSets } = useFlashcardSetStore();
  const { flashcardStats, fetchFlashcardStats } = useStatsStore();

  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortKey>("recent");
  const [statusFilter, setStatusFilter] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalResults, setTotalResults] = useState(0);
  const [reloadKey, setReloadKey] = useState(0);
  /** The skeleton shows only until the first answer; later loads keep the toolbar (and the search focus) in place. */
  const [firstLoadDone, setFirstLoadDone] = useState(false);
  const [failed, setFailed] = useState(false);
  const term = searchTerm(useDebounce(searchQuery, 500));
  // A new search starts again from page 1, in the same render, so only one read goes out.
  const [termShown, setTermShown] = useState(term);
  if (term !== termShown) {
    setTermShown(term);
    setCurrentPage(1);
  }

  useEffect(() => {
    fetchFlashcardStats();
  }, [fetchFlashcardStats]);

  useEffect(() => {
    let stale = false;
    const isPublic = statusFilter === "public" ? true : statusFilter === "private" ? false : undefined;
    fetchFlashcardSets({ page: currentPage, limit: PAGE_SIZE, search: term, isPublic, sort: sortBy })
      .then((response) => {
        if (!response || stale) return;
        setTotalResults(response.total);
        setFailed(false);
        // Sets deleted elsewhere can leave this page past the end: show the last page instead of "no sets".
        const page = pageInRange(currentPage, response.total, PAGE_SIZE);
        if (page !== currentPage) setCurrentPage(page);
      })
      .catch(() => {
        if (!stale) setFailed(true); // the store already toasted the error
      })
      .finally(() => {
        if (!stale) setFirstLoadDone(true);
      });
    return () => {
      stale = true;
    };
  }, [currentPage, term, statusFilter, sortBy, reloadKey, fetchFlashcardSets]);

  const rows: FlashcardRow[] = useMemo(
    () =>
      flashcardSetsK.map((set) => ({
        id: set.id,
        name: set.title,
        description: set.description || "",
        cardCount: set._count?.detailsFlashCard || 0,
        viewCount: set.viewCount || 0,
        isPublic: set.isPublic,
        isPinned: set.isPinned,
        createdDate: new Date(set.createdAt).toLocaleDateString("vi-VN"),
        createdAt: set.createdAt,
        tags: set.tags || [],
      })),
    [flashcardSetsK],
  );

  // null until the stats are in (or when they failed): the tiles show a dash, not a false 0.
  const stats = useMemo(
    () =>
      flashcardStats
        ? { totalGroups: flashcardStats.totalGroups || 0, totalCards: flashcardStats.totalCards || 0, totalViews: flashcardStats.totalViews || 0 }
        : null,
    [flashcardStats],
  );

  // A new filter starts again from page 1 (a new search does so once it is typed, above).
  const changeSearch = useCallback((value: string) => setSearchQuery(value), []);
  const changeStatus = useCallback((value: string) => {
    setStatusFilter(value);
    setCurrentPage(1);
  }, []);
  const changeSort = useCallback((value: SortKey) => {
    setSortBy(value);
    setCurrentPage(1);
  }, []);

  /** After a delete: step back when the page just emptied, otherwise load it again (the total changed). */
  const afterDelete = useCallback(() => {
    const next = pageAfterDelete(flashcardSetsK.length, currentPage);
    if (next.reload) setReloadKey((k) => k + 1);
    else setCurrentPage(next.page);
  }, [flashcardSetsK.length, currentPage]);
  const retry = useCallback(() => {
    setFailed(false); // the retry shows the loading state, not the old error
    setReloadKey((k) => k + 1);
  }, []);

  return {
    rows,
    stats,
    loading,
    firstLoadDone,
    failed,
    retry,
    totalResults,
    totalPages: Math.ceil(totalResults / PAGE_SIZE),
    currentPage,
    setCurrentPage,
    searchQuery,
    changeSearch,
    statusFilter,
    changeStatus,
    sortBy,
    changeSort,
    afterDelete,
  };
}
