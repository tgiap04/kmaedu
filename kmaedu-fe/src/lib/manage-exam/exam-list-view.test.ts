import { describe, expect, it } from "vitest";
import { pageWindow, resultRange, toggleAll, toggleOne, bulkDeleteSummary } from "./exam-list-view";

describe("pageWindow", () => {
  it("lists every page when there are few", () => {
    expect(pageWindow(1, 3)).toEqual([1, 2, 3]);
  });
  it("is empty when there are no pages", () => {
    expect(pageWindow(1, 0)).toEqual([]);
  });
  it("keeps three pages around the current one", () => {
    expect(pageWindow(1, 10)).toEqual([1, 2, 3]);
    expect(pageWindow(5, 10)).toEqual([4, 5, 6]);
    expect(pageWindow(10, 10)).toEqual([8, 9, 10]);
  });
});

describe("resultRange", () => {
  it("returns the first and last row index shown", () => {
    expect(resultRange(1, 10, 12)).toEqual({ from: 1, to: 10 });
    expect(resultRange(2, 10, 12)).toEqual({ from: 11, to: 12 });
  });
  it("returns zeros when there is nothing", () => {
    expect(resultRange(1, 10, 0)).toEqual({ from: 0, to: 0 });
  });
});

describe("selection", () => {
  it("adds and removes one id", () => {
    expect(toggleOne(new Set(["a"]), "b")).toEqual(new Set(["a", "b"]));
    expect(toggleOne(new Set(["a", "b"]), "a")).toEqual(new Set(["b"]));
  });
  it("selects every visible id, or clears them when all are selected", () => {
    expect(toggleAll(new Set(["a"]), ["a", "b"])).toEqual(new Set(["a", "b"]));
    expect(toggleAll(new Set(["a", "b", "x"]), ["a", "b"])).toEqual(new Set(["x"]));
  });
  it("leaves the set alone when the page is empty", () => {
    expect(toggleAll(new Set(["x"]), [])).toEqual(new Set(["x"]));
  });
});

describe("bulkDeleteSummary", () => {
  it("one success line when everything went", () => {
    expect(bulkDeleteSummary(3, 3)).toEqual({ kind: "success", text: "Đã xóa 3 đề thi" });
    expect(bulkDeleteSummary(1, 1)).toEqual({ kind: "success", text: "Đã xóa đề thi" });
  });
  it("a warning with the count when only part went", () => {
    expect(bulkDeleteSummary(2, 3)).toEqual({ kind: "warning", text: "Đã xóa 2/3 đề thi, phần còn lại thất bại" });
  });
  it("nothing extra when none went (each failure was already reported) or nothing was asked", () => {
    expect(bulkDeleteSummary(0, 3)).toBeNull();
    expect(bulkDeleteSummary(0, 0)).toBeNull();
  });
});
