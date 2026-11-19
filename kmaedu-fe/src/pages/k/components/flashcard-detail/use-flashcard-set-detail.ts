import { useCallback, useEffect, useState } from "react";
import { getFlashcardSetLabelsApi, type FlashcardSetLabel } from "@/apis/flashcardSetApi";
import { toast } from "@/components/antd/toast";
import { type LabelChange, applyLabelChange } from "@/lib/label-picker/label-picker";
import { createReadGate } from "@/lib/read-gate";
import { useFlashcardSetStore } from "@/stores/useFlashcardSetStore";

/**
 * The set itself (from the store, which toasts a failed read) and its labels. `set` is null until the
 * set with this id is loaded, so a set opened before never shows under another id.
 */
export function useFlashcardSetDetail(id: string) {
  const current = useFlashcardSetStore((s) => s.currentFlashcardSet);
  const fetchById = useFlashcardSetStore((s) => s.fetchFlashcardSetById);
  const [failed, setFailed] = useState(false);
  const [labels, setLabels] = useState<FlashcardSetLabel[]>([]);
  const [labelsFailed, setLabelsFailed] = useState(false);
  const [labelsGate] = useState(createReadGate);

  const reloadSet = useCallback(async () => {
    try {
      await fetchById(id);
      setFailed(false);
    } catch {
      setFailed(true);
    }
  }, [id, fetchById]);

  const reloadLabels = useCallback(async () => {
    const mine = labelsGate.begin();
    try {
      const { labels: read } = await getFlashcardSetLabelsApi(id);
      if (!labelsGate.isCurrent(mine)) return; // a newer read, or a patch made since, owns the list
      setLabels(read);
      setLabelsFailed(false);
    } catch (error) {
      if (!labelsGate.isCurrent(mine)) return;
      console.error("Failed to fetch labels:", error);
      setLabelsFailed(true);
      toast.error("Không tải được danh sách nhãn", { description: "Nhãn đang hiện có thể chưa đủ. Tải lại trang để thử lại." });
    } finally {
      labelsGate.end(mine);
    }
  }, [id, labelsGate]);
  /** A label was saved: the list shows it at once; a read already on its way (from before the save) is dropped. */
  const patchLabels = useCallback(
    (change: LabelChange) => {
      labelsGate.invalidate();
      setLabels((prev) => applyLabelChange(prev, change));
    },
    [labelsGate],
  );

  useEffect(() => {
    void reloadSet();
    void reloadLabels();
  }, [reloadSet, reloadLabels]);

  return { set: current?.id === id ? current : null, failed, labels, labelsFailed, reloadSet, reloadLabels, patchLabels };
}
