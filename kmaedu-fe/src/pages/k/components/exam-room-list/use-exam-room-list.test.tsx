// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { ExamRoom } from "@/types/examRoom";
import { useExamRoomList } from "./use-exam-room-list";

const NOW = new Date("2026-11-16T14:30:00").getTime();
const live = [{ startTime: new Date("2026-11-16T14:00").toISOString(), endTime: new Date("2026-11-16T15:00").toISOString() }];
const room = (i: number, over: Partial<ExamRoom> = {}): ExamRoom => ({
  id: `r${i}`,
  title: `Phòng ${i}`,
  quizSetId: "q",
  hostId: "h",
  createdAt: new Date("2026-11-16T08:00").toISOString(),
  updatedAt: "",
  participantCount: 2,
  ...over,
});
const many = (n: number) => Array.from({ length: n }, (_, i) => room(i + 1));

describe("useExamRoomList", () => {
  it("pages ten rooms at a time and counts every room for the stats", () => {
    const { result } = renderHook(() => useExamRoomList(many(23), NOW));
    expect(result.current.pageRows).toHaveLength(10);
    expect(result.current.totalPages).toBe(3);
    expect(result.current.stats).toMatchObject({ total: 23, participants: 46 });
    act(() => result.current.setPage(3));
    expect(result.current.pageRows.map((r) => r.id)).toEqual(["r21", "r22", "r23"]);
  });

  it("goes back to page one and forgets the selection when a filter changes", () => {
    const { result } = renderHook(() => useExamRoomList([...many(12), room(99, { sessionWindows: live })], NOW));
    act(() => result.current.setPage(2));
    act(() => result.current.toggle("r11"));
    act(() => result.current.changeFilters({ status: "ongoing" }));
    expect(result.current.page).toBe(1);
    expect(result.current.selected.size).toBe(0);
    expect(result.current.filtered.map((r) => r.id)).toEqual(["r99"]);
  });

  it("forgets the selection on another page, so a delete only takes rooms the user can see", () => {
    const { result } = renderHook(() => useExamRoomList(many(12), NOW));
    act(() => result.current.toggle("r1"));
    act(() => result.current.setPage(2));
    expect(result.current.selected.size).toBe(0);
  });

  it("never counts a ticked room that the clock moved out of the filter", () => {
    const soon = [{ startTime: new Date(NOW + 60_000).toISOString(), endTime: new Date(NOW + 3_600_000).toISOString() }];
    const rooms = [room(1, { sessionWindows: soon }), room(2, { sessionWindows: live })];
    const { result, rerender } = renderHook(({ now }) => useExamRoomList(rooms, now), { initialProps: { now: NOW } });
    act(() => result.current.changeFilters({ status: "upcoming" }));
    act(() => result.current.toggle("r1"));
    expect([...result.current.selected]).toEqual(["r1"]);
    rerender({ now: NOW + 120_000 }); // r1 has started: it is no longer "upcoming", so it left the page
    expect(result.current.pageRows.map((r) => r.id)).toEqual([]);
    expect(result.current.selected.size).toBe(0);
  });

  it("selects and clears only the rooms on the page with the header box", () => {
    const { result } = renderHook(() => useExamRoomList(many(12), NOW));
    act(() => result.current.toggleAll(true));
    expect([...result.current.selected]).toHaveLength(10);
    act(() => result.current.toggle("r1"));
    expect(result.current.selected.has("r1")).toBe(false);
    act(() => result.current.toggleAll(false));
    expect(result.current.selected.size).toBe(0);
  });

  it("drops deleted rooms from the selection and keeps the page in range when the list shrinks", () => {
    const { result, rerender } = renderHook(({ rooms }) => useExamRoomList(rooms, NOW), { initialProps: { rooms: many(11) } });
    act(() => result.current.setPage(2));
    act(() => result.current.toggle("r11"));
    act(() => result.current.toggle("r2"));
    rerender({ rooms: many(10) });
    expect(result.current.page).toBe(1);
    expect([...result.current.selected]).toEqual(["r2"]);
  });
});
