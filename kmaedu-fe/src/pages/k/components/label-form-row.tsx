import { useState } from "react";
import { CircleNotchIcon, CheckIcon } from "@phosphor-icons/react";
import { CHAPTER_COLORS } from "@/lib/manage-exam/chapter-colors";
import { cn } from "@/lib/utils";


export interface LabelDraft {
  name: string;
  description: string;
  color: string;
}

interface Props {
  initial: LabelDraft;
  submitLabel: string;
  onSubmit: (draft: LabelDraft) => Promise<boolean>;
  onCancel: () => void;
  /** What the row names in its labels: "chương" for a quiz set, "nhãn" for a flashcard set. */
  noun: string;
  namePlaceholder: string;
}

const field = "h-9 w-full rounded-lg border border-hairline bg-canvas px-3 text-[14px] text-ink outline-none transition-colors placeholder:text-muted-soft focus:border-brand-border";

/** Inline add / edit of one label (a quiz chapter or a flashcard label): name, optional description, a colour. Enter saves, Esc cancels. */
export function LabelFormRow({ initial, submitLabel, onSubmit, onCancel, noun, namePlaceholder }: Props) {
  const [draft, setDraft] = useState(initial);
  const [saving, setSaving] = useState(false);
  const name = draft.name.trim();

  const submit = async () => {
    if (!name || saving) return;
    setSaving(true);
    const ok = await onSubmit({ ...draft, name, description: draft.description.trim() });
    setSaving(false);
    if (ok) onCancel();
  };

  return (
    <div
      className="space-y-3 rounded-lg bg-surface-soft p-3"
      onKeyDown={(e) => {
        if (e.key === "Escape") onCancel();
        if (e.key === "Enter") void submit();
      }}
    >
      <div className="grid gap-2 sm:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <input autoFocus value={draft.name} maxLength={100} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder={namePlaceholder} aria-label={`Tên ${noun}`} className={field} />
        <input value={draft.description} maxLength={500} onChange={(e) => setDraft({ ...draft, description: e.target.value })} placeholder="Mô tả ngắn (không bắt buộc)" aria-label={`Mô tả ${noun}`} className={field} />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5" role="radiogroup" aria-label={`Màu ${noun}`}>
          {CHAPTER_COLORS.map(({ value: c }) => (
            <button
              key={c}
              type="button"
              role="radio"
              aria-checked={draft.color === c}
              aria-label={`Màu ${c}`}
              onClick={() => setDraft({ ...draft, color: c })}
              className={cn("grid size-6 place-items-center rounded-full transition-transform hover:scale-110", draft.color === c && "ring-2 ring-offset-2 ring-offset-surface-soft")}
              style={{ backgroundColor: c, ["--tw-ring-color" as string]: c }}
            >
              {draft.color === c && <CheckIcon className="size-3.5 text-white" aria-hidden />}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={onCancel} disabled={saving} className="h-8 rounded-lg px-3 text-[13px] font-medium text-body transition-colors hover:bg-canvas hover:text-ink">
            Hủy
          </button>
          <button
            type="button"
            onClick={() => void submit()}
            disabled={!name || saving}
            className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-brand px-3.5 text-[13px] font-semibold text-white transition-colors hover:bg-brand-strong disabled:opacity-50"
          >
            {saving && <CircleNotchIcon className="size-3.5 animate-spin" aria-hidden />}
            {submitLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
