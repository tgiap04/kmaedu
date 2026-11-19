import { appendUnique } from "@/lib/append-unique";
import { fold } from "@/lib/manage-exam/exam-question-picker";
import { plainText } from "@/lib/manage-exam/quiz-set-detail";
import type { Flashcard } from "@/types/flashcardSet";

/** The detail page's estimate of how long one card takes to study (50 cards = 30 phút). */
export const SECONDS_PER_CARD = 36;
export const ALL_CARDS = "all";
/** Same key the cards API takes for the cards without a label. */
export const UNLABELED = "unlabeled";
/** Largest page the cards API serves. */
export const PAGE_LIMIT = 100;

/** "30 phút", "1 giờ", "1 giờ 5 phút": study time of a set, rounded to the minute. */
export function formatStudyTime(cardCount: number): string {
  const cards = Number.isFinite(cardCount) ? Math.max(0, Math.floor(cardCount)) : 0;
  const minutes = Math.round((cards * SECONDS_PER_CARD) / 60);
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  if (hours === 0) return `${rest} phút`;
  return rest === 0 ? `${hours} giờ` : `${hours} giờ ${rest} phút`;
}

/** How many distinct cards of the set the viewer studied (ids of deleted cards do not count). */
export function studiedCount(studiedIds: string[], cardIds: string[]): number {
  const current = new Set(cardIds);
  return new Set(studiedIds.filter((id) => current.has(id))).size;
}

/** Share of the set's cards the viewer has studied, in whole percent; null when there is nothing to show. */
export function completionRate(studiedIds: string[], cardIds: string[]): number | null {
  const studied = studiedCount(studiedIds, cardIds);
  return studied === 0 ? null : Math.round((studied / new Set(cardIds).size) * 100);
}

/** Cards of one label (or none / all) whose front or back contains the search words (accents and tags ignored). */
export function filterCards(list: Flashcard[], label: string, search: string): Flashcard[] {
  const needle = fold(search.trim());
  return list.filter((c) => {
    if (label === UNLABELED && c.label) return false;
    if (label !== ALL_CARDS && label !== UNLABELED && c.label?.id !== label) return false;
    return !needle || fold(plainText(c.question)).includes(needle) || fold(plainText(c.answer)).includes(needle);
  });
}

/** How many cards each label holds, and how many have none: the same split `filterCards` filters by. */
export function labelCounts(list: Flashcard[]): { byLabel: Map<string, number>; unlabeled: number } {
  const byLabel = new Map<string, number>();
  let unlabeled = 0;
  for (const c of list) {
    if (c.label) byLabel.set(c.label.id, (byLabel.get(c.label.id) ?? 0) + 1);
    else unlabeled++;
  }
  return { byLabel, unlabeled };
}

/** The cards after a label of the set changed: a renamed / recoloured label is shown anew, a deleted one is taken off. */
export function relabelCards(list: Flashcard[], labelId: string, label: Flashcard["label"] | null): Flashcard[] {
  return list.map((c) => (c.label?.id === labelId ? { ...c, label: label ?? undefined } : c));
}

/** One page of a list; a page outside the range is clamped, an empty list still has one (empty) page. */
export function pageOf<T>(list: T[], page: number, perPage: number) {
  const totalPages = Math.max(1, Math.ceil(list.length / perPage));
  const at = Math.min(Math.max(1, page), totalPages);
  return { rows: list.slice((at - 1) * perPage, at * perPage), page: at, totalPages };
}

/** True when a face is empty, bare text or a single plain paragraph, so a text input can edit it without losing formatting. */
export function isSimpleHtml(html: string): boolean {
  return /^(?:<p>[^<]*<\/p>)?$/.test(html.trim()) || !html.includes("<");
}

/** What a text input saves: the text escaped inside one paragraph (empty text stays empty). */
export function textToHtml(text: string): string {
  const value = text.trim();
  if (!value) return "";
  return `<p>${value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>`;
}

/** The cards of a set as the bulk-add API takes them; a card with an empty face would be rejected, so it is left out. */
export function copyPayload(cards: Flashcard[]): { question: string; answer: string }[] {
  return cards.filter((c) => c.question.trim() && c.answer.trim()).map((c) => ({ question: c.question, answer: c.answer }));
}

/**
 * The front a text input saves. A front the user did not touch is kept byte for byte: the input shows it
 * through `plainText`, which would otherwise rewrite entities and line breaks of an old bare-text card.
 */
export function frontToSave(original: string | null, text: string): string {
  if (original !== null && text === plainText(original)) return original;
  return textToHtml(text);
}

/** Page reads in flight at once when a whole set is loaded (the gateway allows 100 requests a minute). */
export const COLLECT_CONCURRENCY = 3;

type CardsPage = { flashCards: Flashcard[]; pagination: { totalPages: number } };

/**
 * Every card of a set: page 1 tells how many pages there are, the rest are read a few at a time and joined in
 * page order. A card a later page returns again is dropped (the server's order between equal `createdAt`
 * values is not guaranteed across two offset reads), so the list never shows or copies a card twice.
 * `stop` ends a read nobody wants any more (a newer one replaced it): no further page is asked for, and what
 * it returns is partial, for the caller to drop.
 */
export async function collectPages(fetchPage: (page: number, limit: number) => Promise<CardsPage>, stop: () => boolean = () => false): Promise<Flashcard[]> {
  const first = await fetchPage(1, PAGE_LIMIT);
  const rest: Flashcard[][] = Array.from({ length: Math.max(0, first.pagination.totalPages - 1) }, () => []);
  let next = 0;
  let failed = false; // the first failed read stops every worker: no more requests toward a rate limit
  const worker = async () => {
    while (!failed && !stop() && next < rest.length) {
      const at = next++;
      try {
        rest[at] = (await fetchPage(at + 2, PAGE_LIMIT)).flashCards;
      } catch (error) {
        failed = true;
        throw error;
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(COLLECT_CONCURRENCY, rest.length) }, worker));
  return appendUnique([], [...first.flashCards, ...rest.flat()], (c) => c.id);
}

/** A face has something to show: text, or an image (the empty editor saves "<p></p>"). */
export function hasContent(html: string): boolean {
  return plainText(html) !== "" || /<img\b/i.test(html);
}

/** At most five page numbers, kept around the current page. */
export function pageNumbers(page: number, total: number): number[] {
  const size = Math.min(5, Math.max(0, total));
  const start = Math.min(Math.max(1, page - 2), Math.max(1, total - size + 1));
  return Array.from({ length: size }, (_, i) => start + i);
}

/** Index of the tab a key moves to in a tablist of `count` tabs (arrows wrap, Home / End jump); null for any other key. */
export function nextTabIndex(key: string, current: number, count: number): number | null {
  if (count <= 0) return null;
  if (key === "ArrowRight") return (current + 1) % count;
  if (key === "ArrowLeft") return (current - 1 + count) % count;
  if (key === "Home") return 0;
  if (key === "End") return count - 1;
  return null;
}
