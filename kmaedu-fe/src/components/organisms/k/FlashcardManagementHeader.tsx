import { memo } from "react";
import { CardsIcon, PlusIcon } from "@phosphor-icons/react";
import { PageHeader } from "@/components/k-page/page-header";
import { Button } from "@/components/antd/button";

interface FlashcardManagementHeaderProps {
  onCreateFlashcard: () => void;
}

const FlashcardManagementHeaderComponent = ({ onCreateFlashcard }: FlashcardManagementHeaderProps) => (
  <PageHeader
    icon={<CardsIcon />}
    title="Quản lý Flashcard"
    subtitle="Tạo, chỉnh sửa và quản lý các bộ thẻ học flashcard của bạn"
    actions={
      <Button variant="solid" size="lg" onClick={onCreateFlashcard} aria-label="Tạo Flashcard">
        <PlusIcon weight="bold" aria-hidden />
        <span className="max-sm:hidden">Tạo Flashcard</span>
      </Button>
    }
  />
);

FlashcardManagementHeaderComponent.displayName = "FlashcardManagementHeader";

export const FlashcardManagementHeader = memo(FlashcardManagementHeaderComponent);
