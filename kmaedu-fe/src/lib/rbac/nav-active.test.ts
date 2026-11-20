import { describe, expect, it } from "vitest";
import { isNavActive } from "./nav-active";

const student = ["word-family", "my-materials", "my-exams", "study-room"];
const teacher = ["ai-tool", "word-family", "manage-exam", "flash-card", "manage-exam-room", "study-room", "history"];
const admin = [...new Set([...student, ...teacher, "admin"])];

const lit = (ids: string[], path: string) => ids.filter((id) => isNavActive(id, path, ids));

describe("isNavActive", () => {
  it("lights My materials for a learner practising a quiz set", () => {
    expect(lit(student, "/k/practice-quiz/q1")).toEqual(["my-materials"]);
  });

  it("lights Manage exams for an owner previewing one, and only that for an admin", () => {
    expect(lit(teacher, "/k/practice-quiz/q1")).toEqual(["manage-exam"]);
    expect(lit(admin, "/k/practice-quiz/q1")).toEqual(["manage-exam"]);
  });

  it("keeps the other items' own pages", () => {
    expect(lit(student, "/k/my-materials")).toEqual(["my-materials"]);
    expect(lit(teacher, "/k/manage-quiz-set/abc")).toEqual(["manage-exam"]);
    expect(lit(teacher, "/k/history/pdf")).toEqual(["history"]);
    expect(lit(teacher, "/k/manage-flashcard-set/x")).toEqual(["flash-card"]);
    expect(lit(admin, "/admin")).toEqual(["admin"]);
    expect(lit(student, "/k/my-materials-old")).toEqual([]);
  });
});
