import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** White panel of the waiting page: a soft round icon, a bold title, then its body. */
export function WaitingRoomPanel({ icon, title, action, children, className }: {
  icon: ReactNode;
  title: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-xl border border-hairline bg-canvas p-4 shadow-soft md:p-5", className)}>
      <header className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-brand-soft text-brand [&_svg]:size-5" aria-hidden>
            {icon}
          </span>
          <h2 className="text-lg font-bold text-ink">{title}</h2>
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}
