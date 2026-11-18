import { describe, expect, it } from "vitest";
import type { Quizz, QuizSetLabel } from "@/types/quizset";
import { NO_LABEL, chapterCounts, copyTitle, sortSetQuestions, draftPayload, filterSetQuestions, groupsFromSet, optionDrafts, plainText } from "./quiz-set-detail";

const label = (id: string, name: string, order: number): QuizSetLabel => ({ id, quizSetId: "s", name, order, createdAt: "", updatedAt: "" });
const c1 = label("l1", "Chương 1", 0);
const c2 = label("l2", "Chương 2", 1);
const q = (id: string, question: string, l: QuizSetLabel | null, options: Quizz["options"] = ["A. x", "B. y"]): Quizz => ({
  id,
  question,
  options,
  answer: "B",
  createdAt: "",
  updatedAt: "",
  label: l,
  labelId: l?.id ?? null,
});

describe("plainText", () => {
  it("drops tags, decodes the common entities and collapses spaces", () => {
    expect(plainText("<p>Hệ&nbsp;điều <b>hành</b></p><p>&lt;Linux&gt; &amp; co&#39;</p>")).toBe("Hệ điều hành <Linux> & co'");
    expect(plainText("")).toBe("");
  });
});

describe("filterSetQuestions", () => {
  const list = [q("1", "<p>Hệ điều hành Linux</p>", c1), q("2", "TCP/IP", c2), q("3", "Máy ảo", null)];
  it("filters by chapter, including unlabeled", () => {
    expect(filterSetQuestions(list, "l2", "").map((x) => x.id)).toEqual(["2"]);
    expect(filterSetQuestions(list, NO_LABEL, "").map((x) => x.id)).toEqual(["3"]);
    expect(filterSetQuestions(list, "all", "")).toHaveLength(3);
  });
  it("searches the text without tags, ignoring case and accents", () => {
    expect(filterSetQuestions(list, "all", "he dieu").map((x) => x.id)).toEqual(["1"]);
    expect(filterSetQuestions(list, "all", "p>")).toEqual([]);
    expect(filterSetQuestions(list, "l1", "tcp")).toEqual([]);
  });
});

describe("groupsFromSet", () => {
  it("groups by label order, keeps list order inside, unlabeled last, options as text", () => {
    const list = [q("1", "Q1", c2), q("2", "Q2", null, ["x", { text: "y" }]), q("3", "Q3", c1), q("4", "Q4", c2)];
    expect(groupsFromSet(list, [c2, c1]).map((g) => [g.name, g.quizzes.map((x) => x.question)])).toEqual([
      ["Chương 1", ["Q3"]],
      ["Chương 2", ["Q1", "Q4"]],
      [null, ["Q2"]],
    ]);
    expect(groupsFromSet(list, [c1, c2])[2].quizzes[0]).toEqual({ question: "Q2", options: ["x", "y"], answer: "B" });
  });
  it("is empty for an empty set without chapters, and keeps a chapter that has no question yet", () => {
    expect(groupsFromSet([], [])).toEqual([]);
    expect(groupsFromSet([], [{ ...c1, color: "#EF4444" }])).toEqual([{ name: "Chương 1", color: "#EF4444", quizzes: [] }]);
  });
  it("leaves out questions the save API would reject, whole (dropping one option would shift the answer letter)", () => {
    const list = [q("1", "Q1", c1), q("2", "Q2", c1, ["x", { text: "" }]), q("3", " ", c1), q("4", "Q4", null, ["only"])];
    expect(groupsFromSet(list, [c1]).map((g) => [g.name, g.quizzes.map((x) => x.question)])).toEqual([["Chương 1", ["Q1"]]]);
  });
});

describe("optionDrafts / draftPayload", () => {
  it("shows options as plain text", () => {
    expect(optionDrafts(["<p>Giao <b>thức</b></p>", "B"]).map((d) => d.text)).toEqual(["Giao thức", "B"]);
  });
  it("keeps untouched options byte-for-byte and saves edited ones as typed", () => {
    const drafts = optionDrafts(["<p>Giao <b>thức</b></p>", "Cũ"]);
    drafts[1] = { ...drafts[1], text: "Mới" };
    expect(draftPayload("<p>Q</p>", drafts, 1, "l1")).toEqual({
      ok: true,
      data: { question: "<p>Q</p>", options: ["<p>Giao <b>thức</b></p>", "Mới"], answer: "B", labelId: "l1" },
    });
  });
  it("drops empty options and moves the answer letter with them", () => {
    const drafts = [{ original: "", text: " " }, { original: "", text: "x" }, { original: "", text: "y" }];
    expect(draftPayload("Q", drafts, 2, null)).toEqual({ ok: true, data: { question: "Q", options: ["x", "y"], answer: "B", labelId: null } });
  });
  it("rejects an empty question, fewer than two options, or a missing/empty correct answer", () => {
    const two = optionDrafts(["x", "y"]);
    expect(draftPayload("<p> </p>", two, 0, null)).toEqual({ ok: false, error: "Nhập nội dung câu hỏi." });
    expect(draftPayload("Q", optionDrafts(["x", ""]), 0, null)).toEqual({ ok: false, error: "Cần ít nhất 2 đáp án." });
    expect(draftPayload("Q", two, null, null)).toEqual({ ok: false, error: "Chọn đáp án đúng." });
    expect(draftPayload("Q", optionDrafts(["x", "y", ""]), 2, null)).toEqual({ ok: false, error: "Chọn đáp án đúng." });
  });
});

describe("copyTitle", () => {
  it("adds the copy suffix within the 200 character limit", () => {
    expect(copyTitle("Đề Linux")).toBe("Đề Linux (bản sao)");
    expect(copyTitle("x".repeat(200))).toHaveLength(200);
    expect(copyTitle("x".repeat(200)).endsWith(" (bản sao)")).toBe(true);
  });
});

describe("chapterCounts", () => {
  it("counts questions per label and the unlabeled ones", () => {
    const list = [q("1", "a", c1), q("2", "b", c2), q("3", "c", c1), q("4", "d", null)];
    const { byLabel, unlabeled } = chapterCounts(list);
    expect(byLabel.get("l1")).toBe(2);
    expect(byLabel.get("l2")).toBe(1);
    expect(byLabel.get("l9")).toBeUndefined();
    expect(unlabeled).toBe(1);
  });
  it("is empty for no questions", () => {
    expect(chapterCounts([])).toEqual({ byLabel: new Map(), unlabeled: 0 });
  });
});

describe("sortSetQuestions", () => {
  const at = (id: string, createdAt: string) => ({ ...q(id, id, null), createdAt });
  it("orders like the paged question API: oldest first, then by id", () => {
    const list = [at("c", "2026-01-02"), at("b", "2026-01-01"), at("a", "2026-01-02")];
    expect(sortSetQuestions(list).map((x) => x.id)).toEqual(["b", "a", "c"]);
  });
  it("does not crash on a question without createdAt (it sorts first)", () => {
    const list = [at("b", "2026-01-01"), { ...q("a", "a", null), createdAt: undefined as unknown as string }];
    expect(sortSetQuestions(list).map((x) => x.id)).toEqual(["a", "b"]);
  });
  it("does not touch the input", () => {
    const list = [at("b", "2026-01-02"), at("a", "2026-01-01")];
    sortSetQuestions(list);
    expect(list.map((x) => x.id)).toEqual(["b", "a"]);
  });
});
