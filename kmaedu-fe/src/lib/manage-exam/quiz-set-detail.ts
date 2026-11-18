import type { QuizOption, Quizz, QuizSetLabel } from "@/types/quizset";
import type { ExamChapterGroup } from "./exam-question-picker";
import { fold, isSavableQuiz } from "./exam-question-picker";

/** Filter key of the questions without a chapter (label). */
export const NO_LABEL = "__none__";
export type LabelFilter = "all" | string;

const TITLE_MAX = 200;
const COPY_SUFFIX = " (bản sao)";
const ENTITIES: Record<string, string> = { "&nbsp;": " ", "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": "\"", "&#39;": "'" };

/** Rich-text HTML as one line of text, for search, row titles and editing options. */
export function plainText(html: string) {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&(?:nbsp|amp|lt|gt|quot|#39);/g, (e) => ENTITIES[e])
    .replace(/\s+/g, " ")
    .trim();
}

const optionText = (o: QuizOption) => (typeof o === "string" ? o : o?.text ?? o?.content ?? o?.value ?? "");
const labelOf = (q: Quizz) => q.label?.id ?? q.labelId ?? null;

export function filterSetQuestions(list: Quizz[], chapter: LabelFilter, search: string) {
  const needle = fold(search.trim());
  return list.filter((q) => {
    const id = labelOf(q);
    if (chapter === NO_LABEL && id) return false;
    if (chapter !== "all" && chapter !== NO_LABEL && id !== chapter) return false;
    return !needle || fold(plainText(q.question)).includes(needle);
  });
}

/**
 * Save plan that rebuilds a set elsewhere (Sao chép): one group per label in label order (empty
 * chapters included), unlabeled last. A question the save API would reject is left out whole.
 */
export function groupsFromSet(list: Quizz[], labels: QuizSetLabel[]): ExamChapterGroup[] {
  const ordered = [...labels].sort((a, b) => a.order - b.order || a.name.localeCompare(b.name, "vi"));
  const known = new Set(ordered.map((l) => l.id));
  const savable = list
    .map((q) => ({ label: labelOf(q), quiz: { question: q.question, options: (q.options ?? []).map(optionText), answer: q.answer } }))
    .filter((x) => isSavableQuiz(x.quiz));
  const groups: ExamChapterGroup[] = ordered.map((l) => ({
    name: l.name,
    color: l.color ?? null,
    quizzes: savable.filter((x) => x.label === l.id).map((x) => x.quiz),
  }));
  const rest = savable.filter((x) => !known.has(x.label ?? "")).map((x) => x.quiz);
  return rest.length > 0 ? [...groups, { name: null, quizzes: rest }] : groups;
}

/** An option being edited: what is stored, and the plain text shown in the input. */
export interface OptionDraft {
  original: string;
  text: string;
}

export function optionDrafts(options: QuizOption[]): OptionDraft[] {
  return options.map((o) => {
    const original = optionText(o);
    return { original, text: plainText(original) };
  });
}

export type DraftResult =
  | { ok: true; data: { question: string; options: string[]; answer: string; labelId: string | null } }
  | { ok: false; error: string };

/**
 * Payload for the question API. An option left untouched keeps its stored value (formatting included);
 * an edited one is saved as typed. Empty options are dropped and the answer letter follows its option.
 */
export function draftPayload(question: string, drafts: OptionDraft[], correct: number | null, labelId: string | null): DraftResult {
  if (!plainText(question)) return { ok: false, error: "Nhập nội dung câu hỏi." };
  const kept = drafts
    .map((d, i) => ({ i, value: d.original && d.text === plainText(d.original) ? d.original : d.text.trim() }))
    .filter((k) => plainText(k.value));
  if (kept.length < 2) return { ok: false, error: "Cần ít nhất 2 đáp án." };
  const at = correct === null ? -1 : kept.findIndex((k) => k.i === correct);
  if (at === -1) return { ok: false, error: "Chọn đáp án đúng." };
  return { ok: true, data: { question, options: kept.map((k) => k.value), answer: String.fromCharCode(65 + at), labelId } };
}

export function copyTitle(title: string) {
  return `${title.trim().slice(0, TITLE_MAX - COPY_SUFFIX.length).trimEnd()}${COPY_SUFFIX}`;
}

/** Questions per label id, plus how many have no label. */
export function chapterCounts(list: Quizz[]) {
  const byLabel = new Map<string, number>();
  let unlabeled = 0;
  for (const q of list) {
    const id = labelOf(q);
    if (id) byLabel.set(id, (byLabel.get(id) ?? 0) + 1);
    else unlabeled++;
  }
  return { byLabel, unlabeled };
}

/**
 * The set's questions in the order the paged question API uses (oldest first, then id). The detail
 * endpoint returns them unordered, and labelling questions can reshuffle that order.
 */
export function sortSetQuestions(list: Quizz[]): Quizz[] {
  return [...list].sort((a, b) => (a.createdAt ?? "").localeCompare(b.createdAt ?? "") || a.id.localeCompare(b.id));
}
