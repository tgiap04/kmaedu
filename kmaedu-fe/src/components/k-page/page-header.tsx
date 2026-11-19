import type { ReactNode } from "react";
import { DecorativeIcons } from "@/components/icons/icon-defaults";
import { cn } from "@/lib/utils";

interface PageHeaderProps {
  /** An icon element, drawn two-tone in the pink gradient tile. */
  icon: ReactNode;
  title: string;
  subtitle?: ReactNode;
  /** Buttons on the right (wraps under the title on small screens). */
  actions?: ReactNode;
  /** Above the title row, e.g. a breadcrumb or a back link. */
  eyebrow?: ReactNode;
  /** Beside the title block, e.g. a status pill. */
  badge?: ReactNode;
  /** A larger tile and title, for a page whose heading carries more weight (the exam room pages). */
  large?: boolean;
}

/** The /k page title: pink gradient icon tile, large title and a one-line description (as on /k/my-materials). */
export function PageHeader({ icon, title, subtitle, actions, eyebrow, badge, large }: PageHeaderProps) {
  return (
    <header className="mb-5">
      {eyebrow && <div className="mb-3">{eyebrow}</div>}
      <div className={cn("flex flex-wrap items-center", large ? "gap-x-5 gap-y-3" : "gap-3")}>
        <span
          className={cn(
            "grid shrink-0 place-items-center bg-gradient-to-br from-[#fde4e2] to-[#fef3f2] text-brand shadow-[0_6px_16px_rgba(238,47,43,0.12)]",
            large ? "size-14 rounded-[20px] md:size-16 [&_svg]:size-7 md:[&_svg]:size-8" : "size-12 rounded-lg [&_svg]:size-6",
          )}
        >
          <DecorativeIcons>{icon}</DecorativeIcons>
        </span>
        {/* At least 12rem for the title: on a phone the actions wrap below instead of squeezing it to a word per line. */}
        <div className={cn("min-w-48 flex-1", badge && "flex flex-wrap items-center gap-x-6 gap-y-2")}>
          <div className="min-w-0">
            <h1 className={cn("break-words font-bold tracking-tight text-ink", large ? "text-2xl lg:text-[30px] lg:leading-10" : "text-2xl lg:text-[28px] lg:leading-9")}>{title}</h1>
            {subtitle && <p className={cn("mt-0.5 text-body", large ? "text-[15px]" : "text-sm")}>{subtitle}</p>}
          </div>
          {badge}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}
