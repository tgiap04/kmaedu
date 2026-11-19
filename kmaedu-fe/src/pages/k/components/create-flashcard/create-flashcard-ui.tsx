import { useEffect, useState } from "react";
import { MinusIcon, PlusIcon } from "@phosphor-icons/react";
import { CARD_COUNT_MAX, CARD_COUNT_MIN, clampCardCount, stepCardCount } from "./flashcard-create-logic";

/** White block of the page (same radius and shadow as the other /k create pages). */
export const panelClass = "rounded-lg border border-hairline bg-canvas shadow-[0_4px_20px_rgba(15,23,42,0.04)]";
export const fieldLabelClass = "block text-[14px] font-medium text-ink";
export const inputClass =
  "h-10 w-full rounded-lg border border-hairline bg-canvas px-3.5 text-[14px] text-ink outline-none placeholder:text-muted-soft focus:border-brand-border focus:ring-2 focus:ring-brand/20 disabled:opacity-60";

const stepButton =
  "grid size-8 place-items-center rounded-md text-body transition-colors hover:bg-brand-soft hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-body";

/** "− 50 +" for the number of cards; typing is committed (clamped to 1–50) on blur. */
export function CardCountStepper({ value, onChange, disabled }: { value: number; onChange: (v: number) => void; disabled?: boolean }) {
  const [text, setText] = useState(String(value));
  useEffect(() => setText(String(value)), [value]);

  const commit = () => {
    const next = clampCardCount(Number.parseInt(text, 10));
    setText(String(next));
    if (next !== value) onChange(next);
  };

  return (
    <div className="flex h-10 items-center rounded-lg border border-hairline bg-canvas px-1 focus-within:border-brand-border focus-within:ring-2 focus-within:ring-brand/20">
      <button type="button" aria-label="Giảm số thẻ" disabled={disabled || value <= CARD_COUNT_MIN} onClick={() => onChange(stepCardCount(value, -1))} className={stepButton}>
        <MinusIcon className="size-4" weight="bold" aria-hidden />
      </button>
      <input
        aria-label="Số thẻ cần tạo"
        inputMode="numeric"
        value={text}
        disabled={disabled}
        onChange={(e) => setText(e.target.value.replace(/\D/g, "").slice(0, 3))}
        onBlur={commit}
        onKeyDown={(e) => e.key === "Enter" && commit()}
        className="w-14 bg-transparent text-center text-[15px] font-semibold tabular-nums text-ink outline-none disabled:opacity-60"
      />
      <button type="button" aria-label="Tăng số thẻ" disabled={disabled || value >= CARD_COUNT_MAX} onClick={() => onChange(stepCardCount(value, 1))} className={stepButton}>
        <PlusIcon className="size-4" weight="bold" aria-hidden />
      </button>
    </div>
  );
}
