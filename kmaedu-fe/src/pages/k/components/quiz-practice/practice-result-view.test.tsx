// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { AttemptWithQuestions, ResultQuestion } from "@/apis/quizPracticeApi";
import { PracticeResultView } from "./practice-result-view";

vi.mock("@/components/molecules/StandardMarkdownRenderer", () => ({ StandardMarkdownRenderer: ({ content }: { content: string }) => <span>{content}</span> }));

const result = {
  attempt: { id: "a1", score: 3.3, correctAnswers: 1, totalQuestions: 3, timeSpentSeconds: 125 },
  questions: [
    { id: "q1", question: "Lệnh nào đổi múi giờ?", options: ["timedatectl", "date"], selectedAnswer: "timedatectl", correctAnswer: "A", isCorrect: true },
    { id: "q2", question: "Tệp múi giờ nằm ở đâu?", options: ["/etc/localtime", "/etc/hosts"], selectedAnswer: "B", correctAnswer: "/etc/localtime", isCorrect: false },
    { id: "q3", question: "Câu bỏ qua", options: ["X", "Y"], selectedAnswer: null, correctAnswer: "B", isCorrect: false },
  ],
} as unknown as AttemptWithQuestions<ResultQuestion>;

describe("practice result view", () => {
  it("shows the server score and the counts", () => {
    render(<PracticeResultView result={result} onPracticeAgain={vi.fn()} />);
    expect(screen.getByText("3.3/10")).toBeTruthy();
    expect(screen.getByText("02:05")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Câu 1, đúng" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Câu 2, sai" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Câu 3, chưa trả lời" })).toBeTruthy();
  });

  it("starts on question 1 graded correct and moves through the list and the footer", () => {
    render(<PracticeResultView result={result} onPracticeAgain={vi.fn()} />);
    expect(screen.getByText("Lệnh nào đổi múi giờ?")).toBeTruthy();
    expect(screen.getByText("Trả lời đúng")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Câu 2, sai" }));
    expect(screen.getByText("Tệp múi giờ nằm ở đâu?")).toBeTruthy();
    expect(screen.getByText("Trả lời sai")).toBeTruthy();
    expect(screen.getByText("Bạn đã chọn")).toBeTruthy();
    expect(screen.getByText("Đáp án đúng")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /Câu sau/ }));
    expect(screen.getByText("Bạn không trả lời câu hỏi này")).toBeTruthy();
  });

  it("starts a new attempt from the summary", () => {
    const onPracticeAgain = vi.fn();
    render(<PracticeResultView result={result} onPracticeAgain={onPracticeAgain} />);
    fireEvent.click(screen.getByRole("button", { name: /Luyện tập lại/ }));
    expect(onPracticeAgain).toHaveBeenCalled();
  });
});
