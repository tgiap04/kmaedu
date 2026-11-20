import { forwardRef, type ReactNode } from "react";
import { cn } from "@/lib/utils";

interface CreateSectionProps {
  id: string;
  icon: ReactNode;
  title: string;
  subtitle: string;
  children: ReactNode;
  className?: string;
}

/** One card of the create-room form: soft pink icon tile, title, one-line description, then the fields. */
export const CreateSection = forwardRef<HTMLElement, CreateSectionProps>(({ id, icon, title, subtitle, children, className }, ref) => (
  <section
    ref={ref}
    id={id}
    aria-labelledby={`${id}-title`}
    className={cn("scroll-mt-[150px] rounded-xl border border-hairline-soft bg-canvas p-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)] sm:p-5", className)}
  >
    <header className="mb-5 flex items-center gap-3.5">
      <span className="grid size-11 shrink-0 place-items-center rounded-full bg-brand-soft text-brand [&_svg]:size-5" aria-hidden>
        {icon}
      </span>
      <div className="min-w-0">
        <h2 id={`${id}-title`} className="text-base font-semibold text-ink">{title}</h2>
        <p className="mt-0.5 text-[13px] text-muted-foreground">{subtitle}</p>
      </div>
    </header>
    {children}
  </section>
));
CreateSection.displayName = "CreateSection";

/** A field label; `required` adds the red star of the design. */
export function FieldLabel({ htmlFor, required, icon, children }: { htmlFor?: string; required?: boolean; icon?: ReactNode; children: ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="mb-2 flex items-center gap-2.5 text-sm font-medium text-ink">
      {icon && <span className="grid size-7 place-items-center text-ink [&_svg]:size-5" aria-hidden>{icon}</span>}
      <span>
        {children}
        {required && <span className="ml-0.5 text-brand">*</span>}
      </span>
    </label>
  );
}

export function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return <p id={id} role="alert" className="mt-1.5 text-[13px] text-red-600">{message}</p>;
}
