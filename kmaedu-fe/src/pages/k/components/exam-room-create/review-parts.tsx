import type { ReactNode } from "react";
import { CheckCircleIcon, MinusCircleIcon, PencilSimpleIcon } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

/** Soft UI card of the review: hairline border, a two-layer soft shadow. */
export const reviewCard =
  "rounded-xl border border-hairline-soft bg-canvas shadow-[0_1px_2px_rgba(16,24,40,0.04),0_12px_32px_-18px_rgba(16,24,40,0.18)]";

export function EditLink({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="inline-flex min-h-10 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg px-2.5 text-[13px] font-medium text-brand transition-colors duration-200 hover:bg-brand-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
    >
      <PencilSimpleIcon className="size-4" aria-hidden />
      Sửa
    </button>
  );
}

/** One figure of the exam setup: icon tile, small label, the value in bold. */
export function StatTile({ icon, label, value, hint }: { icon: ReactNode; label: string; value: string; hint?: string }) {
  return (
    <div className="flex items-start gap-3 rounded-lg bg-surface-soft p-3.5">
      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-canvas text-brand shadow-[0_1px_2px_rgba(16,24,40,0.06)] [&_svg]:size-[18px]" aria-hidden>
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="mt-0.5 text-[15px] font-semibold text-ink">{value}</p>
        {hint && <p className="mt-0.5 text-xs text-body">{hint}</p>}
      </div>
    </div>
  );
}

/** A rule of the session, on or off: status icon, what it means for the candidate, and a text chip (not colour alone). */
export function RuleLine({ on, title, detail }: { on: boolean; title: string; detail: string }) {
  return (
    <li className="flex items-start gap-3 py-3 first:pt-0 last:pb-0">
      {on ? (
        <CheckCircleIcon weight="fill" className="mt-0.5 size-5 shrink-0 text-emerald-600" aria-hidden />
      ) : (
        <MinusCircleIcon weight="fill" className="mt-0.5 size-5 shrink-0 text-muted-foreground/70" aria-hidden />
      )}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-ink">{title}</p>
        <p className="mt-0.5 text-[13px] text-body">{detail}</p>
      </div>
      <span
        className={cn(
          "shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold",
          on ? "bg-emerald-50 text-emerald-700" : "bg-surface-soft text-muted-foreground",
        )}
      >
        {on ? "Bật" : "Tắt"}
      </span>
    </li>
  );
}

/** One point of the first session's timeline. */
export function TimelinePoint({ title, time, last, muted }: { title: string; time: string; last?: boolean; muted?: boolean }) {
  return (
    <li className="relative flex gap-3 pb-5 last:pb-0">
      {!last && <span aria-hidden className="absolute left-[7px] top-5 h-[calc(100%-12px)] w-0.5 -translate-x-1/4 rounded-full bg-brand/25" />}
      <span
        aria-hidden
        className={cn("mt-1 size-[15px] shrink-0 rounded-full border-[3px]", muted ? "border-hairline bg-canvas" : last ? "border-brand bg-canvas" : "border-brand-soft bg-brand")}
      />
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground">{title}</p>
        <p className="mt-0.5 text-sm font-semibold text-ink">{time}</p>
      </div>
    </li>
  );
}
