export const CARD_COUNT_MIN = 1;
/** The backend's cap on cards per AI job (MAX_GENERATE_ITEMS). */
export const CARD_COUNT_MAX = 50;
export const TITLE_MAX = 200;
export const TAG_MAX = 10;
export const TAG_LENGTH_MAX = 30;
/** Cards per request: the backend adds a request's cards in one transaction (5 s limit). */
export const BATCH_SIZE = 50;
/** Bytes of card text per request: content-service parses JSON bodies up to 100 KB (Nest's default), with room for the rest. */
export const BATCH_BYTES = 60_000;

const TITLE_SUFFIX = " - Flashcard";

export function clampCardCount(value: number): number {
  if (!Number.isFinite(value)) return CARD_COUNT_MIN;
  return Math.min(CARD_COUNT_MAX, Math.max(CARD_COUNT_MIN, Math.floor(value)));
}

export const stepCardCount = (current: number, delta: number) => clampCardCount(current + delta);

/** "Bài giảng.pdf" → "Bài giảng" (a name that is only an extension is kept). */
export function titleFromFilename(filename: string): string {
  const name = filename.trim();
  const base = name.replace(/\.[^.\s]+$/, "").trim();
  return (base || name).slice(0, TITLE_MAX);
}

/** "Hệ điều hành" → "Hệ điều hành - Flashcard", the quiz part cut so the whole stays within the limit. */
export function titleFromQuiz(quizTitle: string): string {
  const name = quizTitle.trim();
  return name ? `${name.slice(0, TITLE_MAX - TITLE_SUFFIX.length)}${TITLE_SUFFIX}` : "";
}

export function validateTitle(title: string): string | undefined {
  if (!title.trim()) return "Vui lòng nhập tên bộ thẻ";
  if (title.trim().length > TITLE_MAX) return `Tên bộ thẻ không được vượt quá ${TITLE_MAX} ký tự`;
  return undefined;
}

/** The tag list with `raw` added: trimmed, cut to the length limit, no duplicate (any case), at most TAG_MAX. */
export function addTag(tags: string[], raw: string): string[] {
  const tag = raw.trim().slice(0, TAG_LENGTH_MAX).trim();
  if (!tag || tags.length >= TAG_MAX) return tags;
  if (tags.some((t) => t.toLowerCase() === tag.toLowerCase())) return tags;
  return [...tags, tag];
}

const utf8 = new TextEncoder();

/** Cards cut into requests by count and by size; a card bigger than the budget goes alone (the server decides). */
export function batchCards<T extends { question: string; answer: string }>(cards: T[], maxCount: number, maxBytes: number): T[][] {
  const out: T[][] = [];
  let batch: T[] = [];
  let bytes = 0;
  for (const card of cards) {
    const size = utf8.encode(card.question).length + utf8.encode(card.answer).length;
    if (batch.length > 0 && (batch.length >= maxCount || bytes + size > maxBytes)) {
      out.push(batch);
      batch = [];
      bytes = 0;
    }
    batch.push(card);
    bytes += size;
  }
  if (batch.length > 0) out.push(batch);
  return out;
}


export const DESCRIPTION_MAX = 1000;

/** Description of a set made from a file or a quiz set, so the new set says where its cards came from. */
export function sourceDescription(kind: "document" | "quiz", name: string): string {
  const label = name.trim();
  if (!label) return "";
  const text = kind === "document" ? `Tạo từ tài liệu "${label}"` : `Tạo từ bộ quiz "${label}"`;
  return text.slice(0, DESCRIPTION_MAX);
}
