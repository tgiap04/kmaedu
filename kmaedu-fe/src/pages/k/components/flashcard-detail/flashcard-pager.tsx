import { CaretCircleLeftIcon, CaretCircleRightIcon } from "@phosphor-icons/react";
import { pageNumbers } from "@/lib/flashcard-detail/flashcard-detail";
import { cn } from "@/lib/utils";

interface Props {
  page: number;
  totalPages: number;
  onChange: (page: number) => void;
}

const square =
  "grid size-9 place-items-center rounded-lg border text-[14px] font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 disabled:pointer-events-none disabled:opacity-40";

/** Numbered page buttons with previous / next, right-aligned under the list. */
export function FlashcardPager({ page, totalPages, onChange }: Props) {
  if (totalPages <= 1) return null;
  return (
    <nav className="flex items-center justify-end gap-2 pt-3" aria-label="Phân trang">
      <button type="button" aria-label="Trang trước" onClick={() => onChange(page - 1)} disabled={page <= 1} className={cn(square, "border-hairline bg-canvas text-body hover:bg-surface-soft")}>
        <CaretCircleLeftIcon className="size-4" aria-hidden />
      </button>
      {pageNumbers(page, totalPages).map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => onChange(n)}
          aria-current={n === page ? "page" : undefined}
          className={cn(square, n === page ? "border-brand bg-brand text-white" : "border-hairline bg-canvas text-ink hover:bg-surface-soft")}
        >
          {n}
        </button>
      ))}
      <button type="button" aria-label="Trang sau" onClick={() => onChange(page + 1)} disabled={page >= totalPages} className={cn(square, "border-hairline bg-canvas text-body hover:bg-surface-soft")}>
        <CaretCircleRightIcon className="size-4" aria-hidden />
      </button>
    </nav>
  );
}
