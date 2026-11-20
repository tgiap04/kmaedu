import { describe, expect, it } from "vitest";
import { attemptSpentSeconds, formatSpent } from "./attempt-time";

describe("attemptSpentSeconds", () => {
  it("counts whole seconds from start to hand-in", () => {
    expect(attemptSpentSeconds("2026-11-20T08:19:00.000Z", "2026-11-20T10:16:03.900Z")).toBe(7023);
  });

  it("is null while in progress or with an unusable date", () => {
    expect(attemptSpentSeconds("2026-11-20T08:19:00.000Z", null)).toBeNull();
    expect(attemptSpentSeconds("không phải ngày", "2026-11-20T10:16:03.000Z")).toBeNull();
  });

  it("never goes below zero", () => {
    expect(attemptSpentSeconds("2026-11-20T08:19:00.000Z", "2026-11-20T08:18:00.000Z")).toBe(0);
  });
});

describe("formatSpent", () => {
  it("formats minutes, hours and zero", () => {
    expect(formatSpent(307)).toBe("5:07");
    expect(formatSpent(7023)).toBe("1:57:03");
    expect(formatSpent(0)).toBe("0:00");
  });

  it("passes null through and rejects non-numbers", () => {
    expect(formatSpent(null)).toBeNull();
    expect(formatSpent(Number.NaN)).toBeNull();
  });
});
