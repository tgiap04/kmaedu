import { useMemo, useState } from "react";
import { PencilSimpleIcon, PlusCircleIcon, TrashIcon } from "@phosphor-icons/react";
import { createLabelApi, deleteLabelApi, updateLabelApi } from "@/apis/quizsetApi";
import { toast } from "@/components/antd/toast";
import { DeleteConfirmDialog } from "@/components/organisms/DeleteConfirmDialog";
import { nextLabelOrder, orderLabels } from "@/lib/label-picker/label-picker";
import { chapterColorAt } from "@/lib/manage-exam/chapter-colors";
import { type LabelFilter, NO_LABEL, chapterCounts } from "@/lib/manage-exam/quiz-set-detail";
import type { Quizz, QuizSetLabel } from "@/types/quizset";
import { type LabelDraft, LabelFormRow } from "../label-form-row";

interface Props {
  quizSetId: string;
  labels: QuizSetLabel[];
  questions: Quizz[];
  /** Reload the set after a chapter changed. */
  onChanged: () => Promise<void> | void;
  /** Show the question tab filtered to this chapter. */
  onOpenChapter: (filter: LabelFilter) => void;
}

const iconBtn = "grid size-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-surface-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40";
const errorText = (error: unknown) => (error instanceof Error ? error.message : undefined);

/** "Chương": flat list of the set's labels with counts; add, rename, recolour and remove in place. */
export function QuizSetChapterManager({ quizSetId, labels, questions, onChanged, onOpenChapter }: Props) {
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [removing, setRemoving] = useState<QuizSetLabel | null>(null);
  const counts = useMemo(() => chapterCounts(questions), [questions]);
  const ordered = useMemo(() => orderLabels(labels), [labels]);

  const save = async (work: () => Promise<unknown>, done: string, fail: string) => {
    try {
      await work();
      toast.success(done);
      await onChanged();
      return true;
    } catch (error) {
      toast.error(fail, { description: errorText(error) });
      return false;
    }
  };

  const create = (d: LabelDraft) =>
    save(() => createLabelApi(quizSetId, { name: d.name, description: d.description || undefined, color: d.color, order: nextLabelOrder(labels) }), "Đã thêm chương", "Thêm chương thất bại");
  const update = (id: string, d: LabelDraft) =>
    save(() => updateLabelApi(quizSetId, id, { name: d.name, description: d.description || null, color: d.color }), "Đã lưu chương", "Lưu chương thất bại");

  return (
    <div className="rounded-lg border border-hairline-soft p-4 md:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-[16px] font-bold text-ink">
            Chương <span className="font-normal text-muted-foreground">({labels.length})</span>
          </h3>
          <p className="mt-0.5 text-[13px] text-body">Chia câu hỏi theo chương để phòng thi bốc câu theo từng phần.</p>
        </div>
        <button
          type="button"
          onClick={() => setEditing("new")}
          disabled={editing === "new"}
          className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-hairline px-4 text-[13px] font-medium text-ink transition-colors hover:bg-surface-soft disabled:opacity-50"
        >
          <PlusCircleIcon className="size-4" aria-hidden />
          Thêm chương
        </button>
      </div>

      <ul className="mt-3 divide-y divide-hairline-soft">
        {ordered.map((l) =>
          editing === l.id ? (
            <li key={l.id} className="py-2">
              <LabelFormRow noun="chương" namePlaceholder="Tên chương, VD: Chương 1" initial={{ name: l.name, description: l.description ?? "", color: l.color ?? chapterColorAt(0) }} submitLabel="Lưu" onSubmit={(d) => update(l.id, d)} onCancel={() => setEditing(null)} />
            </li>
          ) : (
            <li key={l.id} className="flex items-center gap-1 py-1.5">
              <button
                type="button"
                onClick={() => onOpenChapter(l.id)}
                title="Xem câu hỏi của chương"
                className="flex min-w-0 flex-1 items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-surface-soft/70"
              >
                <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: l.color ?? "var(--muted-foreground)" }} aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-medium text-ink">{l.name}</span>
                  {l.description && <span className="block truncate text-[13px] text-body">{l.description}</span>}
                </span>
                <span className="shrink-0 text-[13px] tabular-nums text-body">{counts.byLabel.get(l.id) ?? 0} câu</span>
              </button>
              <button type="button" onClick={() => setEditing(l.id)} aria-label={`Sửa ${l.name}`} className={`${iconBtn} hover:text-ink`}>
                <PencilSimpleIcon className="size-4" aria-hidden />
              </button>
              <button type="button" onClick={() => setRemoving(l)} aria-label={`Xóa ${l.name}`} className={`${iconBtn} hover:text-brand`}>
                <TrashIcon className="size-4" aria-hidden />
              </button>
            </li>
          ),
        )}

        {editing === "new" && (
          <li className="py-2">
            <LabelFormRow noun="chương" namePlaceholder="Tên chương, VD: Chương 1" initial={{ name: "", description: "", color: chapterColorAt(labels.length) }} submitLabel="Thêm" onSubmit={create} onCancel={() => setEditing(null)} />
          </li>
        )}

        {(counts.unlabeled > 0 || labels.length === 0) && (
          <li className="py-1.5 pr-[72px]">
            <button
              type="button"
              onClick={() => onOpenChapter(NO_LABEL)}
              disabled={counts.unlabeled === 0}
              className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-surface-soft/70 disabled:pointer-events-none"
            >
              <span className="size-2.5 shrink-0 rounded-full border border-dashed border-muted-foreground" aria-hidden />
              <span className="flex-1 text-[15px] text-body">Chưa phân chương</span>
              <span className="text-[13px] tabular-nums text-body">{counts.unlabeled} câu</span>
            </button>
          </li>
        )}
      </ul>

      <DeleteConfirmDialog
        open={removing !== null}
        onOpenChange={(open) => !open && setRemoving(null)}
        title={`Xóa chương "${removing?.name ?? ""}"`}
        description="Câu hỏi trong chương này không bị xóa, chỉ chuyển sang “Chưa phân chương”."
        onConfirm={async () => {
          if (removing) await save(() => deleteLabelApi(quizSetId, removing.id), "Đã xóa chương", "Xóa chương thất bại");
          setRemoving(null);
        }}
      />
    </div>
  );
}
