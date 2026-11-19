// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiRequestError } from "@/apis/api";
import { storeCache } from "@/lib/storeCache";
import type { Quizz } from "@/types/quizset";

const api = vi.hoisted(() => ({ getAllQuizSetsApi: vi.fn(), getQuizSetQuestionsApi: vi.fn() }));
vi.mock("@/apis/quizsetApi", () => api);

const { useQuizSetCards, useQuizSetOptions } = await import("./use-quiz-sources");

const quiz = (id: string): Quizz => ({ id, question: `Câu ${id}`, options: ["Huế", "Hà Nội"], answer: "B", createdAt: "", updatedAt: "" }) as Quizz;
const questions = (...ids: string[]) => ({ questions: ids.map(quiz), pagination: { totalPages: 1 } });
const httpError = (status: number) => Object.assign(new ApiRequestError("x"), { status });

beforeEach(() => {
  vi.clearAllMocks();
  storeCache.clear();
});

describe("useQuizSetCards", () => {
  it("shows no card of the previous set right after another set is picked", async () => {
    api.getQuizSetQuestionsApi.mockImplementation(async (id: string) => (id === "A" ? questions("a1", "a2") : new Promise(() => {})));
    const { result, rerender } = renderHook(({ id }) => useQuizSetCards(id), { initialProps: { id: "A" as string | null } });
    await waitFor(() => expect(result.current.cards).toHaveLength(2));
    rerender({ id: "B" });
    expect(result.current.cards).toHaveLength(0); // the very first render for B, before any effect
    expect(result.current.loading).toBe(true);
  });

  it("an error belongs to its set: picking another set never shows it", async () => {
    api.getQuizSetQuestionsApi.mockImplementation(async (id: string) => {
      if (id === "A") throw httpError(500);
      return new Promise(() => {});
    });
    const { result, rerender } = renderHook(({ id }) => useQuizSetCards(id), { initialProps: { id: "A" as string | null } });
    await waitFor(() => expect(result.current.failed).toBe(true));
    rerender({ id: "B" });
    expect(result.current.error).toBeNull();
    expect(result.current.loading).toBe(true);
  });

  it("a set picked again is not read again (cached until a quiz set changes)", async () => {
    api.getQuizSetQuestionsApi.mockResolvedValue(questions("a1"));
    const { result, rerender } = renderHook(({ id }) => useQuizSetCards(id), { initialProps: { id: "A" as string | null } });
    await waitFor(() => expect(result.current.cards).toHaveLength(1));
    rerender({ id: null });
    rerender({ id: "A" });
    await waitFor(() => expect(result.current.cards).toHaveLength(1));
    expect(api.getQuizSetQuestionsApi).toHaveBeenCalledTimes(1);
    storeCache.invalidate("quizsets"); // what editing a quiz set does
    rerender({ id: null });
    rerender({ id: "A" });
    await waitFor(() => expect(api.getQuizSetQuestionsApi).toHaveBeenCalledTimes(2));
  });

  it("a set the viewer may not read says so and offers no retry", async () => {
    api.getQuizSetQuestionsApi.mockRejectedValue(httpError(403));
    const { result } = renderHook(() => useQuizSetCards("A"));
    await waitFor(() => expect(result.current.error).not.toBeNull());
    expect(result.current.error?.retryable).toBe(false);
  });
});

describe("useQuizSetOptions", () => {
  it("reads the quiz sets once, when the tab opens, through the cache the quiz store shares", async () => {
    api.getAllQuizSetsApi.mockResolvedValue({ quizSets: [{ id: "A", title: "Toán", questionCount: 3, extra: "x" }] });
    const { result, rerender } = renderHook(({ on }) => useQuizSetOptions(on), { initialProps: { on: false } });
    expect(api.getAllQuizSetsApi).not.toHaveBeenCalled();
    rerender({ on: true });
    await waitFor(() => expect(result.current.loaded).toBe(true));
    expect(result.current.sets).toEqual([{ id: "A", title: "Toán", questionCount: 3 }]);
    const second = renderHook(() => useQuizSetOptions(true));
    await waitFor(() => expect(second.result.current.loaded).toBe(true));
    expect(api.getAllQuizSetsApi).toHaveBeenCalledTimes(1);
  });

  it("a failure can be retried", async () => {
    api.getAllQuizSetsApi.mockRejectedValueOnce(httpError(503)).mockResolvedValue({ quizSets: [] });
    const { result } = renderHook(() => useQuizSetOptions(true));
    await waitFor(() => expect(result.current.failed).toBe(true));
    expect(result.current.error?.retryable).toBe(true);
    act(() => result.current.retry());
    await waitFor(() => expect(result.current.loaded).toBe(true));
    expect(result.current.failed).toBe(false);
  });
});
