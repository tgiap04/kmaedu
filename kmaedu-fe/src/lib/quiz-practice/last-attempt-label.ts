import type { SharedQuizSet } from "@/apis/quizPracticeApi";

/** "Lần gần nhất: 8/10" / "Đang làm dở" for a shared quiz set; null before the first attempt. */
export function lastAttemptLabel(last: SharedQuizSet["lastAttempt"]): string | null {
  if (!last) return null;
  return last.isSubmitted ? `Lần gần nhất: ${last.score ?? 0}/10` : "Đang làm dở";
}
