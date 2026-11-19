import { useCallback, useMemo } from "react";
import { createFlashcardLabelApi, type FlashcardSetLabel } from "@/apis/flashcardSetApi";
import { toast } from "@/components/antd/toast";
import { type LabelChange, nextLabelOrder, orderLabels } from "@/lib/label-picker/label-picker";
import { chapterColorAt } from "@/lib/manage-exam/chapter-colors";
import { useFlashcardSetStore } from "@/stores/useFlashcardSetStore";
import type { Flashcard } from "@/types/flashcardSet";

interface Cards {
  assignLabel: (card: Flashcard, label: FlashcardSetLabel, failText?: string) => Promise<boolean>;
  relabel: (labelId: string, label: Flashcard["label"] | null) => void;
}
interface Labels {
  labels: FlashcardSetLabel[];
  reloadLabels: () => Promise<unknown>;
  patchLabels: (change: LabelChange) => void;
}

const errorText = (error: unknown) => (error instanceof Error ? error.message : undefined);

/**
 * Labels on the set page: a card labelled from its row (with a label of the set, or one made on the spot), and a
 * label saved in the labels tab, patched onto the label list and the cards in place (no read of the whole set).
 */
export function useCardLabeling(setId: string, cards: Cards, set: Labels) {
  const invalidateCache = useFlashcardSetStore((s) => s.invalidateCache);
  const { labels, reloadLabels, patchLabels } = set;
  const { assignLabel, relabel } = cards;
  const ordered = useMemo(() => orderLabels(labels), [labels]);

  const onLabelsChanged = useCallback(
    (change?: LabelChange) => {
      if (change) {
        patchLabels(change);
        relabel(change.labelId, change.label ?? null);
      }
      return reloadLabels();
    },
    [patchLabels, relabel, reloadLabels],
  );

  return {
    labels: ordered,
    onLabelsChanged,
    /** A failed assign may mean the label is gone (deleted in another tab): the list is read again. */
    assign: async (card: Flashcard, labelId: string) => {
      const label = labels.find((l) => l.id === labelId);
      const ok = label ? await assignLabel(card, label) : false;
      if (!ok) void reloadLabels();
      return ok;
    },
    /**
     * Creates the label, then assigns it. The label list is reloaded alongside, so when the assign fails the
     * new label is already there to pick; a refused create (409: the name exists) reloads it too, to show that one.
     */
    create: async (card: Flashcard, name: string) => {
      let label: FlashcardSetLabel;
      try {
        ({ label } = await createFlashcardLabelApi(setId, { name, color: chapterColorAt(labels.length), order: nextLabelOrder(labels) }));
      } catch (error) {
        toast.error("Tạo nhãn thất bại", { description: errorText(error) });
        void reloadLabels();
        return false;
      }
      invalidateCache();
      const [, ok] = await Promise.all([reloadLabels(), assignLabel(card, label, "Đã tạo nhãn nhưng chưa gán được thẻ")]);
      return ok;
    },
  };
}
