import { FlagIcon } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import {
  answeredCount,
  navigatorState,
  type NavigatorState,
  type PracticeProgress,
} from "@/lib/quiz-practice/progress";
import type { PracticeQuestion } from "@/apis/quizPracticeApi";

const STYLE: Record<NavigatorState, string> = {
  current: "ring-2 ring-brand ring-offset-2 bg-brand-soft text-brand",
  marked: "bg-warning/20 text-ink",
  answered: "bg-brand text-white",
  empty: "bg-muted hover:bg-muted/80",
};

interface QuestionNavigatorProps {
  questions: PracticeQuestion[];
  currentIndex: number;
  progress: Pick<PracticeProgress, "answers" | "markedQuestions">;
  onGo: (index: number) => void;
}

export function QuestionNavigator({ questions, currentIndex, progress, onGo }: QuestionNavigatorProps) {
  return (
    <div className="sticky rounded-lg border border-hairline bg-canvas shadow-[0_4px_20px_rgba(15,23,42,0.04)]">
      <div className="p-4 md:p-5">
        <h3 className="mb-4 font-semibold">Danh sách câu hỏi</h3>
        <div className="grid max-h-80 grid-cols-5 gap-2 overflow-y-auto p-1">
          {questions.map((q, i) => (
            <button
              key={q.id}
              onClick={() => onGo(i)}
              aria-label={`Câu ${i + 1}`}
              className={cn(
                "relative aspect-square rounded-lg text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40",
                STYLE[navigatorState(q, i, currentIndex, progress)],
              )}
            >
              {i + 1}
              {progress.markedQuestions.includes(q.id) && <FlagIcon className="absolute right-1 top-1 h-3 w-3" />}
            </button>
          ))}
        </div>
        <p className="mt-4 text-sm text-muted-foreground">
          Đã trả lời {answeredCount(questions, progress.answers)}/{questions.length}
        </p>
      </div>
    </div>
  );
}
