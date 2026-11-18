import { useCallback, useState } from "react";
import {
  type ExamChapter,
  type Picks,
  addChapter,
  defaultChapter,
  moveToChapter,
  pickInto,
  recolorChapter,
  removeChapter,
  renameChapter,
} from "@/lib/manage-exam/exam-chapters";
import type { PickedQuestion } from "@/lib/manage-exam/exam-question-picker";

/** Chapters built per file, the ticked questions with their chapter, and the chapter new ticks go into. */
export function useExamChapters() {
  const [chapters, setChapters] = useState<ExamChapter[]>([]);
  const [picked, setPicked] = useState<Picks>(() => new Map());
  const [active, setActive] = useState<Map<string, string>>(() => new Map());

  /** A file opened for the first time gets one chapter named after it. */
  const ensureFile = useCallback((fileId: string, filename: string) => {
    setChapters((prev) => (prev.some((c) => c.fileId === fileId) ? prev : [...prev, defaultChapter(fileId, filename, prev.length)]));
  }, []);

  const activeOf = (fileId: string) => {
    const id = active.get(fileId);
    return chapters.find((c) => c.id === id && c.fileId === fileId) ?? chapters.find((c) => c.fileId === fileId) ?? null;
  };

  const select = (fileId: string, chapterId: string) => setActive((prev) => new Map(prev).set(fileId, chapterId));

  const add = (fileId: string) => {
    const next = addChapter(chapters, fileId);
    const created = next.find((c) => !chapters.includes(c));
    setChapters(next);
    if (created) select(fileId, created.id);
  };

  const remove = (id: string) => {
    const out = removeChapter(chapters, picked, id);
    setChapters(out.chapters);
    setPicked(out.picked);
  };

  const pick = (fileId: string, items: PickedQuestion[], on: boolean) => {
    const chapter = activeOf(fileId);
    if (chapter) setPicked((prev) => pickInto(prev, items, chapter.id, on));
  };

  const reset = () => {
    setPicked(new Map());
    setActive(new Map());
    // The open file gets its default chapter back through `ensureFile`.
    setChapters([]);
  };

  return {
    chapters,
    picked,
    ensureFile,
    activeOf,
    select,
    add,
    rename: (id: string, name: string) => setChapters((prev) => renameChapter(prev, id, name)),
    recolor: (id: string, color: string) => setChapters((prev) => recolorChapter(prev, id, color)),
    remove,
    pick,
    move: (ids: string[], chapterId: string) => setPicked((prev) => moveToChapter(prev, ids, chapterId)),
    reset,
  };
}
