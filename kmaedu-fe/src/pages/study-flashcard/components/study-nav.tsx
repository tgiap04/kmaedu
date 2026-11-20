import { ArrowRightIcon, CaretLeftIcon } from "@phosphor-icons/react";

interface Props {
  index: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
}

/** Floating bar at the bottom: previous, position with a small bar, next. */
export function StudyNav({ index, total, onPrev, onNext }: Props) {
  const position = total ? ((index + 1) / total) * 100 : 0;
  return (
    <nav aria-label="Chuyển thẻ" className="sticky bottom-0 z-20 px-4 pb-4 pt-2">
      <div className="mx-auto flex max-w-[600px] items-center justify-between gap-3 rounded-full border border-hairline bg-canvas/95 p-2 shadow-[0_18px_40px_-20px_rgba(15,23,42,0.35)] backdrop-blur">
        <button
          type="button"
          onClick={onPrev}
          disabled={index === 0}
          className="inline-flex h-12 items-center gap-2 rounded-full border border-hairline px-5 text-[15px] font-semibold text-ink transition-colors hover:border-brand-border hover:text-brand-strong disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-hairline disabled:hover:text-ink sm:px-7"
        >
          <CaretLeftIcon weight="bold" className="size-4" aria-hidden />
          Trước
        </button>
        <div className="flex min-w-0 flex-1 flex-col items-center gap-1.5">
          <span className="text-xl tabular-nums text-body"><span className="font-extrabold text-ink">{index + 1}</span> / {total}</span>
          <span aria-hidden className="h-1.5 w-full max-w-60 overflow-hidden rounded-full bg-hairline-soft">
            <span className="block h-full min-w-2.5 rounded-full bg-brand transition-[width] duration-500" style={{ width: `${position}%` }} />
          </span>
        </div>
        <button
          type="button"
          onClick={onNext}
          disabled={index >= total - 1}
          className="inline-flex h-12 items-center gap-2 rounded-full bg-gradient-to-r from-brand to-brand-strong px-6 text-[15px] font-bold text-white shadow-[0_10px_24px_-12px_var(--brand)] transition-[filter,opacity] hover:brightness-105 disabled:cursor-not-allowed disabled:opacity-40 sm:px-8"
        >
          Sau
          <ArrowRightIcon weight="bold" className="size-4" aria-hidden />
        </button>
      </div>
    </nav>
  );
}
