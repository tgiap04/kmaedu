import { useCallback, useEffect, useRef, useState } from "react";
import { type RecentUpload, aiApi } from "@/apis/aiApi";
import { appendUnique } from "@/lib/append-unique";
import { singleFlight } from "@/lib/single-flight";
import { type PickedQuestion, fileQuestions } from "@/lib/manage-exam/exam-question-picker";

const PAGE_SIZE = 30;

/** An upload that has generated quizzes. */
export type QuizFile = RecentUpload & { quizHistory: NonNullable<RecentUpload["quizHistory"]> };

const hasQuizzes = (u: RecentUpload): u is QuizFile => !!u.quizHistory && u.quizHistory.quizCount > 0;

/** The viewer's uploaded files that have quizzes, newest first, a server page at a time. */
export function usePdfQuizFiles() {
  const [files, setFiles] = useState<QuizFile[]>([]);
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  // One page at a time: a double click on "load more" or "retry" must not fetch (and append) it twice.
  const [guard] = useState(singleFlight);

  const load = useCallback((next: number) => guard(async () => {
    setLoading(true);
    setFailed(false);
    try {
      const uploads = await aiApi.getUploadsPage(next, PAGE_SIZE);
      setFiles((prev) => appendUnique(next === 1 ? [] : prev, uploads.filter(hasQuizzes), (f) => f.id));
      setPage(next);
      setHasMore(uploads.length === PAGE_SIZE);
    } catch {
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }), [guard]);

  useEffect(() => {
    void load(1);
  }, [load]);

  return {
    files,
    loading,
    failed,
    hasMore,
    loadMore: () => void load(page + 1),
    retry: () => void load(page === 0 ? 1 : page + 1),
  };
}

/** Latest generated quizzes of one file; files already opened on this page are not fetched again. */
export function useFileQuizzes(file: QuizFile | null) {
  const cache = useRef(new Map<string, PickedQuestion[]>());
  const [questions, setQuestions] = useState<PickedQuestion[]>([]);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const fileId = file?.id ?? null;

  useEffect(() => {
    // Every early return also clears `loading`: the request of the file left behind is cancelled
    // below and never gets to clear it.
    if (!file) {
      setQuestions([]);
      setLoading(false);
      return;
    }
    const cached = cache.current.get(file.id);
    if (cached) {
      setQuestions(cached);
      setFailed(false);
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setFailed(false);
    setQuestions([]);
    aiApi
      .getUploadHistory(file.id)
      .then(({ quizHistory }) => {
        if (cancelled) return;
        const list = quizHistory ? fileQuestions({ id: file.id, historyId: quizHistory.id, filename: file.filename }, quizHistory.quizzes) : [];
        cache.current.set(file.id, list);
        setQuestions(list);
      })
      .catch(() => !cancelled && setFailed(true))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [fileId, attempt]); // eslint-disable-line react-hooks/exhaustive-deps

  return { questions, loading, failed, retry: () => setAttempt((n) => n + 1) };
}
