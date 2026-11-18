import { beforeEach, describe, expect, it, vi } from "vitest";

const calls: string[] = [];
const api = vi.hoisted(() => ({
  createLabelApi: vi.fn(),
  setQuizzesToQuizset: vi.fn(),
  assignQuestionsToLabelApi: vi.fn(),
  getQuestionsByLabelApi: vi.fn(),
}));
vi.mock("@/apis/quizsetApi", () => api);

const { saveGroups } = await import("./save-exam-groups");

const quiz = (n: number) => ({ question: `Q${n}`, options: ["a", "b"], answer: "A" });
const many = (from: number, count: number) => Array.from({ length: count }, (_, i) => quiz(from + i));

beforeEach(() => {
  calls.length = 0;
  let next = 0;
  api.createLabelApi.mockReset().mockImplementation(async (_set: string, data: { name: string; color?: string; order: number }) => {
    calls.push(`label ${data.name} order=${data.order} color=${data.color ?? "-"}`);
    return { label: { id: `L-${data.name}` } };
  });
  api.setQuizzesToQuizset.mockReset().mockImplementation(async ({ quizzes }: { quizzes: unknown[] }) => {
    const ids = quizzes.map(() => `q${next++}`);
    calls.push(`add ${ids.join(",")}`);
    return { createdCount: ids.length, createdQuestionIds: ids };
  });
  api.getQuestionsByLabelApi.mockReset().mockResolvedValue({ questions: [{ id: "stray" }], pagination: { totalPages: 1 } });
  api.assignQuestionsToLabelApi.mockReset().mockImplementation(async (_set: string, labelId: string, ids: string[]) => {
    calls.push(`assign ${labelId} ${ids.join(",")}`);
    return { updatedCount: ids.length };
  });
});

describe("saveGroups", () => {
  it("labels exactly the questions each request created; an unnamed group stays unlabeled wherever it sits", async () => {
    await saveGroups("S", [
      { name: null, quizzes: many(0, 1) },
      { name: "Chương 1", color: "#EF4444", quizzes: many(1, 2) },
      { name: "Chương 2", color: "red", quizzes: many(3, 1) },
    ]);
    expect(calls).toEqual([
      "add q0",
      "label Chương 1 order=0 color=#EF4444", "add q1,q2", "assign L-Chương 1 q1,q2",
      "label Chương 2 order=1 color=-", "add q3", "assign L-Chương 2 q3",
    ]);
    // Another question without a chapter (another tab, an earlier failed save) is never swept in.
    expect(api.getQuestionsByLabelApi).not.toHaveBeenCalled();
  });

  it("sends a big chapter in batches of 50 and labels each batch by its own ids", async () => {
    await saveGroups("S", [{ name: "Lớn", quizzes: many(0, 120) }]);
    const adds = calls.filter((c) => c.startsWith("add")).map((c) => c.split(",").length);
    const assigns = calls.filter((c) => c.startsWith("assign")).map((c) => c.split(",").length);
    expect(adds).toEqual([50, 50, 20]);
    expect(assigns).toEqual([50, 50, 20]);
  });

  it("keeps a chapter with no question as an empty label", async () => {
    await saveGroups("S", [{ name: "Trống", quizzes: [] }]);
    expect(calls).toEqual(["label Trống order=0 color=-"]);
  });

  it("refuses to guess when the server does not say which questions it created", async () => {
    api.setQuizzesToQuizset.mockResolvedValueOnce({ createdCount: 2 });
    await expect(saveGroups("S", [{ name: "A", quizzes: many(0, 2) }])).rejects.toThrow(/Chương "A"/);
    expect(api.assignQuestionsToLabelApi).not.toHaveBeenCalled();
  });

  it("needs the created ids only to label: an unnamed group still saves against a server that omits them", async () => {
    api.setQuizzesToQuizset.mockResolvedValueOnce({ createdCount: 1 });
    await expect(saveGroups("S", [{ name: null, quizzes: many(0, 1) }])).resolves.toBeUndefined();
  });

  it("says the questions were added but not put in the chapter when the ids are missing, keeping the cause", async () => {
    const cause = Object.assign(new Error("boom"), { requestId: "req-1" });
    api.assignQuestionsToLabelApi.mockRejectedValueOnce(cause);
    const error = await saveGroups("S", [{ name: "A", quizzes: many(0, 1) }]).catch((e: Error) => e);
    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toBe('Chương "A": boom');
    expect((error as Error).cause).toBe(cause);

    api.setQuizzesToQuizset.mockResolvedValueOnce({ createdCount: 2 });
    await expect(saveGroups("S", [{ name: "B", quizzes: many(0, 2) }])).rejects.toThrow(/đã thêm 2 câu.*chưa gán/);
  });

  it("fails loudly when fewer questions were labelled than sent", async () => {
    api.assignQuestionsToLabelApi.mockResolvedValueOnce({ updatedCount: 1 });
    await expect(saveGroups("S", [{ name: "A", quizzes: many(0, 2) }])).rejects.toThrow(/Chương "A".*1\/2/);
  });

  it("stops at the first failure, naming the chapter, without touching later chapters", async () => {
    api.setQuizzesToQuizset.mockRejectedValueOnce(new Error("timeout"));
    await expect(saveGroups("S", [{ name: "A", quizzes: many(0, 1) }, { name: "B", quizzes: many(1, 1) }])).rejects.toThrow('Chương "A": timeout');
    expect(calls).toEqual(["label A order=0 color=-"]);
  });
});
