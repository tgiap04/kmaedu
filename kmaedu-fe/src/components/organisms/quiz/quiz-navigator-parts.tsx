import type { ReactNode } from "react";
import { SquaresFourIcon } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

export function QuizGridHeading() {
  return (
    <div className="flex items-center gap-3">
      <span className="grid size-10 place-items-center rounded-xl bg-brand-soft text-brand">
        <SquaresFourIcon className="size-5" aria-hidden />
      </span>
      <h3 className="text-lg font-bold text-ink">Danh sách câu hỏi</h3>
    </div>
  );
}

/** Scrolling five-column grid that holds the question cells. */
export function QuizGrid({ children }: { children: ReactNode }) {
  return <div className="-mx-1 mt-4 grid max-h-[340px] grid-cols-5 gap-3 overflow-y-auto p-1">{children}</div>;
}

export type QuizCellTone = "brand" | "correct" | "wrong" | "empty";

const CELL: Record<QuizCellTone, string> = {
  brand: "bg-gradient-to-b from-brand to-brand-strong text-white shadow-[0_6px_14px_-8px_var(--brand)]",
  correct: "bg-gradient-to-b from-emerald-400 to-emerald-600 text-white shadow-[0_6px_14px_-8px_rgb(16_185_129)]",
  wrong: "bg-gradient-to-b from-brand to-brand-strong text-white shadow-[0_6px_14px_-8px_var(--brand)]",
  empty: "border border-hairline-soft bg-page text-body hover:border-brand-border",
};

interface CellProps {
  number: number;
  tone: QuizCellTone;
  /** How the current cell stands out: the brand outline while taking the quiz, a dark ring in review. */
  current?: "brand" | "ink";
  label: string;
  onClick: () => void;
  children?: ReactNode;
}

export function QuizGridCell({ number, tone, current, label, onClick, children }: CellProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-current={current ? "step" : undefined}
      className={cn(
        "relative grid aspect-square place-items-center rounded-xl text-base font-bold tabular-nums transition-[background-color,border-color,transform] duration-150 active:scale-95",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40",
        CELL[tone],
        current === "ink" && "ring-[3px] ring-ink ring-offset-2 ring-offset-canvas",
        current === "brand" && (tone === "empty" ? "border-2 border-brand bg-canvas text-brand" : "ring-2 ring-brand ring-offset-2 ring-offset-canvas"),
      )}
    >
      {number}
      {children}
    </button>
  );
}

export function QuizLegend({ children }: { children: ReactNode }) {
  return <div className="mt-5 space-y-2.5 rounded-2xl border border-hairline-soft bg-page p-3">{children}</div>;
}

export function QuizLegendRow({ icon, label, value }: { icon: ReactNode; label: string; value: number }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-hairline-soft bg-canvas px-4 py-3">
      {icon}
      <span className="text-[15px] text-body">{label}</span>
      <span className="ml-auto text-base font-bold tabular-nums text-ink">{value}</span>
    </div>
  );
}

export const legendDot = (className: string) => <span className={cn("size-4 rounded-full", className)} aria-hidden />;
