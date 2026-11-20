import type { ReactNode } from "react";
import { CaretLeftIcon } from "@phosphor-icons/react";

interface Props {
  icon: ReactNode;
  title: string;
  subtitle: string;
  onBack: () => void;
  /** Pills on the right. */
  children?: ReactNode;
}

/** Sticky bar shared by the quiz and its review: back, the icon tile, title and subtitle, pills on the right. */
export function QuizTopBar({ icon, title, subtitle, onBack, children }: Props) {
  return (
    <header className="sticky top-0 z-20 border-b border-hairline bg-canvas/90 backdrop-blur">
      <div className="mx-auto flex h-[72px] w-full max-w-[1440px] items-center gap-3 px-4 sm:gap-4 xl:px-6">
        <button
          type="button"
          onClick={onBack}
          aria-label="Quay lại"
          className="grid size-11 shrink-0 place-items-center rounded-xl border border-hairline bg-canvas text-ink shadow-soft transition-colors hover:border-brand-border hover:text-brand-strong"
        >
          <CaretLeftIcon weight="bold" className="size-5" />
        </button>
        <span aria-hidden className="hidden h-9 w-px bg-hairline sm:block" />
        <span className="hidden size-11 shrink-0 place-items-center rounded-xl bg-gradient-to-br from-brand to-brand-strong text-white shadow-[0_6px_16px_-6px_var(--brand)] sm:grid [&_svg]:size-6" aria-hidden>
          {icon}
        </span>
        <div className="min-w-0">
          <h1 className="truncate text-lg font-bold leading-tight text-ink">{title}</h1>
          <p className="truncate text-[13px] text-body">{subtitle}</p>
        </div>
        <div className="ml-auto flex items-center gap-2 sm:gap-3">{children}</div>
      </div>
    </header>
  );
}
