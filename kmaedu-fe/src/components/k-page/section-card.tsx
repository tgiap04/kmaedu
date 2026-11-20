import type { ReactNode } from "react";
import { ArrowCircleRightIcon } from "@phosphor-icons/react";
import { DecorativeIcons } from "@/components/icons/icon-defaults";
import { Button } from "@/components/antd/button";
import { Skeleton } from "@/components/antd/skeleton";
import { cn } from "@/lib/utils";

interface SectionCardProps {
  icon: ReactNode;
  title: string;
  /** One line under the title saying what the section holds. */
  subtitle?: string;
  countLabel?: string;
  /** A pill at the header's right, e.g. ViewAllButton. */
  action?: ReactNode;
  /** Path under /public of the art shown at the right of the header, on a soft pink fade (md and up). */
  illustration?: string;
  /** Body without the row dividers (a form, a grid, a table). */
  plain?: boolean;
  children: ReactNode;
}

/** The /k section block: header with count and an action pill, optional art at the header's right, then the rows. */
export function SectionCard({ icon, title, subtitle, countLabel, action, illustration, plain, children }: SectionCardProps) {
  const body = plain ? "min-w-0" : "min-w-0 divide-y divide-hairline-soft";
  return (
    <section className="overflow-hidden rounded-lg border border-hairline bg-canvas shadow-[0_4px_20px_rgba(15,23,42,0.04)]">
      <div
        className={cn(
          "relative flex flex-wrap items-center gap-2.5 overflow-hidden px-4 py-3 md:px-5",
          illustration && "md:bg-gradient-to-r md:from-canvas md:from-45% md:via-[#fff7f6] md:to-[#fde8e6]",
        )}
      >
        {/* The art sits at the header's right edge, so the rows keep the full width. */}
        {illustration && (
          <img
            src={illustration}
            alt=""
            aria-hidden="true"
            className={cn("pointer-events-none absolute top-1/2 hidden h-[72px] -translate-y-1/2 select-none md:block", action ? "right-40" : "right-6")}
          />
        )}
        <span className="relative grid size-9 shrink-0 place-items-center rounded-lg bg-brand-soft text-brand [&_svg]:size-[18px]"><DecorativeIcons>{icon}</DecorativeIcons></span>
        <div className="relative min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <h2 className="text-[16px] font-bold text-ink">{title}</h2>
            {countLabel && <span className="rounded-lg border border-hairline bg-surface-soft px-2.5 py-0.5 text-xs text-body">{countLabel}</span>}
          </div>
          {subtitle && <p className="mt-0.5 text-[13px] text-body">{subtitle}</p>}
        </div>
        {action && <div className="relative ml-auto">{action}</div>}
      </div>
      <div className={`${body} border-t border-hairline-soft`}>{children}</div>
    </section>
  );
}

export const pillClass =
  "inline-flex h-8 items-center gap-1.5 rounded-lg border border-hairline bg-canvas px-3.5 text-[13px] font-semibold text-ink transition-colors hover:bg-surface-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40";

/** In-place toggle between the 2-row preview and the full paginated list. */
export function ViewAllButton({ expanded, onToggle }: { expanded: boolean; onToggle: () => void }) {
  return (
    <button type="button" onClick={onToggle} aria-expanded={expanded} className={pillClass}>
      {expanded ? "Thu gọn" : "Xem tất cả"}
      <ArrowCircleRightIcon className={expanded ? "size-4 -rotate-90 transition-transform" : "size-4 transition-transform"} aria-hidden />
    </button>
  );
}

export function RowsSkeleton({ rows = 2 }: { rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-2.5 md:px-5">
          <Skeleton className="size-9 rounded-lg" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-3 w-1/3" />
          </div>
          <Skeleton className="h-8 w-28 rounded-lg" />
        </div>
      ))}
    </>
  );
}

export function SectionMessage({ title, hint, onRetry }: { title: string; hint?: string; onRetry?: () => void }) {
  return (
    <div className="flex min-h-[104px] flex-col items-center justify-center gap-1 px-6 py-6 text-center">
      <p className={onRetry ? "text-sm font-medium text-destructive" : "text-sm font-medium text-ink"}>{title}</p>
      {hint && <p className="text-sm text-muted-foreground">{hint}</p>}
      {onRetry && (
        <Button variant="outline" size="sm" className="mt-2" onClick={onRetry}>
          Thử lại
        </Button>
      )}
    </div>
  );
}

/** Previous / next under a section. Without `totalPages` (an API with no total) it shows "Trang N" and `hasNext` decides "Sau". */
export function SectionPager({ page, totalPages, hasNext, onChange }: { page: number; totalPages?: number; hasNext?: boolean; onChange: (page: number) => void }) {
  const canNext = totalPages === undefined ? !!hasNext : page < totalPages;
  if (page <= 1 && !canNext) return null;
  return (
    <div className="flex items-center justify-center gap-3 px-4 py-3 text-sm">
      <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onChange(page - 1)}>
        Trước
      </Button>
      <span className="tabular-nums text-muted-foreground">
        {totalPages === undefined ? `Trang ${page}` : `${page}/${totalPages}`}
      </span>
      <Button variant="outline" size="sm" disabled={!canNext} onClick={() => onChange(page + 1)}>
        Sau
      </Button>
    </div>
  );
}
