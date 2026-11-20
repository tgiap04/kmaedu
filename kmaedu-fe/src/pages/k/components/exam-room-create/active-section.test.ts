import { describe, expect, it } from "vitest";
import { activeSectionIndex } from "./active-section";

// The reading line sits just under the sticky stepper (here at 160px from the top of the viewport).
const LINE = 160;

describe("activeSectionIndex", () => {
  it("marks the first card before anything has scrolled past the line", () => {
    expect(activeSectionIndex([260, 700, 1100], LINE, false)).toBe(0);
  });

  it("marks the last card whose top has reached the line", () => {
    expect(activeSectionIndex([-300, 120, 600], LINE, false)).toBe(1);
    expect(activeSectionIndex([-900, -400, LINE], LINE, false)).toBe(2);
  });

  it("marks the last card at the bottom of the page, even when it never reaches the line", () => {
    expect(activeSectionIndex([-500, 80, 420], LINE, true)).toBe(2);
  });

  it("ignores cards that are not mounted", () => {
    expect(activeSectionIndex([-200, null, 500], LINE, false)).toBe(0);
    expect(activeSectionIndex([null, null, null], LINE, true)).toBe(0);
  });
});
