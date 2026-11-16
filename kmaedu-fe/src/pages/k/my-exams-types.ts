import type { RecentExamAttempt } from "@/apis/studentMaterialsApi"

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

