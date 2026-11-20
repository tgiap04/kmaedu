import { useCallback, useEffect, useRef, useState } from "react";
import { useBlocker } from "react-router-dom";
import { refreshAccessToken } from "@/apis/api";
import { leaveExamAttemptApi, type UpdateProgressDto } from "@/apis/examAttemptApi";
import { getOrCreateDeviceId } from "@/lib/deviceId";
import { env } from "@/lib/env";

const KEEP_SESSION_MS = 10 * 60_000;

interface Options {
  attemptId: string | null;
  /** True while leaving would hand the attempt in: the session forbids leaving midway and it is still open. */
  active: boolean;
  /** The answers on screen, saved with the hand-in. */
  progress: () => UpdateProgressDto;
}

/**
 * "Cho phép thoát giữa chừng" off: leaving the quiz page hands the attempt in.
 * - Closing, reloading or typing another address: the browser's own confirm (beforeunload), then on `pagehide`
 *   (fired only when the page really goes) a keepalive request to `/leave` carrying the latest answers.
 *   A page only put into the back-forward cache (`persisted`) may come back, so it is not handed in.
 * - A link inside the app: the navigation is held (`blocked`) until the candidate confirms or stays.
 * The keepalive request cannot refresh an expired access token (15 minutes), so the session is refreshed
 * every 10 minutes while this is active.
 */
export function useLeaveHandIn({ attemptId, active, progress }: Options) {
  const progressRef = useRef(progress);
  progressRef.current = progress;
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    if (!active || !attemptId || !env.apiUrl) return;
    const warn = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      // Older browsers show the confirm only when returnValue is set.
      event.returnValue = "";
    };
    const handIn = (event: PageTransitionEvent) => {
      if (event.persisted) return;
      const deviceId = getOrCreateDeviceId();
      void fetch(`${env.apiUrl}/examattempts/${attemptId}/leave`, {
        method: "POST",
        keepalive: true,
        credentials: "include",
        headers: { "Content-Type": "application/json", ...(deviceId ? { "X-Device-ID": deviceId } : {}) },
        body: JSON.stringify(progressRef.current()),
      }).catch(() => {});
    };
    window.addEventListener("beforeunload", warn);
    window.addEventListener("pagehide", handIn);
    return () => {
      window.removeEventListener("beforeunload", warn);
      window.removeEventListener("pagehide", handIn);
    };
  }, [active, attemptId]);

  useEffect(() => {
    if (!active) return;
    const timer = setInterval(() => void refreshAccessToken().catch(() => {}), KEEP_SESSION_MS);
    return () => clearInterval(timer);
  }, [active]);

  const blocker = useBlocker(({ currentLocation, nextLocation }) => active && currentLocation.pathname !== nextLocation.pathname);

  const confirmLeave = useCallback(async () => {
    if (blocker.state !== "blocked") return;
    setLeaving(true);
    try {
      if (attemptId) await leaveExamAttemptApi(attemptId, progressRef.current());
    } catch {
      // Hand-in failed: the attempt stays open on the server and the host can still end it; let the candidate go.
    } finally {
      setLeaving(false);
      blocker.proceed();
    }
  }, [attemptId, blocker]);

  const stayHere = useCallback(() => {
    if (blocker.state === "blocked") blocker.reset();
  }, [blocker]);

  return { blocked: blocker.state === "blocked", leaving, confirmLeave, stayHere };
}
