import { describe, expect, it } from "vitest";
import { applyLabelChange, filterLabels, findLabelByName, nextLabelOrder, orderLabels, resolveSubmit } from "./label-picker";

const label = (id: string, name: string, order = 0, createdAt = "2026-01-01T00:00:00Z") => ({ id, name, order, createdAt });

describe("orderLabels", () => {
  it("sorts by order, then by creation time for equal orders", () => {
    const list = [label("c", "C", 1), label("b", "B", 0, "2026-02-01T00:00:00Z"), label("a", "A", 0, "2026-01-01T00:00:00Z")];
    expect(orderLabels(list).map((l) => l.id)).toEqual(["a", "b", "c"]);
  });
  it("leaves the given list untouched", () => {
    const list = [label("b", "B", 1), label("a", "A", 0)];
    orderLabels(list);
    expect(list.map((l) => l.id)).toEqual(["b", "a"]);
  });
});

describe("filterLabels", () => {
  const list = [label("1", "Chương 1"), label("2", "Từ vựng Unit 2"), label("3", "Đại số")];
  it("keeps every label for an empty or blank query", () => {
    expect(filterLabels(list, "")).toHaveLength(3);
    expect(filterLabels(list, "   ")).toHaveLength(3);
  });
  it("matches part of the name, ignoring case and accents", () => {
    expect(filterLabels(list, "chuong").map((l) => l.id)).toEqual(["1"]);
    expect(filterLabels(list, "UNIT").map((l) => l.id)).toEqual(["2"]);
    expect(filterLabels(list, "dai").map((l) => l.id)).toEqual(["3"]);
  });
  it("ignores spaces around the query", () => expect(filterLabels(list, "  vựng ").map((l) => l.id)).toEqual(["2"]));
  it("is empty when nothing matches", () => expect(filterLabels(list, "hình học")).toEqual([]));
});

describe("findLabelByName", () => {
  const list = [label("1", "Ngữ pháp"), label("2", "Cá"), label("3", "Unit 1")];
  it("finds the label with the same name, ignoring case and outer spaces", () => {
    expect(findLabelByName(list, "  unit 1 ")?.id).toBe("3");
    expect(findLabelByName(list, "NGỮ PHÁP")?.id).toBe("1");
  });
  it("tells apart names that differ only by their accents", () => expect(findLabelByName(list, "Ca")).toBeUndefined());
  it("takes the label written exactly that way when two differ only by case", () => {
    const two = [label("1", "Toán"), label("2", "toán")];
    expect(findLabelByName(two, "toán")?.id).toBe("2");
    expect(findLabelByName(two, "Toán")?.id).toBe("1");
    expect(findLabelByName(two, "TOÁN")?.id).toBe("1"); // no exact one: the first in set order
  });
  it("does not take part of a name for the name", () => expect(findLabelByName(list, "Unit")).toBeUndefined());
  it("finds nothing for a blank query", () => expect(findLabelByName(list, "  ")).toBeUndefined());
  it("matches a name typed in decomposed (NFD) form, as some keyboards send it", () =>
    expect(findLabelByName(list, "Ngữ pháp".normalize("NFD"))?.id).toBe("1"));
});

describe("resolveSubmit (Enter in the picker)", () => {
  const list = [label("1", "Ngữ pháp"), label("2", "Cá")];
  it("takes the label already called that instead of creating a copy", () => expect(resolveSubmit(list, " ngữ PHÁP ")).toEqual({ kind: "assign", label: list[0] }));
  it("creates a label for a new name, without the outer spaces", () => expect(resolveSubmit(list, "  Ca ")).toEqual({ kind: "create", name: "Ca" }));
  it("creates the first label of a set that has none", () => expect(resolveSubmit([], "Unit 1")).toEqual({ kind: "create", name: "Unit 1" }));
  it("does nothing for a blank box", () => expect(resolveSubmit(list, "   ")).toBeNull());
});

describe("nextLabelOrder", () => {
  it("starts at 0 for a set without labels", () => expect(nextLabelOrder([])).toBe(0));
  it("goes after the largest order, gaps included", () => expect(nextLabelOrder([{ order: 0 }, { order: 5 }, { order: 2 }])).toBe(6));
  it("goes after legacy labels that all kept order 0", () => expect(nextLabelOrder([{ order: 0 }, { order: 0 }])).toBe(1));
});

describe("applyLabelChange (keeps the label list right without reading it again)", () => {
  const list = [{ id: "1", name: "Cũ", color: null }, { id: "2", name: "Khác", color: "#10B981" }];
  it("renames and recolours one label", () => {
    expect(applyLabelChange(list, { labelId: "1", label: { id: "1", name: "Mới", color: "#EF4444" } })).toEqual([{ id: "1", name: "Mới", color: "#EF4444" }, list[1]]);
  });
  it("takes a deleted label out", () => expect(applyLabelChange(list, { labelId: "1", label: null })).toEqual([list[1]]));
  it("changes nothing for an unknown id, and never the list it was given", () => {
    expect(applyLabelChange(list, { labelId: "9", label: null })).toEqual(list);
    expect(list[0].name).toBe("Cũ");
  });
});
