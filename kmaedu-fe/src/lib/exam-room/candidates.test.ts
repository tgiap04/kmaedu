import { describe, expect, it, vi } from "vitest";
import type { RoomCandidate, RoomCandidatesResponse } from "@/apis/examAttemptApi";
import { candidatesCsv, CANDIDATE_STATUS_LABEL, formatTimeSpent, readAllCandidates } from "./candidates";

const candidate = (over: Partial<RoomCandidate> = {}): RoomCandidate => ({
  userId: "u1",
  user: { id: "u1", username: "levanc", name: "Lê Văn C" },
  status: "submitted",
  attemptId: "a1",
  sessionId: "s1",
  startedAt: new Date("2026-11-18T18:01").toISOString(),
  finishedAt: new Date("2026-11-18T18:03").toISOString(),
  score: 90,
  passed: true,
  timeSpentSeconds: 120,
  attemptCount: 1,
  ...over,
});

describe("formatTimeSpent", () => {
  it("reads seconds, minutes and hours the way the table shows them", () => {
    expect(formatTimeSpent(null)).toBe("–");
    expect(formatTimeSpent(0)).toBe("0 giây");
    expect(formatTimeSpent(45)).toBe("45 giây");
    expect(formatTimeSpent(120)).toBe("2 phút");
    expect(formatTimeSpent(150)).toBe("3 phút");
    expect(formatTimeSpent(3600)).toBe("1 giờ");
    expect(formatTimeSpent(3900)).toBe("1 giờ 5 phút");
  });
});

describe("candidatesCsv", () => {
  it("opens with a BOM and a header, then one line per candidate", () => {
    const csv = candidatesCsv([
      candidate(),
      candidate({ userId: "u2", user: { id: "u2", username: "tranthib", name: "Trần Thị B" }, status: "in_progress", finishedAt: null, score: null, passed: null, timeSpentSeconds: null }),
      candidate({ userId: "u3", user: null, status: "not_started", attemptId: null, sessionId: null, startedAt: null, finishedAt: null, score: null, passed: null, timeSpentSeconds: null, attemptCount: 0 }),
    ]);
    expect(csv.startsWith("\uFEFF")).toBe(true);
    const lines = csv.slice(1).split("\r\n");
    expect(lines[0]).toBe("STT,Thí sinh,Tên đăng nhập,Trạng thái,Bắt đầu làm,Nộp bài lúc,Điểm (%),Kết quả,Thời gian làm,Số lần làm");
    expect(lines[1]).toBe("1,Lê Văn C,levanc,Đã nộp,18/11/2026 18:01,18/11/2026 18:03,90,Đạt,2 phút,1");
    expect(lines[2]).toBe("2,Trần Thị B,tranthib,Đang làm,18/11/2026 18:01,,,,,1");
    expect(lines[3]).toBe("3,Người dùng đã xóa,,Chưa bắt đầu,,,,,,0");
    expect(lines).toHaveLength(4);
  });

  it("quotes commas, quotes and line breaks, and defuses cells a spreadsheet would run as a formula", () => {
    const csv = candidatesCsv([
      candidate({ user: { id: "u", username: "=cmd|' /C calc'!A0", name: 'Nguyễn "Tí", lớp\nA' }, passed: false, score: 40 }),
    ]);
    const row = csv.slice(1).split("\r\n").slice(1).join("\r\n");
    expect(row).toContain('"Nguyễn ""Tí"", lớp\nA"');
    expect(row).toContain("'=cmd|' /C calc'!A0");
    expect(row).toContain("Chưa đạt");
  });

  it("labels every status", () => {
    expect(CANDIDATE_STATUS_LABEL).toEqual({ submitted: "Đã nộp", in_progress: "Đang làm", not_started: "Chưa bắt đầu", cancelled: "Đã hủy" });
  });
});

describe("readAllCandidates", () => {
  const page = (n: number, totalPages: number): RoomCandidatesResponse => ({
    candidates: [candidate({ userId: `p${n}` })],
    total: totalPages,
    page: n,
    limit: 100,
    totalPages,
  });

  it("reads every page at the largest size, in order", async () => {
    const fetchPage = vi.fn(async (p: number) => page(p, 3));
    const rows = await readAllCandidates(fetchPage);
    expect(rows.map((r) => r.userId)).toEqual(["p1", "p2", "p3"]);
    expect(fetchPage.mock.calls).toEqual([[1, 100], [2, 100], [3, 100]]);
  });

  it("stops at the first failure and lets it through", async () => {
    const fetchPage = vi.fn(async (p: number) => {
      if (p === 2) throw new Error("429");
      return page(p, 4);
    });
    await expect(readAllCandidates(fetchPage)).rejects.toThrow("429");
    expect(fetchPage).toHaveBeenCalledTimes(2);
  });

  it("drops a candidate a later page repeats, and refuses a list that changed size while it was read", async () => {
    const shifting = vi.fn(async (p: number) => ({
      ...page(p, 2),
      total: 3,
      candidates: [candidate({ userId: p === 1 ? "u1" : "u1" }), candidate({ userId: p === 1 ? "u2" : "u3" })],
    }));
    expect((await readAllCandidates(shifting)).map((r) => r.userId)).toEqual(["u1", "u2", "u3"]);

    const growing = vi.fn(async (p: number) => ({ ...page(p, 2), total: p === 1 ? 2 : 3 }));
    await expect(readAllCandidates(growing)).rejects.toThrow(/vừa thay đổi/);
  });

  it("refuses a read that lost a candidate to a reorder, even with the same total", async () => {
    // Page 1 had u1, u2; a retake moved u1 to the end, so page 2 starts at u3's old slot and repeats u2.
    const reordered = vi.fn(async (p: number) => ({
      ...page(p, 2),
      total: 3,
      candidates: p === 1 ? [candidate({ userId: "u1" }), candidate({ userId: "u2" })] : [candidate({ userId: "u2" })],
    }));
    await expect(readAllCandidates(reordered)).rejects.toThrow(/vừa thay đổi/);
  });

  it("gives up on a room too large to export", async () => {
    await expect(readAllCandidates(async (p) => page(p, 51))).rejects.toThrow(/quá nhiều/);
  });
});
