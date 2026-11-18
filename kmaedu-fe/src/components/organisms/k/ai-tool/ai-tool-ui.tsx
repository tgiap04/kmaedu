import type { ReactNode } from "react";
import { CaretLeftIcon, CaretRightIcon, CheckIcon } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

/** White rounded-lg panel used by every block of the AI tool page. */
export const aiPanelClass = "rounded-lg border border-hairline bg-canvas shadow-[0_4px_20px_rgba(15,23,42,0.04)]";

/** Pink tile holding a red line icon (card headers, recent-files header). */
export function IconTile({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "grid h-12 w-12 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-[#fde4e2] to-[#fef3f2] text-brand [&_svg]:h-6 [&_svg]:w-6",
        className,
      )}
    >
      {children}
    </span>
  );
}

/** "1 / 10" counter, red progress bar and round prev/next buttons above a result list. */
export function ResultPager({
  current,
  total,
  onPrev,
  onNext,
  unit,
}: {
  current: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
  unit: string;
}) {
  const percent = total ? ((current + 1) / total) * 100 : 0;
  return (
    <div className="flex items-center gap-4 rounded-lg bg-surface-soft px-4 py-3 md:px-6">
      <p className="shrink-0 text-[17px] font-semibold tabular-nums text-ink" aria-live="polite">
        <span className="text-brand">{current + 1}</span> / {total}
        <span className="sr-only"> {unit}</span>
      </p>
      <div className="h-1.5 flex-1 overflow-hidden rounded-lg bg-hairline" role="progressbar" aria-valuemin={1} aria-valuemax={total} aria-valuenow={current + 1}>
        <div className="h-full rounded-lg bg-brand transition-[width] duration-300" style={{ width: `${percent}%` }} />
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <button
          type="button"
          onClick={onPrev}
          disabled={current === 0}
          aria-label={`${unit} trước`}
          className="grid h-11 w-11 place-items-center rounded-full border border-hairline bg-canvas text-body-strong transition-colors hover:bg-surface-soft disabled:cursor-not-allowed disabled:opacity-40"
        >
          <CaretLeftIcon className="h-5 w-5" />
        </button>
        <button
          type="button"
          onClick={onNext}
          disabled={current >= total - 1}
          aria-label={`${unit} sau`}
          className="grid h-11 w-11 place-items-center rounded-full bg-brand text-white shadow-[0_6px_14px_rgba(238,47,43,0.3)] transition-colors hover:bg-brand-strong disabled:cursor-not-allowed disabled:opacity-40 disabled:shadow-none"
        >
          <CaretRightIcon className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}

export interface EmptyStateStep {
  label: string;
  done?: boolean;
}

/** Result panel before anything was generated: an icon in soft rings, a short message and the steps to get there. */
export function ResultEmptyState({ icon, title, description, steps }: { icon: ReactNode; title: string; description: string; steps: EmptyStateStep[] }) {
  return (
    <div className="flex min-h-[360px] flex-1 flex-col items-center justify-center rounded-lg border border-dashed border-hairline bg-gradient-to-b from-surface-soft to-canvas px-6 py-10 text-center">
      <div className="relative mb-5 grid place-items-center" aria-hidden="true">
        <span className="absolute h-28 w-28 rounded-full bg-brand/5" />
        <span className="absolute h-20 w-20 rounded-full bg-brand/10" />
        <IconTile className="relative h-14 w-14 shadow-[0_8px_20px_rgba(238,47,43,0.15)]">{icon}</IconTile>
      </div>
      <h4 className="text-[17px] font-semibold text-ink">{title}</h4>
      <p className="mt-1 max-w-sm text-sm text-body">{description}</p>

      <ol className="mt-6 w-full max-w-sm space-y-2 text-left">
        {steps.map((step, index) => (
          <li key={step.label} className="flex items-center gap-3 rounded-lg border border-hairline bg-canvas px-4 py-3">
            <span
              className={cn(
                "grid h-7 w-7 shrink-0 place-items-center rounded-full text-[13px] font-semibold tabular-nums",
                step.done ? "bg-brand text-white" : "bg-surface-soft text-body-strong",
              )}
            >
              {step.done ? <CheckIcon className="h-4 w-4" aria-hidden="true" /> : index + 1}
            </span>
            <span className={cn("text-sm", step.done ? "text-body" : "text-body-strong")}>
              {step.label}
              {step.done && <span className="sr-only"> (đã xong)</span>}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
