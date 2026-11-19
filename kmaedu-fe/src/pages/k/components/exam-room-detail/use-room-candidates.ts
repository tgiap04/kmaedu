import { useCallback, useEffect, useRef, useState } from "react";
import { getRoomCandidatesApi, type RoomCandidate, type RoomCandidatesQuery } from "@/apis/examAttemptApi";
import { useDebounce } from "@/hooks/useDebounce";
import { useLiveRefresh } from "@/hooks/useLiveRefresh";
import { createReadGate } from "@/lib/read-gate";

export const CANDIDATES_PER_PAGE = 10;

/** Same pace as the room's progress card. */
const LIVE_REFRESH_MS = 30_000;

export interface CandidateFilters {
  search: string;
  status: "all" | "submitted" | "in_progress" | "not_started";
  result: "all" | "passed" | "failed";
}

const NO_FILTERS: CandidateFilters = { search: "", status: "all", result: "all" };

/** The query for a page under these filters: "all" and a blank search are left out. */
export function candidatesQuery(filters: CandidateFilters, page: number, limit = CANDIDATES_PER_PAGE): RoomCandidatesQuery {
  const search = filters.search.trim();
  return {
    page,
    limit,
    ...(search && { search }),
    ...(filters.status !== "all" && { status: filters.status }),
    ...(filters.result !== "all" && { result: filters.result }),
  };
}

/**
 * One page of the room's candidates under the chosen filters. Typing in the search waits `searchDelay` ms;
 * a read a newer one replaced never lands. A failed read keeps the rows shown and sets `failed`. While `live`,
 * the page is read again every 30 seconds.
 */
export function useRoomCandidates(roomId: string, { live = false, searchDelay = 400 }: { live?: boolean; searchDelay?: number } = {}) {
  const [filters, setFilters] = useState<CandidateFilters>(NO_FILTERS);
  const [page, setPage] = useState(1);
  const [rows, setRows] = useState<RoomCandidate[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const gate = useRef(createReadGate()).current;
  /** The next read is a background refresh: keep the table as it is (no dimming) while it runs. */
  const quiet = useRef(false);
  const search = useDebounce(filters.search, searchDelay);

  useEffect(() => {
    const token = gate.begin();
    if (!quiet.current) setLoading(true);
    quiet.current = false;
    getRoomCandidatesApi(roomId, candidatesQuery({ search, status: filters.status, result: filters.result }, page))
      .then((res) => {
        if (!gate.isCurrent(token)) return;
        setRows(res.candidates);
        setTotal(res.total);
        setTotalPages(Math.max(1, res.totalPages));
        setFailed(false);
      })
      .catch((error) => {
        console.error("Failed to load candidates:", error);
        if (gate.isCurrent(token)) setFailed(true);
      })
      .finally(() => {
        gate.end(token);
        if (gate.isCurrent(token)) setLoading(false);
      });
    // The search applies through its debounced copy; the other filters at once.
  }, [roomId, search, filters.status, filters.result, page, attempt, gate]);

  const reload = useCallback(() => setAttempt((n) => n + 1), []);
  const refresh = useCallback(() => {
    quiet.current = true;
    setAttempt((n) => n + 1);
  }, []);

  // A running room moves on its own (people start and hand in): keep the page in step with the progress card.
  useLiveRefresh(live, refresh, LIVE_REFRESH_MS);

  const changeFilters = useCallback((patch: Partial<CandidateFilters>) => {
    setFilters((f) => ({ ...f, ...patch }));
    setPage(1);
  }, []);

  return {
    rows,
    total,
    totalPages,
    page,
    setPage,
    filters,
    changeFilters,
    loading,
    failed,
    reload,
    /** The applied filters (search as debounced), for an export of every page. */
    applied: { ...filters, search },
  };
}
