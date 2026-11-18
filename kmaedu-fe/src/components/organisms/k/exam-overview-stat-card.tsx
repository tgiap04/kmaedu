import type { Icon as AppIcon } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

export type ExamStatTone = "red" | "green" | "amber" | "violet";

const toneClass: Record<ExamStatTone, { circle: string; wave: string }> = {
  red: { circle: "bg-brand-soft text-brand", wave: "text-brand" },
  green: { circle: "bg-emerald-50 text-emerald-600", wave: "text-emerald-500" },
  amber: { circle: "bg-amber-50 text-amber-500", wave: "text-amber-400" },
  violet: { circle: "bg-violet-50 text-violet-600", wave: "text-violet-500" },
};

interface Props {
  title: string;
  value: number | string;
  icon: AppIcon;
  tone: ExamStatTone;
  /** Small line under the value (e.g. the time of a date). */
  hint?: string;
}

/** Overview tile of /k/manage-exam: round tinted icon, label over a large value, soft wave in the corner. */
export function ExamOverviewStatCard({ title, value, icon: Icon, tone, hint }: Props) {
  const colors = toneClass[tone];
  return (
    <div className="relative overflow-hidden rounded-lg border border-hairline-soft bg-canvas p-4 shadow-raised">
      <svg
        viewBox="0 0 200 80"
        preserveAspectRatio="none"
        className={cn("pointer-events-none absolute bottom-0 right-0 h-12 w-3/4 opacity-[0.12]", colors.wave)}
        aria-hidden
      >
        <path d="M0 80 C 40 70, 70 40, 110 45 S 170 20, 200 5 L 200 80 Z" fill="currentColor" />
      </svg>
      <div className="relative flex items-center gap-4">
        <span className={cn("grid size-12 shrink-0 place-items-center rounded-full", colors.circle)}>
          <Icon className="size-6" weight="duotone" aria-hidden />
        </span>
        <div className="min-w-0">
          <p className="truncate text-[15px] font-medium text-body">{title}</p>
          <p className="mt-1 text-2xl font-bold leading-none text-ink">{value}</p>
          {hint && <p className="mt-1 text-[12px] text-body">{hint}</p>}
        </div>
      </div>
    </div>
  );
}
