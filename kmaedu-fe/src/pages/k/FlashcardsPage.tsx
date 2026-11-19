import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FlashcardManagementTemplate } from "@/templates/FlashcardManagementTemplate";
import type { FlashcardViewMode } from "@/components/organisms/k/FlashcardSearchFilterBar";
import { TableSkeletonLoader } from "@/components/organisms/TableSkeletonLoader";
import { PAGE_SIZE, SORT_OPTIONS, STATUS_OPTIONS, useFlashcardListData } from "./components/flashcard-list/use-flashcard-list-data";
import { useFlashcardSetDialogs } from "./components/flashcard-list/use-flashcard-set-dialogs";
import type { SortKey } from "./components/flashcard-list/flashcard-list-logic";

export default function FlashcardsPage() {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState<FlashcardViewMode>("table");
  const list = useFlashcardListData();
  const { openEdit, openDelete, openShare, dialogs } = useFlashcardSetDialogs(list.afterDelete, list.retry);

  const handleCreate = useCallback(() => navigate("/k/flash-card/create"), [navigate]);
  const handlePlay = useCallback((id: string) => navigate(`/study-flashcard/${id}`), [navigate]);
  const handleManage = useCallback((id: string) => navigate(`/k/manage-flashcard-set/${id}`), [navigate]);

  if (!list.firstLoadDone) {
    return <TableSkeletonLoader rows={10} />;
  }

  return (
    <>
      <FlashcardManagementTemplate
        stats={list.stats}
        flashcards={list.rows}
        searchQuery={list.searchQuery}
        sortBy={list.sortBy}
        statusFilter={list.statusFilter}
        sortOptions={SORT_OPTIONS}
        statusOptions={STATUS_OPTIONS}
        viewMode={viewMode}
        currentPage={list.currentPage}
        totalPages={list.totalPages}
        totalResults={list.totalResults}
        perPage={PAGE_SIZE}
        busy={list.loading}
        loadFailed={list.failed}
        onRetry={list.retry}
        onSearchChange={list.changeSearch}
        onSortChange={(value) => list.changeSort(value as SortKey)}
        onStatusChange={list.changeStatus}
        onViewModeChange={setViewMode}
        onCreateFlashcard={handleCreate}
        onPageChange={list.setCurrentPage}
        onPlay={handlePlay}
        onManage={handleManage}
        onEdit={openEdit}
        onShare={openShare}
        onDelete={openDelete}
      />
      {dialogs}
    </>
  );
}
