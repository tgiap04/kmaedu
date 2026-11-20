import { useEffect, useRef } from "react";
import type { PracticeQuestion } from "@/apis/quizPracticeApi";
import { QuizFooter } from "@/components/organisms/quiz/quiz-footer";
import { QuizNavigatorCard } from "@/components/organisms/quiz/quiz-navigator-card";
import { QuizProgressSegments } from "@/components/organisms/quiz/quiz-progress-segments";
import { QuizQuestionCard } from "@/components/organisms/quiz/quiz-question-card";
import { quizKeyAction } from "@/lib/exam-session/quiz-keys";

interface Props {
  questions: PracticeQuestion[];
  currentIndex: number;
  /** Question id → chosen letter; "" or missing: not answered. */
  answers: Record<string, string>;
  marked: string[];
  busy: boolean;
  problem: string | null;
  /** Off while a dialog is open, so its keys stay its own. */
  keysEnabled: boolean;
  onGo: (index: number) => void;
  onSelect: (questionId: string, letter: string) => void;
  onToggleMark: (questionId: string) => void;
  onSubmit: () => void;
}

/** Practising a set: the exam screen's progress bar, question card, question list and footer, with its shortcuts. */
export function PracticeQuizView({ questions, currentIndex, answers, marked, busy, problem, keysEnabled, onGo, onSelect, onToggleMark, onSubmit }: Props) {
  const current = questions[currentIndex];
  const markedSet = new Set(marked);
  const answeredSet = new Set(questions.filter((q) => (answers[q.id] ?? "") !== "").map((q) => q.id));

  // A, B, C… pick an option, ← / → move; the latest props are read through a ref so the listener is bound once.
  const keyHandler = useRef<(e: KeyboardEvent) => void>(() => {});
  keyHandler.current = (e) => {
    if (!current) return;
    const action = quizKeyAction(e, current.options.length);
    if (!action) return;
    e.preventDefault();
    if (action.type === "prev") onGo(Math.max(0, currentIndex - 1));
    else if (action.type === "next") onGo(Math.min(questions.length - 1, currentIndex + 1));
    else onSelect(current.id, answers[current.id] === action.letter ? "" : action.letter);
  };
  // No keys and no second hand-in while a dialog is open or a hand-in is being sent.
  const submit = busy ? () => {} : onSubmit;
  const keysOn = keysEnabled && !busy;
  useEffect(() => {
    if (!keysOn) return;
    const onKey = (e: KeyboardEvent) => keyHandler.current(e);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [keysOn]);

  if (!current) return null;

  return (
    <div>
      <QuizProgressSegments answered={questions.map((q) => answeredSet.has(q.id))} current={currentIndex} onJump={onGo} />

      <div className="mt-5 grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_340px] xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="space-y-3">
          <QuizQuestionCard
            index={currentIndex}
            total={questions.length}
            question={current.question}
            options={current.options}
            selected={answers[current.id] || undefined}
            marked={markedSet.has(current.id)}
            onSelect={(letter) => onSelect(current.id, letter)}
            onToggleMark={() => onToggleMark(current.id)}
          />
          {problem && <p role="alert" className="text-sm font-medium text-destructive">{problem}</p>}
        </div>
        <QuizNavigatorCard ids={questions.map((q) => q.id)} answered={answeredSet} marked={markedSet} current={currentIndex} onJump={onGo} onSubmit={submit} />
      </div>

      <div className="sticky bottom-[calc(3.25rem+env(safe-area-inset-bottom))] z-20 -mx-4 mt-6 md:-mx-6 xl:bottom-0">
        <QuizFooter
          current={currentIndex}
          total={questions.length}
          onPrev={() => onGo(currentIndex - 1)}
          onNext={() => onGo(currentIndex + 1)}
          last={{ label: "Nộp bài", onClick: submit }}
        />
      </div>
    </div>
  );
}
