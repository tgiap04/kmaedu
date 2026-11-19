import { useRef, useState } from "react";
import type { DragEvent } from "react";
import { CloudArrowUpIcon } from "@phosphor-icons/react";
import { ItemFileDetail } from "@/components/atoms/k/ItemFileDetail";
import { cn } from "@/lib/utils";

interface Props {
  fileName?: string;
  fileSize?: number;
  disabled: boolean;
  onPick: (file: File) => void;
  onRemove: () => void;
}

/** Dashed PDF drop area; once there is a file it shows the file with a remove button instead. */
export function PdfDropZone({ fileName, fileSize, disabled, onPick, onRemove }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  if (fileName) return <ItemFileDetail fileName={fileName} fileSize={fileSize ?? 0} onRemove={onRemove} disabled={disabled} />;

  const onDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setDragging(false);
    const dropped = event.dataTransfer.files?.[0];
    if (dropped && !disabled) onPick(dropped);
  };

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        if (!disabled) setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      className={cn(
        "flex min-h-[260px] flex-col items-center justify-center rounded-lg border-2 border-dashed px-4 py-8 text-center transition-colors",
        dragging ? "border-brand bg-brand-soft" : "border-brand-border bg-[#fffafa]",
        disabled && "pointer-events-none opacity-50",
      )}
    >
      <span className="grid size-14 place-items-center rounded-lg bg-brand-soft text-brand">
        <CloudArrowUpIcon className="size-8" aria-hidden />
      </span>
      <p className="mt-3 text-lg font-bold text-ink">Kéo thả file tài liệu tại đây</p>
      <p className="mt-1 text-[14px] text-body">
        hoặc{" "}
        <button type="button" onClick={() => inputRef.current?.click()} disabled={disabled} className="font-semibold text-brand underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40">
          chọn file từ máy tính
        </button>
      </p>
      <p className="mt-4 text-[13px] text-muted-foreground">Hỗ trợ: PDF (tối đa 5 MB và 50 trang)</p>
      <input
        ref={inputRef}
        type="file"
        accept=".pdf,application/pdf"
        className="hidden"
        aria-label="Chọn file PDF"
        onChange={(event) => {
          const picked = event.target.files?.[0];
          event.target.value = "";
          if (picked) onPick(picked);
        }}
      />
    </div>
  );
}
