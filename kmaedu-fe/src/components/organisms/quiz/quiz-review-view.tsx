import { CheckIcon, EyeIcon } from "@phosphor-icons/react";
import { reviewOutcome } from "@/lib/exam-session/review-outcome";
import { QuizFooter } from "./quiz-footer";
import { QuizProgressSegments } from "./quiz-progress-segments";
import { QuizReviewNavigatorCard } from "./quiz-review-navigator-card";
import { QuizReviewQuestionCard } from "./quiz-review-question-card";
import { QuizTopBar } from "./quiz-top-bar";

export interface ReviewQuestion {
  id: string;
  question: string;
  options: string[];
  answer?: string | null;
  userAnswer?: string | null;
}

interface Props {
  questions: ReviewQuestion[];
  index: number;
  onIndexChange: (index: number) => void;
  /** Back to the result overview. */
  onOverview: () => void;
}

/** Answers after hand-in, one question at a time, with the same frame as the quiz itself. */
export function QuizReviewView({ questions, index, onIndexChange, onOverview }: Props) {
  const graded = questions.map(reviewOutcome);
  const outcomes = graded.map((g) => g.outcome);
  const total = questions.length;
  const correct = outcomes.filter((o) => o === "correct").length;
  const current = questions[index];

  return (
    <div className="flex min-h-[100dvh] flex-col bg-page bg-[radial-gradient(60rem_40rem_at_-10%_10%,color-mix(in_oklab,var(--brand-soft)_70%,transparent),transparent_60%),radial-gradient(40rem_30rem_at_110%_20%,rgba(16,185,129,0.07),transparent_60%)]">
      <QuizTopBar icon={<EyeIcon weight="bold" />} title="Xem lại kết quả" subtitle={`Câu ${index + 1} / ${total}`} onBack={onOverview}>
        <div className="flex h-11 items-center gap-2.5 rounded-full border border-emerald-200 bg-emerald-50/60 pl-1.5 pr-4 shadow-soft">
          <span className="grid size-8 place-items-center rounded-full bg-emerald-100 text-emerald-600">
            <CheckIcon weight="bold" className="size-4" aria-hidden />
          </span>
          <span className="text-sm font-bold tabular-nums text-emerald-700">{correct}/{total} câu đúng</span>
        </div>
      </QuizTopBar>

      <main className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-6 xl:px-6">
        <QuizProgressSegments
          answered={outcomes.map((o) => o !== "skipped")}
          results={outcomes.map((o) => (o === "skipped" ? null : o === "correct"))}
          current={index}
          onJump={onIndexChange}
        />

        <div className="mt-6 grid grid-cols-1 items-start gap-6 lg:grid-cols-[minmax(0,1fr)_360px] xl:grid-cols-[minmax(0,1fr)_420px]">
          {current && (
            <QuizReviewQuestionCard
              index={index}
              total={total}
              question={current.question}
              options={current.options}
              userAnswer={current.userAnswer ?? null}
              correctLetter={graded[index].correctLetter}
              outcome={graded[index].outcome}
            />
          )}
          <QuizReviewNavigatorCard outcomes={outcomes} current={index} onJump={onIndexChange} onOverview={onOverview} />
        </div>
      </main>

      <QuizFooter
        current={index}
        total={total}
        onPrev={() => onIndexChange(Math.max(0, index - 1))}
        onNext={() => onIndexChange(Math.min(total - 1, index + 1))}
        last={{ label: "Xem tổng quan", onClick: onOverview }}
      />
    </div>
  );
}
