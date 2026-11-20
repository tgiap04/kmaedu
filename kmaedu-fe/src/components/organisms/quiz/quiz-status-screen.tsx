import type { ReactNode } from "react";
import { ArrowLeftIcon, CircleNotchIcon, ListChecksIcon, ProhibitIcon, QuestionIcon } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { Sparkle } from "@/components/atoms/Sparkle";

type Tone = "loading" | "error" | "empty";

interface Action {
  label: string;
  onClick: () => void;
}

interface Props {
  tone: Tone;
  title: string;
  message: string;
  /** Main way out (red); none while loading. */
  primary?: Action;
  /** Second way out (outlined). */
  secondary?: Action;
}

const ICON: Record<Tone, { node: ReactNode; ring: string; core: string }> = {
  loading: { node: <CircleNotchIcon weight="bold" className="size-10 animate-spin" />, ring: "bg-brand-soft/50", core: "bg-brand-soft text-brand" },
  error: { node: <ProhibitIcon weight="bold" className="size-11" />, ring: "bg-brand-soft/60 shadow-[0_10px_30px_-12px_var(--brand)]", core: "bg-brand-soft text-brand" },
  empty: { node: <QuestionIcon weight="bold" className="size-11" />, ring: "bg-hairline-soft", core: "bg-canvas text-body" },
};

/** Whole-page card for the quiz's in-between states: loading, cannot open, or no questions. */
export function QuizStatusScreen({ tone, title, message, primary, secondary }: Props) {
  const icon = ICON[tone];
  return (
    <div className="flex min-h-[100dvh] items-center justify-center bg-page bg-[radial-gradient(50rem_36rem_at_-5%_15%,color-mix(in_oklab,var(--brand-soft)_80%,transparent),transparent_60%),radial-gradient(40rem_30rem_at_105%_100%,rgba(251,191,36,0.10),transparent_60%)] px-4 py-10">
      <section
        role={tone === "loading" ? "status" : tone === "error" ? "alert" : undefined}
        className="relative w-full max-w-[560px] overflow-hidden rounded-[28px] border border-hairline bg-canvas px-6 pb-10 pt-12 text-center shadow-[0_24px_60px_-28px_rgba(15,23,42,0.25)] sm:px-12"
      >
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-56 bg-gradient-to-b from-brand-soft/70 to-transparent" />
        <Sparkle className="left-10 top-8 hidden size-12 sm:block" />
        <Sparkle className="left-[88px] top-[84px] hidden size-5 sm:block" />
        <Sparkle className="right-12 top-10 hidden size-10 sm:block" />
        <Sparkle className="right-[92px] top-[96px] hidden size-5 sm:block" />

        <div className="relative flex flex-col items-center">
          <span className={cn("grid size-[112px] place-items-center rounded-full", icon.ring)}>
            <span className={cn("grid size-[92px] place-items-center rounded-full", icon.core)} aria-hidden>{icon.node}</span>
          </span>
          <h1 className="mt-6 text-3xl font-extrabold tracking-tight text-ink sm:text-[34px]">{title}</h1>
          <p className="mt-3 max-w-[40ch] text-[17px] leading-relaxed text-body">{message}</p>

          {(primary || secondary) && (
            <div className="mt-8 flex w-full flex-col-reverse justify-center gap-3 sm:w-auto sm:flex-row">
              {secondary && (
                <button
                  type="button"
                  onClick={secondary.onClick}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-full border border-hairline bg-canvas px-6 text-[15px] font-semibold text-ink shadow-soft transition-colors hover:border-brand-border hover:text-brand-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
                >
                  <ListChecksIcon weight="bold" className="size-5" aria-hidden />
                  {secondary.label}
                </button>
              )}
              {primary && (
                <button
                  type="button"
                  onClick={primary.onClick}
                  className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-gradient-to-r from-brand to-brand-strong px-7 text-[15px] font-bold text-white shadow-[0_12px_28px_-12px_var(--brand)] transition-[filter] hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 focus-visible:ring-offset-2"
                >
                  <ArrowLeftIcon weight="bold" className="size-5" aria-hidden />
                  {primary.label}
                </button>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
