import { addMinutes, format } from "date-fns";
import type { RoomOverview } from "@/apis/examAttemptApi";

/** Share of the room's candidates who handed in, as a whole percent. */
export function completionPercent({ completed, candidates }: Pick<RoomOverview, "completed" | "candidates">): number {
  return candidates === 0 ? 0 : Math.round((completed / candidates) * 100);
}

/** The timeline as chart points, each labelled with its bucket's start (with the day on the week view). */
export function timelinePoints({ window, from, bucketMinutes, counts }: RoomOverview["timeline"]): { label: string; count: number }[] {
  const start = new Date(from);
  const pattern = window === "7d" ? "dd/MM HH:mm" : "HH:mm";
  return counts.map((count, i) => ({ label: format(addMinutes(start, i * bucketMinutes), pattern), count }));
}
