import { describe, expect, it } from "vitest";
import { appendUnique } from "./append-unique";

const item = (id: string, v = id) => ({ id, v });

describe("appendUnique", () => {
  it("appends only items whose key is not there yet, keeping the existing copy", () => {
    const out = appendUnique([item("a"), item("b")], [item("b", "new"), item("c")], (x) => x.id);
    expect(out).toEqual([item("a"), item("b"), item("c")]);
  });
  it("drops repeats inside the new page too", () => {
    expect(appendUnique([], [item("a"), item("a", "2")], (x) => x.id)).toEqual([item("a")]);
  });
});
