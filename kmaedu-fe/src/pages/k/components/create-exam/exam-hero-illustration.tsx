import { ArrowCircleRightIcon, FileTextIcon } from "@phosphor-icons/react";

/** Art beside the title: stacked PDF files, an arrow, the new exam showing how many questions are ticked. */
export function ExamHeroIllustration({ picked }: { picked: number }) {
  return (
    <div className="pointer-events-none hidden items-center gap-5 lg:flex" aria-hidden>
      <div className="relative w-32">
        <div className="absolute inset-0 translate-x-3 -translate-y-3 rotate-[4deg] rounded-lg bg-brand-soft" />
        <div className="relative rotate-[-6deg] rounded-lg bg-canvas p-3 shadow-[0_16px_40px_rgba(238,47,43,0.15)]">
          <p className="flex items-center gap-1.5 text-[13px] font-bold text-ink">
            <FileTextIcon className="size-4 text-brand" />
            File PDF
          </p>
          <div className="mt-3 space-y-2">
            {["w-full", "w-4/5", "w-full", "w-3/5"].map((w, i) => (
              <span key={i} className="flex items-center gap-2">
                <span className={i % 2 ? "size-2.5 rounded-lg border border-hairline" : "size-2.5 rounded-lg bg-brand"} />
                <span className={`block h-1.5 rounded-lg bg-surface-card ${w}`} />
              </span>
            ))}
          </div>
        </div>
      </div>
      <ArrowCircleRightIcon className="size-8 text-brand" />
      <div className="grid w-24 place-items-center rounded-lg bg-canvas p-3 shadow-[0_12px_30px_rgba(238,47,43,0.15)]">
        <span className="text-[22px] font-bold tabular-nums text-brand">{picked}</span>
        <span className="text-[12px] text-body">câu đã chọn</span>
      </div>
    </div>
  );
}
