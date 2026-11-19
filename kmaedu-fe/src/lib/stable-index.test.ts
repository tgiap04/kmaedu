import { describe, expect, it } from "vitest"
import { stableIndex } from "./stable-index"

describe("stableIndex", () => {
  it("gives the same slot for the same id, always a whole number in range", () => {
    for (const id of ["", "a", "room-1", "clx9z0abc000108l4", "x".repeat(500)]) {
      const slot = stableIndex(id, 6)
      expect(stableIndex(id, 6)).toBe(slot)
      expect(Number.isInteger(slot)).toBe(true)
      expect(slot).toBeGreaterThanOrEqual(0)
      expect(slot).toBeLessThan(6)
    }
  })

  it("spreads different ids over several slots", () => {
    const slots = new Set(Array.from({ length: 30 }, (_, i) => stableIndex(`room-${i}`, 6)))
    expect(slots.size).toBeGreaterThan(2)
  })
})
