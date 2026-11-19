import { plainText } from "@/lib/manage-exam/quiz-set-detail";
import type { QuizOptionLike } from "@/lib/quizAnswerUtils";
import type { Quizz } from "@/types/quizset";

export interface CardDraft {
  question: string;
  answer: string;
}

const LETTERS = "ABCD";
const plain = (html: string) => plainText(html).toLowerCase();
const hasContent = (html: string) => plain(html) !== "" || /<img\b/i.test(html);
const rawText = (option: QuizOptionLike) => (typeof option === "string" ? option : (option?.text ?? option?.content ?? option?.value ?? ""));
/** "A. ", "b) ", "C: " in front of the i-th option (bare or in its first paragraph), for that option's own letter. */
const labelOf = (index: number) => new RegExp(`^(<p>)?${LETTERS[index]}[.):]\\s+`, "i");

/**
 * The options' own words. Labels are dropped only when every option carries the label of its place (A, B, C… or
 * a, b, c…) with punctuation and a space; otherwise "A stack…", "D day", "A.I." or "d) …" are words of the answer.
 */
function optionTexts(options: QuizOptionLike[]): string[] {
  const texts = options.map(rawText);
  const labelled = texts.length <= LETTERS.length && texts.every((text, i) => labelOf(i).test(text));
  return labelled ? texts.map((text, i) => text.replace(labelOf(i), "$1")) : texts;
}

/** Index of the correct option: the answer is a letter (A–D) or the text of an option; -1 when neither fits. */
function correctIndex(answer: string, options: string[]): number {
  const trimmed = answer.trim();
  const letter = /^([A-D])[.):]?$/i.exec(trimmed);
  if (letter) {
    const index = LETTERS.indexOf(letter[1].toUpperCase());
    if (index < options.length) return index;
  }
  const wanted = plain(trimmed.replace(/^[A-D][.):]\s+/i, ""));
  if (!wanted) return -1;
  return options.findIndex((option) => plain(option) === wanted);
}

/**
 * A quiz question becomes a card: the question is the front, the text of the correct option the back.
 * HTML is kept as stored (cards render it the same way). Questions that are empty or whose correct
 * option cannot be found are left out and counted in `skipped`.
 */
export function quizzesToFlashcards(quizzes: Quizz[]): { cards: CardDraft[]; skipped: number } {
  const cards: CardDraft[] = [];
  let skipped = 0;
  for (const quiz of quizzes) {
    const question = typeof quiz?.question === "string" ? quiz.question.trim() : "";
    const options = optionTexts(Array.isArray(quiz?.options) ? quiz.options : []);
    const index = typeof quiz?.answer === "string" && options.length >= 2 ? correctIndex(quiz.answer, options) : -1;
    const answer = index >= 0 ? options[index].trim() : "";
    if (hasContent(question) && hasContent(answer)) cards.push({ question, answer });
    else skipped += 1;
  }
  return { cards, skipped };
}
