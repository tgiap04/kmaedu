import { useRef, useState } from "react";
import type { DragEvent, ReactNode } from "react";
import { CloudArrowUpIcon } from "@phosphor-icons/react";
import { ItemFileDetail } from "@/components/atoms/k/ItemFileDetail";
import { cn } from "@/lib/utils";
import { aiPanelClass, IconTile } from "./ai-tool-ui";
import { PdfUploadIllustration } from "./pdf-upload-illustration";

interface GeneratorUploadCardProps {
  icon: ReactNode;
  title: string;
  subtitle: string;
  hasFile: boolean;
  fileName?: string;
  fileSize?: number;
  disabled: boolean;
  onPick: (file: File) => void;
  onRemove: () => void;
}

/** Header + PDF drop zone (or the chosen file once there is one). */
export function GeneratorUploadCard({ icon, title, subtitle, hasFile, fileName, fileSize, disabled, onPick, onRemove }: GeneratorUploadCardProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    const dropped = event.dataTransfer.files?.[0];
    if (dropped && !disabled) onPick(dropped);
  };

  return (
    <section className={cn(aiPanelClass, "p-4")}>
      <div className="flex items-center gap-3.5">
        <IconTile>{icon}</IconTile>
        <div className="min-w-0">
          <h2 className="text-[17px] font-bold leading-tight text-ink">{title}</h2>
          <p className="mt-1 text-[13px] text-body">{subtitle}</p>
        </div>
      </div>

      <div data-tour="ai-tool-upload" className="mt-4">
        {hasFile ? (
          <ItemFileDetail fileName={fileName || "Unknown file"} fileSize={fileSize || 0} onRemove={onRemove} disabled={disabled} />
        ) : (
          <div
            onDragOver={(event) => {
              event.preventDefault();
              if (!disabled) setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            className={cn(
              "flex flex-col items-center rounded-lg border-2 border-dashed px-4 pb-5 pt-5 text-center transition-colors",
              isDragging ? "border-brand bg-brand-soft" : "border-hairline bg-surface-soft/60",
              disabled && "pointer-events-none opacity-50",
            )}
          >
            <PdfUploadIllustration className="h-20 w-28" />
            <p className="mt-2 text-base font-semibold text-ink">Kéo thả file vào đây</p>
            <p className="mt-1 text-[14px] text-body">hoặc chọn file từ máy tính</p>
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={disabled}
              className="mt-4 inline-flex h-10 min-w-[200px] items-center justify-center gap-2 rounded-lg bg-brand px-6 text-[15px] font-semibold text-white shadow-[0_6px_14px_rgba(238,47,43,0.25)] transition-colors hover:bg-brand-strong focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand"
            >
              <CloudArrowUpIcon className="h-[18px] w-[18px]" />
              Chọn file
            </button>
            <p className="mt-4 text-[12px] text-muted-foreground">Hỗ trợ: PDF, tối đa 5 MB và 50 trang</p>
            <input
              ref={inputRef}
              type="file"
              accept=".pdf,application/pdf"
              className="hidden"
              onChange={(event) => {
                const picked = event.target.files?.[0];
                event.target.value = "";
                if (picked) onPick(picked);
              }}
            />
          </div>
        )}
      </div>
    </section>
  );
}
