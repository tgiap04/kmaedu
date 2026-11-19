import { PencilSimpleIcon, TrashIcon, CaretDownIcon } from "@phosphor-icons/react";
import { RichTextViewer } from "@/components/molecules/RichTextViewer";
import { plainText } from "@/lib/manage-exam/quiz-set-detail";
import { quizOptionToText, resolveAnswerIndex } from "@/lib/quizAnswerUtils";
import { cn } from "@/lib/utils";
import type { Quizz, QuizSetLabel } from "@/types/quizset";
import { AssignLabelPicker } from "../assign-label-picker";
import { QuestionInlineEditor } from "./question-inline-editor";
import type { QuestionInput } from "./use-quiz-set-detail";

export const questionGridClass = "grid grid-cols-[28px_minmax(0,1fr)_auto] items-center gap-3 md:grid-cols-[28px_minmax(0,1fr)_150px_120px_112px] md:gap-4";

interface Props {
  question: Quizz;
  number: number;
  labels: QuizSetLabel[];
  selected: boolean;
  onToggleSelect: () => void;
  expanded: boolean;
  onToggleExpand: () => void;
  editing: boolean;
  onEdit: () => void;
  onCancelEdit: () => void;
  onSave: (data: QuestionInput) => Promise<boolean>;
  onDelete: () => void;
  /** Another row is being edited: actions are paused. */
  locked: boolean;
  /** A question without a chapter can be put in one from its row. */
  onAssignChapter: (labelId: string) => Promise<boolean>;
  onCreateChapter: (name: string) => Promise<boolean>;
}

const iconBtn = "grid size-9 place-items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 disabled:pointer-events-none disabled:opacity-40";

export function ChapterBadge({ label }: { label: Quizz["label"] }) {
  if (!label) return <span className="text-[13px] text-muted-foreground">Chưa phân chương</span>;
  const color = label.color ?? "var(--brand)";
  return (
    <span
      className="inline-flex max-w-full items-center gap-1.5 truncate rounded-lg border px-2.5 py-1 text-[12px] font-medium"
      style={{ color, borderColor: `color-mix(in srgb, ${color} 35%, transparent)`, backgroundColor: `color-mix(in srgb, ${color} 10%, transparent)` }}
      title={label.name}
    >
      <span className="truncate">{label.name}</span>
    </span>
  );
}

/** One question: collapsed line, options when expanded, the inline editor when editing. */
export function QuestionTableRow(p: Props) {
  const { question: q } = p;
  const open = p.expanded || p.editing;
  const answerIndex = resolveAnswerIndex(q.answer, q.options);
  const chapter = q.label ? (
    <ChapterBadge label={q.label} />
  ) : (
    <AssignLabelPicker labels={p.labels} noun="chương" disabled={p.locked || p.editing} onAssign={p.onAssignChapter} onCreate={p.onCreateChapter} />
  );

  return (
    <li className={cn("rounded-lg border transition-colors", p.editing ? "border-brand-border bg-brand-soft/30" : "border-transparent hover:bg-surface-soft/50")}>
      <div className={cn(questionGridClass, "px-3 py-3 md:px-4")}>
        <input type="checkbox" checked={p.selected} onChange={p.onToggleSelect} aria-label={`Chọn câu ${p.number}`} className="size-[18px] cursor-pointer accent-[var(--brand)]" />
        <div className="flex min-w-0 items-center gap-3">
          <span className="grid size-8 shrink-0 place-items-center rounded-full bg-brand-soft text-[14px] font-bold text-brand">{p.number}</span>
          <div className="min-w-0">
            <p className={cn("text-[15px] font-semibold text-ink", !open && "truncate")}>{plainText(q.question) || "(Câu hỏi trống)"}</p>
            <div className="mt-1 md:hidden">{chapter}</div>
          </div>
        </div>
        <div className="hidden min-w-0 justify-center md:flex">{chapter}</div>
        <div className="hidden justify-center md:flex">
          <span className="rounded-lg bg-brand-soft px-3 py-1 text-[12px] font-medium text-brand">Trắc nghiệm</span>
        </div>
        <div className="flex items-center justify-end gap-1">
          <button type="button" onClick={p.onEdit} disabled={p.locked || p.editing} aria-label={`Sửa câu ${p.number}`} className={cn(iconBtn, "text-body hover:bg-surface-soft hover:text-ink")}>
            <PencilSimpleIcon className="size-4" aria-hidden />
          </button>
          <button type="button" onClick={p.onDelete} disabled={p.locked} aria-label={`Xóa câu ${p.number}`} className={cn(iconBtn, "border border-brand-border text-brand hover:bg-brand-soft")}>
            <TrashIcon className="size-4" aria-hidden />
          </button>
          <button
            type="button"
            onClick={p.editing ? p.onCancelEdit : p.onToggleExpand}
            aria-expanded={open}
            aria-label={open ? "Thu gọn" : "Xem đáp án"}
            className={cn(iconBtn, open ? "bg-brand-soft text-brand" : "text-body hover:bg-surface-soft")}
          >
            <CaretDownIcon className={cn("size-5 transition-transform", open && "rotate-180")} aria-hidden />
          </button>
        </div>
      </div>

      {p.editing ? (
        <div className="px-3 pb-4 md:pl-[88px] md:pr-4">
          <QuestionInlineEditor question={q} labels={p.labels} onSave={p.onSave} onCancel={p.onCancelEdit} />
        </div>
      ) : p.expanded ? (
        <div className="px-3 pb-4 md:pl-[88px] md:pr-4">
          <div className="text-[14px] text-body"><RichTextViewer content={q.question} /></div>
          <ol className="mt-3 grid gap-x-8 gap-y-2 sm:grid-cols-2">
            {q.options.map((o, i) => (
              <li key={i} className={cn("flex gap-2 rounded-lg border px-3 py-2 text-[14px]", i === answerIndex ? "border-brand-border bg-brand-soft text-ink" : "border-hairline-soft text-body")}>
                <span className="font-medium text-muted-foreground">{String.fromCharCode(65 + i)}.</span>
                <span className="min-w-0 flex-1">{plainText(quizOptionToText(o))}</span>
                {i === answerIndex && <span className="font-semibold text-brand" aria-label="Đáp án đúng">✓</span>}
              </li>
            ))}
          </ol>
        </div>
      ) : null}
    </li>
  );
}
