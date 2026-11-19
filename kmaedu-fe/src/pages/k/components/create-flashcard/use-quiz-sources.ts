import { useCallback, useEffect, useState } from "react";
import { getAllQuizSetsApi, getQuizSetQuestionsApi } from "@/apis/quizsetApi";
import { CacheTTL, storeCache } from "@/lib/storeCache";
import type { QuizSet } from "@/types/quizset";
import { type CardDraft, quizzesToFlashcards } from "./quiz-to-flashcards";
import { quizLoadError, readAllQuestions } from "./read-all-questions";

export type QuizSetOption = Pick<QuizSet, "id" | "title" | "questionCount">;
export type LoadError = ReturnType<typeof quizLoadError>;

const PAGE_SIZE = 100; // the backend's maximum
const MAX_PAGES = 200; // 20 000 questions: far beyond any real set, a bound on the loop all the same

/** Same key as `useQuizSetStore.fetchAllQuizSets`: one read serves both, and editing a quiz set clears it ("quizsets"). */
const allSets = () => storeCache.fetchWithCache(storeCache.createKey("quizsets-all", {}), () => getAllQuizSetsApi(), { ttl: CacheTTL.FIVE_MINUTES });

/** Every question of a set, cached under "quizsets…" (read to the end: a cached list is never a partial one). */
const allQuestions = (quizSetId: string) =>
  storeCache.fetchWithCache(
    storeCache.createKey("quizsets-questions", { quizSetId }),
    () => readAllQuestions((page) => getQuizSetQuestionsApi(quizSetId, page, PAGE_SIZE), PAGE_SIZE, MAX_PAGES),
    { ttl: CacheTTL.FIVE_MINUTES },
  );

/** Logs the failure with what support needs (status, request id) and turns it into the message the panel shows. */
function failure(what: string, error: unknown): LoadError {
  console.error(`Failed to load ${what}:`, error);
  return quizLoadError(error);
}

/** The viewer's quiz sets, fetched the first time `enabled` turns true. */
export function useQuizSetOptions(enabled: boolean) {
  const [sets, setSets] = useState<QuizSetOption[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<LoadError | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!enabled || sets) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    allSets()
      .then(({ quizSets }) => !cancelled && setSets(quizSets.map(({ id, title, questionCount }) => ({ id, title, questionCount }))))
      .catch((e) => !cancelled && setError(failure("quiz sets", e)))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [enabled, attempt]); // eslint-disable-line react-hooks/exhaustive-deps

  return { sets: sets ?? [], loaded: sets !== null, loading, failed: error !== null, error, retry: () => setAttempt((n) => n + 1) };
}

const NO_CARDS = { cards: [] as CardDraft[], skipped: 0, total: 0 };

/** Every question of the chosen quiz set, already turned into cards. */
export function useQuizSetCards(quizSetId: string | null) {
  // The cards remember which set they came from: right after another set is picked, none show (no stale frame).
  const [state, setState] = useState<{ forId: string | null; cards: CardDraft[]; skipped: number; total: number }>({ forId: null, ...NO_CARDS });
  const [loading, setLoading] = useState(false);
  // The error, like the cards, remembers its set: a set picked after a failure never shows the old error.
  const [lastFailure, setFailure] = useState<{ forId: string; error: LoadError } | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    setFailure(null);
    if (!quizSetId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    allQuestions(quizSetId)
      .then((all) => !cancelled && setState({ forId: quizSetId, ...quizzesToFlashcards(all), total: all.length }))
      .catch((e) => !cancelled && setFailure({ forId: quizSetId, error: failure("quiz questions", e) }))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [quizSetId, attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);
  const current = state.forId === quizSetId ? state : { forId: quizSetId, ...NO_CARDS };
  const error = lastFailure?.forId === quizSetId ? lastFailure.error : null;
  const pending = quizSetId !== null && state.forId !== quizSetId && error === null;
  return { cards: current.cards, skipped: current.skipped, total: current.total, loading: loading || pending, failed: error !== null, error, retry };
}
