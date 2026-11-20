import { CheckIcon, GraduationCapIcon, TimerIcon } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { formatClock } from "./quiz-format";
import { QuizTopBar } from "./quiz-top-bar";

interface Props {
  title: string;
  current: number;
  total: number;
  answered: number;
  /** Seconds left before hand-in; null when the attempt has no limit (then the elapsed time shows). */
  remaining: number | null;
  elapsed: number;
  onExit: () => void;
}

/** Top bar of the quiz: back, the exam name and position, answered count and the clock. */
export function QuizHeader({ title, current, total, answered, remaining, elapsed, onExit }: Props) {
  const urgent = remaining !== null && remaining <= 60;
  return (
    <QuizTopBar icon={<GraduationCapIcon weight="fill" />} title={title} subtitle={`KMAEdu · Câu ${current} / ${total}`} onBack={onExit}>
      <div className="hidden h-11 items-center gap-2.5 rounded-full border border-hairline bg-canvas pl-1.5 pr-4 shadow-soft md:flex">
        <span className="grid size-8 place-items-center rounded-full bg-brand-soft text-brand">
          <CheckIcon weight="bold" className="size-4" aria-hidden />
        </span>
        <span className="text-sm font-semibold tabular-nums text-ink">{answered}/{total} đã trả lời</span>
      </div>
      <div
        role="timer"
        aria-label={remaining !== null ? "Thời gian còn lại" : "Thời gian đã làm"}
        className={cn(
          "flex h-11 items-center gap-2 rounded-full border px-4 shadow-soft",
          remaining !== null ? "border-brand-border bg-brand-soft/60 text-brand" : "border-hairline bg-canvas text-ink",
          urgent && "animate-pulse",
        )}
      >
        <TimerIcon weight="bold" className="size-5" aria-hidden />
        <span className="text-lg font-bold tabular-nums">{formatClock(remaining ?? elapsed)}</span>
      </div>
    </QuizTopBar>
  );
}
