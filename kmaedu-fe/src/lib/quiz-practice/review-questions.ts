import type { ResultQuestion } from "@/apis/quizPracticeApi";
import { reviewOutcome, type ReviewOutcome } from "@/lib/exam-session/review-outcome";

/**
 * The picked option as a letter. A single letter is a POSITION (even when an option's text is that
 * letter); otherwise the exact option text. Unmatched text is kept as is, so the question is not counted as skipped.
 */
export function pickedLetter(selected: string | null, options: string[]): string | null {
  if (selected === null) return null;
  const v = selected.trim();
  if (v === "") return null;
  if (/^[a-z]$/i.test(v)) return v.toUpperCase();
  const i = options.findIndex((o) => o.trim() === v);
  return i >= 0 ? String.fromCharCode(65 + i) : v;
}

export interface PracticeReviewRow {
  id: string;
  question: string;
  options: string[];
  userAnswer: string | null;
  correctLetter: string | null;
  outcome: ReviewOutcome;
}

/** A graded practice attempt in the shape the exam review screen reads; the verdict is the server's `isCorrect`. */
export function practiceReviewRows(questions: ResultQuestion[]): PracticeReviewRow[] {
  return questions.map((q) => {
    const userAnswer = pickedLetter(q.selectedAnswer, q.options);
    const { correctLetter } = reviewOutcome({ answer: q.correctAnswer, options: q.options });
    const outcome: ReviewOutcome = userAnswer === null ? "skipped" : q.isCorrect ? "correct" : "wrong";
    return { id: q.id, question: q.question, options: q.options, userAnswer, correctLetter, outcome };
  });
}
