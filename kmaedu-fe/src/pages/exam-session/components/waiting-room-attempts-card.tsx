import { ArrowCounterClockwiseIcon, CheckCircleIcon, CircleNotchIcon, ClockIcon, MedalIcon, WarningCircleIcon, XCircleIcon } from "@phosphor-icons/react";
import type { MyAttemptItem } from "@/apis/examAttemptApi";
import { Button } from "@/components/antd/button";
import { Skeleton } from "@/components/antd/skeleton";
import { attemptSpentSeconds, formatSpent } from "@/lib/exam-session/attempt-time";
import { cn } from "@/lib/utils";
import { WaitingRoomPanel } from "./waiting-room-panel";

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString("vi-VN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
}

type Outcome = "working" | "done" | "passed" | "failed";

const OUTCOME: Record<Outcome, { label: string; tone: string; icon: typeof CheckCircleIcon }> = {
  working: { label: "Đang thi", tone: "bg-warning/15 text-warning", icon: CircleNotchIcon },
  done: { label: "Hoàn thành", tone: "bg-success/15 text-success", icon: CheckCircleIcon },
  passed: { label: "Đạt", tone: "bg-success/15 text-success", icon: CheckCircleIcon },
  failed: { label: "Chưa đạt", tone: "bg-destructive/15 text-destructive", icon: XCircleIcon },
};

interface Props {
  attempts: MyAttemptItem[];
  loading: boolean;
  passingScore: number;
  onContinue: (attemptId: string) => void;
  onView: (attemptId: string) => void;
}

/** The candidate's own attempts at this session, newest first. */
export function WaitingRoomAttemptsCard({ attempts, loading, passingScore, onContinue, onView }: Props) {
  return (
    <WaitingRoomPanel icon={<ArrowCounterClockwiseIcon weight="bold" />} title="Lịch sử làm bài" className="flex h-full flex-col">
      {loading ? (
        <div className="space-y-3">{Array.from({ length: 2 }).map((_, i) => <Skeleton key={i} className="h-16 w-full" />)}</div>
      ) : attempts.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center py-10 text-center">
          <span className="grid size-24 place-items-center rounded-full bg-brand-soft/60 text-brand/70" aria-hidden>
            <MedalIcon weight="duotone" className="size-12" />
          </span>
          <p className="mt-4 font-medium text-ink">Chưa có lượt thi nào</p>
          <p className="mt-1 text-sm text-body">Lần làm bài đầu tiên sẽ hiện ở đây</p>
        </div>
      ) : (
        <ul className="max-h-[520px] space-y-3 overflow-y-auto pr-1">
          {attempts.map((attempt, index) => {
            const percent = attempt.totalQuestions > 0 ? Math.round((attempt.correctAnswers / attempt.totalQuestions) * 100) : 0;
            const outcome: Outcome = attempt.status === 0 ? "working" : passingScore === 0 ? "done" : percent >= passingScore ? "passed" : "failed";
            const { label, tone, icon: OutcomeIcon } = OUTCOME[outcome];
            const spent = formatSpent(attemptSpentSeconds(attempt.startedAt, attempt.finishedAt));
            return (
              <li key={attempt.id} className="rounded-lg border border-hairline-soft p-3.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-sm font-semibold text-ink">Lần {index + 1}</span>
                  <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium", tone)}>
                    <OutcomeIcon className="size-3" aria-hidden />
                    {label}
                  </span>
                </div>
                <p className="mt-1 text-xs text-body">{formatDate(attempt.startedAt)}</p>
                <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-body">
                  <span className="font-semibold text-ink">{percent}%</span>
                  <span>{attempt.correctAnswers}/{attempt.totalQuestions} đúng</span>
                  {spent && (
                    <span className="flex items-center gap-1"><ClockIcon className="size-3" aria-hidden />{spent}</span>
                  )}
                  {attempt.violationCount > 0 && (
                    <span className="flex items-center gap-1 text-orange-500"><WarningCircleIcon className="size-3" aria-hidden />{attempt.violationCount} vi phạm</span>
                  )}
                </div>
                {attempt.status === 0 ? (
                  <Button size="sm" className="mt-3 w-full" onClick={() => onContinue(attempt.id)}>Tiếp tục làm bài</Button>
                ) : (
                  <Button size="sm" variant="outline" className="mt-3 w-full" onClick={() => onView(attempt.id)}>Xem chi tiết</Button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </WaitingRoomPanel>
  );
}
