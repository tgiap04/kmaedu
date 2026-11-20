import { ArrowLeftIcon, ArrowRightIcon, FlagIcon } from "@phosphor-icons/react";
import { Kbd } from "@/components/atoms/Kbd";
import { cn } from "@/lib/utils";
import { QuizOptionCard } from "./quiz-option-card";
import { QuizQuestionFrame } from "./quiz-question-frame";

interface Props {
  index: number;
  total: number;
  question: string;
  options: string[];
  selected: string | undefined;
  marked: boolean;
  onSelect: (letter: string) => void;
  onToggleMark: () => void;
}

const letterOf = (i: number) => String.fromCharCode(65 + i);

/** The question in play: number, kind, mark-for-review, the prompt and its options. */
export function QuizQuestionCard({ index, total, question, options, selected, marked, onSelect, onToggleMark }: Props) {
  return (
    <QuizQuestionFrame
      index={index}
      total={total}
      question={question}
      chips={(
        <>
          <span className="rounded-full border border-brand-border bg-canvas px-3 py-0.5 text-[13px] font-semibold text-brand">Trắc nghiệm</span>
          <span className="rounded-full border border-hairline bg-canvas px-3 py-0.5 text-[13px] font-semibold text-ink">Một đáp án</span>
        </>
      )}
      action={(
        <button
          type="button"
          onClick={onToggleMark}
          aria-pressed={marked}
          className={cn(
            "inline-flex h-11 items-center gap-2 rounded-full border px-4 text-sm font-semibold shadow-soft transition-colors sm:px-6",
            marked ? "border-amber-300 bg-amber-50 text-amber-700" : "border-hairline bg-canvas text-ink hover:border-brand-border hover:text-brand-strong",
          )}
        >
          <FlagIcon weight={marked ? "fill" : "regular"} className="size-[18px]" aria-hidden />
          <span className="hidden sm:inline">{marked ? "Đã đánh dấu" : "Đánh dấu"}</span>
        </button>
      )}
    >
      <div role="radiogroup" aria-label={`Đáp án câu ${index + 1}`} className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2">
        {options.map((option, i) => {
          const letter = letterOf(i);
          const isSelected = selected === letter;
          return (
            <QuizOptionCard
              key={letter}
              letter={letter}
              content={option}
              tone={isSelected ? "selected" : "default"}
              onClick={() => onSelect(isSelected ? "" : letter)}
            />
          );
        })}
      </div>

      <div className="mt-6 hidden flex-wrap items-center gap-x-6 gap-y-2 text-sm text-body md:flex">
        <span className="flex items-center gap-2">
          {options.slice(0, 6).map((_, i) => <Kbd key={letterOf(i)}>{letterOf(i)}</Kbd>)}
          <span className="ml-1">để chọn nhanh</span>
        </span>
        <span className="flex items-center gap-2">
          <Kbd><ArrowLeftIcon weight="bold" className="size-3.5" aria-label="Mũi tên trái" /></Kbd>
          <Kbd><ArrowRightIcon weight="bold" className="size-3.5" aria-label="Mũi tên phải" /></Kbd>
          <span className="ml-1">để chuyển câu</span>
        </span>
      </div>
    </QuizQuestionFrame>
  );
}
