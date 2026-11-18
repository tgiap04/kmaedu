import { memo } from "react";
import { CaretCircleLeftIcon, CaretCircleRightIcon, TrashIcon } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { pageWindow, resultRange } from "@/lib/manage-exam/exam-list-view";

interface ExamTablePaginationProps {
  currentPage: number;
  totalPages: number;
  totalResults: number;
  perPage: number;
  onPageChange: (page: number) => void;
  selectedCount: number;
  onDeleteSelected: () => void;
  /** What a row is, in the range text. */
  unit?: string;
}

const square =
  "grid size-10 place-items-center rounded-lg border text-[15px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 disabled:pointer-events-none disabled:opacity-40";

/** Footer inside the exam table card: range text (or bulk delete) on the left, square page buttons on the right. */
const ExamTablePaginationComponent = ({
  currentPage,
  totalPages,
  totalResults,
  perPage,
  onPageChange,
  selectedCount,
  onDeleteSelected,
  unit = "đề thi",
}: ExamTablePaginationProps) => {
  const { from, to } = resultRange(currentPage, perPage, totalResults);

  return (
    <div className="flex flex-col items-center justify-between gap-3 px-4 py-4 sm:flex-row md:px-5">
      <div className="flex items-center gap-3 text-[14px] text-body">
        <span>Hiển thị {from} – {to} trong tổng số {totalResults} {unit}</span>
        {selectedCount > 0 && (
          <button
            type="button"
            onClick={onDeleteSelected}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-brand-border bg-brand-soft px-3 text-[13px] font-semibold text-brand transition-colors hover:bg-brand-soft-hover focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
          >
            <TrashIcon className="size-3.5" aria-hidden />
            Xóa {selectedCount} đã chọn
          </button>
        )}
      </div>
      <nav className="flex items-center gap-2" aria-label="Phân trang">
        <button
          type="button"
          aria-label="Trang trước"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage <= 1}
          className={cn(square, "border-hairline bg-canvas text-body hover:bg-surface-soft")}
        >
          <CaretCircleLeftIcon className="size-4" aria-hidden />
        </button>
        {pageWindow(currentPage, totalPages).map((page) => (
          <button
            key={page}
            type="button"
            onClick={() => onPageChange(page)}
            aria-current={page === currentPage ? "page" : undefined}
            className={cn(
              square,
              page === currentPage
                ? "border-brand-border bg-brand-soft text-brand"
                : "border-hairline bg-canvas text-ink hover:bg-surface-soft",
            )}
          >
            {page}
          </button>
        ))}
        <button
          type="button"
          aria-label="Trang sau"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          className={cn(square, "border-hairline bg-canvas text-body hover:bg-surface-soft")}
        >
          <CaretCircleRightIcon className="size-4" aria-hidden />
        </button>
      </nav>
    </div>
  );
};

ExamTablePaginationComponent.displayName = "ExamTablePagination";

export const ExamTablePagination = memo(ExamTablePaginationComponent);
