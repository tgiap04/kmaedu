import { useCallback, useEffect, useMemo, useState } from "react";
import {
  addFlashcardToFlashcardSet,
  assignFlashcardsToLabelApi,
  deleteFlashcardFromFlashcardSet,
  getFlashcardSetFlashcardsApi,
  updateFlashcardInFlashcardSet,
  type CreateFlashcardData,
  type FlashcardSetLabel,
} from "@/apis/flashcardSetApi";
import { toast } from "@/components/antd/toast";
import { collectPages, relabelCards } from "@/lib/flashcard-detail/flashcard-detail";
import { createReadGate } from "@/lib/read-gate";
import { createSerialRunner } from "@/lib/serial-runner";
import { storeCache } from "@/lib/storeCache";
import { useStatsStore } from "@/stores/useStatsStore";
import type { Flashcard } from "@/types/flashcardSet";

const errorText = (error: unknown) => (error instanceof Error ? error.message : "Vui lòng thử lại.");

/**
 * Every card of the set (with its label) in memory, so search, the label filter and paging work across
 * the whole set. Add / edit / delete save first, then patch the list instead of reading it all again;
 * `reload` is for changes made elsewhere on the page (labels).
 */
export function useFlashcardCards(setId: string) {
  const invalidateFlashcardStats = useStatsStore((s) => s.invalidateFlashcardStats);
  const [cards, setCards] = useState<Flashcard[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [gate] = useState(createReadGate);

  const readAll = useCallback(async () => {
    const mine = gate.begin();
    try {
      // A read that a change made stale stops asking for pages; its partial list is dropped below.
      const all = await collectPages((page, limit) => getFlashcardSetFlashcardsApi(setId, page, limit), () => !gate.isCurrent(mine));
      if (!gate.isCurrent(mine)) return; // a newer read, or a change made since, owns the list
      setCards(all);
      setFailed(false);
    } catch (error) {
      if (!gate.isCurrent(mine)) return;
      setFailed(true);
      console.error("Failed to fetch flashcards:", error);
    } finally {
      gate.end(mine);
    }
  }, [setId, gate]);
  /** At most one whole-set read at a time: calls made meanwhile make one more read after it, not one each. */
  const reload = useMemo(() => createSerialRunner(readAll), [readAll]);

  useEffect(() => {
    setCards(null);
    void reload();
  }, [reload]);

  /** A change was saved and patched into the list: a read that was already on its way has the list from before it. */
  const patched = (patch: (prev: Flashcard[] | null) => Flashcard[]) => {
    setCards(patch);
    if (gate.invalidate()) void reload();
    storeCache.invalidate("flashcardsets");
    invalidateFlashcardStats();
  };

  /** Runs one change; true when it saved. */
  const run = async (work: () => Promise<void>, done: string, fail: string) => {
    try {
      await work();
      toast.success(done);
      return true;
    } catch (error) {
      toast.error(fail, { description: errorText(error) });
      return false;
    }
  };

  return {
    cards,
    failed,
    reload,
    addCard: (data: CreateFlashcardData) =>
      run(
        async () => {
          const { flashcard } = await addFlashcardToFlashcardSet(setId, data);
          patched((prev) => [...(prev ?? []), flashcard]);
        },
        "Đã thêm thẻ",
        "Thêm thẻ thất bại",
      ),
    updateCard: (card: Flashcard, data: CreateFlashcardData) =>
      run(
        async () => {
          const { flashcard } = await updateFlashcardInFlashcardSet(setId, card.id, data);
          // The update response carries no label: keep the one the card has now (an assign may have landed meanwhile).
          patched((prev) => (prev ?? []).map((c) => (c.id === card.id ? { ...flashcard, label: c.label } : c)));
        },
        "Đã lưu thay đổi",
        "Lưu thẻ thất bại",
      ),
    /** A label of the set was renamed, recoloured (label) or deleted (null): its cards show it anew, no read needed. */
    relabel: (labelId: string, label: Flashcard["label"] | null) => patched((prev) => relabelCards(prev ?? [], labelId, label)),
    /** Puts one card in a label of the set; the list is patched, not read again. */
    assignLabel: (card: Flashcard, label: Pick<FlashcardSetLabel, "id" | "name" | "color">, failText = "Gán nhãn thất bại") =>
      run(
        async () => {
          await assignFlashcardsToLabelApi(setId, label.id, { flashcardIds: [card.id] });
          const tag = { id: label.id, name: label.name, color: label.color };
          patched((prev) => (prev ?? []).map((c) => (c.id === card.id ? { ...c, label: tag } : c)));
        },
        `Đã gán nhãn "${label.name}"`,
        failText,
      ),
    deleteCard: (card: Flashcard) =>
      run(
        async () => {
          await deleteFlashcardFromFlashcardSet(setId, card.id);
          patched((prev) => (prev ?? []).filter((c) => c.id !== card.id));
        },
        "Đã xóa thẻ",
        "Xóa thẻ thất bại",
      ),
  };
}
