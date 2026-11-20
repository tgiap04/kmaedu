import { beforeEach, describe, expect, it, vi } from "vitest";

const getUploadsPage = vi.hoisted(() => vi.fn());
vi.mock("@/apis/aiApi", () => ({ aiApi: { getUploadsPage } }));

const { useRecentUploadsStore } = await import("./useAIGeneratorStore");
const { storeCache } = await import("@/lib/storeCache");

beforeEach(() => {
  getUploadsPage.mockReset();
  storeCache.clear();
});

describe("recent uploads, one page at a time", () => {
  it("asks for the page and for the one item right after it", async () => {
    const full = Array.from({ length: 5 }, (_, i) => ({ id: `p2-${i}` }));
    getUploadsPage.mockImplementation(async (page: number, size: number) => (size === 1 ? (page === 11 ? [{ id: "x" }] : []) : full));
    const res = await useRecentUploadsStore.getState().fetchUploadsPage(2, 5);
    expect(getUploadsPage).toHaveBeenCalledWith(2, 5);
    expect(getUploadsPage).toHaveBeenCalledWith(11, 1);
    expect(res).toEqual({ uploads: full, hasNext: true });
  });

  it("skips the lookahead when the page is not full", async () => {
    getUploadsPage.mockResolvedValue([{ id: "a" }]);
    const res = await useRecentUploadsStore.getState().fetchUploadsPage(1, 5);
    expect(res.hasNext).toBe(false);
    expect(getUploadsPage).toHaveBeenCalledTimes(1);
  });

  it("still shows a full page when the lookahead fails", async () => {
    const full = Array.from({ length: 5 }, (_, i) => ({ id: `d${i}` }));
    getUploadsPage.mockImplementation(async (_page: number, size: number) => {
      if (size === 1) throw new Error("timeout");
      return full;
    });
    const res = await useRecentUploadsStore.getState().fetchUploadsPage(1, 5);
    expect(res).toEqual({ uploads: full, hasNext: false });
    // Not cached: the next visit asks again.
    await useRecentUploadsStore.getState().fetchUploadsPage(1, 5);
    expect(getUploadsPage).toHaveBeenCalledTimes(4);
  });

  it("reports no next page and serves a revisit from the cache", async () => {
    const full = Array.from({ length: 5 }, (_, i) => ({ id: `d${i}` }));
    getUploadsPage.mockImplementation(async (_page: number, size: number) => (size === 1 ? [] : full));
    const store = useRecentUploadsStore.getState();
    expect((await store.fetchUploadsPage(1, 5)).hasNext).toBe(false);
    await store.fetchUploadsPage(1, 5);
    expect(getUploadsPage).toHaveBeenCalledTimes(2);
  });
});
