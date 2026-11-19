/** Orders the server can sort the set list by. */
export type SortKey = "recent" | "name" | "cards" | "views"

/** The set's category: sets carry no category field, so the first non-blank tag stands in; null when there is none. */
export function categoryLabel(tags: readonly string[] | null | undefined): string | null {
  for (const tag of tags ?? []) {
    const trimmed = tag.trim()
    if (trimmed) return trimmed
  }
  return null
}

/** Cards per set over the whole account, one decimal; 0 when there are no sets. */
export function averageCardsPerSet(totalCards: number, totalGroups: number): number {
  if (!Number.isFinite(totalCards) || !Number.isFinite(totalGroups) || totalGroups <= 0) return 0
  return Math.round((totalCards / totalGroups) * 10) / 10
}

/** First and last row number shown on a page ("Hiển thị a – b / total"); 0 – 0 for an empty list. */
export function visibleRange(page: number, perPage: number, total: number): { from: number; to: number } {
  if (total <= 0) return { from: 0, to: 0 }
  return { from: (page - 1) * perPage + 1, to: Math.min(page * perPage, total) }
}

/** Up to `size` page numbers, kept around the current page. */
export function pageNumbers(page: number, totalPages: number, size = 5): number[] {
  const count = Math.min(size, Math.max(totalPages, 0))
  const start = Math.min(Math.max(page - Math.floor(size / 2), 1), Math.max(totalPages - count + 1, 1))
  return Array.from({ length: count }, (_, i) => start + i)
}

/** After a delete: step back when the deleted set was the last row of a later page, otherwise load the page again. */
export function pageAfterDelete(rowsOnPage: number, page: number): { page: number; reload: boolean } {
  return rowsOnPage <= 1 && page > 1 ? { page: page - 1, reload: false } : { page, reload: true }
}

/** The page to show for a total: a page past the end (sets deleted elsewhere) becomes the last one. */
export function pageInRange(page: number, total: number, perPage: number): number {
  return Math.min(page, Math.max(1, Math.ceil(total / perPage)))
}

/** What the search box sends: the words without outer spaces; no search for a blank box. */
export function searchTerm(raw: string): string | undefined {
  return raw.trim() || undefined
}

/** A stat tile's value; a dash while the stats are unknown (not loaded yet, or the read failed), never a false 0. */
export function statText(value: number | null): string {
  return value === null ? "—" : value.toLocaleString("vi-VN")
}
