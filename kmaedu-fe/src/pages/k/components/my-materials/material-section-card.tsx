import type { ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import { Button } from "@/components/antd/button";
import { Skeleton } from "@/components/antd/skeleton";

interface MaterialSectionCardProps {
  icon: ReactNode;
  title: string;
  countLabel?: string;
  /** "Xem tất cả" pill, see ViewAllLink / ViewAllButton. */
  action?: ReactNode;
  /** Path under /public of the art shown in the pink panel on the left. */
  illustration: string;
  children: ReactNode;
}

/** One block of /k/my-materials: header with count and "Xem tất cả", pink art panel, then the rows. */
export function MaterialSectionCard({ icon, title, countLabel, action, illustration, children }: MaterialSectionCardProps) {
  return (
    <section className="overflow-hidden rounded-[20px] border border-hairline bg-canvas shadow-[0_4px_20px_rgba(15,23,42,0.04)]">
      <div className="flex flex-wrap items-center gap-3 px-4 py-3.5 md:px-5">
        <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand [&_svg]:size-5 [&_svg]:stroke-[1.9]">{icon}</span>
        <h2 className="text-[18px] font-bold text-ink">{title}</h2>
        {countLabel && <span className="rounded-full border border-hairline bg-surface-soft px-2.5 py-0.5 text-xs text-body">{countLabel}</span>}
        {action && <div className="ml-auto">{action}</div>}
      </div>
      <div className="grid border-t border-hairline-soft md:grid-cols-[208px_minmax(0,1fr)]">
        <div className="hidden p-3 md:block">
          <div className="grid h-full min-h-[140px] place-items-center rounded-2xl bg-gradient-to-br from-[#fff1f0] via-[#fff6f5] to-[#fde4e2]">
            <img src={illustration} alt="" aria-hidden="true" className="w-full max-w-[184px]" />
          </div>
        </div>
        <div className="min-w-0 divide-y divide-hairline-soft md:border-l md:border-hairline-soft">{children}</div>
      </div>
    </section>
  );
}

const pillClass =
  "inline-flex h-10 items-center gap-2 rounded-full border border-hairline bg-canvas px-4 text-[13px] font-semibold text-ink transition-colors hover:bg-surface-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40";

export function ViewAllLink({ to }: { to: string }) {
  return (
    <Link to={to} className={pillClass}>
      Xem tất cả
      <ArrowRight className="size-4" aria-hidden />
    </Link>
  );
}

/** In-place toggle between the 2-row preview and the full paginated list. */
export function ViewAllButton({ expanded, onToggle }: { expanded: boolean; onToggle: () => void }) {
  return (
    <button type="button" onClick={onToggle} aria-expanded={expanded} className={pillClass}>
      {expanded ? "Thu gọn" : "Xem tất cả"}
      <ArrowRight className={expanded ? "size-4 -rotate-90 transition-transform" : "size-4 transition-transform"} aria-hidden />
    </button>
  );
}

export function MaterialRowsSkeleton({ rows = 2 }: { rows?: number }) {
  return (
    <>
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-3.5 md:px-5">
          <Skeleton className="size-11 rounded-xl" />
          <div className="flex-1 space-y-2">
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-3 w-1/3" />
          </div>
          <Skeleton className="h-10 w-28 rounded-full" />
        </div>
      ))}
    </>
  );
}

export function MaterialMessage({ title, hint, onRetry }: { title: string; hint?: string; onRetry?: () => void }) {
  return (
    <div className="flex min-h-[140px] flex-col items-center justify-center gap-1 px-6 py-8 text-center">
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

export function SectionPager({ page, totalPages, onChange }: { page: number; totalPages: number; onChange: (page: number) => void }) {
  if (totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-center gap-3 px-4 py-3 text-sm">
      <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onChange(page - 1)}>
        Trước
      </Button>
      <span className="tabular-nums text-muted-foreground">
        {page}/{totalPages}
      </span>
      <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => onChange(page + 1)}>
        Sau
      </Button>
    </div>
  );
}
