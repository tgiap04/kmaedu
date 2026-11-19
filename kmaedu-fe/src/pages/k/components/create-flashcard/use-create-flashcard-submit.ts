import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createFlashcardSetApi, setFlashcardsToFlashcardSet, setHistoryFlashcardsToFlashcardSet } from "@/apis/flashcardSetApi";
import { toast } from "@/components/antd/toast";
import { singleFlight } from "@/lib/single-flight";
import { storeCache } from "@/lib/storeCache";
import { useStatsStore } from "@/stores/useStatsStore";
import { type CreateAndFillResult, createAndFill, createFailureMessage, pathAfterCreate } from "./flashcard-flow-logic";
import { type CardInput, saveCardsInBatches } from "./save-cards-in-batches";

export interface SetDraft {
  title: string;
  description: string;
  isPublic: boolean;
  tags: string[];
}

const errorText = (error: unknown) => (error instanceof Error ? error.message : "Vui lòng thử lại.");

/** What goes into the new set once it exists; resolves to the success message. */
type Fill = (setId: string) => Promise<string>;
export type SubmitStatus = CreateAndFillResult["status"];
interface RunOptions {
  /** Fill this set (made by an earlier try) instead of creating one. */
  existingSetId?: string | null;
  /** A failed fill keeps the user here to retry into the set, instead of opening it. */
  onPartial?: (setId: string) => void;
}

/**
 * Creates the set, fills it, then opens its detail page. When filling fails the set is kept and
 * opened (so a retry never makes a second copy) and the toast says how many cards it got. When the
 * set itself cannot be created nothing is lost: the user stays here with the input. A second submit
 * while one runs is ignored, and leaving the page mid-save does not pull the user back.
 */
export function useCreateFlashcardSubmit() {
  const navigate = useNavigate();
  const invalidateFlashcardStats = useStatsStore((s) => s.invalidateFlashcardStats);
  const [submitting, setSubmitting] = useState(false);
  const [guard] = useState(singleFlight);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  // An AI result whose save failed after its set was made: the retry fills that set, it never makes a second one.
  const pendingHistory = useRef<{ historyId: string; setId: string } | null>(null);

  const run = (draft: SetDraft, fill?: Fill, options: RunOptions = {}) =>
    guard(async (): Promise<SubmitStatus> => {
      setSubmitting(true);
      try {
        const result = await createAndFill({
          create: async () => {
            const { flashcardSet } = await createFlashcardSetApi({
              title: draft.title.trim(),
              description: draft.description.trim(),
              isPublic: draft.isPublic,
              isPinned: false,
              tags: draft.tags,
            });
            return flashcardSet.id;
          },
          fill,
          existingSetId: options.existingSetId,
        });
        if (result.status === "create-failed") {
          const { title, description } = createFailureMessage(result.error);
          toast.error(title, { description });
          storeCache.invalidate("flashcardsets"); // the set may exist after all: the list must show it
          return result.status;
        }
        storeCache.invalidate("flashcardsets");
        invalidateFlashcardStats();
        if (result.status === "ok") {
          toast.success(result.message ?? "Đã tạo bộ thẻ. Hãy thêm thẻ đầu tiên.");
        } else if (options.onPartial) {
          options.onPartial(result.setId);
          toast.error("Đã tạo bộ thẻ nhưng chưa lưu được thẻ", { description: `Bấm "Lưu thành bộ thẻ" để lưu lại vào bộ vừa tạo. ${errorText(result.error)}` });
          return result.status;
        } else {
          const added = result.added === null ? "" : ` Đã thêm ${result.added} thẻ trước khi lỗi.`;
          toast.error("Đã tạo bộ thẻ nhưng chưa thêm đủ thẻ", { description: `Bộ thẻ đã có trong danh sách.${added} Mở bộ thẻ để kiểm tra. ${errorText(result.error)}` });
        }
        const path = pathAfterCreate(result, mounted.current);
        if (path) navigate(path);
        return result.status;
      } finally {
        setSubmitting(false);
      }
    });

  return {
    submitting,
    /** Empty set; the detail page is where the first cards get added. */
    submitManual: (draft: SetDraft) => run(draft),
    /** Cards made from quiz questions; `skipped` questions had no usable correct answer. */
    submitCards: (draft: SetDraft, cards: CardInput[], skipped: number) =>
      run(draft, async (setId) => {
        const added = await saveCardsInBatches(setId, cards, setFlashcardsToFlashcardSet);
        return skipped > 0 ? `Đã tạo bộ thẻ với ${added} thẻ (bỏ ${skipped} câu không có đáp án đúng)` : `Đã tạo bộ thẻ với ${added} thẻ`;
      }),
    /** The cards AI generated (saved as a history entry on the server); a retry after a failed save fills the same set. */
    submitHistory: (draft: SetDraft, historyId: string) => {
      const pending = pendingHistory.current?.historyId === historyId ? pendingHistory.current.setId : null;
      return run(
        draft,
        async (setId) => {
          try {
            const { createdCount } = await setHistoryFlashcardsToFlashcardSet({ flashcardsetIds: [setId], historyId });
            pendingHistory.current = null;
            return `Đã tạo bộ thẻ với ${createdCount} thẻ`;
          } catch (error) {
            throw new Error(`${errorText(error)} Thẻ AI vừa tạo vẫn được giữ trong lịch sử tài liệu.`, { cause: error });
          }
        },
        { existingSetId: pending, onPartial: (setId) => (pendingHistory.current = { historyId, setId }) },
      );
    },
  };
}
