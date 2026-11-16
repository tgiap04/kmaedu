import { describe, expect, it } from "vitest";
import { lastAttemptLabel } from "./last-attempt-label";

const attempt = (isSubmitted: boolean, score: number | null) => ({
  id: "a1",
  isSubmitted,
  score,
  updatedAt: "2026-11-16T00:00:00Z",
});

describe("lastAttemptLabel", () => {
  it("is null before the first attempt", () => {
    expect(lastAttemptLabel(null)).toBeNull();
  });

  it("shows the score of a submitted attempt, 0 when the score is missing", () => {
    expect(lastAttemptLabel(attempt(true, 8))).toBe("Lần gần nhất: 8/10");
    expect(lastAttemptLabel(attempt(true, null))).toBe("Lần gần nhất: 0/10");
  });

  it("flags an attempt still in progress", () => {
    expect(lastAttemptLabel(attempt(false, null))).toBe("Đang làm dở");
  });
});
