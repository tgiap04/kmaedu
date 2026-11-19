import { describe, expect, it } from "vitest"
import { averageCardsPerSet, categoryLabel, pageAfterDelete, pageInRange, pageNumbers, searchTerm, statText, visibleRange } from "./flashcard-list-logic"

describe("categoryLabel", () => {
  it("uses the first tag, trimmed", () => {
    expect(categoryLabel(["  Mạng ", "Linux"])).toBe("Mạng")
  })

  it("skips blank tags and returns null when nothing usable is left", () => {
    expect(categoryLabel(["", "   ", "CSDL"])).toBe("CSDL")
    expect(categoryLabel([])).toBeNull()
    expect(categoryLabel(["  "])).toBeNull()
    expect(categoryLabel(undefined)).toBeNull()
    expect(categoryLabel(null)).toBeNull()
  })
})

describe("averageCardsPerSet", () => {
  it("divides cards by sets and rounds to one decimal", () => {
    expect(averageCardsPerSet(50, 12)).toBe(4.2)
    expect(averageCardsPerSet(10, 4)).toBe(2.5)
    expect(averageCardsPerSet(9, 3)).toBe(3)
  })

  it("is 0 when there are no sets (no division by zero) or the input is not usable", () => {
    expect(averageCardsPerSet(0, 0)).toBe(0)
    expect(averageCardsPerSet(12, 0)).toBe(0)
    expect(averageCardsPerSet(12, -1)).toBe(0)
    expect(averageCardsPerSet(Number.NaN, 3)).toBe(0)
  })
})

describe("visibleRange", () => {
  it("gives the first and last row number of the page", () => {
    expect(visibleRange(1, 10, 25)).toEqual({ from: 1, to: 10 })
    expect(visibleRange(2, 10, 25)).toEqual({ from: 11, to: 20 })
  })

  it("stops at the total on the last page", () => {
    expect(visibleRange(3, 10, 25)).toEqual({ from: 21, to: 25 })
    expect(visibleRange(1, 10, 1)).toEqual({ from: 1, to: 1 })
  })

  it("is 0 - 0 for an empty list", () => {
    expect(visibleRange(1, 10, 0)).toEqual({ from: 0, to: 0 })
  })
})

describe("pageNumbers", () => {
  it("lists every page when there are few", () => {
    expect(pageNumbers(1, 3)).toEqual([1, 2, 3])
    expect(pageNumbers(2, 5)).toEqual([1, 2, 3, 4, 5])
  })

  it("keeps a window of five around the current page", () => {
    expect(pageNumbers(1, 12)).toEqual([1, 2, 3, 4, 5])
    expect(pageNumbers(3, 12)).toEqual([1, 2, 3, 4, 5])
    expect(pageNumbers(6, 12)).toEqual([4, 5, 6, 7, 8])
    expect(pageNumbers(11, 12)).toEqual([8, 9, 10, 11, 12])
    expect(pageNumbers(12, 12)).toEqual([8, 9, 10, 11, 12])
  })

  it("is empty with no pages", () => {
    expect(pageNumbers(1, 0)).toEqual([])
  })
})

describe("pageAfterDelete", () => {
  it("steps back when the last row of a later page was deleted", () => expect(pageAfterDelete(1, 3)).toEqual({ page: 2, reload: false }))
  it("reloads the same page when rows remain", () => expect(pageAfterDelete(10, 2)).toEqual({ page: 2, reload: true }))
  it("reloads page 1 even when its last row went (there is no page 0)", () => expect(pageAfterDelete(1, 1)).toEqual({ page: 1, reload: true }))
})

describe("pageInRange", () => {
  it("keeps a page that still exists", () => expect(pageInRange(2, 25, 10)).toBe(2))
  it("moves a page past the end to the last page", () => expect(pageInRange(4, 25, 10)).toBe(3))
  it("is page 1 when nothing is left", () => expect(pageInRange(3, 0, 10)).toBe(1))
  it("keeps the last page when it is exactly full", () => expect(pageInRange(3, 30, 10)).toBe(3))
})

describe("searchTerm", () => {
  it("drops the spaces around the words", () => expect(searchTerm("  toán 10 ")).toBe("toán 10"))
  it("is no search for a blank box", () => {
    expect(searchTerm("")).toBeUndefined()
    expect(searchTerm("   ")).toBeUndefined()
  })
})

describe("statText", () => {
  it("writes a number the Vietnamese way", () => expect(statText(1234)).toBe("1.234"))
  it("shows a dash, not 0, while the stats are unknown (not loaded or failed)", () => expect(statText(null)).toBe("—"))
})
