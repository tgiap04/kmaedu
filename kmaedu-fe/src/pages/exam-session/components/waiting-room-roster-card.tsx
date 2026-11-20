import { UsersIcon, UsersThreeIcon } from "@phosphor-icons/react";
import type { ExamAttemptListItem } from "@/apis/examAttemptApi";
import { Skeleton } from "@/components/antd/skeleton";
import { cn } from "@/lib/utils";
import { displayUserInitial, displayUserName } from "@/lib/user/display-user-name";
import type { RosterCounts } from "@/lib/exam-session/waiting-room-view";
import { WaitingRoomPanel } from "./waiting-room-panel";

function Count({ dot, label, value }: { dot: string; label: string; value: number | null }) {
  return (
    <div className="min-w-0 px-3 first:pl-0 last:pr-0">
      <p className="flex items-start gap-1.5 text-[13px] leading-snug text-body">
        <span className={cn("mt-1.5 size-2 shrink-0 rounded-full", dot)} aria-hidden />
        <span>{label}</span>
      </p>
      <p className="mt-1 pl-3.5 text-xl font-bold tabular-nums text-ink">{value ?? "–"}</p>
    </div>
  );
}

/** Host only: who has joined the session. Refreshed by the page on a timer. */
export function WaitingRoomRosterCard({ counts, candidates, loading }: { counts: RosterCounts; candidates: ExamAttemptListItem[]; loading: boolean }) {
  return (
    <WaitingRoomPanel icon={<UsersIcon weight="duotone" />} title="Danh sách thí sinh" className="flex h-full flex-col">
      <div className="grid grid-cols-3 divide-x divide-hairline-soft rounded-lg bg-surface-soft px-3 py-3">
        <Count dot="bg-emerald-500" label="Đã vào phòng" value={counts.joined} />
        <Count dot="bg-blue-500" label="Đang làm" value={counts.inProgress} />
        <Count dot="bg-slate-300" label="Chưa bắt đầu" value={counts.notStarted} />
      </div>

      {loading && candidates.length === 0 ? (
        <div className="mt-4 space-y-2">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
        </div>
      ) : candidates.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center py-10 text-center">
          <span className="relative grid size-24 place-items-center rounded-full bg-brand-soft/60 text-brand/70" aria-hidden>
            <UsersThreeIcon weight="duotone" className="size-14" />
          </span>
          <p className="mt-4 font-medium text-ink">Chưa có thí sinh nào tham gia</p>
          <p className="mt-1 text-sm text-body">Danh sách tự cập nhật khi có thí sinh vào làm bài</p>
        </div>
      ) : (
        <ul className="mt-3 max-h-[420px] divide-y divide-hairline-soft overflow-y-auto">
          {candidates.map((c) => (
            <li key={c.userId} className="flex items-center gap-3 py-2.5">
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-brand-soft text-sm font-semibold text-brand" aria-hidden>
                {displayUserInitial(c.user)}
              </span>
              <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink">{displayUserName(c.user)}</span>
              {c.status === 0 ? (
                <span className="shrink-0 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-600">Đang làm</span>
              ) : (
                <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-600">Đã nộp</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </WaitingRoomPanel>
  );
}
