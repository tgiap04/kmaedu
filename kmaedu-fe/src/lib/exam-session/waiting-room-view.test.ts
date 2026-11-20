import { describe, expect, it } from "vitest";
import type { ExamSessionStats } from "@/apis/examSessionApi";
import type { ExamAttemptListItem } from "@/apis/examAttemptApi";
import type { ExamSession } from "@/types/examSession";
import { attemptsLabel, durationLabel, footerNote, fromHostSession, fromStudentStats, passingLabel, rosterCounts } from "./waiting-room-view";

const stats: ExamSessionStats = {
  id: "s1",
  title: "Phòng thi test 1",
  description: null,
  startTime: "2026-11-19T10:59:00.000Z",
  endTime: "2026-11-19T12:00:00.000Z",
  status: 1,
  durationMinutes: 61,
  totalQuestions: 18,
  passingScore: 0,
  currentAttempt: 0,
  maxAttempts: null,
  progress: { answered: 0, marked: 0, total: 18 },
  examRoomId: "room-1",
  quizSetTitle: "Bộ đề test 3",
  host: { id: "h1", username: "admin", name: "Admin" },
  attemptDurationMinutes: null,
  antiCheatEnabled: true,
  allowLeaveMidway: true,
};

describe("labels", () => {
  it("duration: minutes, or no limit", () => {
    expect(durationLabel(45)).toBe("45 phút");
    expect(durationLabel(null)).toBe("Không giới hạn");
  });

  it("pass mark: percent, or none at 0", () => {
    expect(passingLabel(60)).toBe("60%");
    expect(passingLabel(0)).toBe("Không yêu cầu");
  });

  it("attempts: first, numbered, or against the cap (never past it)", () => {
    expect(attemptsLabel(0, null)).toBe("Lần đầu");
    expect(attemptsLabel(2, null)).toBe("Lần 3");
    expect(attemptsLabel(0, 3)).toBe("1/3");
    expect(attemptsLabel(3, 3)).toBe("3/3");
  });

  it("footer note depends on whether anything ends the attempt", () => {
    expect(footerNote({ attemptMinutes: 30, endTime: null })).toContain("tự động nộp");
    expect(footerNote({ attemptMinutes: null, endTime: "2026-11-19T12:00:00.000Z" })).toContain("tự động nộp");
    expect(footerNote({ attemptMinutes: null, endTime: null })).toContain("tới khi phiên thi được đóng");
  });
});

describe("fromStudentStats", () => {
  it("uses the attempt limit, not the session window, for the time", () => {
    expect(fromStudentStats(stats)).toMatchObject({
      title: "Phòng thi test 1",
      subtitle: "Thi trực tuyến",
      quizSetTitle: "Bộ đề test 3",
      hostName: "Admin",
      attemptMinutes: null,
      attemptsLabel: "Lần đầu",
    });
    expect(fromStudentStats({ ...stats, attemptDurationMinutes: 45 }).attemptMinutes).toBe(45);
  });

  it("falls back when an older server sends none of the new fields", () => {
    const old = { ...stats, examRoomId: undefined, quizSetTitle: undefined, host: undefined, attemptDurationMinutes: undefined, antiCheatEnabled: undefined, allowLeaveMidway: undefined };
    expect(fromStudentStats(old)).toMatchObject({ quizSetTitle: "–", attemptMinutes: null, antiCheatEnabled: true, allowLeaveMidway: true });
  });
});

describe("fromHostSession", () => {
  it("reads the room, the host and the three rules", () => {
    const session = {
      id: "s1",
      examRoomId: "room-1",
      status: 1,
      startTime: stats.startTime,
      autoJoinByLink: false,
      assessType: 1,
      allowRetake: true,
      maxAttempts: 2,
      passingScore: 50,
      durationMinutes: 30,
      antiCheatEnabled: false,
      allowLeaveMidway: false,
      totalQuestions: 18,
      examRoom: { id: "room-1", title: "Phòng A", quizSet: { id: "q", title: "Bộ đề B" }, host: { id: "h", username: "gv", name: "" } },
    } as ExamSession;
    expect(fromHostSession(session)).toMatchObject({
      title: "Phòng A",
      quizSetTitle: "Bộ đề B",
      hostName: "gv",
      endTime: null,
      attemptMinutes: 30,
      passingScore: 50,
      attemptsLabel: "Tối đa 2 lần",
      antiCheatEnabled: false,
      allowLeaveMidway: false,
      totalQuestions: 18,
    });
  });
});

describe("rosterCounts", () => {
  const attempt = (userId: string, status: number) => ({ userId, status }) as ExamAttemptListItem;

  it("counts joined and still-working candidates", () => {
    expect(rosterCounts([attempt("a", 0), attempt("b", 1)], undefined)).toEqual({ joined: 2, inProgress: 1, notStarted: null });
  });

  it("counts invited candidates who have not started; outsiders do not lower it", () => {
    expect(rosterCounts([attempt("a", 1), attempt("x", 0)], ["a", "b", "c"])).toEqual({ joined: 2, inProgress: 1, notStarted: 2 });
  });

  it("is all zero before anyone joins", () => {
    expect(rosterCounts([], ["a", "b"])).toEqual({ joined: 0, inProgress: 0, notStarted: 2 });
    expect(rosterCounts([], [])).toEqual({ joined: 0, inProgress: 0, notStarted: null });
  });
});
