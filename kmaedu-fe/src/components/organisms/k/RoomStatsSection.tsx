import { memo } from "react";
import { DoorOpenIcon, UsersThreeIcon } from "@phosphor-icons/react";
import { HistoryStatCard } from "@/components/molecules/HistoryStatCard";

interface RoomStats {
  activeRooms: number;
  totalParticipants: number;
  ongoingExams: number;
  completedToday: number;
}

interface RoomStatsSectionProps {
  stats: RoomStats;
}

const RoomStatsSectionComponent = ({ stats }: RoomStatsSectionProps) => {
  return (
    <div className="mb-4 grid gap-4 sm:grid-cols-2">
      <HistoryStatCard icon={DoorOpenIcon} title="Phòng thi đang hoạt động" value={stats.activeRooms} tone="red" />
      <HistoryStatCard icon={UsersThreeIcon} title="Tổng số thí sinh" value={stats.totalParticipants} tone="green" />
    </div>
  );
};

RoomStatsSectionComponent.displayName = "RoomStatsSection";

export const RoomStatsSection = memo(RoomStatsSectionComponent);
