import { useEffect, useState } from "react";
import { getProgressApi } from "@/apis/flashcardStudyApi";

/**
 * The viewer's own study progress on the set: ids of the cards studied, or null while it loads and when
 * it cannot be read (no progress yet, no study permission); the page then shows "—".
 */
export function useFlashcardProgress(setId: string) {
  const [studiedIds, setStudiedIds] = useState<string[] | null>(null);
  useEffect(() => {
    let alive = true;
    setStudiedIds(null);
    getProgressApi(setId)
      .then((progress) => alive && setStudiedIds(progress.studiedCardIds ?? []))
      .catch(() => alive && setStudiedIds(null));
    return () => {
      alive = false;
    };
  }, [setId]);
  return studiedIds;
}
