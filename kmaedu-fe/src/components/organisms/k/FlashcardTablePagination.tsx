import { memo } from "react";
import { CaretLeftIcon, CaretRightIcon } from "@phosphor-icons/react";
import { pageNumbers, visibleRange } from "@/pages/k/components/flashcard-list/flashcard-list-logic";
import { cn } from "@/lib/utils";

interface FlashcardTablePaginationProps {
  currentPage: number;
  totalPages: number;
  totalResults: number;
  perPage: number;
  onPageChange: (page: number) => void;
  /** What the rows are, in "Hiển thị 1 – 5 / 5 …". */
  noun?: string;
}

const base =
  "grid size-8 place-items-center rounded-full border text-[13px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 disabled:pointer-events-none disabled:opacity-50";

const FlashcardTablePaginationComponent = ({ currentPage, totalPages, totalResults, perPage, onPageChange, noun = "bộ thẻ" }: FlashcardTablePaginationProps) => {
  const { from, to } = visibleRange(currentPage, perPage, totalResults);
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-t border-hairline-soft px-4 py-3 md:px-5">
      <p className="text-sm text-muted-foreground">
        Hiển thị {from} – {to} / {totalResults} {noun}
      </p>
      {totalPages > 1 && (
        <nav aria-label="Phân trang" className="flex items-center gap-1.5">
          <button type="button" aria-label="Trang trước" disabled={currentPage <= 1} onClick={() => onPageChange(currentPage - 1)} className={cn(base, "border-hairline bg-canvas text-body hover:bg-surface-soft")}>
            <CaretLeftIcon weight="bold" className="size-3.5" aria-hidden />
          </button>
          {pageNumbers(currentPage, totalPages).map((n) => (
            <button
              key={n}
              type="button"
              aria-current={n === currentPage ? "page" : undefined}
              onClick={() => onPageChange(n)}
              className={cn(base, n === currentPage ? "border-brand bg-brand text-white" : "border-hairline bg-canvas text-ink hover:bg-surface-soft")}
            >
              {n}
            </button>
          ))}
          <button type="button" aria-label="Trang sau" disabled={currentPage >= totalPages} onClick={() => onPageChange(currentPage + 1)} className={cn(base, "border-hairline bg-canvas text-body hover:bg-surface-soft")}>
            <CaretRightIcon weight="bold" className="size-3.5" aria-hidden />
          </button>
        </nav>
      )}
    </div>
  );
};

FlashcardTablePaginationComponent.displayName = "FlashcardTablePagination";

export const FlashcardTablePagination = memo(FlashcardTablePaginationComponent);
