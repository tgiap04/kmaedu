import { useRef } from "react";
import { cn } from "@/lib/utils";

export type RoomTab = "candidates" | "sessions" | "stats" | "settings";

export const ROOM_TABS: readonly RoomTab[] = ["candidates", "sessions", "stats", "settings"];

export const isRoomTab = (value: string | null): value is RoomTab => ROOM_TABS.includes(value as RoomTab);

interface Props {
  active: RoomTab;
  onChange: (tab: RoomTab) => void;
  candidates: number | null;
  sessions: number;
}

/** Underlined tab row; arrow keys move between tabs as a tablist should. */
export function RoomDetailTabs({ active, onChange, candidates, sessions }: Props) {
  const refs = useRef<Partial<Record<RoomTab, HTMLButtonElement | null>>>({});
  const labels: Record<RoomTab, string> = {
    candidates: candidates === null ? "Danh sách thí sinh" : `Danh sách thí sinh (${candidates})`,
    sessions: `Phiên thi (${sessions})`,
    stats: "Thống kê chi tiết",
    settings: "Cài đặt phòng thi",
  };

  const move = (from: RoomTab, step: number) => {
    const next = ROOM_TABS[(ROOM_TABS.indexOf(from) + step + ROOM_TABS.length) % ROOM_TABS.length];
    onChange(next);
    refs.current[next]?.focus();
  };

  return (
    // Scrolls sideways on a phone only. `overflow-x-auto` alone makes the y axis scroll too (CSS turns a visible
    // axis into auto), so an underline poking below the row showed a vertical scrollbar. The baseline is an inset
    // shadow so the active underline sits on it without leaving the row.
    <div
      role="tablist"
      aria-label="Nội dung phòng thi"
      className="-mx-4 flex gap-1 overflow-x-auto overflow-y-hidden px-4 shadow-[inset_0_-1px_0_var(--hairline-soft)] md:-mx-5 md:gap-4 md:px-5"
    >
      {ROOM_TABS.map((tab) => (
        <button
          key={tab}
          ref={(el) => {
            refs.current[tab] = el;
          }}
          type="button"
          role="tab"
          id={`room-tab-${tab}`}
          aria-selected={tab === active}
          // Only the open tab has its panel on the page.
          aria-controls={tab === active ? `room-panel-${tab}` : undefined}
          tabIndex={tab === active ? 0 : -1}
          onClick={() => onChange(tab)}
          onKeyDown={(e) => {
            if (e.key === "ArrowRight") move(tab, 1);
            else if (e.key === "ArrowLeft") move(tab, -1);
          }}
          className={cn(
            "relative shrink-0 whitespace-nowrap px-3 pb-3.5 pt-1 text-[15px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-brand/40",
            tab === active
              ? "font-semibold text-brand after:absolute after:inset-x-0 after:bottom-0 after:h-[3px] after:rounded-full after:bg-brand"
              : "font-medium text-body hover:text-ink",
          )}
        >
          {labels[tab]}
        </button>
      ))}
    </div>
  );
}
