import { Check, Circle, Loader2 } from "lucide-react";
import { describeGenerationSteps } from "@/lib/generation-progress/generation-steps";
import { cn } from "@/lib/utils";
import { useJobStore } from "@/stores/useAIGeneratorStore";

/** The real stages of the running job (from `GET /ai/job/:id`), done ones checked, the current one spinning. */
export function GenerationStepsList({ itemWord }: { itemWord: string }) {
  const progress = useJobStore((state) => state.jobProgress);
  const steps = describeGenerationSteps(progress, itemWord);
  const active = steps.find((step) => step.state === "active");

  return (
    <div className="w-full max-w-md">
      <p className="sr-only" aria-live="polite">
        {active ? `${active.label}${active.detail ? `. ${active.detail}` : ""}` : ""}
      </p>
      <ol className="flex flex-col gap-3">
        {steps.map((step) => (
          <li key={step.key} className="flex items-start gap-3" aria-current={step.state === "active" ? "step" : undefined}>
            <span
              className={cn(
                "mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full",
                step.state === "done" && "bg-brand text-white",
                step.state === "active" && "bg-brand-soft text-brand",
                step.state === "pending" && "text-muted-foreground",
              )}
              aria-hidden="true"
            >
              {step.state === "done" ? (
                <Check className="h-3.5 w-3.5" strokeWidth={3} />
              ) : step.state === "active" ? (
                <Loader2 className="h-4 w-4 animate-spin motion-reduce:animate-none" />
              ) : (
                <Circle className="h-3.5 w-3.5" />
              )}
            </span>
            <span className="min-w-0">
              <span
                className={cn(
                  "block text-[14px] leading-6",
                  step.state === "active" && "font-semibold text-ink",
                  step.state === "done" && "text-body",
                  step.state === "pending" && "text-muted-foreground",
                )}
              >
                {step.label}
              </span>
              {step.detail && <span className="block text-[13px] text-body">{step.detail}</span>}
              <span className="sr-only">{step.state === "done" ? " (xong)" : step.state === "active" ? " (đang chạy)" : " (chưa tới)"}</span>
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
