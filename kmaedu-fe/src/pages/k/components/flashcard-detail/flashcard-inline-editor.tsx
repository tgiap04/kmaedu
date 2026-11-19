import { useId, useState } from "react";
import { CardsIcon, CircleNotchIcon, PencilSimpleIcon, PlusCircleIcon } from "@phosphor-icons/react";
import { RichTextEditor } from "@/components/molecules/RichTextEditor";
import { RichTextViewer } from "@/components/molecules/RichTextViewer";
import { frontToSave, hasContent, isSimpleHtml } from "@/lib/flashcard-detail/flashcard-detail";
import { plainText } from "@/lib/manage-exam/quiz-set-detail";
import type { Flashcard } from "@/types/flashcardSet";

interface Props {
  /** null = a new card. */
  card: Flashcard | null;
  onSave: (data: { question: string; answer: string }) => Promise<boolean>;
  onCancel: () => void;
}

const labelClass = "text-[13px] font-semibold text-ink";

/**
 * Edit form inside a card row: "Cụm từ" (front), "Mô tả" (back, rich text) and a live preview. A front
 * that is bare text is a text input; one that already carries formatting or an image keeps its rich editor.
 */
export function FlashcardInlineEditor({ card, onSave, onCancel }: Props) {
  const frontId = useId();
  const simple = !card || isSimpleHtml(card.question);
  const [front, setFront] = useState(() => (card ? (simple ? plainText(card.question) : card.question) : ""));
  const [back, setBack] = useState(card?.answer ?? "");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  // An untouched bare-text front is saved as it was (no entity or line-break rewrite).
  const frontHtml = simple ? frontToSave(card?.question ?? null, front) : front;

  const save = async () => {
    if (!hasContent(frontHtml)) return setError("Nhập cụm từ (mặt trước).");
    if (!hasContent(back)) return setError("Nhập mô tả (mặt sau).");
    setError("");
    setSaving(true);
    const ok = await onSave({ question: frontHtml, answer: back });
    setSaving(false);
    if (ok) onCancel();
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,380px)]">
      <div className="min-w-0 space-y-3">
        <div>
          <label htmlFor={frontId} className={labelClass}>Cụm từ</label>
          <div className="mt-1.5">
            {simple ? (
              <input
                id={frontId}
                value={front}
                onChange={(e) => setFront(e.target.value)}
                placeholder="Nhập cụm từ hoặc câu hỏi..."
                autoFocus
                className="h-10 w-full rounded-lg border border-hairline bg-canvas px-3.5 text-[14px] text-ink outline-none placeholder:text-muted-soft focus:border-brand-border"
              />
            ) : (
              <RichTextEditor content={front} onChange={setFront} placeholder="Nhập mặt trước..." minHeight="56px" />
            )}
          </div>
        </div>
        <div>
          <p className={labelClass}>Mô tả</p>
          <div className="mt-1.5">
            <RichTextEditor content={back} onChange={setBack} placeholder="Nhập mô tả hoặc câu trả lời..." minHeight="96px" />
          </div>
        </div>
      </div>

      <div className="min-w-0">
        <p className={labelClass}>Xem trước</p>
        <div className="mt-1.5 flex items-start gap-4 rounded-lg border border-brand-border bg-brand-soft/50 p-4">
          <span className="grid size-12 shrink-0 place-items-center rounded-full bg-brand-soft-hover text-brand">
            <CardsIcon className="size-6" weight="duotone" aria-hidden />
          </span>
          <div className="min-w-0 flex-1 space-y-1">
            <div className="text-[15px] font-semibold text-ink">
              {hasContent(frontHtml) ? <RichTextViewer content={frontHtml} /> : <span className="font-normal text-muted-foreground">Mặt trước</span>}
            </div>
            <div className="text-[14px] text-body">
              {hasContent(back) ? <RichTextViewer content={back} /> : <span className="text-muted-foreground">Mặt sau</span>}
            </div>
          </div>
        </div>
      </div>

      {error && <p className="text-[13px] text-destructive lg:col-span-2" role="alert">{error}</p>}
      <div className="flex items-center justify-end gap-2 lg:col-span-2">
        <button type="button" onClick={onCancel} disabled={saving} className="h-9 rounded-lg border border-hairline bg-canvas px-5 text-[14px] font-medium text-ink transition-colors hover:bg-surface-soft disabled:opacity-60">
          Hủy
        </button>
        <button
          type="button"
          onClick={() => void save()}
          disabled={saving}
          className="inline-flex h-9 items-center gap-2 rounded-lg bg-brand px-5 text-[14px] font-semibold text-white shadow-[0_6px_16px_rgba(238,47,43,0.25)] transition-colors hover:bg-brand-strong disabled:opacity-60"
        >
          {saving ? <CircleNotchIcon className="size-4 animate-spin" aria-hidden /> : card ? <PencilSimpleIcon className="size-4" aria-hidden /> : <PlusCircleIcon className="size-4" aria-hidden />}
          {card ? "Lưu thay đổi" : "Thêm thẻ"}
        </button>
      </div>
    </div>
  );
}
