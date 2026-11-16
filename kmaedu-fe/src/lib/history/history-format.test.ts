import { describe, expect, it } from "vitest";
import { formatTimeAgo, scoreTone } from "./history-format";

const NOW = new Date("2026-11-16T12:00:00Z");
const ago = (ms: number) => new Date(NOW.getTime() - ms).toISOString();
const MIN = 60_000;
const DAY = 24 * 60 * MIN;

describe("formatTimeAgo", () => {
  it("covers each unit and its boundary", () => {
    expect(formatTimeAgo(ago(30_000), NOW)).toBe("vừa xong");
    expect(formatTimeAgo(ago(MIN), NOW)).toBe("1 phút trước");
    expect(formatTimeAgo(ago(59 * MIN), NOW)).toBe("59 phút trước");
    expect(formatTimeAgo(ago(60 * MIN), NOW)).toBe("1 giờ trước");
    expect(formatTimeAgo(ago(DAY), NOW)).toBe("1 ngày trước");
    expect(formatTimeAgo(ago(6 * DAY), NOW)).toBe("6 ngày trước");
    expect(formatTimeAgo(ago(7 * DAY), NOW)).toBe("1 tuần trước");
    expect(formatTimeAgo(ago(30 * DAY), NOW)).toBe("1 tháng trước");
    expect(formatTimeAgo(ago(400 * DAY), NOW)).toBe("1 năm trước");
  });

  it("treats a future or invalid date safely", () => {
    expect(formatTimeAgo(ago(-5 * MIN), NOW)).toBe("vừa xong");
    expect(formatTimeAgo("not-a-date", NOW)).toBe("");
  });
});

describe("scoreTone", () => {
  it("is good from 80%, fair from 60%, poor below", () => {
    expect(scoreTone(100)).toBe("good");
    expect(scoreTone(80)).toBe("good");
    expect(scoreTone(79)).toBe("fair");
    expect(scoreTone(60)).toBe("fair");
    expect(scoreTone(59)).toBe("poor");
    expect(scoreTone(0)).toBe("poor");
  });

  it("treats a missing score as poor", () => {
    expect(scoreTone(Number.NaN)).toBe("poor");
  });
});
