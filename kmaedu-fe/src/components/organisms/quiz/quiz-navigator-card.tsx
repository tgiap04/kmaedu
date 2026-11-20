import { FlagIcon } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { legendDot, QuizGrid, QuizGridCell, QuizGridHeading, QuizLegend, QuizLegendRow } from "./quiz-navigator-parts";
import { QuizProgressRing } from "./quiz-progress-ring";

interface Props {
  /** Question ids in order. */
  ids: string[];
  answered: Set<string>;
  marked: Set<string>;
  current: number;
  onJump: (index: number) => void;
  onSubmit: () => void;
  /** Shown above the submit button when time is short. */
  warning?: string | null;
}

/** Side panel: progress, the question grid to jump around, the legend and the submit button. */
export function QuizNavigatorCard({ ids, answered, marked, current, onJump, onSubmit, warning }: Props) {
  const total = ids.length;
  const answeredCount = ids.filter((id) => answered.has(id)).length;
  const percent = total ? Math.round((answeredCount / total) * 100) : 0;
  const left = total - answeredCount;

  return (
    <aside className="rounded-3xl border border-hairline bg-canvas p-5 shadow-raised sm:p-6">
      <div className="mb-6 flex items-center gap-4 rounded-2xl border border-brand-border/60 bg-brand-soft/50 p-4">
        <QuizProgressRing percent={percent} />
        <div className="min-w-0">
          <p className="text-lg font-bold text-ink">Tiến độ làm bài</p>
          <p className="text-sm text-body">{left > 0 ? `Còn ${left} câu chưa trả lời` : "Đã trả lời hết các câu"}</p>
        </div>
      </div>

      <QuizGridHeading />
      <QuizGrid>
        {ids.map((id, i) => {
          const isAnswered = answered.has(id);
          const isMarked = marked.has(id);
          return (
            <QuizGridCell
              key={id}
              number={i + 1}
              tone={isAnswered ? "brand" : "empty"}
              current={i === current ? "brand" : undefined}
              label={`Câu ${i + 1}${isAnswered ? ", đã trả lời" : ""}${isMarked ? ", đã đánh dấu" : ""}`}
              onClick={() => onJump(i)}
            >
              {isMarked && (
                <FlagIcon weight="fill" aria-hidden className={cn("absolute right-1.5 top-1.5 size-3", isAnswered ? "text-white" : "text-amber-500")} />
              )}
            </QuizGridCell>
          );
        })}
      </QuizGrid>

      <QuizLegend>
        <QuizLegendRow icon={legendDot("bg-brand")} label="Đã trả lời" value={answeredCount} />
        <QuizLegendRow icon={legendDot("border-2 border-hairline")} label="Chưa trả lời" value={left} />
        <QuizLegendRow icon={<FlagIcon weight="fill" className="size-4 text-amber-500" aria-hidden />} label="Đánh dấu" value={ids.filter((id) => marked.has(id)).length} />
      </QuizLegend>

      {warning && <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm font-medium text-amber-700">{warning}</p>}

      <button
        type="button"
        onClick={onSubmit}
        className="mt-5 h-14 w-full rounded-full bg-gradient-to-r from-brand to-brand-strong text-base font-bold text-white shadow-[0_10px_24px_-12px_var(--brand)] transition-[filter,transform] hover:brightness-105 active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 focus-visible:ring-offset-2"
      >
        Nộp bài
      </button>
    </aside>
  );
}
