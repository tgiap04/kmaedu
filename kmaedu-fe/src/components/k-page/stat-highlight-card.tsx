import type { ReactNode } from "react";
import type { Icon } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

export type StatTone = "red" | "green" | "blue" | "violet" | "amber";

const TONES: Record<StatTone, { wash: string; tile: string; mark: string }> = {
  red: { wash: "from-brand-soft/60", tile: "bg-brand-soft-hover text-brand", mark: "text-brand" },
  green: { wash: "from-emerald-50/70", tile: "bg-emerald-100/80 text-emerald-600", mark: "text-emerald-500" },
  blue: { wash: "from-blue-50/70", tile: "bg-blue-100/80 text-blue-600", mark: "text-blue-500" },
  violet: { wash: "from-violet-50/70", tile: "bg-violet-100/80 text-violet-600", mark: "text-violet-500" },
  amber: { wash: "from-amber-50/70", tile: "bg-amber-100/80 text-amber-500", mark: "text-amber-400" },
};

interface Props {
  icon: Icon;
  label: string;
  value: ReactNode;
  tone: StatTone;
}

/** A headline number: round icon tile, label over a large value, a tinted wash and the icon drawn large and faint. */
export function StatHighlightCard({ icon: StatIcon, label, value, tone }: Props) {
  const t = TONES[tone];
  return (
    <div className={cn("relative overflow-hidden rounded-lg border border-hairline bg-canvas bg-gradient-to-r to-transparent to-70% p-4 shadow-soft md:p-5", t.wash)}>
      <StatIcon weight="duotone" aria-hidden className={cn("pointer-events-none absolute -bottom-4 right-1 size-20 opacity-[0.09]", t.mark)} />
      <div className="relative flex items-center gap-4">
        <span className={cn("grid size-12 shrink-0 place-items-center rounded-full md:size-14", t.tile)}>
          <StatIcon weight="duotone" aria-hidden className="size-6 md:size-7" />
        </span>
        <div className="min-w-0">
          <p className="truncate text-sm text-body">{label}</p>
          <p className="mt-1 text-[26px] font-bold leading-none tabular-nums text-ink md:text-[28px]">{value}</p>
        </div>
      </div>
    </div>
  );
}
