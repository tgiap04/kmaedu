import type { ExamSessionStats } from "@/apis/examSessionApi";
import type { ExamAttemptListItem } from "@/apis/examAttemptApi";
import type { ExamSession } from "@/types/examSession";
import { displayUserName } from "@/lib/user/display-user-name";

/** What the waiting page shows, built the same way for a candidate (stats API) and the room's host (session API). */
export interface WaitingRoomView {
  title: string;
  subtitle: string;
  examRoomId: string;
  quizSetTitle: string;
  startTime: string;
  endTime: string | null;
  hostName: string;
  /** Minutes one attempt may last; null: until the session closes. */
  attemptMinutes: number | null;
  totalQuestions: number | null;
  /** Pass mark in percent; 0: none. */
  passingScore: number;
  attemptsLabel: string;
  antiCheatEnabled: boolean;
  allowLeaveMidway: boolean;
}

export const NO_TIME_LIMIT = "Không giới hạn";

export function durationLabel(minutes: number | null): string {
  return minutes === null ? NO_TIME_LIMIT : `${minutes} phút`;
}

export function passingLabel(score: number): string {
  return score > 0 ? `${score}%` : "Không yêu cầu";
}

/** "Lần đầu" before any attempt; "2/3" when attempts are capped; "Lần 3" when they are not. */
export function attemptsLabel(done: number, max: number | null): string {
  if (max !== null) return `${Math.min(done + 1, max)}/${max}`;
  return done === 0 ? "Lần đầu" : `Lần ${done + 1}`;
}

/** Text of the footer note: what happens when time runs out. */
export function footerNote(view: Pick<WaitingRoomView, "attemptMinutes" | "endTime">): string {
  if (view.attemptMinutes !== null || view.endTime) return "Bài thi sẽ tự động nộp khi hết thời gian.";
  return "Bạn có thể làm bài tới khi phiên thi được đóng.";
}

export function fromStudentStats(stats: ExamSessionStats): WaitingRoomView {
  return {
    title: stats.title,
    subtitle: stats.description || "Thi trực tuyến",
    examRoomId: stats.examRoomId ?? "",
    quizSetTitle: stats.quizSetTitle || "–",
    startTime: stats.startTime,
    endTime: stats.endTime,
    hostName: displayUserName(stats.host),
    attemptMinutes: stats.attemptDurationMinutes ?? null,
    totalQuestions: stats.totalQuestions,
    passingScore: stats.passingScore,
    attemptsLabel: attemptsLabel(stats.currentAttempt, stats.maxAttempts),
    antiCheatEnabled: stats.antiCheatEnabled ?? true,
    allowLeaveMidway: stats.allowLeaveMidway ?? true,
  };
}

export function fromHostSession(session: ExamSession): WaitingRoomView {
  const room = session.examRoom;
  return {
    title: room?.title ?? "Phòng thi",
    subtitle: room?.description || "Thi trực tuyến",
    examRoomId: session.examRoomId,
    quizSetTitle: room?.quizSet?.title || "–",
    startTime: session.startTime,
    endTime: session.endTime ?? null,
    hostName: displayUserName(room?.host),
    attemptMinutes: session.durationMinutes ?? null,
    totalQuestions: session.totalQuestions ?? null,
    passingScore: session.passingScore ?? 0,
    attemptsLabel: session.allowRetake ? `Tối đa ${session.maxAttempts} lần` : "1 lần",
    antiCheatEnabled: session.antiCheatEnabled ?? true,
    allowLeaveMidway: session.allowLeaveMidway ?? true,
  };
}

export interface RosterCounts {
  /** Candidates who opened at least one attempt. */
  joined: number;
  /** Candidates whose latest attempt is still open. */
  inProgress: number;
  /** Invited candidates with no attempt yet; null when the session is not invite-only. */
  notStarted: number | null;
}

/** Counts for the host's candidate panel. `attempts` is one row per candidate (their latest attempt). */
export function rosterCounts(attempts: ExamAttemptListItem[], whitelist: string[] | undefined): RosterCounts {
  const joinedIds = new Set(attempts.map((a) => a.userId));
  const inProgress = attempts.filter((a) => a.status === 0).length;
  const invited = whitelist?.length ? new Set(whitelist) : null;
  const notStarted = invited ? [...invited].filter((id) => !joinedIds.has(id)).length : null;
  return { joined: joinedIds.size, inProgress, notStarted };
}
