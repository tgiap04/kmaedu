import { ClockIcon, PlayIcon, PushPinIcon } from "@phosphor-icons/react"
import { Button } from "@/components/antd/button"
import type { SessionSummary } from "../my-exams-types"
import { CardMenu, ExamMeta, ExamStats } from "./session-card"

function resumeUrl(session: SessionSummary): string {
  const base = `/exam-session/${session.examSessionId}/quiz`
  return session.inProgressAttemptId ? `${base}?attemptId=${session.inProgressAttemptId}` : base
}

/**
 * A room with an open attempt, shown under "Tiếp tục học". The card lays itself out by its own width:
 * one row when wide, title and buttons over the results when medium, everything stacked when narrow.
 */
export function ContinueExamCard({
  session,
  onViewHistory,
  onTogglePin,
}: {
  session: SessionSummary
  onViewHistory: (s: SessionSummary) => void
  onTogglePin: (s: SessionSummary) => void
}) {
  return (
    <article className="@container rounded-lg border border-brand-border bg-gradient-to-r from-[#fff7f6] to-[#fdeeed] p-4 shadow-[0_4px_20px_rgba(238,47,43,0.06)]">
      <div className="grid items-center gap-4 @3xl:grid-cols-[minmax(0,1fr)_auto] @5xl:grid-cols-[minmax(0,1fr)_auto_auto]">
        <div className="flex min-w-0 items-center gap-4 @3xl:col-start-1 @3xl:row-start-1">
          <span className="hidden size-20 shrink-0 place-items-center rounded-lg bg-brand-soft-hover @md:grid">
            <img src="/illustrations/exam-in-progress.svg" alt="" aria-hidden="true" className="size-16" />
          </span>
          <div className="min-w-0">
            <h3 className="line-clamp-2 text-lg font-bold leading-snug text-ink @3xl:text-xl">
              {session.isPinned && (
                <PushPinIcon className="mr-1.5 inline size-4 align-[-1px] text-brand" aria-hidden={false} role="img" aria-label="Đã ghim" />
              )}
              {session.title}
            </h3>
            <ExamMeta
              session={session}
              badge={<span className="rounded-lg bg-brand-soft-hover px-2 py-0.5 text-xs font-medium text-brand">Đang làm</span>}
            />
          </div>
        </div>

        <ExamStats
          session={session}
          large
          className="divide-brand-border @3xl:col-span-2 @3xl:row-start-2 @5xl:col-span-1 @5xl:col-start-2 @5xl:row-start-1 @5xl:w-[360px] @5xl:border-l @5xl:border-brand-border"
        />

        <div className="flex flex-wrap gap-2 @3xl:col-start-2 @3xl:row-start-1 @5xl:col-start-3">
          <Button variant="solid" className="!px-4" onClick={() => window.location.assign(resumeUrl(session))}>
            <PlayIcon />
            Tiếp tục
          </Button>
          <Button variant="outline" className="!px-3.5" onClick={() => onViewHistory(session)}>
            <ClockIcon />
            Lịch sử
          </Button>
          <CardMenu session={session} onTogglePin={onTogglePin} className="!h-[34px] !w-[34px]" />
        </div>
      </div>
    </article>
  )
}
