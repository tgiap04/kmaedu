import { StackIcon } from "@phosphor-icons/react";
import { FlashcardManagementHeader } from "@/components/organisms/k/FlashcardManagementHeader";
import { FlashcardStatsSection } from "@/components/organisms/k/FlashcardStatsSection";
import { FlashcardSearchFilterBar, type FlashcardViewMode } from "@/components/organisms/k/FlashcardSearchFilterBar";
import { FlashcardTable } from "@/components/organisms/k/FlashcardTable";
import { FlashcardTablePagination } from "@/components/organisms/k/FlashcardTablePagination";
import { SectionCard } from "@/components/k-page/section-card";
import type { FilterOption } from "@/components/molecules/FilterSelect";
import { FlashcardEmptyState } from "@/pages/k/components/flashcard-list/empty-state";
import { FlashcardGrid } from "@/pages/k/components/flashcard-list/flashcard-grid";
import type { FlashcardRow, FlashcardRowHandlers } from "@/pages/k/components/flashcard-list/flashcard-row";

interface FlashcardManagementTemplateProps extends FlashcardRowHandlers {
  /** null while unknown (not loaded, or failed). */
  stats: { totalGroups: number; totalCards: number; totalViews: number } | null;
  flashcards: FlashcardRow[];
  searchQuery: string;
  sortBy: string;
  statusFilter: string;
  sortOptions: FilterOption[];
  statusOptions: FilterOption[];
  viewMode: FlashcardViewMode;
  currentPage: number;
  totalPages: number;
  totalResults: number;
  perPage: number;
  /** A page is being fetched while the previous rows are still shown. */
  busy: boolean;
  /** The last read failed: say so (with a retry) instead of showing an empty account. */
  loadFailed: boolean;
  onRetry: () => void;
  onSearchChange: (value: string) => void;
  onSortChange: (value: string) => void;
  onStatusChange: (value: string) => void;
  onViewModeChange: (mode: FlashcardViewMode) => void;
  onCreateFlashcard: () => void;
  onPageChange: (page: number) => void;
}

export function FlashcardManagementTemplate({
  stats,
  flashcards,
  searchQuery,
  sortBy,
  statusFilter,
  sortOptions,
  statusOptions,
  viewMode,
  currentPage,
  totalPages,
  totalResults,
  perPage,
  busy,
  loadFailed,
  onRetry,
  onSearchChange,
  onSortChange,
  onStatusChange,
  onViewModeChange,
  onCreateFlashcard,
  onPageChange,
  ...handlers
}: FlashcardManagementTemplateProps) {
  const filtered = searchQuery.trim() !== "" || statusFilter !== "all";
  return (
    <div className="min-w-0">
      <FlashcardManagementHeader onCreateFlashcard={onCreateFlashcard} />
      <div className="flex flex-col gap-4">
        <FlashcardStatsSection stats={stats} />
        <FlashcardSearchFilterBar
          searchQuery={searchQuery}
          onSearchChange={onSearchChange}
          sortBy={sortBy}
          statusFilter={statusFilter}
          sortOptions={sortOptions}
          statusOptions={statusOptions}
          onSortChange={onSortChange}
          onStatusChange={onStatusChange}
          viewMode={viewMode}
          onViewModeChange={onViewModeChange}
        />
        <SectionCard icon={<StackIcon />} title="Danh sách bộ flashcard" countLabel={String(totalResults)} plain>
          {loadFailed && flashcards.length === 0 ? (
            <p className="py-12 text-center text-[14px] text-body">
              Không tải được danh sách bộ thẻ.{" "}
              <button type="button" onClick={onRetry} className="font-semibold text-brand hover:underline">Thử lại</button>
            </p>
          ) : flashcards.length === 0 ? (
            <FlashcardEmptyState filtered={filtered} onCreate={onCreateFlashcard} />
          ) : (
            <>
              {loadFailed && (
                <p className="mb-3 rounded-lg bg-surface-soft px-3 py-2 text-[13px] text-body" role="status">
                  Chưa tải được trang này, đang hiện danh sách trước đó.{" "}
                  <button type="button" onClick={onRetry} className="font-semibold text-brand hover:underline">Thử lại</button>
                </p>
              )}
              <div aria-busy={busy} className={busy ? "opacity-60 transition-opacity" : "transition-opacity"}>
                {viewMode === "grid" ? (
                  <FlashcardGrid flashcards={flashcards} {...handlers} />
                ) : (
                  <FlashcardTable flashcards={flashcards} {...handlers} />
                )}
              </div>
              <FlashcardTablePagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalResults={totalResults}
                perPage={perPage}
                onPageChange={onPageChange}
              />
            </>
          )}
        </SectionCard>
      </div>
    </div>
  );
}
