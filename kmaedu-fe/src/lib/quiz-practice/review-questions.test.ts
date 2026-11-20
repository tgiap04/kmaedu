import { describe, expect, it } from "vitest";
import { pickedLetter, practiceReviewRows } from "./review-questions";

const options = ["timedatectl", "date", "B", "hwclock"];

describe("pickedLetter", () => {
  it("reads a single letter as a position, even when an option's text is that letter", () => {
    expect(pickedLetter("b", options)).toBe("B");
    expect(pickedLetter(" C ", options)).toBe("C");
  });

  it("maps the exact option text to its letter", () => {
    expect(pickedLetter("hwclock", options)).toBe("D");
    expect(pickedLetter(" date ", options)).toBe("B");
  });

  it("treats null and blank as no answer", () => {
    expect(pickedLetter(null, options)).toBeNull();
    expect(pickedLetter("  ", options)).toBeNull();
  });

  it("keeps unmatched text, so it grades as wrong rather than skipped", () => {
    expect(pickedLetter("zdump", options)).toBe("zdump");
  });
});

describe("practiceReviewRows", () => {
  it("takes the verdict from the server and the right letter from a letter or text key", () => {
    const rows = practiceReviewRows([
      { id: "q1", question: "1", options, selectedAnswer: "A", correctAnswer: "timedatectl", isCorrect: true },
      { id: "q2", question: "2", options, selectedAnswer: "date", correctAnswer: "D", isCorrect: false },
      { id: "q3", question: "3", options, selectedAnswer: null, correctAnswer: "A", isCorrect: false },
      { id: "q4", question: "4", options, selectedAnswer: "  ", correctAnswer: null, isCorrect: false },
    ]);
    expect(rows.map((r) => r.outcome)).toEqual(["correct", "wrong", "skipped", "skipped"]);
    expect(rows.map((r) => r.correctLetter)).toEqual(["A", "D", "A", null]);
    expect(rows[1].userAnswer).toBe("B");
  });

  it("trusts the server even when the local key looks different", () => {
    const [row] = practiceReviewRows([{ id: "q1", question: "1", options, selectedAnswer: "B", correctAnswer: "A", isCorrect: true }]);
    expect(row.outcome).toBe("correct");
  });
});
