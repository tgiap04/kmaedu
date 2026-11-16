import { memo } from "react";
import { HistoryListCardHeader } from "@/components/molecules/HistoryListCardHeader";
import {
  PDFHistoryListItem,
  type PDFHistoryListItemData,
} from "@/components/molecules/PDFHistoryListItem";

interface PDFHistoryListSectionProps {
  items: PDFHistoryListItemData[];
  onDownload?: (id: string) => void;
  onDelete?: (id: string) => void;
  maxItems?: number;
}

const PDFHistoryListSectionComponent = ({
  items,
  onDownload,
  onDelete,
  maxItems = 4,
}: PDFHistoryListSectionProps) => {
  const displayItems = items.slice(0, maxItems);

  return (
    <div className="h-full rounded-2xl border border-hairline bg-canvas p-5 shadow-soft">
      <HistoryListCardHeader
        title="Tài liệu học tập"
        subtitle="Các file PDF tài liệu gần đây"
        viewAllTo="/k/history/pdf"
      />

      <div className="divide-y divide-hairline-soft">
        {displayItems.length > 0 ? (
          displayItems.map((item) => (
            <PDFHistoryListItem
              key={item.id}
              item={item}
              onDownload={onDownload}
              onDelete={onDelete}
            />
          ))
        ) : (
          <div className="py-8 text-center">
            <p className="text-sm text-muted-foreground">
              Chưa có lịch sử PDF
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

PDFHistoryListSectionComponent.displayName = "PDFHistoryListSection";

export const PDFHistoryListSection = memo(PDFHistoryListSectionComponent);
