import { memo } from "react";
import { EyeIcon, FoldersIcon, CardsIcon } from "@phosphor-icons/react";
import { HistoryStatCard } from "@/components/molecules/HistoryStatCard";

interface FlashcardStatsData {
  totalGroups: number;
  totalGroupsTrend: number;
  totalCards: number;
  totalCardsTrend: number;
  totalViews: number;
  totalViewsTrend: number;
}

interface FlashcardStatsSectionProps {
  stats: FlashcardStatsData;
}

const FlashcardStatsSectionComponent = ({ stats }: FlashcardStatsSectionProps) => {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      <HistoryStatCard
        title="Tổng số nhóm"
        value={stats.totalGroups}
        icon={FoldersIcon}
        tone="red"
      />
      <HistoryStatCard
        title="Tổng số thẻ"
        value={stats.totalCards}
        icon={CardsIcon}
        tone="amber"
      />
      <HistoryStatCard
        title="Tổng lượt xem"
        value={stats.totalViews}
        icon={EyeIcon}
        tone="green"
      />
    </div>
  );
};

FlashcardStatsSectionComponent.displayName = "FlashcardStatsSection";

export const FlashcardStatsSection = memo(FlashcardStatsSectionComponent);
