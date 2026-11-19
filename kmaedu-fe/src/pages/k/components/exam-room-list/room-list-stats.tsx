import { CheckCircleIcon, MonitorIcon, PlayCircleIcon, UsersThreeIcon } from "@phosphor-icons/react";
import { StatHighlightCard } from "@/components/k-page/stat-highlight-card";
import type { roomListStats } from "@/lib/exam-room/room-status";

export function RoomListStats({ stats }: { stats: ReturnType<typeof roomListStats> }) {
  return (
    <div className="grid grid-cols-1 gap-4 min-[480px]:grid-cols-2 xl:grid-cols-4">
      <StatHighlightCard icon={MonitorIcon} label="Tổng số phòng thi" value={stats.total} tone="red" />
      <StatHighlightCard icon={PlayCircleIcon} label="Đang diễn ra" value={stats.ongoing} tone="green" />
      <StatHighlightCard icon={CheckCircleIcon} label="Đã kết thúc" value={stats.ended} tone="blue" />
      <StatHighlightCard icon={UsersThreeIcon} label="Tổng lượt tham gia" value={stats.participants} tone="amber" />
    </div>
  );
}
