import { useMemo, useState } from "react";
import { PencilSimpleIcon, PlusCircleIcon, TrashIcon } from "@phosphor-icons/react";
import { createFlashcardLabelApi, deleteFlashcardLabelApi, type FlashcardSetLabel, updateFlashcardLabelApi } from "@/apis/flashcardSetApi";
import { toast } from "@/components/antd/toast";
import { DeleteConfirmDialog } from "@/components/organisms/DeleteConfirmDialog";
import { UNLABELED, labelCounts } from "@/lib/flashcard-detail/flashcard-detail";
import { nextLabelOrder, orderLabels } from "@/lib/label-picker/label-picker";
import { chapterColorAt } from "@/lib/manage-exam/chapter-colors";
import { useFlashcardSetStore } from "@/stores/useFlashcardSetStore";
import type { Flashcard } from "@/types/flashcardSet";
import { type LabelDraft, LabelFormRow } from "../label-form-row";

interface Props {
  setId: string;
  labels: FlashcardSetLabel[];
  cards: Flashcard[];
  /**
   * A label was saved. `change` is what its cards now carry: the renamed / recoloured label, or null once it is
   * deleted; no change for a new label (no card has it yet).
   */
  onChanged: (change?: { labelId: string; label: { id: string; name: string; color: string | null } | null }) => Promise<unknown> | void;
  /** Show the card tab filtered to this label (or to the cards without one). */
  onOpenLabel: (filter: string) => void;
}

const iconBtn = "grid size-8 place-items-center rounded-lg text-muted-foreground transition-colors hover:bg-surface-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40";
const errorText = (error: unknown) => (error instanceof Error ? error.message : undefined);
const NOUN = "nhãn";
const NAME_PLACEHOLDER = "Tên nhãn, VD: Từ vựng Unit 1";

/** "Nhãn": flat list of the set's labels with card counts; add, rename, recolour and remove in place (as the quiz set's chapters). */
export function FlashcardLabelManager({ setId, labels, cards, onChanged, onOpenLabel }: Props) {
  const invalidateCache = useFlashcardSetStore((s) => s.invalidateCache);
  const [editing, setEditing] = useState<string | "new" | null>(null);
  const [removing, setRemoving] = useState<FlashcardSetLabel | null>(null);
  const [deleting, setDeleting] = useState(false);
  const counts = useMemo(() => labelCounts(cards), [cards]);
  const ordered = useMemo(() => orderLabels(labels), [labels]);

  const save = async (work: () => Promise<Parameters<Props["onChanged"]>[0]>, done: string, fail: string) => {
    try {
      const change = await work();
      invalidateCache();
      toast.success(done);
      await onChanged(change);
      return true;
    } catch (error) {
      toast.error(fail, { description: errorText(error) });
      return false;
    }
  };

  const create = (d: LabelDraft) =>
    save(
      async () => {
        await createFlashcardLabelApi(setId, { name: d.name, description: d.description || undefined, color: d.color, order: nextLabelOrder(labels) });
        return undefined;
      },
      "Đã thêm nhãn",
      "Thêm nhãn thất bại",
    );
  const update = (id: string, d: LabelDraft) =>
    save(
      async () => {
        await updateFlashcardLabelApi(setId, id, { name: d.name, description: d.description || null, color: d.color });
        return { labelId: id, label: { id, name: d.name, color: d.color } };
      },
      "Đã lưu nhãn",
      "Lưu nhãn thất bại",
    );
  const remove = async () => {
    if (!removing) return;
    setDeleting(true);
    const { id } = removing;
    const ok = await save(
      async () => {
        await deleteFlashcardLabelApi(setId, id);
        return { labelId: id, label: null };
      },
      "Đã xóa nhãn",
      "Xóa nhãn thất bại",
    );
    setDeleting(false);
    if (ok) setRemoving(null);
  };

  return (
    <div className="rounded-lg border border-hairline-soft p-4 md:p-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-[16px] font-bold text-ink">
            Nhãn <span className="font-normal text-muted-foreground">({labels.length})</span>
          </h3>
          <p className="mt-0.5 text-[13px] text-body">Gắn nhãn để nhóm thẻ theo chủ đề và lọc nhanh khi ôn.</p>
        </div>
        <button
          type="button"
          onClick={() => setEditing("new")}
          disabled={editing === "new"}
          className="inline-flex h-9 shrink-0 items-center gap-1.5 rounded-lg border border-hairline px-4 text-[13px] font-medium text-ink transition-colors hover:bg-surface-soft disabled:opacity-50"
        >
          <PlusCircleIcon className="size-4" aria-hidden />
          Thêm nhãn
        </button>
      </div>

      <ul className="mt-3 divide-y divide-hairline-soft">
        {ordered.map((l) =>
          editing === l.id ? (
            <li key={l.id} className="py-2">
              <LabelFormRow
                initial={{ name: l.name, description: l.description ?? "", color: l.color ?? chapterColorAt(0) }}
                submitLabel="Lưu"
                noun={NOUN}
                namePlaceholder={NAME_PLACEHOLDER}
                onSubmit={(d) => update(l.id, d)}
                onCancel={() => setEditing(null)}
              />
            </li>
          ) : (
            <li key={l.id} className="flex items-center gap-1 py-1.5">
              <button
                type="button"
                onClick={() => onOpenLabel(l.id)}
                title="Xem thẻ của nhãn"
                className="flex min-w-0 flex-1 items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-surface-soft/70"
              >
                <span className="size-2.5 shrink-0 rounded-full" style={{ backgroundColor: l.color ?? "var(--muted-foreground)" }} aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-medium text-ink">{l.name}</span>
                  {l.description && <span className="block truncate text-[13px] text-body">{l.description}</span>}
                </span>
                <span className="shrink-0 text-[13px] tabular-nums text-body">{counts.byLabel.get(l.id) ?? 0} thẻ</span>
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
            <LabelFormRow
              initial={{ name: "", description: "", color: chapterColorAt(labels.length) }}
              submitLabel="Thêm"
              noun={NOUN}
              namePlaceholder={NAME_PLACEHOLDER}
              onSubmit={create}
              onCancel={() => setEditing(null)}
            />
          </li>
        )}

        {(counts.unlabeled > 0 || labels.length === 0) && (
          <li className="py-1.5 pr-[72px]">
            <button
              type="button"
              onClick={() => onOpenLabel(UNLABELED)}
              disabled={counts.unlabeled === 0}
              className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition-colors hover:bg-surface-soft/70 disabled:pointer-events-none"
            >
              <span className="size-2.5 shrink-0 rounded-full border border-dashed border-muted-foreground" aria-hidden />
              <span className="flex-1 text-[15px] text-body">Chưa gán nhãn</span>
              <span className="text-[13px] tabular-nums text-body">{counts.unlabeled} thẻ</span>
            </button>
          </li>
        )}
      </ul>

      <DeleteConfirmDialog
        open={removing !== null}
        onOpenChange={(open) => !open && !deleting && setRemoving(null)}
        title={`Xóa nhãn "${removing?.name ?? ""}"`}
        description="Thẻ trong nhãn này không bị xóa, chỉ chuyển sang “Chưa gán nhãn”."
        isLoading={deleting}
        onConfirm={() => void remove()}
      />
    </div>
  );
}
