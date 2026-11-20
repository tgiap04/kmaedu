import { describe, expect, it } from "vitest";
import { reviewOutcome } from "./review-outcome";

const options = ["Sao lưu", "Nén file", "Kiểm tra", "Xóa"];

describe("reviewOutcome", () => {
  it("marks a matching letter correct and another letter wrong", () => {
    expect(reviewOutcome({ answer: "B", options, userAnswer: "B" })).toEqual({ outcome: "correct", correctLetter: "B" });
    expect(reviewOutcome({ answer: "B", options, userAnswer: "C" })).toEqual({ outcome: "wrong", correctLetter: "B" });
  });

  it("treats no answer as skipped, keeping the right letter", () => {
    expect(reviewOutcome({ answer: "C", options, userAnswer: null })).toEqual({ outcome: "skipped", correctLetter: "C" });
    expect(reviewOutcome({ answer: "C", options, userAnswer: "" })).toEqual({ outcome: "skipped", correctLetter: "C" });
  });

  it("reads a key given as option text or index", () => {
    expect(reviewOutcome({ answer: "Nén file", options, userAnswer: "B" }).outcome).toBe("correct");
    expect(reviewOutcome({ answer: "3", options, userAnswer: "D" }).outcome).toBe("correct");
  });

  it("counts nothing correct without a key", () => {
    expect(reviewOutcome({ answer: undefined, options, userAnswer: "A" })).toEqual({ outcome: "wrong", correctLetter: null });
  });
});
