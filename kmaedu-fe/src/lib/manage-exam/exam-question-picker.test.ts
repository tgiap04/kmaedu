import { describe, expect, it } from "vitest";
import { chapterFromFilename, filterQuestions, fileQuestions, shuffled } from "./exam-question-picker";

const file = { id: "u1", historyId: "h1", filename: "Hệ điều hành - Chương 3.pdf" };
const quizzes = [
  { question: "Hệ điều hành là gì?", options: ["A. x", "B. y"], answer: "B" },
  { question: "Linux", options: ["A. x", "B. y"], answer: "A" },
];

describe("chapterFromFilename", () => {
  it("drops the extension and trims", () => {
    expect(chapterFromFilename("  Bài giảng.PDF ")).toBe("Bài giảng");
    expect(chapterFromFilename("a.b.docx")).toBe("a.b");
    expect(chapterFromFilename("noext")).toBe("noext");
  });
  it("keeps the label limit of 100 characters and never returns empty", () => {
    expect(chapterFromFilename(`${"x".repeat(150)}.pdf`)).toHaveLength(100);
    expect(chapterFromFilename(".pdf")).toBe(".pdf");
  });
});

describe("fileQuestions", () => {
  it("gives each generated question a stable id and the file as its chapter", () => {
    expect(fileQuestions(file, quizzes)).toEqual([
      { id: "h1:0", question: "Hệ điều hành là gì?", options: ["A. x", "B. y"], answer: "B", chapter: "Hệ điều hành - Chương 3", fileId: "u1", source: file.filename },
      { id: "h1:1", question: "Linux", options: ["A. x", "B. y"], answer: "A", chapter: "Hệ điều hành - Chương 3", fileId: "u1", source: file.filename },
    ]);
  });
  it("skips questions the generator left without options or answer", () => {
    expect(fileQuestions(file, [{ question: "Q", options: ["A"], answer: "" }, ...quizzes]).map((q) => q.id)).toEqual(["h1:1", "h1:2"]);
  });
});

describe("filterQuestions", () => {
  const list = fileQuestions(file, quizzes);
  it("searches ignoring case and Vietnamese accents", () => {
    expect(filterQuestions(list, "he dieu").map((q) => q.id)).toEqual(["h1:0"]);
    expect(filterQuestions(list, "LINUX").map((q) => q.id)).toEqual(["h1:1"]);
    expect(filterQuestions(list, "  ")).toHaveLength(2);
  });
});

describe("shuffled", () => {
  it("returns a permutation without touching the input", () => {
    const input = [1, 2, 3, 4];
    const out = shuffled(input, () => 0);
    expect(out).not.toEqual(input);
    expect([...out].sort()).toEqual(input);
    expect(input).toEqual([1, 2, 3, 4]);
  });
});

describe("chapterFromFilename (blank name)", () => {
  it("falls back to a chapter name instead of an empty one", () => {
    expect(chapterFromFilename("   ")).toBe("Chương 1");
    expect(chapterFromFilename("")).toBe("Chương 1");
  });
});
