import { format, isSameDay, startOfDay, subDays } from "date-fns";
import { fold } from "@/lib/manage-exam/exam-question-picker";
import type { ExamRoom } from "@/types/examRoom";

/** Where a room stands, read from its sessions' times (the stored session status is never updated). */
export type RoomStatus = "ongoing" | "upcoming" | "ended" | "empty";

export interface SessionWindow {
  startTime: string;
  endTime?: string | null;
}

export interface RoomTimeline {
  status: RoomStatus;
  ongoing: number;
  upcoming: number;
  ended: number;
  /** The first session's start; null without sessions. */
  startsAt: string | null;
  /** The last session's end; null without sessions or while any session has no end. */
  endsAt: string | null;
}

/** One room as the list shows it. */
export interface ExamRoomRow {
  id: string;
  title: string;
  quizSetTitle: string | null;
  questionCount: number;
  createdAt: string;
  participants: number;
  timeline: RoomTimeline;
}

export type StatusFilter = "all" | RoomStatus;
export type CreatedFilter = "all" | "today" | "7d" | "30d";

export interface RoomFilters {
  search: string;
  status: StatusFilter;
  created: CreatedFilter;
}

export const ROOM_STATUS_LABEL: Record<RoomStatus, string> = {
  ongoing: "Đang diễn ra",
  upcoming: "Sắp diễn ra",
  ended: "Đã kết thúc",
  empty: "Chưa có phiên",
};

/** A session is ongoing from its start until its end; one without an end never ends. */
export function sessionPhase(w: SessionWindow, now: number): Exclude<RoomStatus, "empty"> {
  if (Date.parse(w.startTime) > now) return "upcoming";
  if (w.endTime && Date.parse(w.endTime) <= now) return "ended";
  return "ongoing";
}

export function roomTimeline(windows: readonly SessionWindow[], now: number): RoomTimeline {
  const t: RoomTimeline = { status: "empty", ongoing: 0, upcoming: 0, ended: 0, startsAt: null, endsAt: null };
  let first = Infinity;
  let last = -Infinity;
  let openEnded = false;
  for (const w of windows) {
    t[sessionPhase(w, now)] += 1;
    const start = Date.parse(w.startTime);
    if (start < first) {
      first = start;
      t.startsAt = w.startTime;
    }
    if (!w.endTime) openEnded = true;
    else if (Date.parse(w.endTime) > last) {
      last = Date.parse(w.endTime);
      t.endsAt = w.endTime;
    }
  }
  if (openEnded) t.endsAt = null;
  t.status = t.ongoing ? "ongoing" : t.upcoming ? "upcoming" : t.ended ? "ended" : "empty";
  return t;
}

const DAY = "dd/MM/yyyy";
const TIME = "HH:mm";

/** "16/11/2026 14:00 – 15:00"; both dates when the span crosses midnight. */
export function formatSpan({ startsAt, endsAt }: Pick<RoomTimeline, "startsAt" | "endsAt">): string {
  if (!startsAt) return "Chưa có phiên thi";
  const start = new Date(startsAt);
  const head = `${format(start, DAY)} ${format(start, TIME)}`;
  if (!endsAt) return `${head} – Không giới hạn`;
  const end = new Date(endsAt);
  return isSameDay(start, end) ? `${head} – ${format(end, TIME)}` : `${head} – ${format(end, DAY)} ${format(end, TIME)}`;
}

/** "18/11/2026 • 18:01", or a dash. */
export function formatStamp(value: string | null | undefined): string {
  if (!value) return "–";
  const d = new Date(value);
  return `${format(d, DAY)} • ${format(d, TIME)}`;
}

export function createdWithin(createdAt: string, range: CreatedFilter, now: number): boolean {
  if (range === "all") return true;
  const from = range === "today" ? startOfDay(now) : subDays(now, range === "7d" ? 7 : 30);
  return Date.parse(createdAt) >= from.getTime();
}

export function toRoomRow(room: ExamRoom, now: number): ExamRoomRow {
  return {
    id: room.id,
    title: room.title,
    quizSetTitle: room.quizSet?.title || null,
    questionCount: room.quizSet?._count?.detailsQuizQuestions || room.quizSet?.questionCount || 0,
    createdAt: room.createdAt,
    participants: room.participantCount ?? 0,
    timeline: roomTimeline(room.sessionWindows ?? [], now),
  };
}

export function filterRooms(rows: readonly ExamRoomRow[], filters: RoomFilters, now: number): ExamRoomRow[] {
  const term = fold(filters.search.trim());
  return rows.filter(
    (r) =>
      (filters.status === "all" || r.timeline.status === filters.status) &&
      createdWithin(r.createdAt, filters.created, now) &&
      (!term || fold(r.title).includes(term) || (r.quizSetTitle !== null && fold(r.quizSetTitle).includes(term))),
  );
}

export function roomListStats(rows: readonly ExamRoomRow[]) {
  let ongoing = 0;
  let ended = 0;
  let participants = 0;
  for (const r of rows) {
    if (r.timeline.status === "ongoing") ongoing += 1;
    else if (r.timeline.status === "ended") ended += 1;
    participants += r.participants;
  }
  return { total: rows.length, ongoing, ended, participants };
}

/** The session whose link the room hands out: the running one that started last, else the next to start. */
export function linkSession(sessions: readonly (SessionWindow & { id: string })[], now: number): string | null {
  let live: (SessionWindow & { id: string }) | null = null;
  let next: (SessionWindow & { id: string }) | null = null;
  for (const s of sessions) {
    const phase = sessionPhase(s, now);
    if (phase === "ongoing" && (!live || Date.parse(s.startTime) > Date.parse(live.startTime))) live = s;
    if (phase === "upcoming" && (!next || Date.parse(s.startTime) < Date.parse(next.startTime))) next = s;
  }
  return (live ?? next)?.id ?? null;
}
