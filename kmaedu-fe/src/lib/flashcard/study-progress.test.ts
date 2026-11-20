import { describe, expect, it } from "vitest";
import { applyVerdict, studiedPercent } from "./study-progress";

describe("applyVerdict", () => {
  it("adds a remembered card and removes a forgotten one", () => {
    expect([...applyVerdict(new Set(["a"]), "b", "remembered").next]).toEqual(["a", "b"]);
    expect([...applyVerdict(new Set(["a", "b"]), "a", "forgotten").next]).toEqual(["b"]);
  });

  it("reports no change when the verdict matches what is stored", () => {
    expect(applyVerdict(new Set(["a"]), "a", "remembered").changed).toBe(false);
    expect(applyVerdict(new Set(["a"]), "b", "forgotten").changed).toBe(false);
    expect(applyVerdict(new Set(), "b", "remembered").changed).toBe(true);
  });

  it("never mutates the set it was given", () => {
    const before = new Set(["a"]);
    applyVerdict(before, "b", "remembered");
    applyVerdict(before, "a", "forgotten");
    expect([...before]).toEqual(["a"]);
  });
});

describe("studiedPercent", () => {
  it("counts only cards of this set and rounds the percent", () => {
    expect(studiedPercent(new Set(["a", "gone"]), ["a", "b", "c"])).toEqual({ count: 1, percent: 33 });
    expect(studiedPercent(new Set(["a", "b", "c"]), ["a", "b", "c"])).toEqual({ count: 3, percent: 100 });
  });

  it("is 0% for an empty set of cards", () => {
    expect(studiedPercent(new Set(["a"]), [])).toEqual({ count: 0, percent: 0 });
  });
});
