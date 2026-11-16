import { ArrowRight, FileText } from "lucide-react";
import { Link } from "react-router-dom";

interface HistoryListCardHeaderProps {
  title: string;
  subtitle: string;
  viewAllTo: string;
}

/** Header of a /k/history list card: round icon, title + subtitle, red "Xem tất cả →". */
export function HistoryListCardHeader({ title, subtitle, viewAllTo }: HistoryListCardHeaderProps) {
  return (
    <div className="flex items-center gap-3 border-b border-hairline-soft pb-4">
      <span className="flex size-11 shrink-0 items-center justify-center rounded-full bg-brand-soft text-brand">
        <FileText className="size-5" aria-hidden />
      </span>
      <div className="min-w-0 flex-1">
        <h2 className="truncate text-lg font-semibold text-ink">{title}</h2>
        <p className="truncate text-xs text-muted-foreground sm:text-sm">{subtitle}</p>
      </div>
      <Link
        to={viewAllTo}
        className="group inline-flex shrink-0 items-center gap-2 rounded-full px-1 text-sm font-semibold text-coral focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
      >
        Xem tất cả
        <span className="flex size-6 items-center justify-center rounded-full bg-brand-soft transition-transform group-hover:translate-x-0.5">
          <ArrowRight className="size-3.5" aria-hidden />
        </span>
      </Link>
    </div>
  );
}
