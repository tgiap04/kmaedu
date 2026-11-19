import { CheckCircleIcon, FileArrowUpIcon, SparkleIcon, StackIcon } from "@phosphor-icons/react";
import { Button } from "@/components/antd/button";
import { ItemFileDetail } from "@/components/atoms/k/ItemFileDetail";
import { ResultLoading } from "@/components/organisms/k/ai-tool/result-panel";
import { PdfDropZone } from "./pdf-drop-zone";

interface Props {
  fileName?: string;
  fileSize?: number;
  generating: boolean;
  /** Number of cards AI already made for this file (0 = none yet). */
  resultCount: number;
  canCancel: boolean;
  saving: boolean;
  /** A dropped file is still being checked (page count): no second drop meanwhile. */
  checking?: boolean;
  onPick: (file: File) => void;
  onRemove: () => void;
  onCancel: () => void;
}

const STEPS = [
  { icon: FileArrowUpIcon, label: "Tải lên PDF" },
  { icon: SparkleIcon, label: "AI sinh thẻ" },
  { icon: StackIcon, label: "Lưu bộ thẻ" },
];

/** "Từ tài liệu của bạn": drop a PDF, watch the AI job, and (if the page was left mid-way) the ready result. */
export function DocumentSourcePanel({ fileName, fileSize, generating, resultCount, canCancel, saving, checking, onPick, onRemove, onCancel }: Props) {
  const busy = generating || saving || !!checking;
  return (
    <div className="space-y-4">
      {generating && fileName && <ItemFileDetail fileName={fileName} fileSize={fileSize ?? 0} onRemove={onRemove} disabled />}
      {generating ? (
        <>
          <ResultLoading itemWord="flashcard" />
          {canCancel && (
            <div className="flex justify-end">
              <Button variant="outline" size="sm" onClick={onCancel}>Dừng tạo</Button>
            </div>
          )}
        </>
      ) : (
        <>
          <PdfDropZone fileName={fileName} fileSize={fileSize} disabled={busy} onPick={onPick} onRemove={onRemove} />
          {resultCount > 0 && (
            <div role="status" className="flex items-start gap-2.5 rounded-lg border border-brand-border bg-brand-soft px-3.5 py-3 text-[14px] text-ink">
              <CheckCircleIcon className="mt-0.5 size-5 shrink-0 text-brand" aria-hidden />
              <span>
                AI đã tạo xong <b>{resultCount} thẻ</b> từ file này. Đặt tên bộ thẻ rồi nhấn <b>Lưu thành bộ thẻ</b>.
              </span>
            </div>
          )}
          {!fileName && (
            <ol className="grid gap-2 sm:grid-cols-3">
              {STEPS.map(({ icon: StepIcon, label }, i) => (
                <li key={label} className="flex items-center gap-2.5 rounded-lg bg-surface-soft px-3 py-2.5 text-[13px] text-ink">
                  <span className="grid size-7 shrink-0 place-items-center rounded-full bg-canvas text-brand shadow-sm">
                    <StepIcon className="size-4" aria-hidden />
                  </span>
                  <span><b className="text-ink">{i + 1}.</b> {label}</span>
                </li>
              ))}
            </ol>
          )}
        </>
      )}
    </div>
  );
}
