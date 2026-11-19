import { CircleNotchIcon, GearSixIcon, SparkleIcon } from "@phosphor-icons/react";
import { Switch } from "@/components/antd/switch";
import { CardCountStepper, fieldLabelClass, inputClass } from "./create-flashcard-ui";
import { TITLE_MAX } from "./flashcard-create-logic";

interface Props {
  title: string;
  titleError?: string;
  onTitleChange: (v: string) => void;
  isPublic: boolean;
  onPublicChange: (v: boolean) => void;
  /** Only for the document tab (AI options); omitted for the other tabs. */
  ai?: {
    count: number;
    onCountChange: (v: number) => void;
    narrow: boolean;
    onNarrowChange: (v: boolean) => void;
    keyword: string;
    onKeywordChange: (v: string) => void;
    /** The options were already used (AI made the cards): shown but not editable. */
    locked?: boolean;
  };
  /** Line under the options, e.g. how many cards a quiz set will give. */
  note?: string;
  disabled: boolean;
  busy: boolean;
  actionLabel: string;
  actionDisabled: boolean;
  onSubmit: () => void;
}

/** "Cài đặt tạo Flashcard": name, visibility, the AI options and the red create button. */
export function SettingsPanel(p: Props) {
  return (
    <section aria-labelledby="flashcard-settings" className="rounded-lg border border-brand-border/60 bg-gradient-to-br from-[#fff1f0] via-[#fff7f6] to-white p-4 shadow-[0_4px_20px_rgba(238,47,43,0.06)] md:p-5">
      <h2 id="flashcard-settings" className="flex items-center gap-2 text-[17px] font-bold text-ink">
        <GearSixIcon className="size-5 text-brand" aria-hidden />
        Cài đặt tạo Flashcard
      </h2>

      <div className="mt-4 space-y-4">
        <div>
          <label htmlFor="flashcard-title" className={fieldLabelClass}>Tên bộ thẻ <span className="text-brand">*</span></label>
          <input
            id="flashcard-title"
            value={p.title}
            maxLength={TITLE_MAX + 1}
            disabled={p.disabled}
            placeholder="VD: Từ vựng Unit 1"
            aria-invalid={!!p.titleError}
            aria-describedby={p.titleError ? "flashcard-title-error" : undefined}
            onChange={(e) => p.onTitleChange(e.target.value)}
            className={`${inputClass} mt-2`}
          />
          {p.titleError && <p id="flashcard-title-error" role="alert" className="mt-1.5 text-[13px] text-destructive">{p.titleError}</p>}
        </div>

        <div className="flex items-center justify-between gap-3">
          <span id="flashcard-public-label" className={fieldLabelClass}>
            Công khai
            <span className="block text-[13px] font-normal text-body">Ai có liên kết cũng xem được bộ thẻ</span>
          </span>
          <Switch checked={p.isPublic} onCheckedChange={p.onPublicChange} disabled={p.disabled} aria-labelledby="flashcard-public-label" />
        </div>

        {p.ai && (
          <div className="space-y-4 border-t border-brand-border/50 pt-4">
            <div className="flex items-center justify-between gap-3">
              <span className={fieldLabelClass}>Số thẻ cần tạo</span>
              <CardCountStepper value={p.ai.count} onChange={p.ai.onCountChange} disabled={p.disabled || p.ai.locked} />
            </div>
            <div>
              <div className="flex items-center justify-between gap-3">
                <span id="flashcard-narrow-label" className={fieldLabelClass}>
                  Tập trung theo từ khóa
                  <span className="block text-[13px] font-normal text-body">Chỉ tạo thẻ về từ khóa bạn nhập</span>
                </span>
                <Switch checked={p.ai.narrow} onCheckedChange={p.ai.onNarrowChange} disabled={p.disabled || p.ai.locked} aria-labelledby="flashcard-narrow-label" />
              </div>
              {p.ai.narrow && (
                <input
                  aria-label="Từ khóa"
                  value={p.ai.keyword}
                  disabled={p.disabled || p.ai.locked}
                  placeholder="Nhập từ khóa, ví dụ: quyền truy cập file"
                  onChange={(e) => p.ai!.onKeywordChange(e.target.value)}
                  className={`${inputClass} mt-3`}
                />
              )}
            </div>
          </div>
        )}

        {p.note && <p className="rounded-lg bg-canvas/80 px-3.5 py-2.5 text-[13px] text-ink">{p.note}</p>}
      </div>

      <button
        type="button"
        onClick={p.onSubmit}
        disabled={p.actionDisabled || p.busy}
        className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-lg bg-brand text-[16px] font-semibold text-white shadow-[0_8px_20px_rgba(238,47,43,0.25)] transition-colors hover:bg-brand-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {p.busy ? <CircleNotchIcon className="size-5 animate-spin" aria-hidden /> : <SparkleIcon className="size-5" weight="fill" aria-hidden />}
        {p.actionLabel}
      </button>
    </section>
  );
}
