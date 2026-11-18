import { describe, expect, it } from "vitest";
import { pickableQuizSetId } from "./quiz-set-choice";

const options = [{ id: "qs1" }, { id: "qs2" }];

describe("pickableQuizSetId", () => {
  it("keeps an id that is still among the options", () => {
    expect(pickableQuizSetId("qs2", options)).toBe("qs2");
  });
  it("is empty for a deleted quiz set that is no longer an option (the reported bug)", () => {
    expect(pickableQuizSetId("qs-deleted", options)).toBe("");
  });
  it("is empty when the room says its source was deleted, even if a stale option remains", () => {
    expect(pickableQuizSetId("qs1", options, true)).toBe("");
  });
  it("is empty with no id or no options", () => {
    expect(pickableQuizSetId("", options)).toBe("");
    expect(pickableQuizSetId(undefined, options)).toBe("");
    expect(pickableQuizSetId("qs1", [])).toBe("");
  });
});
