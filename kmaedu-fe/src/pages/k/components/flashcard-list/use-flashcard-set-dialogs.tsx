import { useCallback, useRef, useState } from "react";
import { FlashcardSetModal } from "@/components/organisms/FlashcardSetModal";
import { DeleteConfirmDialog } from "@/components/organisms/DeleteConfirmDialog";
import { ShareFlashcardModal } from "@/components/organisms/ShareFlashcardModal";
import type { FlashcardSetFormData } from "@/components/molecules/FlashcardSetForm";
import { useFlashcardSetStore } from "@/stores/useFlashcardSetStore";
import { useStatsStore } from "@/stores/useStatsStore";

/**
 * Edit, delete and share dialogs of the list; `dialogs` goes anywhere in the page, the open* handlers go to the rows.
 * `onEdited` reloads the page: an edited set may no longer match the search or filter.
 */
export function useFlashcardSetDialogs(onDeleted: () => void, onEdited: () => void) {
  const { flashcardSetsK, deleteFlashcardSet, updateFlashcardSet } = useFlashcardSetStore();
  const { fetchFlashcardStats, invalidateFlashcardStats } = useStatsStore();

  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedTitle, setSelectedTitle] = useState("");
  // Their own flags: the store's \`loading\` is also on while the list reads a page.
  const [saving, setSaving] = useState(false);
  const [deletingNow, setDeletingNow] = useState(false);
  const [shareTarget, setShareTarget] = useState<{ id: string; title: string } | null>(null);
  const [editData, setEditData] = useState<FlashcardSetFormData | undefined>(undefined);

  const openEdit = useCallback(
    (id: string) => {
      const set = flashcardSetsK.find((fs) => fs.id === id);
      if (!set) return;
      setEditData({
        title: set.title,
        description: set.description || "",
        isPublic: set.isPublic,
        isPinned: set.isPinned,
        tags: set.tags || [],
      });
      setSelectedId(id);
      setEditOpen(true);
    },
    [flashcardSetsK],
  );

  const openDelete = useCallback(
    (id: string) => {
      setSelectedId(id);
      setSelectedTitle(flashcardSetsK.find((fs) => fs.id === id)?.title ?? "");
      setDeleteOpen(true);
    },
    [flashcardSetsK],
  );

  const openShare = useCallback(
    (id: string) => {
      const set = flashcardSetsK.find((fs) => fs.id === id);
      if (!set) return;
      setShareTarget({ id, title: set.title });
      setShareOpen(true);
    },
    [flashcardSetsK],
  );

  // A second click before the dialog shows its spinner must not send a second DELETE.
  const deleting = useRef(false);
  const confirmDelete = useCallback(async () => {
    if (!selectedId || deleting.current) return;
    deleting.current = true;
    setDeletingNow(true);
    try {
      await deleteFlashcardSet(selectedId);
      invalidateFlashcardStats();
      setDeleteOpen(false);
      setSelectedId(null);
      onDeleted();
    } catch (error) {
      console.error("Delete flashcard set error:", error);
    } finally {
      deleting.current = false;
      setDeletingNow(false);
      await fetchFlashcardStats();
    }
  }, [selectedId, deleteFlashcardSet, invalidateFlashcardStats, fetchFlashcardStats, onDeleted]);

  const submitEdit = useCallback(
    async (data: FlashcardSetFormData) => {
      if (!selectedId) return;
      setSaving(true);
      try {
        await updateFlashcardSet(selectedId, {
          title: data.title,
          description: data.description || "",
          isPublic: data.isPublic,
          isPinned: data.isPinned,
          tags: data.tags,
        });
        setEditOpen(false);
        setSelectedId(null);
        setEditData(undefined);
        onEdited();
      } catch (error) {
        console.error("Update flashcard set error:", error);
      } finally {
        setSaving(false);
        await fetchFlashcardStats();
      }
    },
    [selectedId, updateFlashcardSet, fetchFlashcardStats, onEdited],
  );

  const dialogs = (
    <>
      <FlashcardSetModal open={editOpen} onOpenChange={setEditOpen} mode="edit" initialData={editData} isLoading={saving} onSubmit={submitEdit} />
      <DeleteConfirmDialog
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        title="Xác nhận xóa flashcard set"
        description={`Xóa bộ "${selectedTitle}"? Tất cả thẻ trong bộ sẽ bị xóa. Hành động này không thể hoàn tác.`}
        isLoading={deletingNow}
        onConfirm={confirmDelete}
      />
      {shareTarget && <ShareFlashcardModal open={shareOpen} onOpenChange={setShareOpen} flashcardSetId={shareTarget.id} flashcardSetTitle={shareTarget.title} />}
    </>
  );

  return { openEdit, openDelete, openShare, dialogs };
}
