import { describe, expect, it } from "vitest";
import { addTag, batchCards, sourceDescription, CARD_COUNT_MAX, CARD_COUNT_MIN, clampCardCount, stepCardCount, TAG_LENGTH_MAX, TAG_MAX, titleFromFilename, titleFromQuiz, TITLE_MAX, validateTitle } from "./flashcard-create-logic";

describe("clampCardCount", () => {
  it("keeps a value inside the range", () => {
    expect(clampCardCount(15)).toBe(15);
  });
  it("clamps to the bounds", () => {
    expect(clampCardCount(0)).toBe(CARD_COUNT_MIN);
    expect(clampCardCount(-8)).toBe(CARD_COUNT_MIN);
    expect(clampCardCount(51)).toBe(CARD_COUNT_MAX);
    expect(clampCardCount(10_000)).toBe(CARD_COUNT_MAX);
  });
  it("rounds down fractions and falls back to the minimum for NaN/Infinity", () => {
    expect(clampCardCount(7.9)).toBe(7);
    expect(clampCardCount(Number.NaN)).toBe(CARD_COUNT_MIN);
    expect(clampCardCount(Number.POSITIVE_INFINITY)).toBe(CARD_COUNT_MIN);
  });
});

describe("stepCardCount", () => {
  it("moves by the delta and stops at the bounds", () => {
    expect(stepCardCount(10, 1)).toBe(11);
    expect(stepCardCount(10, -1)).toBe(9);
    expect(stepCardCount(CARD_COUNT_MAX, 1)).toBe(CARD_COUNT_MAX);
    expect(stepCardCount(CARD_COUNT_MIN, -1)).toBe(CARD_COUNT_MIN);
  });
});

describe("titleFromFilename", () => {
  it("drops the extension and trims", () => {
    expect(titleFromFilename("  Bài giảng HĐH.pdf ")).toBe("Bài giảng HĐH");
  });
  it("only removes the last extension and keeps dots inside the name", () => {
    expect(titleFromFilename("v1.2 notes.final.pdf")).toBe("v1.2 notes.final");
  });
  it("keeps a name that is only an extension", () => {
    expect(titleFromFilename(".pdf")).toBe(".pdf");
  });
  it("is empty for an empty name and cut to the title limit", () => {
    expect(titleFromFilename("  ")).toBe("");
    expect(titleFromFilename(`${"a".repeat(300)}.pdf`)).toHaveLength(TITLE_MAX);
  });
});

describe("titleFromQuiz", () => {
  it("adds the flashcard suffix", () => {
    expect(titleFromQuiz("Hệ điều hành")).toBe("Hệ điều hành - Flashcard");
  });
  it("never exceeds the title limit and is empty for an empty title", () => {
    const title = titleFromQuiz("x".repeat(500));
    expect(title).toHaveLength(TITLE_MAX);
    expect(title.endsWith(" - Flashcard")).toBe(true);
    expect(titleFromQuiz("   ")).toBe("");
  });
});

describe("validateTitle", () => {
  it("accepts a normal title", () => {
    expect(validateTitle("Từ vựng")).toBeUndefined();
    expect(validateTitle("a".repeat(TITLE_MAX))).toBeUndefined();
  });
  it("rejects empty, blank and too long titles", () => {
    expect(validateTitle("")).toMatch(/tên/i);
    expect(validateTitle("   ")).toMatch(/tên/i);
    expect(validateTitle("a".repeat(TITLE_MAX + 1))).toMatch(String(TITLE_MAX));
  });
});

describe("addTag", () => {
  it("adds a trimmed tag", () => {
    expect(addTag(["a"], "  b ")).toEqual(["a", "b"]);
  });
  it("ignores blank input and duplicates regardless of case", () => {
    expect(addTag(["Anh"], "  ")).toEqual(["Anh"]);
    expect(addTag(["Anh"], "anh")).toEqual(["Anh"]);
  });
  it("cuts a long tag and stops at the maximum count", () => {
    expect(addTag([], "x".repeat(100))[0]).toHaveLength(TAG_LENGTH_MAX);
    const full = Array.from({ length: TAG_MAX }, (_, i) => `t${i}`);
    expect(addTag(full, "extra")).toEqual(full);
  });
  it("does not mutate its input", () => {
    const tags = ["a"];
    addTag(tags, "b");
    expect(tags).toEqual(["a"]);
  });
});

describe("sourceDescription", () => {
  it("names the file or the quiz it came from", () => {
    expect(sourceDescription("document", " HĐH.pdf ")).toBe('Tạo từ tài liệu "HĐH.pdf"');
    expect(sourceDescription("quiz", "Giữa kỳ")).toBe('Tạo từ bộ quiz "Giữa kỳ"');
  });
  it("is empty without a name and never exceeds 1000 characters", () => {
    expect(sourceDescription("quiz", "  ")).toBe("");
    expect(sourceDescription("document", "x".repeat(2000))).toHaveLength(1000);
  });
});

describe("batchCards (one request each, under the server's body limit)", () => {
  const card = (n: number, size = 10) => ({ question: `q${n}`.padEnd(size, "x"), answer: "a" });
  it("is no batch for no card", () => expect(batchCards([], 50, 1000)).toEqual([]))
  it("cuts by count", () => {
    expect(batchCards(Array.from({ length: 5 }, (_, i) => card(i)), 2, 1_000_000).map((b) => b.length)).toEqual([2, 2, 1]);
  });
  it("starts a new batch before the byte budget would be passed", () => {
    // each card is 100 + 1 bytes: three fit in 350, the fourth starts a new batch
    expect(batchCards(Array.from({ length: 5 }, (_, i) => card(i, 100)), 50, 350).map((b) => b.length)).toEqual([3, 2]);
  });
  it("sends a card bigger than the budget alone", () => {
    expect(batchCards([card(1), card(2, 500), card(3)], 50, 100).map((b) => b.length)).toEqual([1, 1, 1]);
  });
  it("counts bytes, not letters (Vietnamese letters take 2-3 bytes)", () => {
    const viet = { question: "ữ".repeat(40), answer: "" }; // 40 letters, 120 bytes
    expect(batchCards([viet, viet], 50, 200).map((b) => b.length)).toEqual([1, 1]);
  });
});
