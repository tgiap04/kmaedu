import { CheckIcon, MinusIcon, XIcon } from "@phosphor-icons/react";
import type { ReviewOutcome } from "@/lib/exam-session/review-outcome";
import { cn } from "@/lib/utils";
import { QuizOptionCard, type QuizOptionTone } from "./quiz-option-card";
import { QuizQuestionFrame } from "./quiz-question-frame";

interface Props {
  index: number;
  total: number;
  question: string;
  options: string[];
  /** The candidate's letter; null when skipped. */
  userAnswer: string | null;
  correctLetter: string | null;
  outcome: ReviewOutcome;
}

const VERDICT: Record<ReviewOutcome, { label: string; className: string; icon: React.ReactNode }> = {
  correct: { label: "Trả lời đúng", className: "border-emerald-300 text-emerald-700 [&_.dot]:bg-emerald-100", icon: <CheckIcon weight="bold" /> },
  wrong: { label: "Trả lời sai", className: "border-brand-border text-brand-strong [&_.dot]:bg-brand-soft", icon: <XIcon weight="bold" /> },
  skipped: { label: "Chưa trả lời", className: "border-hairline text-body [&_.dot]:bg-hairline-soft", icon: <MinusIcon weight="bold" /> },
};

function Tag({ tone, children }: { tone: "green" | "red"; children: string }) {
  return (
    <span className={cn("rounded-full border bg-canvas px-3 py-0.5 text-[13px] font-bold", tone === "green" ? "border-emerald-300 text-emerald-700" : "border-brand-border text-brand-strong")}>
      {children}
    </span>
  );
}

/** One question after hand-in: the verdict, the right option in green and a wrong pick in red. */
export function QuizReviewQuestionCard({ index, total, question, options, userAnswer, correctLetter, outcome }: Props) {
  const verdict = VERDICT[outcome];
  return (
    <QuizQuestionFrame
      index={index}
      total={total}
      question={question}
      action={(
        <span className={cn("inline-flex h-11 items-center gap-2 rounded-full border bg-canvas pl-1.5 pr-4 text-sm font-bold shadow-soft", verdict.className)}>
          <span className="dot grid size-8 place-items-center rounded-full [&_svg]:size-4" aria-hidden>{verdict.icon}</span>
          {verdict.label}
        </span>
      )}
    >
      {outcome === "skipped" && (
        <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm font-medium text-amber-700">Bạn không trả lời câu hỏi này</p>
      )}
      <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        {options.map((option, i) => {
          const letter = String.fromCharCode(65 + i);
          const isRight = letter === correctLetter;
          const isPicked = letter === userAnswer;
          const tone: QuizOptionTone = isRight ? "correct" : isPicked ? "wrong" : "muted";
          const tags = (isRight || isPicked) && (
            <>
              {isPicked && <Tag tone={isRight ? "green" : "red"}>Bạn đã chọn</Tag>}
              {isRight && <Tag tone="green">Đáp án đúng</Tag>}
            </>
          );
          return <QuizOptionCard key={letter} letter={letter} content={option} tone={tone} tags={tags || undefined} />;
        })}
      </div>
    </QuizQuestionFrame>
  );
}
