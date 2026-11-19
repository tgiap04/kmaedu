import { useEffect } from "react";

/**
 * Calls `refresh` every `everyMs` while `live`, skipping the ticks when the browser tab is hidden (nobody is
 * looking, and a teacher may leave a running room open for hours).
 */
export function useLiveRefresh(live: boolean, refresh: () => void, everyMs = 30_000) {
  useEffect(() => {
    if (!live) return;
    const timer = setInterval(() => {
      if (!document.hidden) refresh();
    }, everyMs);
    return () => clearInterval(timer);
  }, [live, refresh, everyMs]);
}
