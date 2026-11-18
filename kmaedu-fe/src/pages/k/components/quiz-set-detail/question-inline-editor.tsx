import { useState } from "react";
import { CheckSquareIcon, CircleNotchIcon, PlusCircleIcon, TrashIcon } from "@phosphor-icons/react";
import { PillDropdown } from "@/components/k-page/pill-dropdown";
import { RichTextEditor } from "@/components/molecules/RichTextEditor";
import { NO_LABEL, type OptionDraft, draftPayload, optionDrafts } from "@/lib/manage-exam/quiz-set-detail";
import { resolveAnswerIndex } from "@/lib/quizAnswerUtils";
import { cn } from "@/lib/utils";
import type { Quizz, QuizSetLabel } from "@/types/quizset";
import type { QuestionInput } from "./use-quiz-set-detail";

const MAX_OPTIONS = 6;
const EMPTY: OptionDraft = { original: "", text: "" };

interface Props {
  /** null = a new question. */
  question: Quizz | null;
  labels: QuizSetLabel[];
  onSave: (data: QuestionInput) => Promise<boolean>;
  onCancel: () => void;
}

/** Edit form inside a question row: rich-text body, answers with the correct one, chapter, cancel / save. */
export function QuestionInlineEditor({ question, labels, onSave, onCancel }: Props) {
  const [body, setBody] = useState(question?.question ?? "");
  const [drafts, setDrafts] = useState<OptionDraft[]>(() => (question ? optionDrafts(question.options) : [EMPTY, EMPTY, EMPTY, EMPTY]));
  const [correct, setCorrect] = useState<number | null>(() => (question?.answer ? resolveAnswerIndex(question.answer, question.options) : null));
  const [labelId, setLabelId] = useState<string>(question?.label?.id ?? question?.labelId ?? NO_LABEL);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const setText = (i: number, text: string) => setDrafts((prev) => prev.map((d, j) => (j === i ? { ...d, text } : d)));
  const remove = (i: number) => {
    setDrafts((prev) => prev.filter((_, j) => j !== i));
    setCorrect((c) => (c === null || c === i ? null : c > i ? c - 1 : c));
  };

  const save = async () => {
    const result = draftPayload(body, drafts, correct, labelId === NO_LABEL ? null : labelId);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setError("");
    setSaving(true);
    const ok = await onSave(result.data);
    setSaving(false);
    if (ok) onCancel();
  };

  const chapterOptions = [{ value: NO_LABEL, label: "Chưa phân chương" }, ...labels.map((l) => ({ value: l.id, label: l.name, color: l.color }))];

  return (
    <div className="rounded-lg border border-hairline-soft bg-canvas p-4 md:p-5">
      <p className="text-[14px] font-semibold text-ink">Nội dung câu hỏi</p>
      <div className="mt-2">
        <RichTextEditor content={body} onChange={setBody} placeholder="Nhập nội dung câu hỏi..." minHeight="80px" />
      </div>

      <p className="mt-5 text-[14px] font-semibold text-ink">Các đáp án</p>
      <div className="mt-2 grid gap-3 md:grid-cols-2" role="radiogroup" aria-label="Đáp án đúng">
        {drafts.map((d, i) => {
          const isCorrect = correct === i;
          return (
            <div
              key={i}
              className={cn(
                "group flex h-11 items-center gap-3 rounded-lg border px-3 transition-colors",
                isCorrect ? "border-brand-border bg-brand-soft/60" : "border-hairline bg-canvas focus-within:border-brand-border",
              )}
            >
              <button
                type="button"
                role="radio"
                aria-checked={isCorrect}
                aria-label={`Chọn ${String.fromCharCode(65 + i)} là đáp án đúng`}
                onClick={() => setCorrect(i)}
                className={cn("grid size-[18px] shrink-0 place-items-center rounded-full border-2", isCorrect ? "border-brand" : "border-hairline")}
              >
                {isCorrect && <span className="size-2 rounded-full bg-brand" />}
              </button>
              <input
                value={d.text}
                onChange={(e) => setText(i, e.target.value)}
                placeholder={`Đáp án ${String.fromCharCode(65 + i)}`}
                aria-label={`Đáp án ${String.fromCharCode(65 + i)}`}
                className="min-w-0 flex-1 bg-transparent text-[14px] text-ink outline-none placeholder:text-muted-soft"
              />
              {drafts.length > 2 && (
                <button
                  type="button"
                  onClick={() => remove(i)}
                  aria-label={`Xóa đáp án ${String.fromCharCode(65 + i)}`}
                  className={cn("grid size-7 shrink-0 place-items-center rounded-full text-brand transition-opacity hover:bg-brand-soft", !isCorrect && "opacity-0 group-hover:opacity-100 focus-visible:opacity-100")}
                >
                  <TrashIcon className="size-4" aria-hidden />
                </button>
              )}
            </div>
          );
        })}
      </div>
      {drafts.length < MAX_OPTIONS && (
        <button
          type="button"
          onClick={() => setDrafts((prev) => [...prev, EMPTY])}
          className="mt-3 inline-flex h-9 items-center gap-1.5 rounded-lg border border-hairline bg-canvas px-4 text-[13px] font-medium text-ink transition-colors hover:bg-surface-soft"
        >
          <PlusCircleIcon className="size-4" aria-hidden />
          Thêm đáp án
        </button>
      )}

      {error && <p className="mt-3 text-[13px] text-destructive" role="alert">{error}</p>}

      <div className="-mx-4 -mb-4 mt-5 flex flex-wrap items-center gap-x-6 gap-y-3 rounded-b-lg border-t border-hairline-soft bg-surface-soft/60 px-4 py-3 md:-mx-5 md:-mb-5 md:px-5">
        <span className="inline-flex items-center gap-2 text-[14px] text-ink">
          <CheckSquareIcon className={cn("size-5", correct === null ? "text-muted-foreground" : "text-brand")} aria-hidden />
          Đáp án đúng: <b>{correct === null ? "chưa chọn" : String.fromCharCode(65 + correct)}</b>
        </span>
        <span className="inline-flex items-center gap-2 text-[14px] text-body md:ml-auto">
          Chương:
          <PillDropdown options={chapterOptions} value={labelId} onChange={setLabelId} label="Chương của câu hỏi" />
        </span>
        <div className="flex items-center gap-2">
          <button type="button" onClick={onCancel} disabled={saving} className="h-10 rounded-lg border border-hairline bg-canvas px-5 text-[14px] font-medium text-ink transition-colors hover:bg-surface-soft disabled:opacity-60">
            Hủy
          </button>
          <button
            type="button"
            onClick={() => void save()}
            disabled={saving}
            className="inline-flex h-10 items-center gap-2 rounded-lg bg-brand px-5 text-[14px] font-semibold text-white shadow-[0_6px_16px_rgba(238,47,43,0.25)] transition-colors hover:bg-brand-strong disabled:opacity-60"
          >
            {saving && <CircleNotchIcon className="size-4 animate-spin" aria-hidden />}
            {question ? "Lưu thay đổi" : "Thêm câu hỏi"}
          </button>
        </div>
      </div>
    </div>
  );
}
