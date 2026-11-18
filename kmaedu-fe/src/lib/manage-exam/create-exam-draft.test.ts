import { describe, expect, it } from "vitest";
import { validateExamDraft } from "./create-exam-draft";

describe("validateExamDraft", () => {
  it("accepts a title and a short description", () => {
    expect(validateExamDraft({ title: "Đề Linux", description: "" })).toEqual({});
  });
  it("requires a non-blank title", () => {
    expect(validateExamDraft({ title: "   ", description: "" }).title).toBe("Tên đề thi không được để trống");
  });
  it("caps the title at 200 characters and the description at 1000", () => {
    expect(validateExamDraft({ title: "a".repeat(200), description: "b".repeat(1000) })).toEqual({});
    const errors = validateExamDraft({ title: "a".repeat(201), description: "b".repeat(1001) });
    expect(errors.title).toBe("Tên đề thi không được vượt quá 200 ký tự");
    expect(errors.description).toBe("Mô tả không được vượt quá 1000 ký tự");
  });
});
