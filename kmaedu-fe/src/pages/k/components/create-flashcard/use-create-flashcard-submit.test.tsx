// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiRequestError } from "@/apis/api";

const api = vi.hoisted(() => ({ createFlashcardSetApi: vi.fn(), setFlashcardsToFlashcardSet: vi.fn(), setHistoryFlashcardsToFlashcardSet: vi.fn() }));
const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
const navigate = vi.hoisted(() => vi.fn());
vi.mock("@/apis/flashcardSetApi", () => api);
vi.mock("@/components/antd/toast", () => ({ toast }));
vi.mock("@/stores/useStatsStore", () => ({ useStatsStore: (pick: (s: unknown) => unknown) => pick({ invalidateFlashcardStats: vi.fn() }) }));
vi.mock("react-router-dom", () => ({ useNavigate: () => navigate }));

const { useCreateFlashcardSubmit } = await import("./use-create-flashcard-submit");

const draft = { title: "Bộ thẻ", description: "", isPublic: false, tags: [] };
const madeSet = (id: string) => ({ flashcardSet: { id } });

beforeEach(() => vi.clearAllMocks());

describe("useCreateFlashcardSubmit", () => {
  it("a failed AI save keeps the user here, and the retry fills the same set (never a second one)", async () => {
    api.createFlashcardSetApi.mockResolvedValue(madeSet("S1"));
    api.setHistoryFlashcardsToFlashcardSet.mockRejectedValueOnce(new Error("503")).mockResolvedValue({ createdCount: 5 });
    const { result } = renderHook(() => useCreateFlashcardSubmit());

    let first: unknown;
    await act(async () => {
      first = await result.current.submitHistory(draft, "h1");
    });
    expect(first).toBe("partial");
    expect(navigate).not.toHaveBeenCalled();
    expect(toast.error).toHaveBeenCalledWith("Đã tạo bộ thẻ nhưng chưa lưu được thẻ", expect.anything());

    let second: unknown;
    await act(async () => {
      second = await result.current.submitHistory(draft, "h1");
    });
    expect(second).toBe("ok");
    expect(api.createFlashcardSetApi).toHaveBeenCalledTimes(1);
    expect(api.setHistoryFlashcardsToFlashcardSet.mock.calls.map(([arg]) => arg.flashcardsetIds)).toEqual([["S1"], ["S1"]]);
    expect(navigate).toHaveBeenCalledWith("/k/manage-flashcard-set/S1");
  });

  it("another AI result after a failed save gets its own set", async () => {
    api.createFlashcardSetApi.mockResolvedValueOnce(madeSet("S1")).mockResolvedValueOnce(madeSet("S2"));
    api.setHistoryFlashcardsToFlashcardSet.mockRejectedValueOnce(new Error("503")).mockResolvedValue({ createdCount: 2 });
    const { result } = renderHook(() => useCreateFlashcardSubmit());
    await act(async () => {
      await result.current.submitHistory(draft, "h1");
      await result.current.submitHistory(draft, "h2");
    });
    expect(api.createFlashcardSetApi).toHaveBeenCalledTimes(2);
    expect(navigate).toHaveBeenCalledWith("/k/manage-flashcard-set/S2");
  });

  it("no answer to the create: warns the set may exist and stays", async () => {
    api.createFlashcardSetApi.mockRejectedValue(Object.assign(new ApiRequestError("Network Error"), { status: undefined }));
    const { result } = renderHook(() => useCreateFlashcardSubmit());
    let status: unknown;
    await act(async () => {
      status = await result.current.submitManual(draft);
    });
    expect(status).toBe("create-failed");
    expect(toast.error).toHaveBeenCalledWith("Không rõ bộ thẻ đã được tạo chưa", expect.anything());
    expect(navigate).not.toHaveBeenCalled();
  });

  it("a second submit while the first runs is ignored", async () => {
    api.createFlashcardSetApi.mockResolvedValue(madeSet("S1"));
    const { result } = renderHook(() => useCreateFlashcardSubmit());
    await act(async () => {
      await Promise.all([result.current.submitManual(draft), result.current.submitManual(draft)]);
    });
    expect(api.createFlashcardSetApi).toHaveBeenCalledTimes(1);
  });

  it("leaving the page mid-save does not pull the user back", async () => {
    let finish!: (v: unknown) => void;
    api.createFlashcardSetApi.mockReturnValue(new Promise((resolve) => (finish = resolve)));
    const { result, unmount } = renderHook(() => useCreateFlashcardSubmit());
    let run!: Promise<unknown>;
    act(() => {
      run = result.current.submitManual(draft);
    });
    unmount();
    finish(madeSet("S1"));
    await run;
    expect(navigate).not.toHaveBeenCalled();
  });

  it("cards from a quiz set that only partly got in: the set is opened and the toast says how many", async () => {
    api.createFlashcardSetApi.mockResolvedValue(madeSet("S1"));
    api.setFlashcardsToFlashcardSet.mockResolvedValueOnce({}).mockRejectedValue(Object.assign(new Error("bad"), { status: 400 }));
    const cards = Array.from({ length: 60 }, (_, i) => ({ question: `q${i}`, answer: "a" }));
    const { result } = renderHook(() => useCreateFlashcardSubmit());
    await act(async () => {
      await result.current.submitCards(draft, cards, 0);
    });
    expect(navigate).toHaveBeenCalledWith("/k/manage-flashcard-set/S1");
    expect(toast.error).toHaveBeenCalledWith("Đã tạo bộ thẻ nhưng chưa thêm đủ thẻ", { description: expect.stringContaining("Đã thêm 50 thẻ") });
  });
});
