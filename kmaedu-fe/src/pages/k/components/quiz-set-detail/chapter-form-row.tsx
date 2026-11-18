import { useState } from "react";
import { CircleNotchIcon, CheckIcon } from "@phosphor-icons/react";
import { CHAPTER_COLORS } from "@/lib/manage-exam/chapter-colors";
import { cn } from "@/lib/utils";


export interface ChapterDraft {
  name: string;
  description: string;
  color: string;
}

interface Props {
  initial: ChapterDraft;
  submitLabel: string;
  onSubmit: (draft: ChapterDraft) => Promise<boolean>;
  onCancel: () => void;
}

const field = "h-9 w-full rounded-lg border border-hairline bg-canvas px-3 text-[14px] text-ink outline-none transition-colors placeholder:text-muted-soft focus:border-brand-border";

/** Inline add / edit of one chapter: name, optional description, a colour dot. Enter saves, Esc cancels. */
export function ChapterFormRow({ initial, submitLabel, onSubmit, onCancel }: Props) {
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
        <input autoFocus value={draft.name} maxLength={100} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Tên chương, VD: Chương 1" aria-label="Tên chương" className={field} />
        <input value={draft.description} maxLength={500} onChange={(e) => setDraft({ ...draft, description: e.target.value })} placeholder="Mô tả ngắn (không bắt buộc)" aria-label="Mô tả chương" className={field} />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5" role="radiogroup" aria-label="Màu chương">
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
