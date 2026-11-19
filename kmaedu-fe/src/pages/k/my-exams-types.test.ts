import { describe, expect, it } from "vitest"
import { examOverview, formatAttemptTime, myExamsView, PREVIEW_COUNT, splitByProgress, type SessionSummary } from "./my-exams-types"

function session(over: Partial<SessionSummary>): SessionSummary {
  return {
    examSessionId: "s",
    examRoomId: "r",
    title: "Đề",
    description: null,
    showAnswersAfterSubmit: false,
    attemptCount: 1,
    bestScore: null,
    bestPercentage: 0,
    lastAttemptAt: "2026-11-17T00:00:00Z",
    hasInProgress: false,
    inProgressAttemptId: null,
    totalViolations: 0,
    isPinned: false,
    ...over,
  }
}

describe("examOverview", () => {
  it("counts rooms, rooms with an open attempt and rooms finished at least once", () => {
    const sessions = [
      session({ examSessionId: "a", hasInProgress: true }),
      session({ examSessionId: "b", bestScore: 80 }),
      session({ examSessionId: "c", hasInProgress: true, bestScore: 40 }),
      session({ examSessionId: "d" }),
    ]
    expect(examOverview(sessions)).toEqual({ total: 4, inProgress: 2, completed: 2 })
  })

  it("counts a finished attempt that scored 0", () => {
    expect(examOverview([session({ bestScore: 0 })])).toEqual({ total: 1, inProgress: 0, completed: 1 })
  })

  it("is all zeros with no rooms", () => {
    expect(examOverview([])).toEqual({ total: 0, inProgress: 0, completed: 0 })
  })
})

describe("splitByProgress", () => {
  it("moves rooms with an open attempt to continuing and keeps the order of both groups", () => {
    const sessions = [
      session({ examSessionId: "pinned", isPinned: true }),
      session({ examSessionId: "open-1", hasInProgress: true }),
      session({ examSessionId: "done" }),
      session({ examSessionId: "open-2", hasInProgress: true, isPinned: true }),
    ]
    const { continuing, others } = splitByProgress(sessions)
    expect(continuing.map((s) => s.examSessionId)).toEqual(["open-1", "open-2"])
    expect(others.map((s) => s.examSessionId)).toEqual(["pinned", "done"])
  })

  it("returns two empty groups for no rooms", () => {
    expect(splitByProgress([])).toEqual({ continuing: [], others: [] })
  })
})

describe("formatAttemptTime", () => {
  // Local-time anchors keep the calendar day the same whatever timezone runs the tests.
  const now = new Date(2026, 10, 18, 12, 0)
  const MIN = 60_000
  const HOUR = 60 * MIN
  const DAY = 24 * HOUR
  const ago = (ms: number) => new Date(now.getTime() - ms).toISOString()

  it.each([
    [ago(30_000), "vừa xong"],
    [ago(MIN), "1 phút trước"],
    [ago(59 * MIN), "59 phút trước"],
    [ago(60 * MIN), "1 giờ trước"],
    [ago(DAY - MIN), "23 giờ trước"],
    [ago(DAY), "1 ngày trước"],
    [ago(7 * DAY - MIN), "6 ngày trước"],
  ])("formats %s as %s", (at, expected) => {
    expect(formatAttemptTime(at, now)).toBe(expected)
  })

  it("shows the date itself from exactly a week back", () => {
    expect(formatAttemptTime(new Date(2026, 10, 11, 12, 0).toISOString(), now)).toBe("11/11/2026")
    expect(formatAttemptTime(new Date(2026, 10, 6, 9, 30).toISOString(), now)).toBe("6/11/2026")
  })

  it("treats a time slightly in the future as just now", () => {
    expect(formatAttemptTime(ago(-5 * MIN), now)).toBe("vừa xong")
  })

  it("returns an empty string for a date it cannot read", () => {
    expect(formatAttemptTime("not-a-date", now)).toBe("")
  })
})

describe("myExamsView", () => {
  const base = { expandedByUser: false, page: 1, othersCount: 3, totalPages: 1, failed: false }

  it("shows every room and no toggle when they fit in the preview on a single page", () => {
    expect(myExamsView(base)).toEqual({ expanded: false, canExpand: false, visibleOthers: 3, showPager: false, showOverview: true })
  })

  it("previews two rows until the user opens the list", () => {
    expect(myExamsView({ ...base, othersCount: 7 })).toMatchObject({ canExpand: true, expanded: false, visibleOthers: PREVIEW_COUNT, showPager: false })
    expect(myExamsView({ ...base, othersCount: 7, expandedByUser: true })).toMatchObject({ expanded: true, visibleOthers: 7, showPager: true })
  })

  it("offers the toggle when more pages exist even if this page fits the preview", () => {
    expect(myExamsView({ ...base, othersCount: 2, totalPages: 3 })).toMatchObject({ canExpand: true, visibleOthers: 2, showPager: false })
  })

  it("always shows the full list and the pager from page 2 on", () => {
    expect(myExamsView({ ...base, page: 2, othersCount: 9, totalPages: 2 })).toMatchObject({ expanded: true, visibleOthers: 9, showPager: true })
  })

  it("keeps the pager reachable when a page holds only rooms in progress", () => {
    expect(myExamsView({ ...base, othersCount: 0, totalPages: 2 })).toMatchObject({ visibleOthers: 0, showPager: true })
  })

  it("shows the header counts only for a complete, successfully loaded list", () => {
    expect(myExamsView({ ...base, totalPages: 0 }).showOverview).toBe(true)
    expect(myExamsView({ ...base, totalPages: 2 }).showOverview).toBe(false)
    expect(myExamsView({ ...base, failed: true }).showOverview).toBe(false)
  })
})
