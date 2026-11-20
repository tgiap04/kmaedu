import { describe, expect, it } from "vitest";
import { quizKeyAction } from "./quiz-keys";

describe("quizKeyAction", () => {
  it("picks the option for a letter, either case", () => {
    expect(quizKeyAction({ key: "a" }, 4)).toEqual({ type: "select", letter: "A" });
    expect(quizKeyAction({ key: "D" }, 4)).toEqual({ type: "select", letter: "D" });
  });

  it("ignores letters past the last option", () => {
    expect(quizKeyAction({ key: "e" }, 4)).toBeNull();
    expect(quizKeyAction({ key: "c" }, 2)).toBeNull();
    expect(quizKeyAction({ key: "a" }, 0)).toBeNull();
  });

  it("moves with the arrow keys", () => {
    expect(quizKeyAction({ key: "ArrowLeft" }, 4)).toEqual({ type: "prev" });
    expect(quizKeyAction({ key: "ArrowRight" }, 4)).toEqual({ type: "next" });
  });

  it("ignores other keys, modifiers and typing in a field", () => {
    expect(quizKeyAction({ key: "1" }, 4)).toBeNull();
    expect(quizKeyAction({ key: "Enter" }, 4)).toBeNull();
    expect(quizKeyAction({ key: "a", metaKey: true }, 4)).toBeNull();
    expect(quizKeyAction({ key: "ArrowLeft", ctrlKey: true }, 4)).toBeNull();
    expect(quizKeyAction({ key: "a", repeat: true }, 4)).toBeNull();
    expect(quizKeyAction({ key: "ArrowRight", repeat: true }, 4)).toBeNull();
    expect(quizKeyAction({ key: "a", target: { tagName: "INPUT" } as unknown as EventTarget }, 4)).toBeNull();
    expect(quizKeyAction({ key: "b", target: { tagName: "DIV", isContentEditable: true } as unknown as EventTarget }, 4)).toBeNull();
  });
});
