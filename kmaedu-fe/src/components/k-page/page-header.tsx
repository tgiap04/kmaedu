import type { ReactNode } from "react";
import { DecorativeIcons } from "@/components/icons/icon-defaults";

interface PageHeaderProps {
  /** An icon element, drawn two-tone in the pink gradient tile. */
  icon: ReactNode;
  title: string;
  subtitle?: ReactNode;
  /** Buttons on the right (wraps under the title on small screens). */
  actions?: ReactNode;
  /** Above the title row, e.g. a breadcrumb or a back link. */
  eyebrow?: ReactNode;
}

/** The /k page title: pink gradient icon tile, large title and a one-line description (as on /k/my-materials). */
export function PageHeader({ icon, title, subtitle, actions, eyebrow }: PageHeaderProps) {
  return (
    <header className="mb-5">
      {eyebrow && <div className="mb-3">{eyebrow}</div>}
      <div className="flex flex-wrap items-center gap-3">
        <span className="grid size-12 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-[#fde4e2] to-[#fef3f2] text-brand shadow-[0_6px_16px_rgba(238,47,43,0.12)] [&_svg]:size-6">
          <DecorativeIcons>{icon}</DecorativeIcons>
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="break-words text-2xl font-bold tracking-tight text-ink lg:text-[28px] lg:leading-9">{title}</h1>
          {subtitle && <p className="mt-0.5 text-sm text-body">{subtitle}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}
