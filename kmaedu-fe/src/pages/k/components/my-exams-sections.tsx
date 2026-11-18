import type { ReactNode } from "react"
import { CheckIcon, PlayIcon, StackIcon } from "@phosphor-icons/react"
import { Skeleton } from "@/components/antd/skeleton"
import { cn } from "@/lib/utils"
import type { ExamOverview } from "../my-exams-types"

function OverviewPill({ icon, value, label, className }: { icon: ReactNode; value: number; label: string; className?: string }) {
  return (
    <span className={cn("inline-flex h-10 items-center gap-2 rounded-lg border border-hairline bg-canvas px-3.5 text-sm text-body", className)}>
      {icon}
      <span>
        <strong className="mr-1 text-[15px] font-bold tabular-nums text-ink">{value}</strong>
        {label}
      </span>
    </span>
  )
}

/** The three counts on the right of the page title. */
export function OverviewPills({ overview }: { overview: ExamOverview }) {
  return (
    <>
      <OverviewPill icon={<StackIcon className="size-[18px] text-body" />} value={overview.total} label="phòng thi" />
      <OverviewPill
        icon={<PlayIcon className="size-[18px] text-brand" />}
        value={overview.inProgress}
        label="đang làm"
        className="border-brand-border bg-brand-soft"
      />
      <OverviewPill
        icon={(
          <span className="grid size-6 place-items-center rounded-full bg-success/10 text-success">
            <CheckIcon weight="bold" className="size-3.5" />
          </span>
        )}
        value={overview.completed}
        label="đã hoàn thành"
      />
    </>
  )
}

export function OverviewPillsSkeleton() {
  return (
    <>
      {[116, 112, 150].map((width) => (
        <Skeleton key={width} className="h-10 rounded-lg" style={{ width }} />
      ))}
    </>
  )
}

/** Section title with the short red bar in front, and an optional action on the right. */
export function SectionHeading({ id, title, action }: { id: string; title: string; action?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center gap-2.5">
      <span aria-hidden="true" className="h-5 w-1 shrink-0 rounded-full bg-brand" />
      <h2 id={id} className="text-lg font-bold text-ink">{title}</h2>
      {action && <div className="ml-auto">{action}</div>}
    </div>
  )
}

export function MyExamsSkeleton() {
  return (
    <div className="space-y-8">
      <div>
        <Skeleton className="mb-3 h-6 w-36" />
        <Skeleton className="h-[112px] rounded-lg" />
      </div>
      <div className="@container">
        <Skeleton className="mb-3 h-6 w-44" />
        <div className="grid grid-cols-1 gap-4 @3xl:grid-cols-2">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-[150px] rounded-lg" />
          ))}
        </div>
      </div>
    </div>
  )
}
