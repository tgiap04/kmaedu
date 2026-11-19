// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { RoomCandidatesQuery, RoomCandidatesResponse } from "@/apis/examAttemptApi";

vi.mock("@/apis/examAttemptApi", () => ({ getRoomCandidatesApi: vi.fn() }));

const { getRoomCandidatesApi } = await import("@/apis/examAttemptApi");
const { useRoomCandidates } = await import("./use-room-candidates");

const reply = (q: RoomCandidatesQuery, total = 25): RoomCandidatesResponse => ({
  candidates: [{ userId: `${q.search ?? ""}-${q.status ?? "all"}-p${q.page}`, user: null, status: "submitted", attemptId: null, sessionId: null, startedAt: null, finishedAt: null, score: null, passed: null, timeSpentSeconds: null, attemptCount: 1 }],
  total,
  page: q.page,
  limit: q.limit,
  totalPages: Math.ceil(total / q.limit),
});

beforeEach(() => {
  vi.mocked(getRoomCandidatesApi).mockReset();
  vi.mocked(getRoomCandidatesApi).mockImplementation(async (_id, q) => reply(q));
});

afterEach(() => vi.useRealTimers());

describe("useRoomCandidates", () => {
  it("reads the page again every 30 seconds while the room is live, and not otherwise", async () => {
    vi.useFakeTimers({ toFake: ["setInterval", "clearInterval"] });
    const { rerender } = renderHook(({ live }) => useRoomCandidates("r1", { searchDelay: 0, live }), { initialProps: { live: true } });
    await waitFor(() => expect(getRoomCandidatesApi).toHaveBeenCalledTimes(1));
    await act(async () => vi.advanceTimersByTime(30_000));
    await waitFor(() => expect(getRoomCandidatesApi).toHaveBeenCalledTimes(2));
    rerender({ live: false });
    await act(async () => vi.advanceTimersByTime(90_000));
    expect(getRoomCandidatesApi).toHaveBeenCalledTimes(2);
  });

  it("refreshes in the background without the loading state, and not while the page is hidden", async () => {
    let release!: () => void;
    const { result, rerender } = renderHook(({ live }) => useRoomCandidates("r1", { searchDelay: 0, live }), { initialProps: { live: false } });
    await waitFor(() => expect(result.current.loading).toBe(false)); // real timers: waitFor polls with setInterval
    vi.useFakeTimers({ toFake: ["setInterval", "clearInterval"] });
    rerender({ live: true });
    vi.mocked(getRoomCandidatesApi).mockImplementationOnce((_id, q) => new Promise((r) => (release = () => r(reply(q)))));
    await act(async () => vi.advanceTimersByTime(30_000));
    expect(getRoomCandidatesApi).toHaveBeenCalledTimes(2);
    expect(result.current.loading).toBe(false); // the table is not dimmed for a refresh nobody asked for
    await act(async () => release());

    const hidden = vi.spyOn(document, "hidden", "get").mockReturnValue(true);
    await act(async () => vi.advanceTimersByTime(60_000));
    expect(getRoomCandidatesApi).toHaveBeenCalledTimes(2);
    hidden.mockRestore();
  });

  it("reads the first page of the room, then the page asked for", async () => {
    const { result } = renderHook(() => useRoomCandidates("r1", { searchDelay: 0 }));
    await waitFor(() => expect(result.current.rows[0]?.userId).toBe("-all-p1"));
    expect(getRoomCandidatesApi).toHaveBeenLastCalledWith("r1", { page: 1, limit: 10 });
    expect(result.current.total).toBe(25);
    act(() => result.current.setPage(3));
    await waitFor(() => expect(result.current.rows[0]?.userId).toBe("-all-p3"));
  });

  it("goes back to page one when a filter or the search changes, and sends only the filters set", async () => {
    const { result } = renderHook(() => useRoomCandidates("r1", { searchDelay: 0 }));
    await waitFor(() => expect(result.current.loading).toBe(false));
    act(() => result.current.setPage(2));
    act(() => result.current.changeFilters({ status: "in_progress" }));
    await waitFor(() => expect(result.current.rows[0]?.userId).toBe("-in_progress-p1"));
    act(() => result.current.changeFilters({ search: "  Lê  " }));
    await waitFor(() => expect(result.current.rows[0]?.userId).toBe("Lê-in_progress-p1"));
    expect(getRoomCandidatesApi).toHaveBeenLastCalledWith("r1", { page: 1, limit: 10, search: "Lê", status: "in_progress" });
  });

  it("drops an answer that a newer read replaced", async () => {
    let releaseFirst!: () => void;
    vi.mocked(getRoomCandidatesApi).mockImplementationOnce(
      (_id, q) => new Promise((resolve) => (releaseFirst = () => resolve(reply(q)))),
    );
    const { result } = renderHook(() => useRoomCandidates("r1", { searchDelay: 0 }));
    act(() => result.current.changeFilters({ status: "submitted" }));
    await waitFor(() => expect(result.current.rows[0]?.userId).toBe("-submitted-p1"));
    await act(async () => releaseFirst());
    expect(result.current.rows[0]?.userId).toBe("-submitted-p1");
  });

  it("keeps the last rows on a failure, says so, and reads again on retry", async () => {
    const { result } = renderHook(() => useRoomCandidates("r1", { searchDelay: 0 }));
    await waitFor(() => expect(result.current.rows).toHaveLength(1));
    vi.mocked(getRoomCandidatesApi).mockRejectedValueOnce(new Error("down"));
    act(() => result.current.setPage(2));
    await waitFor(() => expect(result.current.failed).toBe(true));
    expect(result.current.rows[0]?.userId).toBe("-all-p1");
    act(() => result.current.reload());
    await waitFor(() => expect(result.current.failed).toBe(false));
    expect(result.current.rows[0]?.userId).toBe("-all-p2");
  });
});
