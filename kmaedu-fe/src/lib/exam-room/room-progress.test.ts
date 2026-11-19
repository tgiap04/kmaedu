import { describe, expect, it } from "vitest";
import { completionPercent, timelinePoints } from "./room-progress";

describe("completionPercent", () => {
  it("is the share of candidates who submitted, rounded, and 0 for an empty room", () => {
    expect(completionPercent({ completed: 36, candidates: 48 })).toBe(75);
    expect(completionPercent({ completed: 1, candidates: 3 })).toBe(33);
    expect(completionPercent({ completed: 0, candidates: 0 })).toBe(0);
    expect(completionPercent({ completed: 5, candidates: 5 })).toBe(100);
  });
});

describe("timelinePoints", () => {
  const from = new Date("2026-11-18T17:30").toISOString();

  it("labels each bucket with its start time", () => {
    expect(timelinePoints({ window: "30m", from, bucketMinutes: 2, counts: [0, 3, 1] })).toEqual([
      { label: "17:30", count: 0 },
      { label: "17:32", count: 3 },
      { label: "17:34", count: 1 },
    ]);
  });

  it("adds the day for the week view", () => {
    expect(timelinePoints({ window: "7d", from, bucketMinutes: 720, counts: [2, 0] })).toEqual([
      { label: "18/11 17:30", count: 2 },
      { label: "19/11 05:30", count: 0 },
    ]);
  });
});
