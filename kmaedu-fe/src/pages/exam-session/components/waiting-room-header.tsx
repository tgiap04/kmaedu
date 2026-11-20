import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { CaretRightIcon, MonitorIcon } from "@phosphor-icons/react";

interface Props {
  title: string;
  subtitle: string;
  /** Where the first breadcrumb leads: the host's room list, or the candidate's exams. */
  crumb: { label: string; to: string };
  actions?: ReactNode;
}

export function WaitingRoomHeader({ title, subtitle, crumb, actions }: Props) {
  return (
    <div className="space-y-4">
      <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-sm text-body">
        <Link to={crumb.to} className="transition-colors hover:text-brand">{crumb.label}</Link>
        <CaretRightIcon className="size-3.5 shrink-0" aria-hidden />
        <span className="truncate text-ink" aria-current="page">{title}</span>
      </nav>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex min-w-0 items-center gap-4">
          <span className="grid size-16 shrink-0 place-items-center rounded-full bg-brand-soft text-brand md:size-[72px]" aria-hidden>
            <MonitorIcon weight="duotone" className="size-8 md:size-9" />
          </span>
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-bold text-ink md:text-[30px]">{title}</h1>
            <p className="mt-1 text-[15px] text-body">{subtitle}</p>
          </div>
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2.5">{actions}</div>}
      </div>
    </div>
  );
}
