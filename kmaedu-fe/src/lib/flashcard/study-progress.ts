/** The learner's verdict on one card: remembered adds it to the studied set, forgotten takes it out. */
export type CardVerdict = "remembered" | "forgotten";

/**
 * The studied set after a verdict, and whether it changed (no change: nothing to save). Returns a new set;
 * the one passed in is never mutated.
 */
export function applyVerdict(studied: ReadonlySet<string>, cardId: string, verdict: CardVerdict): { next: Set<string>; changed: boolean } {
  const has = studied.has(cardId);
  if ((verdict === "remembered") === has) return { next: new Set(studied), changed: false };
  const next = new Set(studied);
  if (verdict === "remembered") next.add(cardId);
  else next.delete(cardId);
  return { next, changed: true };
}

/** Percent of cards studied, 0 for an empty set; only ids of cards still in the set count. */
export function studiedPercent(studied: ReadonlySet<string>, cardIds: readonly string[]): { count: number; percent: number } {
  const count = cardIds.filter((id) => studied.has(id)).length;
  return { count, percent: cardIds.length ? Math.round((count / cardIds.length) * 100) : 0 };
}
