import type { ReactNode } from "react"
import {
  ArrowsClockwiseIcon,
  BookOpenTextIcon,
  CalendarBlankIcon,
  ChartBarIcon,
  ClipboardTextIcon,
  ClockIcon,
  DotsThreeIcon,
  ExamIcon,
  FolderIcon,
  type Icon,
  ListChecksIcon,
  NotebookIcon,
  PushPinIcon,
  PushPinSlashIcon,
  TrophyIcon,
  WarningIcon,
} from "@phosphor-icons/react"
import { Button } from "@/components/antd/button"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/antd/dropdown-menu"
import { DecorativeIcons } from "@/components/icons/icon-defaults"
import { cn } from "@/lib/utils"
import { stableIndex } from "@/lib/stable-index"
import { formatAttemptTime, type SessionSummary } from "../my-exams-types"

/** Rooms carry no subject, so each one gets a fixed icon picked from its id. */
const TILE_ICONS: Icon[] = [ExamIcon, ListChecksIcon, ClipboardTextIcon, NotebookIcon, FolderIcon, BookOpenTextIcon]

/** Best score, number of attempts and best rate, split by thin dividers; results turn green once an attempt is finished. */
export function ExamStats({ session, large, className }: { session: SessionSummary; large?: boolean; className?: string }) {
  const finished = session.bestScore !== null
  const stats: { icon: ReactNode; label: string; value: string; good: boolean }[] = [
    { icon: <TrophyIcon />, label: "Điểm cao", value: session.bestScore === null ? "—" : session.bestScore.toFixed(1), good: finished },
    { icon: <ArrowsClockwiseIcon />, label: "Số lần thi", value: String(session.attemptCount), good: false },
    { icon: <ChartBarIcon />, label: "Tỷ lệ tốt", value: `${session.bestPercentage}%`, good: finished },
  ]
  return (
    <dl className={cn("grid grid-cols-3 divide-x divide-hairline", className)}>
      {stats.map((stat) => (
        <div key={stat.label} className="flex min-w-0 flex-col items-center gap-0.5 px-2 text-center">
          <dt className="inline-flex items-center gap-1.5 text-[13px] text-muted-foreground [&_svg]:size-4 [&_svg]:shrink-0">
            {stat.icon}
            <span className="truncate">{stat.label}</span>
          </dt>
          <dd className={cn("font-bold tabular-nums", large ? "text-xl" : "text-lg", stat.good ? "text-success" : "text-ink")}>
            {stat.value}
          </dd>
        </div>
      ))}
    </dl>
  )
}

/** Date of the last attempt, violations when there are any, then a status pill. */
export function ExamMeta({ session, badge }: { session: SessionSummary; badge: ReactNode }) {
  const when = formatAttemptTime(session.lastAttemptAt)
  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-muted-foreground">
      {when && (
        <span className="inline-flex items-center gap-1.5">
          <CalendarBlankIcon className="size-3.5" />
          {when}
        </span>
      )}
      {session.totalViolations > 0 && (
        <span className="inline-flex items-center gap-1.5 text-error">
          <WarningIcon className="size-3.5" />
          {session.totalViolations} vi phạm
        </span>
      )}
      {badge}
    </div>
  )
}

/** The ··· menu holding pin / unpin. */
export function CardMenu({ session, onTogglePin, className }: { session: SessionSummary; onTogglePin: (s: SessionSummary) => void; className?: string }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="icon" className={cn("!h-7 !w-7", className)} aria-label={`Thao tác khác với "${session.title}"`}>
          <DotsThreeIcon weight="bold" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => onTogglePin(session)} className="cursor-pointer">
          {session.isPinned ? <PushPinSlashIcon className="mr-2 size-4" /> : <PushPinIcon className="mr-2 size-4" />}
          {session.isPinned ? "Bỏ ghim" : "Ghim lên đầu"}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

/** A room in "Các bài thi khác": icon tile, title with history and menu, then the three results. */
export function SessionCard({
  session,
  onViewHistory,
  onTogglePin,
}: {
  session: SessionSummary
  onViewHistory: (s: SessionSummary) => void
  onTogglePin: (s: SessionSummary) => void
}) {
  const TileIcon = TILE_ICONS[stableIndex(session.examRoomId, TILE_ICONS.length)]
  return (
    <article className="flex h-full flex-col gap-4 rounded-lg border border-hairline bg-canvas p-4 shadow-[0_4px_20px_rgba(15,23,42,0.04)] transition-colors hover:border-brand-border">
      <div className="flex items-start gap-3">
        <span className="grid size-12 shrink-0 place-items-center rounded-lg bg-brand-soft-hover text-brand-strong sm:size-14 [&_svg]:size-6 sm:[&_svg]:size-7">
          <DecorativeIcons>
            <TileIcon />
          </DecorativeIcons>
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <h3 className="line-clamp-2 min-w-0 flex-1 basis-40 text-base font-semibold leading-snug text-ink">
              {session.isPinned && (
                <PushPinIcon className="mr-1 inline size-3.5 align-[-1px] text-brand" aria-hidden={false} role="img" aria-label="Đã ghim" />
              )}
              {session.title}
            </h3>
            <div className="flex shrink-0 items-center gap-1.5">
              <Button variant="outline" size="sm" onClick={() => onViewHistory(session)}>
                <ClockIcon />
                Lịch sử
              </Button>
              <CardMenu session={session} onTogglePin={onTogglePin} />
            </div>
          </div>
          <ExamMeta
            session={session}
            badge={<span className="rounded-lg bg-success/10 px-2 py-0.5 text-xs font-medium text-success">{session.attemptCount} lần thi</span>}
          />
        </div>
      </div>
      <ExamStats session={session} className="mt-auto" />
    </article>
  )
}
