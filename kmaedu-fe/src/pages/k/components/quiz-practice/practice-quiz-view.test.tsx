// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PracticeQuizView } from "./practice-quiz-view";

vi.mock("@/components/molecules/StandardMarkdownRenderer", () => ({ StandardMarkdownRenderer: ({ content }: { content: string }) => <span>{content}</span> }));

const questions = [
  { id: "p1", question: "Tại sao không sửa trực tiếp /etc/localtime?", options: ["Không phải văn bản", "Nằm trong nhân", "Mã hóa TLS", "Tạo lại khi khởi động"] },
  { id: "p2", question: "Lệnh nào đổi múi giờ?", options: ["timedatectl", "date"] },
];

function renderView(over: Partial<Parameters<typeof PracticeQuizView>[0]> = {}) {
  const props = {
    questions, currentIndex: 0, answers: { p2: "A" } as Record<string, string>, marked: ["p2"], busy: false, problem: null, keysEnabled: true,
    onGo: vi.fn(), onSelect: vi.fn(), onToggleMark: vi.fn(), onSubmit: vi.fn(), ...over,
  };
  render(<PracticeQuizView {...props} />);
  return props;
}

describe("practice quiz view", () => {
  it("answers, unanswers and marks the current question", () => {
    const p = renderView({ answers: { p1: "B" } });
    fireEvent.click(screen.getByRole("radio", { name: /C\s*Mã hóa TLS/ }));
    expect(p.onSelect).toHaveBeenLastCalledWith("p1", "C");
    fireEvent.click(screen.getByRole("radio", { name: /B\s*Nằm trong nhân/ }));
    expect(p.onSelect).toHaveBeenLastCalledWith("p1", "");
    fireEvent.click(screen.getByRole("button", { name: /Đánh dấu/ }));
    expect(p.onToggleMark).toHaveBeenCalledWith("p1");
  });

  it("counts answers in the side list and jumps from it", () => {
    const p = renderView();
    expect(screen.getByText("50%")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Câu 2, đã trả lời, đã đánh dấu" }));
    expect(p.onGo).toHaveBeenCalledWith(1);
  });

  it("uses A–D and the arrows, and not while a dialog is open", () => {
    const p = renderView();
    fireEvent.keyDown(window, { key: "b" });
    expect(p.onSelect).toHaveBeenLastCalledWith("p1", "B");
    fireEvent.keyDown(window, { key: "ArrowRight" });
    expect(p.onGo).toHaveBeenLastCalledWith(1);
    fireEvent.keyDown(window, { key: "ArrowLeft" });
    expect(p.onGo).toHaveBeenLastCalledWith(0);
  });

  it("ignores keys while a dialog is open", () => {
    const p = renderView({ keysEnabled: false });
    fireEvent.keyDown(window, { key: "a" });
    expect(p.onSelect).not.toHaveBeenCalled();
  });

  it("hands in from the footer on the last question", () => {
    const p = renderView({ currentIndex: 1 });
    const footerSubmit = screen.getAllByRole("button", { name: /Nộp bài/ });
    fireEvent.click(footerSubmit.at(-1)!);
    expect(p.onSubmit).toHaveBeenCalled();
  });

  it("neither hands in again nor takes keys while a hand-in is being sent", () => {
    const p = renderView({ currentIndex: 1, busy: true });
    for (const b of screen.getAllByRole("button", { name: /Nộp bài/ })) fireEvent.click(b);
    expect(p.onSubmit).not.toHaveBeenCalled();
    fireEvent.keyDown(window, { key: "a" });
    expect(p.onSelect).not.toHaveBeenCalled();
  });

  it("shows a save problem under the question", () => {
    renderView({ problem: "Chưa lưu được bài, kiểm tra kết nối" });
    expect(screen.getByRole("alert").textContent).toBe("Chưa lưu được bài, kiểm tra kết nối");
  });
});
