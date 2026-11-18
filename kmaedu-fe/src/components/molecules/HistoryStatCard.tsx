import { type Icon as AppIcon, ArrowRightIcon } from "@phosphor-icons/react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

export type HistoryStatTone = "red" | "amber" | "green" | "blue";

interface HistoryStatCardProps {
  title: string;
  value: number | string;
  icon: AppIcon;
  tone: HistoryStatTone;
  /** Where the arrow button leads; no arrow when the viewer cannot open that page. */
  to?: string;
}

const toneClass: Record<HistoryStatTone, { tile: string; arrow: string; mark: string }> = {
  red: { tile: "bg-brand-soft text-brand", arrow: "text-brand", mark: "text-brand" },
  amber: { tile: "bg-amber-50 text-amber-500", arrow: "text-amber-500", mark: "text-amber-400" },
  green: { tile: "bg-emerald-50 text-emerald-600", arrow: "text-emerald-600", mark: "text-emerald-500" },
  blue: { tile: "bg-blue-50 text-blue-600", arrow: "text-blue-600", mark: "text-blue-500" },
};

export function HistoryStatCard({ title, value, icon: Icon, tone, to }: HistoryStatCardProps) {
  const colors = toneClass[tone];

  return (
    <div className="relative overflow-hidden rounded-lg border border-hairline bg-canvas p-5 shadow-soft">
      {/* Faded watermark of the same icon, as in the brand mock */}
      <Icon
        className={cn("pointer-events-none absolute -right-2 top-1/2 size-24 -translate-y-1/2 opacity-[0.07]", colors.mark)}
        weight="duotone"
        aria-hidden
      />
      <div className="relative flex items-center gap-3">
        <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg", colors.tile)}>
          <Icon className="size-[18px]" weight="duotone" aria-hidden />
        </span>
        <p className="truncate text-sm font-medium text-body">{title}</p>
      </div>
      <div className="relative mt-3 flex items-end justify-between gap-3">
        <p className="text-3xl font-bold leading-none text-ink">{value}</p>
        {to && (
          <Link
            to={to}
            aria-label={`Xem ${title.toLowerCase()}`}
            className={cn(
              "flex size-9 items-center justify-center rounded-full bg-canvas shadow-raised transition-transform hover:translate-x-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40",
              colors.arrow,
            )}
          >
            <ArrowRightIcon className="size-4" aria-hidden />
          </Link>
        )}
      </div>
    </div>
  );
}
