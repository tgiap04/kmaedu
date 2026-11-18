/**
 * The quiz set id an exam-room form may show and submit: only one that is still among the options and
 * whose room is not marked `sourceDeleted`. Anything else (a deleted set) is "" so the select shows its
 * placeholder instead of the raw id, and validation asks for a new choice.
 */
export function pickableQuizSetId(id: string | undefined, options: { id: string }[], sourceDeleted = false) {
  if (!id || sourceDeleted) return "";
  return options.some((o) => o.id === id) ? id : "";
}
