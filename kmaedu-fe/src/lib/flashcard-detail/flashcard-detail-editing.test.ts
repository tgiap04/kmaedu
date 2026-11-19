import { describe, expect, it } from "vitest";
import { frontToSave, nextTabIndex } from "./flashcard-detail";

describe("frontToSave", () => {
  it("keeps a bare-text front untouched when the input still shows the same text (no entity or line-break rewrite)", () => {
    expect(frontToSave("It&#x27;s &hellip;", "It&#x27;s &hellip;")).toBe("It&#x27;s &hellip;");
    expect(frontToSave("dòng 1\ndòng 2", "dòng 1 dòng 2")).toBe("dòng 1\ndòng 2");
  });
  it("writes the edited text as one escaped paragraph", () => {
    expect(frontToSave("Linux", "Linux kernel")).toBe("<p>Linux kernel</p>");
    expect(frontToSave("<p>a</p>", "a < b")).toBe("<p>a &lt; b</p>");
  });
  it("saves a new card's front as a paragraph, empty stays empty", () => {
    expect(frontToSave(null, "Linux")).toBe("<p>Linux</p>");
    expect(frontToSave(null, "  ")).toBe("");
  });
});

describe("nextTabIndex", () => {
  it("moves with the arrows and wraps around", () => {
    expect(nextTabIndex("ArrowRight", 0, 3)).toBe(1);
    expect(nextTabIndex("ArrowRight", 2, 3)).toBe(0);
    expect(nextTabIndex("ArrowLeft", 1, 3)).toBe(0);
    expect(nextTabIndex("ArrowLeft", 0, 3)).toBe(2);
  });
  it("jumps to the first and last tab", () => {
    expect(nextTabIndex("Home", 2, 3)).toBe(0);
    expect(nextTabIndex("End", 0, 3)).toBe(2);
  });
  it("ignores other keys and an empty list", () => {
    expect(nextTabIndex("Enter", 1, 3)).toBeNull();
    expect(nextTabIndex("a", 1, 3)).toBeNull();
    expect(nextTabIndex("ArrowRight", 0, 0)).toBeNull();
  });
});
