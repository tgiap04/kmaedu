import { ApiRequestError } from "@/apis/api";
import type { Quizz } from "@/types/quizset";

export type QuestionsPage = { questions: Quizz[]; pagination?: { totalPages?: number } | null };

/** The set goes on past the page cap: it is refused whole, never turned into a set missing its last questions. */
export class TooManyQuestionsError extends Error {
  constructor(readonly limit: number) {
    super(`Bộ quiz có hơn ${limit.toLocaleString("vi-VN")} câu`);
    this.name = "TooManyQuestionsError";
  }
}

/**
 * Every question of a quiz set, a page at a time. The page count comes from the server; without it, reading goes on
 * while pages come back full, so a missing field never cuts the set to its first page. Past `maxPages` the set is
 * refused (TooManyQuestionsError) rather than cut.
 */
export async function readAllQuestions(fetchPage: (page: number) => Promise<QuestionsPage>, pageSize: number, maxPages: number): Promise<Quizz[]> {
  const all: Quizz[] = [];
  for (let page = 1; page <= maxPages; page++) {
    const res = await fetchPage(page);
    all.push(...res.questions);
    const total = res.pagination?.totalPages;
    const more = typeof total === "number" ? page < total : res.questions.length >= pageSize;
    if (!more) return all;
  }
  throw new TooManyQuestionsError(maxPages * pageSize);
}

/** What to tell the user when quiz sets or questions could not be read, and whether "Thử lại" can help. */
export function quizLoadError(error: unknown): { message: string; retryable: boolean } {
  if (error instanceof TooManyQuestionsError) return { message: `${error.message}, quá lớn để chuyển thành một bộ thẻ.`, retryable: false };
  const status = error instanceof ApiRequestError ? error.status : undefined;
  const requestId = error instanceof ApiRequestError ? error.requestId : undefined;
  if (status === 403 || status === 404) return { message: "Bạn không có quyền xem bộ quiz này, hoặc bộ quiz không còn.", retryable: false };
  if (status === 429) return { message: "Bạn thao tác hơi nhanh, thử lại sau ít phút.", retryable: true };
  return { message: `Không tải được bộ quiz.${requestId ? ` Mã yêu cầu: ${requestId}.` : ""}`, retryable: true };
}
