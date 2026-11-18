import { CaretCircleLeftIcon, CaretCircleRightIcon } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { pillClass } from "@/components/k-page/section-card";

interface Props {
  page: number;
  totalPages: number;
  perPage: number;
  total: number;
  unit: string;
  onChange: (updater: (prev: number) => number) => void;
  onSelect: (page: number) => void;
}

/** Footer of a detail-page list: "a - b / total" on the left, prev / numbers / next pills on the right. */
export function NumberedPagination({ page, totalPages, perPage, total, unit, onChange, onSelect }: Props) {
  const numbers = Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
    if (totalPages <= 5 || page <= 3) return i + 1;
    if (page >= totalPages - 2) return totalPages - 4 + i;
    return page - 2 + i;
  });
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 md:px-5">
      <p className="text-sm text-muted-foreground">
        Hiển thị {(page - 1) * perPage + 1} - {Math.min(page * perPage, total)} / {total} {unit}
      </p>
      <div className="flex items-center gap-1.5">
        <button type="button" className={cn(pillClass, "disabled:opacity-50")} onClick={() => onChange((p) => Math.max(1, p - 1))} disabled={page === 1}>
          <CaretCircleLeftIcon className="size-4" aria-hidden />
          Trước
        </button>
        {numbers.map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => onSelect(n)}
            aria-current={page === n ? "page" : undefined}
            className={cn(
              "grid size-8 place-items-center rounded-full border text-[13px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40",
              page === n ? "border-brand bg-brand text-white" : "border-hairline bg-canvas text-ink hover:bg-surface-soft",
            )}
          >
            {n}
          </button>
        ))}
        <button type="button" className={cn(pillClass, "disabled:opacity-50")} onClick={() => onChange((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
          Sau
          <CaretCircleRightIcon className="size-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}
