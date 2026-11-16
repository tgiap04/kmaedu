import { memo } from "react";
import { Layers, Plus } from "lucide-react";
import { PageHeader } from "@/components/k-page/page-header";

interface FlashcardManagementHeaderProps {
  onCreateFlashcard: () => void;
}

const FlashcardManagementHeaderComponent = ({
  onCreateFlashcard,
}: FlashcardManagementHeaderProps) => {
  return (
    <PageHeader
      icon={<Layers />}
      title="Quản lý Flashcard"
      subtitle="Tạo, chỉnh sửa và quản lý các bộ thẻ học flashcard của bạn"
      actions={
        <button
          type="button"
          onClick={onCreateFlashcard}
          className="inline-flex h-10 items-center gap-2 rounded-full bg-brand px-5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-brand/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 focus-visible:ring-offset-2"
        >
          <Plus className="size-4" aria-hidden />
          Tạo flashcard
        </button>
      }
    />
  );
};

FlashcardManagementHeaderComponent.displayName = "FlashcardManagementHeader";

export const FlashcardManagementHeader = memo(FlashcardManagementHeaderComponent);
