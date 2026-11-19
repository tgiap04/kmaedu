import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createFlashcardSetApi, setFlashcardsToFlashcardSet } from "@/apis/flashcardSetApi";
import { toast } from "@/components/antd/toast";
import { copyPayload } from "@/lib/flashcard-detail/flashcard-detail";
import { copyTitle } from "@/lib/manage-exam/quiz-set-detail";
import { singleFlight } from "@/lib/single-flight";
import { storeCache } from "@/lib/storeCache";
import { useStatsStore } from "@/stores/useStatsStore";
import type { Flashcard, FlashcardSet } from "@/types/flashcardSet";
import { createAndFill, pathAfterCreate } from "../create-flashcard/flashcard-flow-logic";
import { saveCardsInBatches } from "../create-flashcard/save-cards-in-batches";

const errorText = (error: unknown) => (error instanceof Error ? error.message : undefined);

/**
 * "Sao chép": a private "<tên> (bản sao)" with the same cards, then opens it. Cards are copied without
 * their labels (the bulk API returns no card ids to attach labels to). Same rules as creating a set: a copy
 * that fails half way is kept and opened with a toast of how many cards it got (so a retry does not leave a
 * second half-copy), a second click is ignored, and a user who left the page is not pulled back.
 */
export function useCopyFlashcardSet(set: FlashcardSet | null, cards: Flashcard[] | null) {
  const navigate = useNavigate();
  const invalidateFlashcardStats = useStatsStore((s) => s.invalidateFlashcardStats);
  const [copying, setCopying] = useState(false);
  const [guard] = useState(singleFlight);
  const mounted = useRef(true);
  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const copy = () =>
    guard(async () => {
      if (!set || !cards) return;
      const payload = copyPayload(cards);
      const skipped = cards.length - payload.length;
      setCopying(true);
      try {
        const result = await createAndFill({
          create: async () => {
            const { flashcardSet } = await createFlashcardSetApi({ title: copyTitle(set.title), description: set.description ?? "", isPublic: false, isPinned: false, tags: set.tags ?? [] });
            return flashcardSet.id;
          },
          fill: async (setId) => {
            await saveCardsInBatches(setId, payload, setFlashcardsToFlashcardSet);
            return "Đã sao chép bộ thẻ";
          },
        });
        if (result.status === "create-failed") {
          toast.error("Sao chép bộ thẻ thất bại", { description: errorText(result.error) });
          return;
        }
        storeCache.invalidate("flashcardsets");
        invalidateFlashcardStats();
        if (result.status === "partial") {
          toast.error(`Đã tạo bộ mới nhưng chỉ chép được ${result.added ?? 0}/${payload.length} thẻ`, { description: errorText(result.error) });
        } else {
          if (skipped > 0) toast.warning(`Bỏ qua ${skipped} thẻ thiếu mặt trước hoặc mặt sau khi sao chép`);
          toast.success(result.message ?? "Đã sao chép bộ thẻ", { description: "Thẻ được chép không kèm nhãn." });
        }
        const path = pathAfterCreate(result, mounted.current);
        if (path) navigate(path);
      } finally {
        setCopying(false);
      }
    });
  return { copy, copying };
}
