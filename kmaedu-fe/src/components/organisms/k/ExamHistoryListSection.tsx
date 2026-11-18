import { memo } from "react";
import { HistoryListCardHeader } from "@/components/molecules/HistoryListCardHeader";
import {
  ExamHistoryListItem,
  type ExamHistoryListItemData,
} from "@/components/molecules/ExamHistoryListItem";

interface ExamHistoryListSectionProps {
  items: ExamHistoryListItemData[];
  onClick?: (id: string) => void;
  maxItems?: number;
}

const ExamHistoryListSectionComponent = ({
  items,
  onClick,
  maxItems = 4,
}: ExamHistoryListSectionProps) => {
  const displayItems = items.slice(0, maxItems);

  return (
    <div className="h-full rounded-lg border border-hairline bg-canvas p-4 shadow-soft">
      <HistoryListCardHeader
        title="Lịch sử làm bài"
        subtitle="Kết quả các bài thi đã làm"
        viewAllTo="/k/history/exam"
      />

      <div className="divide-y divide-hairline-soft">
        {displayItems.length > 0 ? (
          displayItems.map((item) => (
            <ExamHistoryListItem
              key={item.id}
              item={item}
              onClick={onClick}
            />
          ))
        ) : (
          <div className="py-6 text-center">
            <p className="text-sm text-muted-foreground">
              Chưa có lịch sử bài thi
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

ExamHistoryListSectionComponent.displayName = "ExamHistoryListSection";

export const ExamHistoryListSection = memo(ExamHistoryListSectionComponent);
