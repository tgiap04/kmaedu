// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Flashcard } from "@/types/flashcardSet";

const api = vi.hoisted(() => ({
  getFlashcardSetFlashcardsApi: vi.fn(),
  assignFlashcardsToLabelApi: vi.fn(),
  addFlashcardToFlashcardSet: vi.fn(),
  updateFlashcardInFlashcardSet: vi.fn(),
  deleteFlashcardFromFlashcardSet: vi.fn(),
}));
vi.mock("@/apis/flashcardSetApi", () => api);
vi.mock("@/components/antd/toast", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/stores/useStatsStore", () => ({ useStatsStore: (pick: (s: unknown) => unknown) => pick({ invalidateFlashcardStats: vi.fn() }) }));

const { useFlashcardCards } = await import("./use-flashcard-cards");

const card = (id: string, label?: { id: string; name: string }): Flashcard =>
  ({ id, question: `q${id}`, answer: "a", createdAt: "", updatedAt: "", label: label ? { ...label, color: null } : undefined }) as Flashcard;
const page = (cards: Flashcard[]) => ({ flashCards: cards, pagination: { totalPages: 1 } });
const deferred = <T,>() => {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
};

beforeEach(() => vi.clearAllMocks());

async function loaded(cards: Flashcard[]) {
  api.getFlashcardSetFlashcardsApi.mockResolvedValue(page(cards));
  const hook = renderHook(() => useFlashcardCards("s1"));
  await waitFor(() => expect(hook.result.current.cards).not.toBeNull());
  return hook;
}

describe("useFlashcardCards", () => {
  it("renames a label on its cards in place, without reading the set again", async () => {
    const { result } = await loaded([card("1", { id: "l1", name: "Cũ" }), card("2")]);
    const reads = api.getFlashcardSetFlashcardsApi.mock.calls.length;
    act(() => result.current.relabel("l1", { id: "l1", name: "Mới", color: "#EF4444" }));
    expect(result.current.cards?.map((c) => c.label?.name ?? null)).toEqual(["Mới", null]);
    expect(api.getFlashcardSetFlashcardsApi.mock.calls.length).toBe(reads);
  });

  it("a deleted label leaves its cards unlabeled", async () => {
    const { result } = await loaded([card("1", { id: "l1", name: "Cũ" })]);
    act(() => result.current.relabel("l1", null));
    expect(result.current.cards?.[0].label).toBeUndefined();
  });

  it("assigning a label patches that card only", async () => {
    api.assignFlashcardsToLabelApi.mockResolvedValue({ message: "ok" });
    const { result } = await loaded([card("1"), card("2")]);
    await act(async () => {
      await result.current.assignLabel(card("2"), { id: "l9", name: "Nhãn", color: null });
    });
    expect(api.assignFlashcardsToLabelApi).toHaveBeenCalledWith("s1", "l9", { flashcardIds: ["2"] });
    expect(result.current.cards?.map((c) => c.label?.id ?? null)).toEqual([null, "l9"]);
  });

  it("reloads asked for during a read make one more read after it, not one each", async () => {
    const { result } = await loaded([card("1")]);
    const first = deferred<ReturnType<typeof page>>();
    api.getFlashcardSetFlashcardsApi.mockReset().mockReturnValueOnce(first.promise).mockResolvedValue(page([card("1"), card("2")]));
    let done!: Promise<void>;
    act(() => {
      done = result.current.reload();
      void result.current.reload();
      void result.current.reload();
    });
    expect(api.getFlashcardSetFlashcardsApi).toHaveBeenCalledTimes(1); // one at a time
    first.resolve(page([card("1")]));
    await act(async () => {
      await done;
    });
    expect(api.getFlashcardSetFlashcardsApi).toHaveBeenCalledTimes(2);
    expect(result.current.cards).toHaveLength(2);
  });

  it("a failed reload keeps the cards on screen and says the list is stale", async () => {
    const { result } = await loaded([card("1")]);
    api.getFlashcardSetFlashcardsApi.mockRejectedValue(new Error("429"));
    await act(async () => {
      await result.current.reload();
    });
    expect(result.current.failed).toBe(true);
    expect(result.current.cards).toHaveLength(1);
  });

  it("a read that started before a change never overwrites the change", async () => {
    const { result } = await loaded([card("1", { id: "l1", name: "Cũ" })]);
    const old = deferred<ReturnType<typeof page>>();
    api.getFlashcardSetFlashcardsApi.mockReset().mockReturnValueOnce(old.promise).mockResolvedValue(page([card("1", { id: "l1", name: "Mới" })]));
    let done!: Promise<void>;
    act(() => {
      done = result.current.reload();
    });
    act(() => result.current.relabel("l1", { id: "l1", name: "Mới", color: null }));
    old.resolve(page([card("1", { id: "l1", name: "Cũ" })])); // the server's answer from before the rename
    await act(async () => {
      await done;
    });
    expect(result.current.cards?.[0].label?.name).toBe("Mới");
  });
});
