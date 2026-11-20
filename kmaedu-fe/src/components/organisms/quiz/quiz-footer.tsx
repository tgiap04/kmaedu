import { ArrowRightIcon, CaretLeftIcon, CaretRightIcon } from "@phosphor-icons/react";

interface Props {
  current: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
  /** What the right button does on the last question (hand in, or back to the overview in review). */
  last: { label: string; onClick: () => void };
}

const primary =
  "inline-flex h-12 items-center gap-2 rounded-full bg-gradient-to-r from-brand to-brand-strong px-6 text-[15px] font-bold text-white shadow-[0_10px_24px_-12px_var(--brand)] transition-[filter] hover:brightness-105 sm:px-8";

/** Bottom bar: previous, where you are, next — or the last-question action. */
export function QuizFooter({ current, total, onPrev, onNext, last }: Props) {
  const isLast = current >= total - 1;
  return (
    <div className="sticky bottom-0 z-20 border-t border-hairline bg-canvas/95 backdrop-blur">
      <div className="mx-auto flex h-[76px] w-full max-w-[1440px] items-center justify-between gap-3 px-4 xl:px-6">
        <button
          type="button"
          onClick={onPrev}
          disabled={current === 0}
          className="inline-flex h-12 items-center gap-2 rounded-full border border-hairline bg-canvas px-5 text-[15px] font-semibold text-ink shadow-soft transition-colors hover:border-brand-border hover:text-brand-strong disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:border-hairline disabled:hover:text-ink sm:px-7"
        >
          <CaretLeftIcon weight="bold" className="size-4" aria-hidden />
          Câu trước
        </button>
        <span className="text-[15px] font-semibold tabular-nums text-body">{current + 1} / {total}</span>
        {isLast ? (
          <button type="button" onClick={last.onClick} className={primary}>
            {last.label}
            <ArrowRightIcon weight="bold" className="size-4" aria-hidden />
          </button>
        ) : (
          <button type="button" onClick={onNext} className={primary}>
            Câu sau
            <CaretRightIcon weight="bold" className="size-4" aria-hidden />
          </button>
        )}
      </div>
    </div>
  );
}
