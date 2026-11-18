import { chapterColorAt, isChapterColor } from "./chapter-colors";
import { type ExamChapterGroup, type PickedQuestion, chapterFromFilename, shuffled } from "./exam-question-picker";

/** A chapter the user builds inside one source file; it becomes a label (chương) of the new exam. */
export interface ExamChapter {
  /** `<fileId>#<n>`, unique on the page. */
  id: string;
  fileId: string;
  name: string;
  /** #rrggbb, saved as the label colour. */
  color: string;
}

export type ChapterPick = PickedQuestion & { chapterId: string };
export type Picks = Map<string, ChapterPick>;

const NAME_MAX = 100;

/** Labels are unique per exam, so chapters whose names match (trimmed, any case) end up as one label. */
const mergeKey = (name: string) => name.trim().toLocaleLowerCase("vi");
const suffix = (id: string) => Number(id.slice(id.lastIndexOf("#") + 1)) || 0;

/** `index` (how many chapters exist already) picks the palette colour, so files start in different colours. */
export function defaultChapter(fileId: string, filename: string, index = 0): ExamChapter {
  return { id: `${fileId}#1`, fileId, name: chapterFromFilename(filename), color: chapterColorAt(index) };
}

/** Adds "Chương N" to the file, right after the file's other chapters; N skips names the file already uses. */
export function addChapter(chapters: ExamChapter[], fileId: string): ExamChapter[] {
  const own = chapters.filter((c) => c.fileId === fileId);
  const next = Math.max(0, ...own.map((c) => suffix(c.id))) + 1;
  const used = new Set(own.map((c) => mergeKey(c.name)));
  let n = own.length + 1;
  while (used.has(mergeKey(`Chương ${n}`))) n++;
  const chapter = { id: `${fileId}#${next}`, fileId, name: `Chương ${n}`, color: chapterColorAt(chapters.length) };
  const lastIndex = chapters.findLastIndex((c) => c.fileId === fileId);
  const at = lastIndex === -1 ? chapters.length : lastIndex + 1;
  return [...chapters.slice(0, at), chapter, ...chapters.slice(at)];
}

export function recolorChapter(chapters: ExamChapter[], id: string, color: string): ExamChapter[] {
  if (!isChapterColor(color)) return chapters;
  return chapters.map((c) => (c.id === id ? { ...c, color } : c));
}

export function renameChapter(chapters: ExamChapter[], id: string, name: string): ExamChapter[] {
  const clean = name.trim().slice(0, NAME_MAX);
  if (!clean) return chapters;
  return chapters.map((c) => (c.id === id ? { ...c, name: clean } : c));
}

/** Ticks (`on`) into `chapterId`, or unticks; a question already ticked keeps its chapter. */
export function pickInto(picked: Picks, items: PickedQuestion[], chapterId: string, on: boolean): Picks {
  const next = new Map(picked);
  for (const item of items) {
    if (!on) next.delete(item.id);
    else if (!next.has(item.id)) next.set(item.id, { ...item, chapterId });
  }
  return next;
}

export function moveToChapter(picked: Picks, ids: string[], chapterId: string): Picks {
  const next = new Map(picked);
  for (const id of ids) {
    const p = next.get(id);
    if (p) next.set(id, { ...p, chapterId });
  }
  return next;
}

/** Removes a chapter, moving its questions to the file's first other chapter; a file's last chapter stays. */
export function removeChapter(chapters: ExamChapter[], picked: Picks, id: string) {
  const target = chapters.find((c) => c.id === id);
  const fallback = target && chapters.find((c) => c.fileId === target.fileId && c.id !== id);
  if (!fallback) return { chapters, picked };
  const moved = [...picked.values()].filter((p) => p.chapterId === id).map((p) => p.id);
  return { chapters: chapters.filter((c) => c.id !== id), picked: moveToChapter(picked, moved, fallback.id) };
}

/**
 * Save plan: one group per chapter name in chapter order (equal names merge, empty chapters are
 * skipped), questions in pick order inside; `random` shuffles inside a group only.
 */
export function groupForExam(picked: ChapterPick[], chapters: ExamChapter[], random?: () => number): ExamChapterGroup[] {
  const groups = new Map<string, ExamChapterGroup>();
  for (const chapter of chapters) {
    const quizzes = picked
      .filter((p) => p.chapterId === chapter.id)
      .map((p) => ({ question: p.question, options: p.options, answer: p.answer }));
    if (quizzes.length === 0) continue;
    const key = mergeKey(chapter.name);
    const group = groups.get(key);
    if (group) group.quizzes.push(...quizzes);
    else groups.set(key, { name: chapter.name.trim(), color: chapter.color, quizzes });
  }
  const out = [...groups.values()];
  return random ? out.map((g) => ({ ...g, quizzes: shuffled(g.quizzes, random) })) : out;
}

/** Per chapter: how many questions it holds and whether another chapter shares its name. */
export function chapterSummary(chapters: ExamChapter[], picked: Picks) {
  const counts = new Map<string, number>();
  for (const p of picked.values()) counts.set(p.chapterId, (counts.get(p.chapterId) ?? 0) + 1);
  const names = new Map<string, number>();
  for (const c of chapters) names.set(mergeKey(c.name), (names.get(mergeKey(c.name)) ?? 0) + 1);
  return chapters.map((chapter) => ({
    chapter,
    count: counts.get(chapter.id) ?? 0,
    merged: (names.get(mergeKey(chapter.name)) ?? 0) > 1,
  }));
}
