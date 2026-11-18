import { type ReactNode, useState } from "react";
import { CheckCircleIcon, LightbulbIcon, PencilSimpleIcon, XIcon, CaretDownIcon } from "@phosphor-icons/react";

/** A small key-cap holding an icon, inline in the tip text. */
const TipKey = ({ children }: { children: ReactNode }) => (
  <span className="relative -top-px mx-0.5 inline-flex size-[18px] items-center justify-center rounded-lg border border-hairline bg-canvas align-middle text-ink">{children}</span>
);

/** Bottom of the quiz-set detail page: a dismissible one-line tip and "Lưu đề thi", the same height. */
export function QuizSetSaveBar({ onSave }: { onSave: () => void }) {
  const [showTip, setShowTip] = useState(true);
  return (
    <div className="flex flex-col gap-3 lg:flex-row lg:items-stretch">
      {showTip && (
        <div className="flex min-h-11 flex-1 items-center gap-3 rounded-lg border border-brand-border bg-brand-soft py-1.5 pl-2 pr-1.5">
          <span className="grid size-7 shrink-0 place-items-center rounded-full bg-canvas text-brand shadow-[0_2px_6px_rgba(238,47,43,0.12)]">
            <LightbulbIcon className="size-3.5" aria-hidden />
          </span>
          <p className="min-w-0 flex-1 text-[13px] leading-6 text-body">
            <b className="font-semibold text-ink">Mẹo nhỏ:</b>
            {" "}Bấm <TipKey><CaretDownIcon className="size-3" aria-hidden={false} role="img" aria-label="nút mở rộng" /></TipKey> để xem đáp án,
            {" "}<TipKey><PencilSimpleIcon className="size-3" aria-hidden={false} role="img" aria-label="nút sửa" /></TipKey> để sửa ngay trong danh sách.
            {" "}Gán chương cho câu hỏi để phòng thi bốc câu theo từng chương.
          </p>
          <button type="button" onClick={() => setShowTip(false)} aria-label="Ẩn mẹo" className="grid size-7 shrink-0 place-items-center rounded-full text-body hover:bg-canvas">
            <XIcon className="size-3.5" aria-hidden />
          </button>
        </div>
      )}
      <button
        type="button"
        onClick={onSave}
        className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 self-end rounded-lg bg-brand px-5 text-[14px] font-semibold text-white shadow-[0_4px_12px_rgba(238,47,43,0.22)] transition-colors hover:bg-brand-strong lg:ml-auto lg:self-stretch"
      >
        <CheckCircleIcon className="size-4" aria-hidden />
        Lưu đề thi
      </button>
    </div>
  );
}
