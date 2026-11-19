import { ChartBarIcon, DotsThreeIcon, EyeIcon } from "@phosphor-icons/react";
import type { CandidateStatus, RoomCandidate } from "@/apis/examAttemptApi";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/antd/dropdown-menu";
import { CANDIDATE_STATUS_LABEL, formatTimeSpent } from "@/lib/exam-room/candidates";
import { formatStamp } from "@/lib/exam-room/room-status";
import { displayUserName } from "@/lib/user/display-user-name";
import { cn } from "@/lib/utils";

const STATUS_TONE: Record<CandidateStatus, { pill: string; dot: string }> = {
  submitted: { pill: "bg-emerald-50 text-emerald-700", dot: "bg-emerald-500" },
  in_progress: { pill: "bg-blue-50 text-blue-600", dot: "bg-blue-500" },
  not_started: { pill: "bg-surface-soft text-body", dot: "bg-muted-foreground/60" },
  cancelled: { pill: "bg-surface-soft text-muted-foreground", dot: "bg-muted-foreground/40" },
};

function StatusPill({ status }: { status: CandidateStatus }) {
  const tone = STATUS_TONE[status];
  return (
    <span className={cn("inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-medium", tone.pill)}>
      <span className={cn("size-1.5 rounded-full", tone.dot)} aria-hidden />
      {CANDIDATE_STATUS_LABEL[status]}
    </span>
  );
}

export interface CandidateActions {
  onDetail: (c: RoomCandidate) => void;
  onWatch: (c: RoomCandidate) => void;
}

const actionBtn =
  "inline-flex h-8 min-w-[104px] items-center justify-center rounded-lg border border-hairline bg-canvas px-3 text-[13px] font-medium text-ink transition-colors hover:bg-surface-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40";

function RowActions({ c, actions }: { c: RoomCandidate; actions: CandidateActions }) {
  if (!c.sessionId) return null; // not started: nothing to open yet
  const submitted = c.status === "submitted";
  return (
    <div className="flex items-center justify-end gap-2">
      <button type="button" className={actionBtn} onClick={() => (submitted ? actions.onDetail(c) : actions.onWatch(c))}>
        {submitted ? "Xem chi tiết" : "Theo dõi"}
      </button>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label={`Tùy chọn cho ${displayUserName(c.user)}`}
            className="grid size-8 place-items-center rounded-lg border border-hairline bg-canvas text-body transition-colors hover:bg-surface-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
          >
            <DotsThreeIcon weight="bold" className="size-4" aria-hidden />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {c.attemptId && <DropdownMenuItem onClick={() => actions.onDetail(c)}><EyeIcon className="mr-2 size-4" />Xem bài làm</DropdownMenuItem>}
          <DropdownMenuItem onClick={() => actions.onWatch(c)}><ChartBarIcon className="mr-2 size-4" />Thống kê phiên</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

const head = "px-3 py-3 text-left text-sm font-medium text-body first:pl-4 last:pr-4 whitespace-nowrap";
const cell = "px-3 py-3 text-sm first:pl-4 last:pr-4";

export function CandidatesTable({ rows, offset, actions }: { rows: RoomCandidate[]; offset: number; actions: CandidateActions }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-hairline">
      <table className="w-full min-w-[860px] border-collapse">
        <thead className="bg-surface-soft/70">
          <tr>
            <th scope="col" className={cn(head, "w-12")}>#</th>
            <th scope="col" className={head}>Thí sinh</th>
            <th scope="col" className={head}>Trạng thái</th>
            <th scope="col" className={head}>Bắt đầu làm</th>
            <th scope="col" className={head}>Nộp bài lúc</th>
            <th scope="col" className={head}>Điểm</th>
            <th scope="col" className={head}>Thời gian làm</th>
            <th scope="col" className={cn(head, "text-center")}>Hành động</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-hairline-soft">
          {rows.map((c, i) => (
            <tr key={c.userId} className="transition-colors hover:bg-surface-soft/50">
              <td className={cn(cell, "text-muted-foreground tabular-nums")}>{offset + i + 1}</td>
              <td className={cn(cell, "font-medium text-ink")}>
                <span className="block max-w-[220px] truncate" title={displayUserName(c.user)}>{displayUserName(c.user)}</span>
                {c.attemptCount > 1 && <span className="block text-xs font-normal text-muted-foreground">Làm {c.attemptCount} lần · hiện lần gần nhất</span>}
              </td>
              <td className={cell}><StatusPill status={c.status} /></td>
              <td className={cn(cell, "whitespace-nowrap tabular-nums text-ink")}>{formatStamp(c.startedAt)}</td>
              <td className={cn(cell, "whitespace-nowrap tabular-nums text-ink")}>{formatStamp(c.finishedAt)}</td>
              <td className={cn(cell, "tabular-nums", c.passed === false ? "text-error" : "text-ink")}>{c.score === null ? "–" : `${Math.round(c.score)}%`}</td>
              <td className={cn(cell, "whitespace-nowrap text-ink")}>{formatTimeSpent(c.timeSpentSeconds)}</td>
              <td className={cell}><RowActions c={c} actions={actions} /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
