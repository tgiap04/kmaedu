import type { Icon } from "@phosphor-icons/react";
import { CalendarDotsIcon, ClockCounterClockwiseIcon, FileTextIcon, SealPercentIcon } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { durationLabel, type WaitingRoomView } from "@/lib/exam-session/waiting-room-view";

const TONES = {
  red: "from-brand-soft/50 [&_.tile]:bg-brand-soft [&_.tile]:text-brand",
  blue: "from-blue-50/70 [&_.tile]:bg-blue-100/80 [&_.tile]:text-blue-600",
  green: "from-emerald-50/70 [&_.tile]:bg-emerald-100/80 [&_.tile]:text-emerald-600",
  amber: "from-amber-50/70 [&_.tile]:bg-amber-100/80 [&_.tile]:text-amber-600",
} as const;

function Stat({ icon: StatIcon, label, value, tone }: { icon: Icon; label: string; value: string; tone: keyof typeof TONES }) {
  return (
    <div className={cn("flex items-center gap-3 rounded-xl border border-hairline bg-canvas bg-gradient-to-r to-transparent to-80% p-3.5 shadow-soft", TONES[tone])}>
      <span className="tile grid size-11 shrink-0 place-items-center rounded-full">
        <StatIcon weight="duotone" className="size-[22px]" aria-hidden />
      </span>
      <div className="min-w-0">
        <p className="truncate text-[13px] text-body">{label}</p>
        <p className="mt-0.5 truncate text-lg font-bold tabular-nums text-ink">{value}</p>
      </div>
    </div>
  );
}

export function WaitingRoomStats({ view }: { view: WaitingRoomView }) {
  return (
    <div className="grid grid-cols-1 gap-3 min-[480px]:grid-cols-2 xl:grid-cols-4">
      <Stat icon={CalendarDotsIcon} label="Thời gian" value={durationLabel(view.attemptMinutes)} tone="red" />
      <Stat icon={FileTextIcon} label="Tổng số câu hỏi" value={view.totalQuestions === null ? "–" : `${view.totalQuestions} câu`} tone="blue" />
      <Stat icon={SealPercentIcon} label="Điểm đạt" value={view.passingScore > 0 ? `${view.passingScore}%` : "Không yêu cầu"} tone="green" />
      <Stat icon={ClockCounterClockwiseIcon} label="Lượt thi" value={view.attemptsLabel} tone="amber" />
    </div>
  );
}
