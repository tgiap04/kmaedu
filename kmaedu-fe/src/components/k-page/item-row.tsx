import { type Icon as AppIcon, DotsThreeVerticalIcon } from "@phosphor-icons/react";
import { DecorativeIcons } from "@/components/icons/icon-defaults";
import type { ReactNode } from "react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/antd/dropdown-menu";
import { cn } from "@/lib/utils";

export type RowTone = "red" | "cyan" | "amber" | "indigo";

const toneClass: Record<RowTone, string> = {
  red: "bg-brand-soft text-brand",
  cyan: "bg-cyan-50 text-cyan-600",
  amber: "bg-amber-50 text-amber-500",
  indigo: "bg-indigo-50 text-indigo-600",
};

export interface RowAction {
  label: string;
  icon: AppIcon;
  onClick: () => void;
  /** Red text, for delete-like actions. */
  destructive?: boolean;
}

interface ItemRowProps {
  icon: ReactNode;
  tone: RowTone;
  title: string;
  /** Small marker after the title (e.g. a pin). */
  titleAddon?: ReactNode;
  meta: string[];
  /** Middle column on wide screens (views, last attempt, ...). */
  metric?: ReactNode;
  action: RowAction & { variant?: "primary" | "neutral" };
  menu?: RowAction[];
}

/** One item row: tinted icon, title and "a • b" meta, a metric, the main pill action and a ⋮ menu. */
export function ItemRow({ icon, tone, title, titleAddon, meta, metric, action, menu }: ItemRowProps) {
  const ActionIcon = action.icon;
  return (
    <div className="flex items-center gap-3 px-4 py-2.5 md:px-5">
      <span className={cn("grid size-9 shrink-0 place-items-center rounded-lg [&_svg]:size-[18px]", toneClass[tone])}><DecorativeIcons>{icon}</DecorativeIcons></span>

      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 text-[14px] font-semibold text-ink">
          <span className="truncate" title={title}>{title}</span>
          {titleAddon}
        </p>
        <p className="mt-0.5 truncate text-[12px] text-muted-foreground">{meta.filter(Boolean).join("  •  ")}</p>
      </div>

      {metric && <div className="hidden w-[180px] shrink-0 items-center gap-2 text-[13px] text-body lg:flex [&_svg]:size-4 [&_svg]:shrink-0">{metric}</div>}

      <button
        type="button"
        onClick={action.onClick}
        className={cn(
          "inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-lg border px-3.5 text-[13px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 sm:min-w-[112px]",
          action.variant === "neutral"
            ? "border-hairline bg-surface-soft text-body-strong hover:bg-surface-card"
            : "border-brand-border bg-brand-soft text-brand hover:bg-[#fde4e2]",
        )}
      >
        <ActionIcon className="size-3.5" aria-hidden />
        <span className="hidden sm:inline">{action.label}</span>
        <span className="sr-only sm:hidden">{action.label}</span>
      </button>

      {menu && menu.length > 0 && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label={`Tùy chọn cho ${title}`}
              className="grid size-8 shrink-0 place-items-center rounded-full text-body transition-colors hover:bg-surface-soft hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
            >
              <DotsThreeVerticalIcon className="size-4" aria-hidden />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {menu.map(({ label, icon: Icon, onClick, destructive }) => (
              <DropdownMenuItem key={label} onClick={onClick} className={cn("cursor-pointer", destructive && "text-destructive focus:text-destructive")}>
                <Icon className="mr-2 size-4" aria-hidden />
                {label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );
}

/** Red "PDF" badge on a pink tile, as in the mock's document rows. */
export function PdfBadgeIcon() {
  return <span className="grid h-6 w-5 place-items-center rounded-lg bg-brand text-[7px] font-bold tracking-tight text-white shadow-sm">PDF</span>;
}
