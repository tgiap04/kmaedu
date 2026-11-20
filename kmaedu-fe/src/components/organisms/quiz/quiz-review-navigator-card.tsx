import { ChartBarIcon } from "@phosphor-icons/react";
import type { ReviewOutcome } from "@/lib/exam-session/review-outcome";
import { legendDot, QuizGrid, QuizGridCell, QuizGridHeading, QuizLegend, QuizLegendRow } from "./quiz-navigator-parts";

interface Props {
  /** Per question, in order. */
  outcomes: ReviewOutcome[];
  current: number;
  onJump: (index: number) => void;
  onOverview: () => void;
}

const WORD: Record<ReviewOutcome, string> = { correct: "đúng", wrong: "sai", skipped: "chưa trả lời" };

/** Review side panel: the grid coloured by result, the counts and the way back to the overview. */
export function QuizReviewNavigatorCard({ outcomes, current, onJump, onOverview }: Props) {
  const count = (o: ReviewOutcome) => outcomes.filter((x) => x === o).length;
  return (
    <aside className="rounded-3xl border border-hairline bg-canvas p-5 shadow-raised sm:p-6">
      <QuizGridHeading />
      <QuizGrid>
        {outcomes.map((outcome, i) => (
          <QuizGridCell
            key={i}
            number={i + 1}
            tone={outcome === "skipped" ? "empty" : outcome}
            current={i === current ? "ink" : undefined}
            label={`Câu ${i + 1}, ${WORD[outcome]}`}
            onClick={() => onJump(i)}
          />
        ))}
      </QuizGrid>

      <QuizLegend>
        <QuizLegendRow icon={legendDot("bg-emerald-500")} label="Đúng" value={count("correct")} />
        <QuizLegendRow icon={legendDot("bg-brand")} label="Sai" value={count("wrong")} />
        <QuizLegendRow icon={legendDot("border-2 border-hairline")} label="Chưa trả lời" value={count("skipped")} />
      </QuizLegend>

      <button
        type="button"
        onClick={onOverview}
        className="mt-5 inline-flex h-14 w-full items-center justify-center gap-2.5 rounded-full border border-hairline bg-canvas text-base font-bold text-ink shadow-soft transition-colors hover:border-brand-border hover:text-brand-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
      >
        <ChartBarIcon weight="bold" className="size-5" aria-hidden />
        Xem tổng quan
      </button>
    </aside>
  );
}
