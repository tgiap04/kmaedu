import { describe, expect, it } from "vitest";
import type { Quizz } from "@/types/quizset";
import { ApiRequestError } from "@/apis/api";
import { TooManyQuestionsError, quizLoadError, readAllQuestions } from "./read-all-questions";

const q = (n: number) => ({ id: `q${n}`, question: `Câu ${n}`, options: ["a", "b"], answer: "A" }) as unknown as Quizz;
const pageOf = (from: number, count: number) => Array.from({ length: count }, (_, i) => q(from + i));

describe("readAllQuestions", () => {
  it("reads as many pages as the server says", async () => {
    const asked: number[] = [];
    const all = await readAllQuestions(async (page) => {
      asked.push(page);
      return { questions: pageOf((page - 1) * 2, 2), pagination: { totalPages: 3 } };
    }, 2, 50);
    expect({ asked, count: all.length }).toEqual({ asked: [1, 2, 3], count: 6 });
  });
  it("without paging info, keeps reading while pages come back full", async () => {
    const sizes = [2, 2, 1];
    const all = await readAllQuestions(async (page) => ({ questions: pageOf(page * 10, sizes[page - 1] ?? 0) }), 2, 50);
    expect(all).toHaveLength(5);
  });
  it("without paging info, stops after an empty page", async () => {
    const asked: number[] = [];
    await readAllQuestions(async (page) => {
      asked.push(page);
      return { questions: page === 1 ? pageOf(0, 2) : [], pagination: null };
    }, 2, 50);
    expect(asked).toEqual([1, 2]);
  });
  it("never reads more than the page cap, and refuses the set rather than cutting it", async () => {
    const asked: number[] = [];
    const run = readAllQuestions(async (page) => {
      asked.push(page);
      return { questions: pageOf(page * 10, 2), pagination: { totalPages: 999 } };
    }, 2, 4);
    await expect(run).rejects.toBeInstanceOf(TooManyQuestionsError);
    expect(asked).toEqual([1, 2, 3, 4]);
  });
  it("reads a set that ends exactly on the cap", async () => {
    const all = await readAllQuestions(async (page) => ({ questions: pageOf(page * 10, 2), pagination: { totalPages: 4 } }), 2, 4);
    expect(all).toHaveLength(8);
  });
});

describe("quizLoadError", () => {
  const err = (status?: number, requestId?: string) => Object.assign(new ApiRequestError("x"), { status, requestId });
  it("says the quiz set is not the user's to read, with no retry, on 403 / 404", () => {
    expect(quizLoadError(err(403)).retryable).toBe(false);
    expect(quizLoadError(err(404)).retryable).toBe(false);
    expect(quizLoadError(err(403)).message).toMatch(/quyền|không còn/);
  });
  it("says a set past the cap is too big, with no retry", () => {
    expect(quizLoadError(new TooManyQuestionsError(200 * 100))).toEqual({ message: expect.stringMatching(/quá lớn/), retryable: false });
  });
  it("asks to wait on 429", () => {
    expect(quizLoadError(err(429))).toEqual({ message: expect.stringMatching(/ít phút/), retryable: true });
  });
  it("offers a retry for network and server errors, with the request id when there is one", () => {
    expect(quizLoadError(err(undefined)).retryable).toBe(true);
    expect(quizLoadError(err(503, "req-42")).message).toContain("req-42");
  });
});
