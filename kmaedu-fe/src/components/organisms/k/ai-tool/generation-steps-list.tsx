import type { LucideIcon } from "lucide-react";
import { CalendarDays, Check, CircleHelp, CloudUpload, FileText, Filter, LoaderCircle, Network, Send, Sparkle } from "lucide-react";
import { describeGenerationSteps } from "@/lib/generation-progress/generation-steps";
import type { GenerationStepState } from "@/lib/generation-progress/generation-steps";
import { cn } from "@/lib/utils";
import { useJobStore } from "@/stores/useAIGeneratorStore";

const STEP_ICONS: Record<string, LucideIcon> = {
  queued: Send,
  uploading: CloudUpload,
  processing_document: FileText,
  waiting_graph: Network,
  planning: CalendarDays,
  generating: CircleHelp,
  reviewing: Filter,
};

/** Curved four-point sparkle with a small companion dot, as in the design. */
function ActiveSparkle() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-6 w-6 shrink-0 text-brand">
      <path d="M10 3c.9 4.4 2.6 6.1 7 7-4.4.9-6.1 2.6-7 7-.9-4.4-2.6-6.1-7-7 4.4-.9 6.1-2.6 7-7Z" fill="currentColor" />
      <path d="M18.5 15c.4 1.7 1 2.3 2.7 2.7-1.7.4-2.3 1-2.7 2.7-.4-1.7-1-2.3-2.7-2.7 1.7-.4 2.3-1 2.7-2.7Z" fill="currentColor" opacity="0.7" />
    </svg>
  );
}

const STATE_TEXT: Record<GenerationStepState, string> = { done: "xong", active: "đang chạy", pending: "chưa tới" };

function StatusDot({ state }: { state: GenerationStepState }) {
  if (state === "done") {
    return (
      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-brand text-white shadow-[0_4px_10px_rgba(238,47,43,0.28)]">
        <Check className="h-4 w-4" strokeWidth={3} />
      </span>
    );
  }
  if (state === "active") {
    // the spinner lives in the status slot: it turns into the check once the step is done
    return (
      <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white">
        <LoaderCircle className="h-7 w-7 animate-spin text-brand motion-reduce:animate-none" strokeWidth={2.25} />
      </span>
    );
  }
  return <span className="h-7 w-7 shrink-0 rounded-full border-2 border-hairline bg-white" />;
}

/** The real stages of the running job (from `GET /ai/job/:id`): done ones checked, the current one highlighted. */
export function GenerationStepsList({ itemWord }: { itemWord: string }) {
  const progress = useJobStore((state) => state.jobProgress);
  const steps = describeGenerationSteps(progress, itemWord);
  const active = steps.find((step) => step.state === "active");

  return (
    <div className="w-full">
      <p className="sr-only" aria-live="polite">
        {active ? `${active.label}${active.detail ? `. ${active.detail}` : ""}` : ""}
      </p>
      <ol className="flex flex-col gap-1.5">
        {steps.map((step) => {
          const Icon = STEP_ICONS[step.key] ?? Sparkle;
          return (
            <li
              key={step.key}
              aria-current={step.state === "active" ? "step" : undefined}
              className={cn(
                "flex items-center gap-3 rounded-2xl px-3 transition-colors duration-200 @4xl:gap-4 @4xl:px-4",
                step.state === "active" ? "bg-brand-soft py-3.5" : "py-2.5",
              )}
            >
              <span aria-hidden="true" className="flex items-center gap-3 @4xl:gap-4">
                <StatusDot state={step.state} />
                <Icon
                  className={cn(
                    "h-[22px] w-[22px] shrink-0",
                    step.state === "active" && "text-brand",
                    step.state === "done" && "text-ink",
                    step.state === "pending" && "text-body",
                  )}
                  strokeWidth={1.75}
                />
              </span>
              <span className="min-w-0 flex-1">
                <span
                  className={cn(
                    "block text-[14px] leading-6 @4xl:text-[15px]",
                    step.state === "active" ? "font-semibold text-ink" : step.state === "done" ? "text-ink" : "text-body",
                  )}
                >
                  {step.label}
                </span>
                {step.detail && <span className="block text-[13px] leading-5 text-body">{step.detail}</span>}
                <span className="sr-only">{` (${STATE_TEXT[step.state]})`}</span>
              </span>
              {step.state === "active" && <ActiveSparkle />}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
