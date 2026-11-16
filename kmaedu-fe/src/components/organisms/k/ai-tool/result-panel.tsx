import { forwardRef } from "react";
import type { ReactNode } from "react";
import { SaveAll } from "lucide-react";
import { cn } from "@/lib/utils";
import { aiPanelClass } from "./ai-tool-ui";
import { GenerationProgressIllustration } from "./generation-progress-illustration";
import { GenerationStepsList } from "./generation-steps-list";

interface ResultPanelProps {
  icon: ReactNode;
  title: string;
  countLabel?: string;
  keyword?: string;
  /** Wraps the "Lưu" button (a save dialog trigger); omitted while there is nothing to save. */
  renderSave?: (button: ReactNode) => ReactNode;
  children: ReactNode;
}

/** Right-hand result card: title row with the save button, the item count pill, then the content. */
export const ResultPanel = forwardRef<HTMLElement, ResultPanelProps>(({ icon, title, countLabel, keyword, renderSave, children }, ref) => {
  const saveButton = (
    <button
      type="button"
      className="inline-flex h-11 items-center gap-2 rounded-full border border-hairline bg-canvas px-5 text-[14px] font-semibold text-ink transition-colors hover:bg-surface-soft"
    >
      <SaveAll className="h-[18px] w-[18px]" />
      Lưu
    </button>
  );

  return (
    <section ref={ref} className={cn(aiPanelClass, "flex min-h-[600px] flex-col p-4 md:p-6")}>
      <div data-tour="ai-tool-preview" className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="flex items-center gap-2.5 text-[20px] font-bold text-ink [&_svg]:h-6 [&_svg]:w-6 [&_svg]:stroke-[1.75] [&_svg]:text-brand">
            {icon}
            {title}
          </h2>
          <p className="mt-1.5 text-[14px] text-body">Xem trước nội dung AI tạo từ tài liệu trước khi lưu.</p>
        </div>
        {renderSave?.(saveButton)}
      </div>

      {countLabel && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-hairline bg-canvas px-3.5 py-1.5 text-[14px] font-semibold text-ink">{countLabel}</span>
          {keyword && <span className="rounded-full border border-brand-border bg-brand-soft px-3 py-1.5 text-xs font-medium text-brand-strong">{keyword}</span>}
        </div>
      )}

      <div className="mt-4 flex flex-1 flex-col">{children}</div>
    </section>
  );
});
ResultPanel.displayName = "ResultPanel";

/** "AI is working" state shared by both generators: art and title, then the job's real stages and a note. */
export function ResultLoading({ itemWord }: { itemWord: string }) {
  const subject = itemWord === "flashcard" ? "bộ flashcard" : "đề thi";
  return (
    <div className="@container flex flex-1">
      <div className="grid w-full gap-8 rounded-[28px] border border-hairline-soft bg-white p-4 shadow-[0_20px_50px_rgba(15,23,42,0.06)] @xl:grid-cols-[minmax(0,0.8fr)_1px_minmax(0,1.55fr)] @xl:gap-6 @xl:p-6 @4xl:gap-8 @4xl:p-8">
        <div className="flex flex-col items-center justify-center text-center">
          <GenerationProgressIllustration className="w-full max-w-[240px] @xl:max-w-[200px] @4xl:max-w-[240px]" />
          <h3 className="mt-4 text-[26px] leading-tight font-bold text-ink @xl:text-[22px] @4xl:text-[30px]">{`Đang tạo ${subject} của bạn`}</h3>
          <p className="mt-3 max-w-xs text-[15px] leading-relaxed text-body @xl:text-[14px] @4xl:text-[15px]">Hệ thống làm lần lượt từng bước, bước nào xong sẽ được đánh dấu.</p>
          <div className="mt-6 flex gap-2" aria-hidden="true">
            <span className="h-1.5 w-16 rounded-full bg-brand" />
            <span className="h-1.5 w-16 rounded-full bg-brand-soft" />
          </div>
        </div>
        <div className="hidden bg-hairline-soft @xl:block" aria-hidden="true" />
        <div className="flex flex-col gap-6">
          <GenerationStepsList itemWord={itemWord} />
          <div className="flex items-start gap-4 rounded-2xl bg-brand-soft px-5 py-4">
            <span className="mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-full bg-brand text-white" aria-hidden="true">
              <svg viewBox="0 0 24 24" className="h-5 w-5" aria-hidden="true">
                <circle cx="12" cy="7" r="1.6" fill="currentColor" />
                <path d="M12 11v7" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" />
              </svg>
            </span>
            <p className="text-[14px] leading-relaxed text-ink">
              {`Lần đầu dùng một tài liệu mới, hệ thống cần phân tích toàn bộ nội dung để ${itemWord} không trùng ý và phủ đủ các chủ đề, có thể mất vài phút. Bạn có thể chuyển sang trang khác, việc tạo vẫn tiếp tục.`}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
