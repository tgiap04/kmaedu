import { describe, expect, it } from "vitest";
import {
  createdWithin,
  filterRooms,
  formatSpan,
  formatStamp,
  linkSession,
  roomListStats,
  roomTimeline,
  sessionPhase,
  toRoomRow,
  type ExamRoomRow,
} from "./room-status";

const at = (s: string) => new Date(s).getTime();
const NOW = at("2026-11-16T14:30:00");
const w = (start: string, end: string | null) => ({ startTime: new Date(start).toISOString(), endTime: end && new Date(end).toISOString() });

describe("sessionPhase", () => {
  it("is upcoming before the start, ongoing inside the window, ended from the end on", () => {
    expect(sessionPhase(w("2026-11-16T15:00", "2026-11-16T16:00"), NOW)).toBe("upcoming");
    expect(sessionPhase(w("2026-11-16T14:00", "2026-11-16T15:00"), NOW)).toBe("ongoing");
    expect(sessionPhase(w("2026-11-16T14:00", "2026-11-16T14:30"), NOW)).toBe("ended");
  });

  it("never ends a session without an end time, and a session starting now is ongoing", () => {
    expect(sessionPhase(w("2026-11-01T08:00", null), NOW)).toBe("ongoing");
    expect(sessionPhase(w("2026-11-16T14:30", "2026-11-16T15:00"), NOW)).toBe("ongoing");
  });
});

describe("roomTimeline", () => {
  it("is empty without sessions", () => {
    expect(roomTimeline([], NOW)).toEqual({ status: "empty", ongoing: 0, upcoming: 0, ended: 0, startsAt: null, endsAt: null });
  });

  it("ongoing beats upcoming beats ended, and counts each phase", () => {
    const ended = w("2026-11-15T09:00", "2026-11-15T10:00");
    const live = w("2026-11-16T14:00", "2026-11-16T15:00");
    const next = w("2026-11-17T09:00", "2026-11-17T10:00");
    expect(roomTimeline([ended, live, next], NOW)).toMatchObject({ status: "ongoing", ongoing: 1, upcoming: 1, ended: 1 });
    expect(roomTimeline([ended, next], NOW).status).toBe("upcoming");
    expect(roomTimeline([ended], NOW).status).toBe("ended");
  });

  it("spans the first start to the last end, whatever order the sessions come in", () => {
    const t = roomTimeline([w("2026-11-17T09:00", "2026-11-17T10:00"), w("2026-11-15T09:00", "2026-11-15T11:00")], NOW);
    expect(t.startsAt).toBe(new Date("2026-11-15T09:00").toISOString());
    expect(t.endsAt).toBe(new Date("2026-11-17T10:00").toISOString());
  });

  it("has no end while any session is open-ended", () => {
    expect(roomTimeline([w("2026-11-15T09:00", "2026-11-15T10:00"), w("2026-11-16T09:00", null)], NOW).endsAt).toBeNull();
  });
});

describe("formatSpan", () => {
  it("keeps one date for a same-day span", () => {
    expect(formatSpan(roomTimeline([w("2026-11-16T14:00", "2026-11-16T15:00")], NOW))).toBe("16/11/2026 14:00 – 15:00");
  });

  it("writes both dates across days, and says there is no limit when open-ended", () => {
    expect(formatSpan(roomTimeline([w("2026-11-16T14:00", "2026-11-18T09:30")], NOW))).toBe("16/11/2026 14:00 – 18/11/2026 09:30");
    expect(formatSpan(roomTimeline([w("2026-11-16T14:00", null)], NOW))).toBe("16/11/2026 14:00 – Không giới hạn");
  });

  it("says there is no session yet", () => {
    expect(formatSpan(roomTimeline([], NOW))).toBe("Chưa có phiên thi");
  });
});

describe("formatStamp", () => {
  it("joins date and time with a bullet, and is a dash without a value", () => {
    expect(formatStamp(new Date("2026-11-18T18:01").toISOString())).toBe("18/11/2026 • 18:01");
    expect(formatStamp(null)).toBe("–");
  });
});

describe("createdWithin", () => {
  it("today starts at midnight; 7 and 30 days count back from now", () => {
    expect(createdWithin(new Date("2026-11-16T00:00").toISOString(), "today", NOW)).toBe(true);
    expect(createdWithin(new Date("2026-11-15T23:59").toISOString(), "today", NOW)).toBe(false);
    expect(createdWithin(new Date("2026-11-09T14:30").toISOString(), "7d", NOW)).toBe(true);
    expect(createdWithin(new Date("2026-11-09T14:29").toISOString(), "7d", NOW)).toBe(false);
    expect(createdWithin(new Date("2026-10-17T14:30").toISOString(), "30d", NOW)).toBe(true);
    expect(createdWithin(new Date("2020-01-01T00:00").toISOString(), "all", NOW)).toBe(true);
  });
});

const room = (over: Partial<ExamRoomRow> & Pick<ExamRoomRow, "id">): ExamRoomRow => ({
  title: "Phòng",
  quizSetTitle: null,
  questionCount: 0,
  createdAt: new Date("2026-11-16T08:00").toISOString(),
  participants: 0,
  timeline: roomTimeline([], NOW),
  ...over,
});

describe("toRoomRow", () => {
  it("reads the quiz set, counts and windows, and copes with a room the server sent without them", () => {
    const row = toRoomRow(
      {
        id: "r1",
        title: "Thi cuối kỳ",
        quizSetId: "q1",
        hostId: "h",
        createdAt: "2026-11-01T00:00:00.000Z",
        updatedAt: "2026-11-01T00:00:00.000Z",
        quizSet: { id: "q1", title: "Bộ đề 2", _count: { detailsQuizQuestions: 12 } },
        sessionWindows: [w("2026-11-16T14:00", "2026-11-16T15:00")],
        participantCount: 7,
      },
      NOW,
    );
    expect(row).toMatchObject({ id: "r1", quizSetTitle: "Bộ đề 2", questionCount: 12, participants: 7 });
    expect(row.timeline.status).toBe("ongoing");

    const bare = toRoomRow({ id: "r2", title: "Mới", quizSetId: "q", hostId: "h", createdAt: "", updatedAt: "" }, NOW);
    expect(bare).toMatchObject({ quizSetTitle: null, questionCount: 0, participants: 0 });
    expect(bare.timeline.status).toBe("empty");
  });

  it("falls back to the stored question count", () => {
    const row = toRoomRow({ id: "r", title: "t", quizSetId: "q", hostId: "h", createdAt: "", updatedAt: "", quizSet: { id: "q", title: "x", questionCount: 5 } }, NOW);
    expect(row.questionCount).toBe(5);
  });
});

describe("filterRooms", () => {
  const live = roomTimeline([w("2026-11-16T14:00", "2026-11-16T15:00")], NOW);
  const done = roomTimeline([w("2026-11-10T14:00", "2026-11-10T15:00")], NOW);
  const rows = [
    room({ id: "a", title: "Kiểm tra giữa kỳ – Lớp HĐH", timeline: live }),
    room({ id: "b", title: "Ôn tập Linux", quizSetTitle: "Bộ đề Hệ điều hành", timeline: done, createdAt: new Date("2026-10-01T00:00").toISOString() }),
    room({ id: "c", title: "Phòng trống" }),
  ];
  const all = { search: "", status: "all", created: "all" } as const;

  it("matches title or quiz set, ignoring case and Vietnamese marks", () => {
    expect(filterRooms(rows, { ...all, search: "hdh" }, NOW).map((r) => r.id)).toEqual(["a"]);
    expect(filterRooms(rows, { ...all, search: "he dieu hanh" }, NOW).map((r) => r.id)).toEqual(["b"]);
    expect(filterRooms(rows, { ...all, search: "  " }, NOW)).toHaveLength(3);
  });

  it("filters by status and by creation time together", () => {
    expect(filterRooms(rows, { ...all, status: "ongoing" }, NOW).map((r) => r.id)).toEqual(["a"]);
    expect(filterRooms(rows, { ...all, status: "empty" }, NOW).map((r) => r.id)).toEqual(["c"]);
    expect(filterRooms(rows, { ...all, status: "ended", created: "7d" }, NOW)).toEqual([]);
  });
});

describe("roomListStats", () => {
  it("counts rooms by status and adds up participants", () => {
    const live = roomTimeline([w("2026-11-16T14:00", "2026-11-16T15:00")], NOW);
    const done = roomTimeline([w("2026-11-10T14:00", "2026-11-10T15:00")], NOW);
    expect(roomListStats([room({ id: "a", timeline: live, participants: 48 }), room({ id: "b", timeline: done, participants: 32 }), room({ id: "c" })])).toEqual({
      total: 3,
      ongoing: 1,
      ended: 1,
      participants: 80,
    });
  });
});

describe("linkSession", () => {
  const s = (id: string, start: string, end: string | null) => ({ id, ...w(start, end) });

  it("takes the running session (the latest to start), else the next one, else none", () => {
    const ended = s("old", "2026-11-15T09:00", "2026-11-15T10:00");
    const live1 = s("live1", "2026-11-16T13:00", "2026-11-16T16:00");
    const live2 = s("live2", "2026-11-16T14:00", null);
    const soon = s("soon", "2026-11-17T09:00", "2026-11-17T10:00");
    const later = s("later", "2026-11-20T09:00", "2026-11-20T10:00");
    expect(linkSession([ended, live1, live2, soon], NOW)).toBe("live2");
    expect(linkSession([later, ended, soon], NOW)).toBe("soon");
    expect(linkSession([ended], NOW)).toBeNull();
    expect(linkSession([], NOW)).toBeNull();
  });
});
