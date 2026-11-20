import type { ReactNode } from "react";
import { ArrowCounterClockwiseIcon, ChartBarIcon, CheckIcon, SignOutIcon, TimerIcon, WarningIcon, XIcon } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { QuizProgressRing } from "./quiz-progress-ring";
import { Sparkle } from "@/components/atoms/Sparkle";

interface Props {
  passed: boolean;
  correct: number;
  total: number;
  /** Score in percent, as the server graded it. */
  percentage: number;
  timeLabel: string;
  violations: number;
  /** Absent when the session hides answers after hand-in. */
  onDetail?: () => void;
  onRetake: () => void;
  onExit: () => void;
}

const TILE_TONES = {
  green: { tile: "bg-emerald-100 text-emerald-600", value: "text-emerald-700" },
  red: { tile: "bg-brand-soft text-brand", value: "text-brand-strong" },
  slate: { tile: "bg-hairline-soft text-body", value: "text-ink" },
  amber: { tile: "bg-amber-100 text-amber-700", value: "text-amber-700" },
} as const;

function StatTile({ icon, value, label, tone }: { icon: ReactNode; value: string | number; label: string; tone: keyof typeof TILE_TONES }) {
  const t = TILE_TONES[tone];
  return (
    <div className="flex flex-col items-center rounded-2xl border border-hairline-soft bg-page px-3 py-5 text-center">
      <span className={cn("grid size-10 place-items-center rounded-xl [&_svg]:size-5", t.tile)} aria-hidden>{icon}</span>
      <span className={cn("mt-3 text-3xl font-extrabold tabular-nums leading-none", t.value)}>{value}</span>
      <span className="mt-2 text-sm font-medium text-body">{label}</span>
    </div>
  );
}

const outlineButton =
  "inline-flex h-12 items-center gap-2 rounded-full border border-hairline bg-canvas px-6 text-[15px] font-semibold text-ink shadow-soft transition-colors hover:border-brand-border hover:text-brand-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40";

/** Summary after hand-in: pass or not, the score, the counts and what to do next. */
export function QuizResultCard({ passed, correct, total, percentage, timeLabel, violations, onDetail, onRetake, onExit }: Props) {
  const wrong = Math.max(0, total - correct);
  const correctShare = total > 0 ? (correct / total) * 100 : 0;

  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-page bg-[radial-gradient(50rem_36rem_at_-5%_15%,color-mix(in_oklab,var(--brand-soft)_80%,transparent),transparent_60%),radial-gradient(40rem_30rem_at_105%_100%,rgba(251,191,36,0.10),transparent_60%)] px-4 py-10">
      <section className="relative w-full max-w-[1008px] overflow-hidden rounded-[28px] border border-hairline bg-canvas px-5 pb-10 pt-10 shadow-[0_24px_60px_-28px_rgba(15,23,42,0.25)] sm:px-12">
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-72 bg-gradient-to-b from-brand-soft/70 to-transparent" />
        <Sparkle className="left-[100px] top-8 hidden size-[70px] sm:block" />
        <Sparkle className="left-[172px] top-[108px] hidden size-7 sm:block" />
        <Sparkle className="right-[110px] top-12 hidden size-14 sm:block" />
        <Sparkle className="right-[166px] top-[128px] hidden size-7 sm:block" />

        <div className="relative flex flex-col items-center text-center">
          <span
            className={cn(
              "grid size-[120px] place-items-center rounded-full",
              passed ? "bg-emerald-50 shadow-[0_10px_30px_-12px_rgba(16,185,129,0.45)]" : "bg-brand-soft/60 shadow-[0_10px_30px_-12px_var(--brand)]",
            )}
          >
            <span className={cn("grid size-[100px] place-items-center rounded-full", passed ? "bg-emerald-100/70 text-emerald-600" : "bg-brand-soft text-brand")}>
              {passed ? <CheckIcon weight="bold" className="size-11" aria-hidden /> : <XIcon weight="bold" className="size-11" aria-hidden />}
            </span>
          </span>
          <h1 className="mt-6 text-4xl font-extrabold tracking-tight text-ink sm:text-[44px]">{passed ? "Chúc mừng!" : "Chưa đạt"}</h1>
          <p className="mt-2 text-lg text-body">{passed ? "Bạn đã hoàn thành bài thi" : "Hãy cố gắng hơn lần sau"}</p>

          <div className="mt-9 flex items-center gap-4 rounded-full border border-brand-border/60 bg-brand-soft/50 py-3 pl-3 pr-6 sm:gap-6 sm:py-4 sm:pl-5 sm:pr-10">
            <QuizProgressRing percent={percentage} size={104} stroke={10} labelClassName="text-[28px] font-extrabold" />
            <div className="text-left">
              <p className="text-sm font-bold uppercase tracking-wide text-brand">Điểm số</p>
              <p className="mt-1 whitespace-nowrap text-xl font-extrabold tabular-nums text-ink sm:text-2xl">{correct} / {total} câu đúng</p>
            </div>
          </div>
        </div>

        <div className="relative mt-8 grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatTile icon={<CheckIcon weight="bold" />} value={correct} label="Đúng" tone="green" />
          <StatTile icon={<XIcon weight="bold" />} value={wrong} label="Sai" tone="red" />
          <StatTile icon={<TimerIcon weight="bold" />} value={timeLabel} label="Thời gian" tone="slate" />
          <StatTile icon={<WarningIcon weight="bold" />} value={violations} label="Vi phạm" tone={violations > 0 ? "amber" : "slate"} />
        </div>

        {total > 0 && (
          <div className="relative mt-8">
            <div className="flex justify-between text-sm font-semibold text-body">
              <span className="flex items-center gap-2"><span className="size-2.5 rounded-full bg-emerald-500" aria-hidden />{correct} câu đúng</span>
              <span className="flex items-center gap-2">{wrong} câu sai<span className="size-2.5 rounded-full bg-brand" aria-hidden /></span>
            </div>
            <div className="mt-2 flex h-3 gap-1" role="img" aria-label={`${correct} câu đúng, ${wrong} câu sai`}>
              {correct > 0 && <span className="rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600" style={{ width: `${correctShare}%` }} />}
              {wrong > 0 && <span className="flex-1 rounded-full bg-gradient-to-r from-brand/60 to-brand" />}
            </div>
          </div>
        )}

        <div className="relative mt-10 flex flex-wrap justify-center gap-4">
          {onDetail && (
            <button
              type="button"
              onClick={onDetail}
              className="inline-flex h-14 items-center gap-2.5 rounded-full bg-gradient-to-r from-brand to-brand-strong px-8 text-[15px] font-bold text-white shadow-[0_12px_28px_-12px_var(--brand)] transition-[filter] hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 focus-visible:ring-offset-2"
            >
              <ChartBarIcon weight="bold" className="size-5" aria-hidden />
              Xem chi tiết
            </button>
          )}
          <button type="button" onClick={onRetake} className={cn(outlineButton, "h-14")}>
            <ArrowCounterClockwiseIcon weight="bold" className="size-5" aria-hidden />
            Làm lại
          </button>
          <button type="button" onClick={onExit} className={cn(outlineButton, "h-14")}>
            <SignOutIcon weight="bold" className="size-5" aria-hidden />
            Thoát
          </button>
        </div>
      </section>
    </div>
  );
}
