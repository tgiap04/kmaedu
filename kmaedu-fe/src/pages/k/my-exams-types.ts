import type { RecentExamAttempt } from "@/apis/studentMaterialsApi"
import { formatTimeAgo } from "@/lib/history/history-format"

export interface SessionSummary {
  examSessionId: string
  examRoomId: string
  title: string
  description: string | null
  showAnswersAfterSubmit: boolean
  attemptCount: number
  bestScore: number | null
  bestPercentage: number
  lastAttemptAt: string
  hasInProgress: boolean
  inProgressAttemptId: string | null
  totalViolations: number
  isPinned: boolean
}

export function groupBySession(attempts: RecentExamAttempt[]): SessionSummary[] {
  const map = new Map<string, RecentExamAttempt[]>()
  for (const a of attempts) {
    const key = a.examSessionId
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(a)
  }

  const summaries: SessionSummary[] = []
  for (const [examSessionId, group] of map) {
    const first = group[0]
    const completed = group.filter((a) => a.status === 1)

    const bestScore = completed.length > 0
      ? Math.max(...completed.map((a) => a.score ?? 0))
      : null

    const bestPercentage = completed.length > 0
      ? Math.max(
          ...completed.map((a) =>
            a.totalQuestions > 0
              ? Math.round((a.correctAnswers / a.totalQuestions) * 100)
              : 0,
          ),
        )
      : 0

    const lastAttemptAt = group.reduce(
      (max, a) => (a.startedAt > max ? a.startedAt : max),
      group[0].startedAt,
    )

    summaries.push({
      examSessionId,
      examRoomId: first.examSession.examRoom.id,
      title: first.examSession.examRoom.title,
      description: first.examSession.examRoom.description,
      showAnswersAfterSubmit: first.examSession.showAnswersAfterSubmit,
      attemptCount: group.length,
      bestScore,
      bestPercentage,
      lastAttemptAt,
      hasInProgress: group.some((a) => a.status === 0),
      inProgressAttemptId: group.find((a) => a.status === 0)?.id ?? null,
      totalViolations: group.reduce((sum, a) => sum + (a.violationCount ?? 0), 0),
      isPinned: first.isPinned,
    })
  }
  return summaries
}

export function sortWithPinnedFirst(sessions: SessionSummary[]): SessionSummary[] {
  return [
    ...sessions.filter((s) => s.isPinned),
    ...sessions.filter((s) => !s.isPinned),
  ]
}


export interface ExamOverview {
  total: number
  inProgress: number
  completed: number
}

/** Header counts: rooms joined, rooms with an attempt still open, rooms finished at least once. */
export function examOverview(sessions: SessionSummary[]): ExamOverview {
  return {
    total: sessions.length,
    inProgress: sessions.filter((s) => s.hasInProgress).length,
    completed: sessions.filter((s) => s.bestScore !== null).length,
  }
}

/** Rooms with an open attempt go to "Tiếp tục học"; both groups keep the incoming order (pinned first). */
export function splitByProgress(sessions: SessionSummary[]): { continuing: SessionSummary[]; others: SessionSummary[] } {
  return {
    continuing: sessions.filter((s) => s.hasInProgress),
    others: sessions.filter((s) => !s.hasInProgress),
  }
}

const WEEK_MS = 7 * 24 * 60 * 60 * 1000

/** "5 phút trước" for the last week (shared wording), then the date itself (d/m/yyyy); "" when the date cannot be read. */
export function formatAttemptTime(dateString: string, now: Date = new Date()): string {
  const time = new Date(dateString).getTime()
  if (Number.isNaN(time)) return ""
  if (now.getTime() - time >= WEEK_MS) return new Date(time).toLocaleDateString("vi-VN")
  return formatTimeAgo(dateString, now)
}

/** Two rows of two cards before "Xem tất cả". */
export const PREVIEW_COUNT = 4

export interface MyExamsViewInput {
  expandedByUser: boolean
  page: number
  othersCount: number
  totalPages: number
  failed: boolean
}

/**
 * What the page shows: page 2+ only exists in the full list, the pager belongs to the full list (or to a page
 * holding only rooms in progress), and the header counts are shown only when the loaded page is the whole list.
 */
export function myExamsView({ expandedByUser, page, othersCount, totalPages, failed }: MyExamsViewInput) {
  const expanded = expandedByUser || page > 1
  const canExpand = othersCount > PREVIEW_COUNT || totalPages > 1
  return {
    expanded,
    canExpand,
    visibleOthers: expanded || !canExpand ? othersCount : Math.min(othersCount, PREVIEW_COUNT),
    showPager: expanded || othersCount === 0,
    showOverview: !failed && totalPages <= 1,
  }
}
