import type { ReactNode } from "react";
import { Pencil, Trash2 } from "lucide-react";
import { RichTextViewer } from "@/components/molecules/RichTextViewer";
import { isCorrectAnswer, quizOptionToText } from "@/lib/quizAnswerUtils";
import { cn } from "@/lib/utils";
import type { Quizz } from "@/types/quizset";

interface Props {
  question: Quizz;
  number: number;
  /** Question body (plain viewer or search-highlighted). */
  body: ReactNode;
  disabled: boolean;
  onEdit: () => void;
  onDelete: () => void;
}

const iconBtn =
  "grid size-8 place-items-center rounded-full text-body transition-colors hover:bg-surface-soft hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 disabled:pointer-events-none disabled:opacity-50";

/** One question in the quiz-set detail list: numbered tile, label chip, body, answer options and edit / delete. */
export function QuizQuestionRow({ question, number, body, disabled, onEdit, onDelete }: Props) {
  return (
    <div className="px-4 py-4 transition-colors hover:bg-surface-soft/50 md:px-5">
      <div className="flex items-start gap-3">
        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-brand-soft font-mono text-xs font-semibold text-brand">{number}</span>
        <div className="min-w-0 flex-1 space-y-3">
          {question.label && (
            <div
              className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium"
              style={{
                backgroundColor: question.label.color ? `${question.label.color}15` : undefined,
                borderColor: question.label.color || undefined,
                color: question.label.color || undefined,
              }}
            >
              {question.label.color && <div className="h-2 w-2 rounded-full" style={{ backgroundColor: question.label.color }} />}
              {question.label.name}
            </div>
          )}
          <div className="text-[14px] font-semibold leading-[1.55] text-ink">{body}</div>

          <div className="grid gap-2 sm:grid-cols-2">
            {question.options.map((option, optIndex) => {
              const isCorrect = isCorrectAnswer(question.answer, optIndex, question.options);
              const optionText = quizOptionToText(option);
              const hasPrefix = /^[A-D]\s*[.):]\s+/.test(optionText);
              const displayText = hasPrefix ? optionText.replace(/^[A-D]\s*[.):]\s+/, "") : optionText;
              return (
                <div
                  key={optIndex}
                  className={cn(
                    "flex items-center gap-2 rounded-xl border px-3 py-2 text-[13px] transition-colors",
                    isCorrect ? "border-brand-border bg-brand-soft text-ink" : "border-hairline text-body",
                  )}
                >
                  <span className="font-mono text-[11px]">{String.fromCharCode(65 + optIndex)}.</span>
                  <span className="mt-3 flex-1">
                    <RichTextViewer content={displayText} />
                  </span>
                  {isCorrect && <span className="text-[11px] font-medium text-brand">✓</span>}
                </div>
              );
            })}
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button type="button" onClick={onEdit} disabled={disabled} aria-label="Sửa câu hỏi" className={iconBtn}>
            <Pencil className="size-3.5" aria-hidden />
          </button>
          <button type="button" onClick={onDelete} disabled={disabled} aria-label="Xóa câu hỏi" className={cn(iconBtn, "hover:text-error")}>
            <Trash2 className="size-3.5" aria-hidden />
          </button>
        </div>
      </div>
    </div>
  );
}
