import { describe, expect, it } from "vitest";
import { formatCompactCount, formatFileSize, formatTimeAgo, scoreTone } from "./history-format";

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

describe("formatFileSize", () => {
  it("shows KB below one MB (never 0 KB for a real file) and one decimal in MB", () => {
    expect(formatFileSize(0)).toBe("0 KB");
    expect(formatFileSize(1)).toBe("1 KB");
    expect(formatFileSize(512 * 1024)).toBe("512 KB");
    expect(formatFileSize(1024 * 1024 - 1)).toBe("1024 KB");
    expect(formatFileSize(1024 * 1024)).toBe("1.0 MB");
    expect(formatFileSize(2.4 * 1024 * 1024)).toBe("2.4 MB");
  });
});

describe("formatCompactCount", () => {
  it("keeps small numbers and shortens thousands and millions", () => {
    expect(formatCompactCount(0)).toBe("0");
    expect(formatCompactCount(999)).toBe("999");
    expect(formatCompactCount(1000)).toBe("1k");
    expect(formatCompactCount(1234)).toBe("1.2k");
    expect(formatCompactCount(856_000)).toBe("856k");
    expect(formatCompactCount(1_500_000)).toBe("1.5M");
  });
});
