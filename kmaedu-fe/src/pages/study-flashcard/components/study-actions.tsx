import { ArrowCounterClockwiseIcon, ArrowLeftIcon, ArrowRightIcon, CheckIcon, XIcon } from "@phosphor-icons/react";
import { Kbd } from "@/components/atoms/Kbd";

interface Props {
  onForgot: () => void;
  onFlip: () => void;
  onRemembered: () => void;
}

/** Self-grading under the card: not yet, turn over, got it; then the keyboard hints. */
export function StudyActions({ onForgot, onFlip, onRemembered }: Props) {
  return (
    <div className="flex flex-col items-center">
      <div className="flex w-full flex-wrap items-center justify-center gap-3 sm:gap-5">
        <button
          type="button"
          onClick={onForgot}
          className="inline-flex h-14 items-center gap-2.5 rounded-full border border-brand-border bg-canvas px-6 text-base font-bold text-brand-strong shadow-soft transition-colors hover:bg-brand-soft/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 sm:px-8"
        >
          <XIcon weight="bold" className="size-5" aria-hidden />
          Chưa nhớ
        </button>
        <button
          type="button"
          onClick={onFlip}
          className="order-first inline-flex h-16 w-full items-center justify-center gap-3 rounded-full bg-gradient-to-r from-brand to-brand-strong px-10 text-lg font-bold text-white shadow-[0_14px_30px_-12px_var(--brand)] transition-[filter,transform] hover:brightness-105 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 focus-visible:ring-offset-2 sm:order-none sm:w-auto"
        >
          <ArrowCounterClockwiseIcon weight="bold" className="size-6" aria-hidden />
          Lật thẻ
        </button>
        <button
          type="button"
          onClick={onRemembered}
          className="inline-flex h-14 items-center gap-2.5 rounded-full border border-emerald-300 bg-emerald-50/50 px-6 text-base font-bold text-emerald-700 shadow-soft transition-colors hover:bg-emerald-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400/50 sm:px-8"
        >
          <CheckIcon weight="bold" className="size-5" aria-hidden />
          Đã nhớ
        </button>
      </div>

      <div className="mt-6 hidden items-center gap-x-6 gap-y-2 text-sm text-body md:flex">
        <span className="flex items-center gap-2"><Kbd>Space</Kbd>lật thẻ</span>
        <span className="flex items-center gap-2">
          <Kbd><ArrowLeftIcon weight="bold" className="size-3.5" aria-label="Mũi tên trái" /></Kbd>
          <Kbd><ArrowRightIcon weight="bold" className="size-3.5" aria-label="Mũi tên phải" /></Kbd>
          chuyển thẻ
        </span>
      </div>
    </div>
  );
}
