import { resolveAnswerIndex } from "@/lib/quizAnswerUtils";

export type ReviewOutcome = "correct" | "wrong" | "skipped";

/**
 * How a candidate did on one question, and which letter was right. The key may be a letter, an index or
 * the option text (an unmatched text falls back to A, as `resolveAnswerIndex` does everywhere); the
 * candidate's answer is a letter. Without a key nothing counts as correct.
 */
export function reviewOutcome(q: { answer?: string | null; options: string[]; userAnswer?: string | null }): {
  outcome: ReviewOutcome;
  correctLetter: string | null;
} {
  const idx = q.answer ? resolveAnswerIndex(q.answer, q.options) : -1;
  const correctLetter = idx >= 0 && idx < q.options.length ? String.fromCharCode(65 + idx) : null;
  if (!q.userAnswer) return { outcome: "skipped", correctLetter };
  return { outcome: q.userAnswer === correctLetter ? "correct" : "wrong", correctLetter };
}
