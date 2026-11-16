import { memo } from "react";
import { Layers, Target, Eye } from "lucide-react";
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
        icon={Layers}
        tone="red"
      />
      <HistoryStatCard
        title="Tổng số thẻ"
        value={stats.totalCards}
        icon={Target}
        tone="amber"
      />
      <HistoryStatCard
        title="Tổng lượt xem"
        value={stats.totalViews}
        icon={Eye}
        tone="green"
      />
    </div>
  );
};

FlashcardStatsSectionComponent.displayName = "FlashcardStatsSection";

export const FlashcardStatsSection = memo(FlashcardStatsSectionComponent);
