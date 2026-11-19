// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { storeCache } from "@/lib/storeCache";

const api = vi.hoisted(() => ({ getFlashcardSetsApi: vi.fn() }));
const stats = vi.hoisted(() => ({ flashcardStats: null as null | Record<string, number>, fetchFlashcardStats: vi.fn() }));
vi.mock("@/apis/flashcardSetApi", () => api);
vi.mock("@/components/antd/toast", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/stores/useStatsStore", () => ({ useStatsStore: () => stats }));

const { useFlashcardSetStore } = await import("@/stores/useFlashcardSetStore");
const { useFlashcardListData, PAGE_SIZE } = await import("./use-flashcard-list-data");

const set = (id: string) => ({ id, title: id, description: "", isPublic: false, isPinned: false, viewCount: 0, createdAt: "2026-01-01", tags: [], _count: { detailsFlashCard: 1 } });
const answer = (ids: string[], total: number) => ({ flashcardSets: ids.map(set), total, page: 1, limit: PAGE_SIZE, totalPages: Math.ceil(total / PAGE_SIZE) });
const lastParams = () => api.getFlashcardSetsApi.mock.calls.at(-1)?.[0];

beforeEach(() => {
  vi.clearAllMocks();
  storeCache.clear();
  useFlashcardSetStore.setState({ flashcardSetsK: [], loading: false, error: null });
  stats.flashcardStats = null;
});

async function shown(total = 25) {
  api.getFlashcardSetsApi.mockImplementation(async (p: { page: number }) => answer([`p${p.page}`], total));
  const hook = renderHook(() => useFlashcardListData());
  await waitFor(() => expect(hook.result.current.firstLoadDone).toBe(true));
  return hook;
}

describe("useFlashcardListData", () => {
  it("sorts on the server, and a new order starts again from page 1", async () => {
    const { result } = await shown();
    act(() => result.current.setCurrentPage(3));
    await waitFor(() => expect(lastParams()).toMatchObject({ page: 3 }));
    act(() => result.current.changeSort("name"));
    await waitFor(() => expect(lastParams()).toMatchObject({ page: 1, sort: "name" }));
  });

  it("a failed first load shows a failure with a retry, not an empty account", async () => {
    api.getFlashcardSetsApi.mockRejectedValueOnce(new Error("503"));
    const { result } = renderHook(() => useFlashcardListData());
    await waitFor(() => expect(result.current.firstLoadDone).toBe(true));
    expect(result.current.failed).toBe(true);
    api.getFlashcardSetsApi.mockResolvedValue(answer(["a"], 1));
    act(() => result.current.retry());
    expect(result.current.failed).toBe(false); // the retry shows loading, not the old error
    await waitFor(() => expect(result.current.rows.map((r) => r.id)).toEqual(["a"]));
  });

  it("a page past the end (sets deleted elsewhere) moves to the last page", async () => {
    const { result } = await shown(25);
    api.getFlashcardSetsApi.mockImplementation(async (p: { page: number }) => (p.page > 2 ? answer([], 12) : answer([`p${p.page}`], 12)));
    act(() => result.current.setCurrentPage(3));
    await waitFor(() => expect(result.current.currentPage).toBe(2));
    expect(result.current.rows.map((r) => r.id)).toEqual(["p2"]);
  });

  it("a search typed on page 3 sends one request, for page 1, without outer spaces", async () => {
    const { result } = await shown();
    act(() => result.current.setCurrentPage(3));
    await waitFor(() => expect(lastParams()).toMatchObject({ page: 3 }));
    const before = api.getFlashcardSetsApi.mock.calls.length;
    act(() => result.current.changeSearch("  toán "));
    await waitFor(() => expect(lastParams()).toMatchObject({ page: 1, search: "toán" }), { timeout: 2000 });
    expect(api.getFlashcardSetsApi.mock.calls.length - before).toBe(1);
  });

  it("deleting the only set of a later page steps back a page; otherwise the page is read again", async () => {
    const { result } = await shown();
    act(() => result.current.setCurrentPage(2));
    await waitFor(() => expect(result.current.rows.map((r) => r.id)).toEqual(["p2"]));
    act(() => result.current.afterDelete());
    expect(result.current.currentPage).toBe(1);
  });

  it("stats are unknown (shown as a dash) until they are in", async () => {
    const { result, rerender } = await shown();
    expect(result.current.stats).toBeNull();
    stats.flashcardStats = { totalGroups: 2, totalCards: 9, totalViews: 4 };
    rerender();
    expect(result.current.stats).toEqual({ totalGroups: 2, totalCards: 9, totalViews: 4 });
  });

  it("an answer that comes back after a newer one never replaces its rows", async () => {
    const { result } = await shown();
    let slow!: (v: unknown) => void;
    api.getFlashcardSetsApi.mockImplementation((p: { page: number }) => (p.page === 2 ? new Promise((resolve) => (slow = resolve)) : Promise.resolve(answer([`p${p.page}`], 25))));
    act(() => result.current.setCurrentPage(2));
    act(() => result.current.setCurrentPage(3));
    await waitFor(() => expect(result.current.rows.map((r) => r.id)).toEqual(["p3"]));
    await act(async () => {
      slow(answer(["p2"], 25));
    });
    expect(result.current.rows.map((r) => r.id)).toEqual(["p3"]);
  });
});
