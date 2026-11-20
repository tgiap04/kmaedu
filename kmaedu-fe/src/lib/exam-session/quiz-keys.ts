export type QuizKeyAction = { type: "select"; letter: string } | { type: "prev" } | { type: "next" };

/**
 * What a key press does on the quiz page: A, B, C… pick that option (only letters the question has),
 * ← / → move between questions. Keys with a modifier, a held key repeating, and keys typed into a field do nothing.
 */
export function quizKeyAction(
  e: { key: string; altKey?: boolean; ctrlKey?: boolean; metaKey?: boolean; repeat?: boolean; target?: EventTarget | null },
  optionCount: number,
): QuizKeyAction | null {
  if (e.altKey || e.ctrlKey || e.metaKey || e.repeat) return null;
  const el = e.target as HTMLElement | null;
  if (el && (el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(el.tagName))) return null;
  if (e.key === "ArrowLeft") return { type: "prev" };
  if (e.key === "ArrowRight") return { type: "next" };
  if (e.key.length !== 1) return null;
  const index = e.key.toUpperCase().charCodeAt(0) - 65;
  return index >= 0 && index < optionCount ? { type: "select", letter: String.fromCharCode(65 + index) } : null;
}
