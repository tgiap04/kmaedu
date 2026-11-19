import { useCallback, useEffect, useRef, useState } from "react";
import { getRoomOverviewApi, type RoomOverview, type RoomOverviewWindow } from "@/apis/examAttemptApi";
import { useLiveRefresh } from "@/hooks/useLiveRefresh";
import { createReadGate } from "@/lib/read-gate";

/** How often a live room's numbers are read again. */
const LIVE_REFRESH_MS = 30_000;

/**
 * The room's progress numbers and submission timeline for the chosen range. While `live` (a session is
 * running) they are read again every 30 seconds. A failed read keeps the numbers shown and sets `failed`.
 */
export function useRoomOverview(roomId: string, live: boolean) {
  const [range, setRange] = useState<RoomOverviewWindow>("30m");
  const [data, setData] = useState<RoomOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const gate = useRef(createReadGate()).current;

  useEffect(() => {
    const token = gate.begin();
    setLoading(true);
    getRoomOverviewApi(roomId, range)
      .then((res) => {
        if (!gate.isCurrent(token)) return;
        setData(res);
        setFailed(false);
      })
      .catch((error) => {
        console.error("Failed to load room overview:", error);
        if (gate.isCurrent(token)) setFailed(true);
      })
      .finally(() => {
        gate.end(token);
        if (gate.isCurrent(token)) setLoading(false);
      });
  }, [roomId, range, attempt, gate]);

  const reload = useCallback(() => setAttempt((n) => n + 1), []);

  useLiveRefresh(live, reload, LIVE_REFRESH_MS);

  return { data, loading, failed, range, setRange, reload };
}
