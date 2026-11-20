import { describe, expect, it } from "vitest";
import { searchTarget } from "./header-search";

describe("searchTarget", () => {
  it("goes to the materials page for an empty query", () => {
    expect(searchTarget("   ")).toBe("/k/my-materials");
  });

  it("guesses the page from a keyword", () => {
    expect(searchTarget("Flashcard Linux")).toBe("/k/flash-card?search=Flashcard%20Linux");
    expect(searchTarget("phòng thi")).toBe(`/k/manage-exam-room?search=${encodeURIComponent("phòng thi")}`);
    expect(searchTarget("đề cuối kỳ")).toBe(`/k/manage-exam?search=${encodeURIComponent("đề cuối kỳ")}`);
    expect(searchTarget(" mạng máy tính ")).toBe(`/k/my-materials?search=${encodeURIComponent("mạng máy tính")}`);
  });
});
