import { ApiRequestError } from "@/apis/api";
import { PartialSaveError } from "./save-cards-in-batches";

/** How "make a set, then put cards into it" ended. A set that was created is never thrown away. */
export type CreateAndFillResult =
  | { status: "create-failed"; setId: null; error: unknown }
  | { status: "ok"; setId: string; message?: string }
  | { status: "partial"; setId: string; added: number | null; error: unknown };

/**
 * Creates a set, then fills it. A failed create stops everything (nothing exists, the caller keeps its input);
 * a failed fill keeps the set and reports how many cards got in, so a retry never makes a second set.
 * Shared by "Tạo Flashcard" and "Sao chép". `existingSetId` fills a set made by an earlier try instead of a new one.
 */
export async function createAndFill(args: { create: () => Promise<string>; fill?: (setId: string) => Promise<string>; existingSetId?: string | null }): Promise<CreateAndFillResult> {
  let setId: string;
  try {
    setId = args.existingSetId ?? (await args.create());
  } catch (error) {
    return { status: "create-failed", setId: null, error };
  }
  if (!args.fill) return { status: "ok", setId };
  try {
    return { status: "ok", setId, message: await args.fill(setId) };
  } catch (error) {
    return { status: "partial", setId, added: error instanceof PartialSaveError ? error.added : null, error };
  }
}

/** Where to go once the work is over: the set's page when a set exists and the user is still here, else nowhere. */
export function pathAfterCreate(result: CreateAndFillResult, stillMounted: boolean): string | null {
  return result.setId && stillMounted ? `/k/manage-flashcard-set/${result.setId}` : null;
}

export interface JobEnd {
  wasGenerating: boolean;
  isGenerating: boolean;
  /** The user pressed the button on this page (and did not cancel since). */
  wantsSave: boolean;
  historyId: string | null;
  cardCount: number;
}

/**
 * What to do when the AI store's `isGenerating` changes: "wait" (the job is running or never ran), "skip" (it ended
 * but there is nothing to save: cancelled, started elsewhere, or failed, which the store already toasted),
 * "save" (cards ready), "empty" (the job finished with a history entry but no card: no set must be made) or
 * "unsaved" (cards came back without a history entry to save them from: the user must be told, not left waiting).
 */
export function onJobEnd(end: JobEnd): "wait" | "skip" | "save" | "empty" | "unsaved" {
  if (!end.wasGenerating || end.isGenerating) return "wait";
  if (!end.wantsSave) return "skip";
  // No history entry: a failed job (the store toasted it), or cards that cannot be saved from history ("unsaved").
  if (!end.historyId) return end.cardCount > 0 ? "unsaved" : "skip";
  return end.cardCount > 0 ? "save" : "empty";
}

/**
 * True when starting a flashcard job would overwrite the job slot (`useJobStore.currentJobId`) of another
 * AI job, e.g. the quiz generator's, and orphan it. A flashcard job's own run (resumed jobs mark both stores) is not blocked.
 */
export function aiJobBlock(s: { testGenerating: boolean; flashcardGenerating: boolean; hasJob: boolean }): boolean {
  if (s.flashcardGenerating) return false;
  return s.testGenerating || s.hasJob;
}

/**
 * The toast for a set that could not be created. With no answer from the server (network cut, timeout) the set may
 * exist all the same, so the user is told to look at the list before trying again, or end up with two.
 */
export function createFailureMessage(error: unknown): { title: string; description: string } {
  const message = error instanceof Error ? error.message : "Vui lòng thử lại.";
  if (error instanceof ApiRequestError && error.status === undefined) {
    return { title: "Không rõ bộ thẻ đã được tạo chưa", description: `Máy chủ chưa trả lời (${message}). Hãy kiểm tra danh sách bộ thẻ trước khi tạo lại để tránh bị trùng.` };
  }
  return { title: "Tạo bộ thẻ thất bại", description: message };
}
