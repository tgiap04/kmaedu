import { useEffect, useState } from "react";
import { getExamSessionByIdApi } from "@/apis/examSessionApi";
import { getExamAttemptsBySessionApi, type ExamAttemptListItem } from "@/apis/examAttemptApi";
import type { ExamSession } from "@/types/examSession";

export const ROSTER_REFRESH_MS = 15_000;

export type HostState = "off" | "loading" | "host" | "not-host" | "error";

/**
 * The host's view of the waiting page. `enabled` is "may manage sessions"; the session API answers 404 to
 * anyone but the room's host, which turns the page back into the candidate flow (`not-host`). Any other
 * failure is not an answer: the first lookup shows a retry (`error`), a later one keeps the host view.
 * Once the host is known, the candidates who joined are read again every 15 seconds.
 */
export function useHostWaitingRoom(sessionId: string, enabled: boolean) {
  const [state, setState] = useState<HostState>(enabled ? "loading" : "off");
  const [session, setSession] = useState<ExamSession | null>(null);
  const [candidates, setCandidates] = useState<ExamAttemptListItem[]>([]);
  const [candidatesLoading, setCandidatesLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!enabled || !sessionId) {
      setState("off");
      return;
    }
    let cancelled = false;
    setState((prev) => (prev === "host" ? prev : "loading"));
    getExamSessionByIdApi(sessionId)
      .then((s) => {
        if (cancelled) return;
        setSession(s);
        setError(null);
        setState("host");
      })
      .catch((err: { status?: number; response?: { status?: number }; message?: string }) => {
        if (cancelled) return;
        if ((err?.status ?? err?.response?.status) === 404) {
          setState("not-host");
          return;
        }
        setError(err?.message || "Không thể tải phiên thi");
        setState((prev) => (prev === "host" ? prev : "error"));
      });
    return () => {
      cancelled = true;
    };
  }, [sessionId, enabled, reloadKey]);

  useEffect(() => {
    if (state !== "host") return;
    let cancelled = false;
    const load = async () => {
      setCandidatesLoading(true);
      try {
        const res = await getExamAttemptsBySessionApi(sessionId, 1, 100, true);
        if (!cancelled) setCandidates(res.attempts);
      } catch {
        // Keep the last list; the next tick tries again.
      } finally {
        if (!cancelled) setCandidatesLoading(false);
      }
    };
    void load();
    const timer = window.setInterval(load, ROSTER_REFRESH_MS);
    return () => {
      cancelled = true;
      window.clearInterval(timer);
    };
  }, [state, sessionId]);

  /** Read the session again (after ending the room) without leaving the host view. */
  const reload = () => setReloadKey((k) => k + 1);

  return { state, session, candidates, candidatesLoading, error, reload };
}
