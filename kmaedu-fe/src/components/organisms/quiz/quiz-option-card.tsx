import type { ReactNode } from "react";
import { CheckIcon, XIcon } from "@phosphor-icons/react";
import { StandardMarkdownRenderer } from "@/components/molecules/StandardMarkdownRenderer";
import { cn } from "@/lib/utils";

/** default/selected while taking the quiz; correct/wrong/muted in review. */
export type QuizOptionTone = "default" | "selected" | "correct" | "wrong" | "muted";

interface Props {
  letter: string;
  content: string;
  tone: QuizOptionTone;
  /** Small pill under the text ("Đáp án đúng", "Bạn đã chọn"). */
  tags?: ReactNode;
  /** Present while taking the quiz: the card is then a radio button. */
  onClick?: () => void;
}

const BOX: Record<QuizOptionTone, string> = {
  default: "border-hairline bg-canvas hover:border-brand-border hover:bg-brand-soft/20",
  selected: "border-brand bg-brand-soft/50 shadow-[0_6px_18px_-10px_var(--brand)]",
  correct: "border-emerald-400 bg-emerald-50/70",
  wrong: "border-brand/60 bg-brand-soft/50",
  muted: "border-hairline bg-canvas",
};

const TILE: Record<QuizOptionTone, string> = {
  default: "bg-hairline-soft text-body",
  selected: "bg-brand text-white",
  correct: "bg-gradient-to-b from-emerald-400 to-emerald-600 text-white shadow-[0_6px_14px_-8px_rgb(16_185_129)]",
  wrong: "bg-gradient-to-b from-brand to-brand-strong text-white shadow-[0_6px_14px_-8px_var(--brand)]",
  muted: "bg-hairline-soft text-body",
};

/** One answer option; in review a tick or cross replaces the letter of the right and the chosen-wrong option. */
export function QuizOptionCard({ letter, content, tone, tags, onClick }: Props) {
  const body = (
    <>
      <span className={cn("grid size-11 shrink-0 place-items-center rounded-xl text-base font-bold transition-colors", TILE[tone])}>
        {tone === "correct" ? <CheckIcon weight="bold" className="size-5" aria-label={`${letter}, đáp án đúng`} />
          : tone === "wrong" ? <XIcon weight="bold" className="size-5" aria-label={`${letter}, đã chọn sai`} />
            : letter}
      </span>
      <span className={cn("min-w-0 flex-1 font-semibold", tone === "muted" ? "text-body" : "text-ink")}>
        <StandardMarkdownRenderer content={content} fontSize={17} />
        {tags && <span className="mt-2 flex flex-wrap gap-2">{tags}</span>}
      </span>
    </>
  );
  const box = cn("flex min-h-[88px] items-center gap-4 rounded-2xl border-2 px-5 py-4 text-left transition-[border-color,background-color,box-shadow] duration-200", BOX[tone]);

  if (!onClick) return <div className={box}>{body}</div>;
  return (
    <button
      type="button"
      role="radio"
      aria-checked={tone === "selected"}
      onClick={onClick}
      className={cn(box, "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40")}
    >
      {body}
    </button>
  );
}
