// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { RoomOverview, RoomOverviewWindow } from "@/apis/examAttemptApi";

vi.mock("@/apis/examAttemptApi", () => ({ getRoomOverviewApi: vi.fn() }));

const { getRoomOverviewApi } = await import("@/apis/examAttemptApi");
const { useRoomOverview } = await import("./use-room-overview");

const overview = (window: RoomOverviewWindow, completed = 1): RoomOverview => ({
  candidates: 2,
  completed,
  inProgress: 1,
  notStarted: 0,
  cancelled: 0,
  averageScore: 80,
  passed: 1,
  scoreBuckets: Array.from({ length: 10 }, () => 0),
  timeline: { window, from: "", bucketMinutes: 2, counts: [] },
});

beforeEach(() => {
  vi.mocked(getRoomOverviewApi).mockReset();
  vi.mocked(getRoomOverviewApi).mockImplementation(async (_id, w) => overview(w));
});
afterEach(() => vi.useRealTimers());

describe("useRoomOverview", () => {
  it("reads the last 30 minutes first, then the window chosen", async () => {
    const { result } = renderHook(() => useRoomOverview("r1", false));
    await waitFor(() => expect(result.current.data?.timeline.window).toBe("30m"));
    act(() => result.current.setRange("24h"));
    await waitFor(() => expect(result.current.data?.timeline.window).toBe("24h"));
    expect(getRoomOverviewApi).toHaveBeenLastCalledWith("r1", "24h");
  });

  it("keeps the numbers shown when a read fails, and says so", async () => {
    const { result } = renderHook(() => useRoomOverview("r1", false));
    await waitFor(() => expect(result.current.data).not.toBeNull());
    vi.mocked(getRoomOverviewApi).mockRejectedValueOnce(new Error("down"));
    act(() => result.current.reload());
    await waitFor(() => expect(result.current.failed).toBe(true));
    expect(result.current.data?.completed).toBe(1);
  });

  it("reads again every 30 seconds while the room is live, and not otherwise", async () => {
    vi.useFakeTimers({ toFake: ["setInterval", "clearInterval"] });
    const { rerender } = renderHook(({ live }) => useRoomOverview("r1", live), { initialProps: { live: true } });
    await waitFor(() => expect(getRoomOverviewApi).toHaveBeenCalledTimes(1));
    await act(async () => vi.advanceTimersByTime(30_000));
    expect(getRoomOverviewApi).toHaveBeenCalledTimes(2);
    rerender({ live: false });
    await act(async () => vi.advanceTimersByTime(90_000));
    expect(getRoomOverviewApi).toHaveBeenCalledTimes(2);
  });
});
