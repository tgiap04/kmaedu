import { useMemo, useRef, useState } from "react";
import { ArrowCounterClockwiseIcon, CheckIcon, MinusIcon, TimerIcon, XIcon } from "@phosphor-icons/react";
import type { AttemptWithQuestions, ResultQuestion } from "@/apis/quizPracticeApi";
import { QuizFooter } from "@/components/organisms/quiz/quiz-footer";
import { QuizProgressRing } from "@/components/organisms/quiz/quiz-progress-ring";
import { QuizProgressSegments } from "@/components/organisms/quiz/quiz-progress-segments";
import { QuizReviewNavigatorCard } from "@/components/organisms/quiz/quiz-review-navigator-card";
import { QuizReviewQuestionCard } from "@/components/organisms/quiz/quiz-review-question-card";
import { formatDuration } from "@/lib/quiz-practice/progress";
import { practiceReviewRows } from "@/lib/quiz-practice/review-questions";
import { cn } from "@/lib/utils";

interface Props {
  result: AttemptWithQuestions<ResultQuestion>;
  onPracticeAgain: () => void;
}

function Stat({ icon, value, label, className }: { icon: React.ReactNode; value: string | number; label: string; className: string }) {
  return (
    <span className="inline-flex items-center gap-2 whitespace-nowrap rounded-full border border-hairline bg-page py-1 pl-1 pr-3 text-sm text-body">
      <span className={cn("grid size-6 place-items-center rounded-full [&_svg]:size-3.5", className)} aria-hidden>{icon}</span>
      <span className="font-bold tabular-nums text-ink">{value}</span>
      {label}
    </span>
  );
}

/** After submit: the server's score, then every answer one question at a time, as on the exam review screen. */
export function PracticeResultView({ result, onPracticeAgain }: Props) {
  const { attempt } = result;
  const questions = useMemo(() => practiceReviewRows(result.questions), [result.questions]);
  const outcomes = questions.map((q) => q.outcome);
  const total = questions.length;
  const count = (o: string) => outcomes.filter((x) => x === o).length;
  const [index, setIndex] = useState(0);
  const summaryRef = useRef<HTMLElement>(null);
  const current = questions[index];
  const score = attempt.score ?? 0;
  const toSummary = () => summaryRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });

  return (
    <div className="space-y-5">
      <section ref={summaryRef} className="flex scroll-mt-24 flex-wrap items-center gap-4 rounded-2xl border border-hairline bg-canvas p-4 shadow-soft md:p-5">
        <span className="rounded-full bg-brand-soft/60 p-1">
          <QuizProgressRing percent={score * 10} size={72} stroke={7} labelClassName="text-lg font-extrabold" />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-xs font-bold uppercase tracking-wide text-brand">Điểm</p>
          <p className="text-2xl font-extrabold tabular-nums text-ink">{score}/10</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Stat icon={<CheckIcon weight="bold" />} value={attempt.correctAnswers ?? count("correct")} label="đúng" className="bg-emerald-100 text-emerald-600" />
            <Stat icon={<XIcon weight="bold" />} value={count("wrong")} label="sai" className="bg-brand-soft text-brand" />
            <Stat icon={<MinusIcon weight="bold" />} value={count("skipped")} label="bỏ qua" className="bg-hairline-soft text-body" />
            <Stat icon={<TimerIcon weight="bold" />} value={formatDuration(attempt.timeSpentSeconds)} label="" className="bg-hairline-soft text-body" />
          </div>
        </div>
        <button
          type="button"
          onClick={onPracticeAgain}
          className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-full bg-gradient-to-r from-brand to-brand-strong px-5 text-sm font-bold text-white shadow-[0_10px_24px_-12px_var(--brand)] transition-[filter] hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 focus-visible:ring-offset-2 sm:w-auto"
        >
          <ArrowCounterClockwiseIcon weight="bold" className="size-4" aria-hidden />
          Luyện tập lại
        </button>
      </section>

      {current && (
        <div>
          <QuizProgressSegments
            answered={outcomes.map((o) => o !== "skipped")}
            results={outcomes.map((o) => (o === "skipped" ? null : o === "correct"))}
            current={index}
            onJump={setIndex}
          />

          <div className="mt-5 grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_380px]">
            <QuizReviewQuestionCard
              index={index}
              total={total}
              question={current.question}
              options={current.options}
              userAnswer={current.userAnswer}
              correctLetter={current.correctLetter}
              outcome={current.outcome}
            />
            <QuizReviewNavigatorCard outcomes={outcomes} current={index} onJump={setIndex} onOverview={toSummary} />
          </div>

          <div className="sticky bottom-[calc(3.25rem+env(safe-area-inset-bottom))] z-20 -mx-4 mt-6 md:-mx-6 xl:bottom-0">
            <QuizFooter
              current={index}
              total={total}
              onPrev={() => setIndex(Math.max(0, index - 1))}
              onNext={() => setIndex(Math.min(total - 1, index + 1))}
              last={{ label: "Xem tổng quan", onClick: toSummary }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
