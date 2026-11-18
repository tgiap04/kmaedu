import type { Quizz } from "@/types/exam";

/** A generated question ticked for the new exam, copied out of its file (so it survives switching files). */
export interface PickedQuestion {
  /** `<historyId>:<index in that history>` — generated questions have no id of their own. */
  id: string;
  question: string;
  options: string[];
  answer: string;
  /** Chapter (label) name the question gets in the exam: its file's name. */
  chapter: string;
  fileId: string;
  source: string;
}

export interface QuizSourceFile {
  id: string;
  historyId: string;
  filename: string;
}

export interface ExamChapterGroup {
  name: string | null;
  /** Label colour (#rrggbb) for a named group. */
  color?: string | null;
  quizzes: Quizz[];
}

const LABEL_MAX = 100;

/** Lower case, no Vietnamese accents (đ → d), so "he dieu" finds "Hệ điều hành". */
export const fold = (text: string) => text.normalize("NFD").replace(/\p{M}/gu, "").replace(/đ/gi, "d").toLowerCase();

/** "Bài giảng.pdf" → "Bài giảng", cut to the label limit; a name that is only an extension is kept. */
export function chapterFromFilename(filename: string) {
  const name = filename.trim();
  const base = name.replace(/\.[^.\s]+$/, "").trim();
  return (base || name).slice(0, LABEL_MAX) || "Chương 1";
}

/** Whether the save API takes the question: text, an answer and at least two non-empty text options. */
export function isSavableQuiz(q: { question?: unknown; answer?: unknown; options?: unknown }): q is { question: string; answer: string; options: string[] } {
  return (
    typeof q.question === "string" && !!q.question.trim()
    && typeof q.answer === "string" && !!q.answer.trim()
    && Array.isArray(q.options) && q.options.length >= 2
    && q.options.every((o) => typeof o === "string" && o.trim() !== "")
  );
}

/** The file's generated quizzes as pickable questions; ones the save API would reject are left out. */
export function fileQuestions(file: QuizSourceFile, quizzes: Quizz[]): PickedQuestion[] {
  const chapter = chapterFromFilename(file.filename);
  const out: PickedQuestion[] = [];
  quizzes.forEach((q, i) => {
    if (!isSavableQuiz(q)) return;
    out.push({ id: `${file.historyId}:${i}`, question: q.question, options: q.options, answer: q.answer, chapter, fileId: file.id, source: file.filename });
  });
  return out;
}

export function filterQuestions(list: PickedQuestion[], search: string) {
  const needle = fold(search.trim());
  return needle ? list.filter((q) => fold(q.question).includes(needle)) : list;
}

/** Fisher–Yates on a copy; `random` is injectable for tests. */
export function shuffled<T>(list: T[], random: () => number = Math.random): T[] {
  const out = [...list];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}
