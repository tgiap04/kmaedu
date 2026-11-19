import { ROOM_STATUS_LABEL, type RoomStatus } from "@/lib/exam-room/room-status";
import { cn } from "@/lib/utils";

const TONE: Record<RoomStatus, { pill: string; dot: string }> = {
  ongoing: { pill: "bg-emerald-50 text-emerald-700", dot: "bg-emerald-500" },
  upcoming: { pill: "bg-amber-50 text-amber-700", dot: "bg-amber-500" },
  ended: { pill: "bg-blue-50 text-blue-600", dot: "bg-blue-500" },
  empty: { pill: "bg-surface-soft text-muted-foreground", dot: "bg-muted-foreground/60" },
};

/** Room status as a soft pill with a leading dot; `lg` for the detail page heading. */
export function RoomStatusPill({ status, size = "md" }: { status: RoomStatus; size?: "md" | "lg" }) {
  const tone = TONE[status];
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 whitespace-nowrap rounded-full font-medium",
        size === "lg" ? "h-9 px-4 text-sm" : "h-7 px-3 text-[13px]",
        tone.pill,
      )}
    >
      <span className={cn("size-2 shrink-0 rounded-full", tone.dot)} aria-hidden />
      {ROOM_STATUS_LABEL[status]}
    </span>
  );
}
