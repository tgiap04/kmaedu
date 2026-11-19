import { useMemo, useState } from "react";
import { filterRooms, roomListStats, toRoomRow, type RoomFilters } from "@/lib/exam-room/room-status";
import type { ExamRoom } from "@/types/examRoom";

export type RoomViewMode = "table" | "grid";

export const ROOMS_PER_PAGE = 10;

const NO_FILTERS: RoomFilters = { search: "", status: "all", created: "all" };

/**
 * The list page's view of every room it loaded: filters, the page shown and the rooms ticked.
 * Statuses are read at `now`, so they move on as sessions start and end without a reload.
 */
export function useExamRoomList(rooms: ExamRoom[], now: number) {
  const [filters, setFilters] = useState<RoomFilters>(NO_FILTERS);
  const [requestedPage, setPage] = useState(1);
  const [view, setView] = useState<RoomViewMode>("table");
  const [ticked, setTicked] = useState<ReadonlySet<string>>(() => new Set());

  const rows = useMemo(() => rooms.map((r) => toRoomRow(r, now)), [rooms, now]);
  const stats = useMemo(() => roomListStats(rows), [rows]);
  const filtered = useMemo(() => filterRooms(rows, filters, now), [rows, filters, now]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / ROOMS_PER_PAGE));
  const page = Math.min(requestedPage, totalPages);
  const pageRows = filtered.slice((page - 1) * ROOMS_PER_PAGE, page * ROOMS_PER_PAGE);

  // Only ticked rooms the user can see count: a room deleted elsewhere, or one the clock moved out of the filter
  // ("Đang diễn ra" that just ended), drops out, so a bulk delete never takes a room that is not on screen.
  const pageKey = pageRows.map((r) => r.id).join("|");
  const selected = useMemo(() => {
    const visible = new Set(pageKey.split("|"));
    return new Set([...ticked].filter((id) => visible.has(id)));
  }, [ticked, pageKey]);

  const changeFilters = (patch: Partial<RoomFilters>) => {
    setFilters((f) => ({ ...f, ...patch }));
    setPage(1);
    setTicked(new Set());
  };

  const toggle = (id: string) =>
    setTicked((prev) => {
      const next = new Set(prev);
      if (!next.delete(id)) next.add(id);
      return next;
    });

  const toggleAll = (checked: boolean) =>
    setTicked((prev) => {
      const next = new Set(prev);
      for (const r of pageRows) {
        if (checked) next.add(r.id);
        else next.delete(r.id);
      }
      return next;
    });

  return {
    stats,
    filters,
    changeFilters,
    filtered,
    pageRows,
    page,
    totalPages,
    // Another page drops the ticks as well.
    setPage: (next: number) => {
      setPage(next);
      setTicked(new Set());
    },
    view,
    setView,
    selected,
    toggle,
    toggleAll,
    clearSelection: () => setTicked(new Set()),
  };
}
