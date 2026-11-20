import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/** One titled group of the session form: soft icon tile, title and a one-line hint, then its fields. */
export function SessionFormSection({ icon, title, hint, children, className }: {
  icon: ReactNode;
  title: string;
  hint: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-xl border border-hairline-soft bg-canvas p-4 sm:p-5", className)}>
      <header className="mb-4 flex items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-brand-soft text-brand [&_svg]:size-[18px]" aria-hidden>
          {icon}
        </span>
        <div className="min-w-0">
          <h3 className="text-[15px] font-semibold text-ink">{title}</h3>
          <p className="mt-0.5 text-[13px] text-muted-foreground">{hint}</p>
        </div>
      </header>
      {children}
    </section>
  );
}

/** A switch row: what it controls on the left (label + effect), the switch on the right. */
export function SwitchRow({ label, detail, control }: { label: string; detail: string; control: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
      <div className="min-w-0">
        <p className="text-sm font-medium text-ink">{label}</p>
        <p className="mt-0.5 text-[13px] text-body">{detail}</p>
      </div>
      <div className="shrink-0">{control}</div>
    </div>
  );
}

export function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p role="alert" className="mt-1.5 text-[13px] text-red-600">{message}</p>;
}

export const fieldLabel = "mb-1.5 block text-sm font-medium text-ink";
