// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { QuizFooter } from "./quiz-footer";
import { formatClock } from "./quiz-format";
import { QuizNavigatorCard } from "./quiz-navigator-card";
import { indexAtPosition, QuizProgressSegments } from "./quiz-progress-segments";
import { QuizQuestionCard } from "./quiz-question-card";
import { QuizResultCard } from "./quiz-result-card";
import { QuizReviewView } from "./quiz-review-view";
import { QuizStatusScreen } from "./quiz-status-screen";

vi.mock("@/components/molecules/StandardMarkdownRenderer", () => ({
  StandardMarkdownRenderer: ({ content }: { content: string }) => <span>{content}</span>,
}));

const ids = ["q1", "q2", "q3", "q4"];

describe("quiz question card", () => {
  const base = { index: 1, total: 4, question: "Định dạng ZIP dùng để?", options: ["Sao lưu", "Nén", "Kiểm tra"], selected: undefined, marked: false };

  it("selects an option and clears it on a second click", () => {
    const onSelect = vi.fn();
    const { rerender } = render(<QuizQuestionCard {...base} onSelect={onSelect} onToggleMark={() => {}} />);
    fireEvent.click(screen.getByRole("radio", { name: /B\s*Nén/ }));
    expect(onSelect).toHaveBeenLastCalledWith("B");
    rerender(<QuizQuestionCard {...base} selected="B" onSelect={onSelect} onToggleMark={() => {}} />);
    expect(screen.getByRole("radio", { name: /B\s*Nén/ }).getAttribute("aria-checked")).toBe("true");
    fireEvent.click(screen.getByRole("radio", { name: /B\s*Nén/ }));
    expect(onSelect).toHaveBeenLastCalledWith("");
  });

  it("shows the number and toggles the review mark", () => {
    const onToggleMark = vi.fn();
    render(<QuizQuestionCard {...base} marked onSelect={() => {}} onToggleMark={onToggleMark} />);
    expect(screen.getByText("Câu 2/4")).toBeTruthy();
    const mark = screen.getByRole("button", { pressed: true });
    fireEvent.click(mark);
    expect(onToggleMark).toHaveBeenCalledOnce();
  });
});

describe("quiz navigator card", () => {
  it("counts answered, unanswered and marked, and the percent", () => {
    render(<QuizNavigatorCard ids={ids} answered={new Set(["q1", "q3", "gone"])} marked={new Set(["q2"])} current={1} onJump={() => {}} onSubmit={() => {}} />);
    expect(screen.getByText("50%")).toBeTruthy();
    expect(screen.getByText("Còn 2 câu chưa trả lời")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Câu 2, đã đánh dấu" }).getAttribute("aria-current")).toBe("step");
    expect(screen.getByRole("button", { name: "Câu 1, đã trả lời" })).toBeTruthy();
  });

  it("says everything is answered at 100% and jumps / submits", () => {
    const onJump = vi.fn();
    const onSubmit = vi.fn();
    render(<QuizNavigatorCard ids={ids} answered={new Set(ids)} marked={new Set()} current={0} onJump={onJump} onSubmit={onSubmit} />);
    expect(screen.getByText("100%")).toBeTruthy();
    expect(screen.getByText("Đã trả lời hết các câu")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /^Câu 4/ }));
    expect(onJump).toHaveBeenCalledWith(3);
    fireEvent.click(screen.getByRole("button", { name: "Nộp bài" }));
    expect(onSubmit).toHaveBeenCalledOnce();
  });

  it("shows 0% with no questions", () => {
    render(<QuizNavigatorCard ids={[]} answered={new Set()} marked={new Set()} current={0} onJump={() => {}} onSubmit={() => {}} />);
    expect(screen.getByText("0%")).toBeTruthy();
  });
});

describe("quiz footer", () => {
  it("disables previous on the first question and offers next", () => {
    const onNext = vi.fn();
    render(<QuizFooter current={0} total={3} onPrev={() => {}} onNext={onNext} last={{ label: "Nộp bài", onClick: () => {} }} />);
    expect((screen.getByRole("button", { name: /Câu trước/ }) as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(screen.getByRole("button", { name: /Câu sau/ }));
    expect(onNext).toHaveBeenCalledOnce();
    expect(screen.getByText("1 / 3")).toBeTruthy();
  });

  it("hands in on the last question", () => {
    const onSubmit = vi.fn();
    render(<QuizFooter current={2} total={3} onPrev={() => {}} onNext={() => {}} last={{ label: "Nộp bài", onClick: onSubmit }} />);
    expect(screen.queryByRole("button", { name: /Câu sau/ })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /Nộp bài/ }));
    expect(onSubmit).toHaveBeenCalledOnce();
  });
});

describe("formatClock", () => {
  it("pads minutes and seconds, adds hours past an hour, clamps below zero", () => {
    expect(formatClock(2535)).toBe("42:15");
    expect(formatClock(5)).toBe("00:05");
    expect(formatClock(3723)).toBe("1:02:03");
    expect(formatClock(-4)).toBe("00:00");
  });
});

describe("quiz progress segments", () => {
  it("jumps to the question of the clicked segment and marks the current one", () => {
    const onJump = vi.fn();
    render(<QuizProgressSegments answered={[true, false, true, false]} current={1} onJump={onJump} />);
    expect(screen.getByRole("button", { name: "Đến câu 2" }).getAttribute("aria-current")).toBe("step");
    fireEvent.click(screen.getByRole("button", { name: "Đến câu 4" }));
    expect(onJump).toHaveBeenCalledWith(3);
  });

  it("fills the segment of each answered question, not the first N", () => {
    render(<QuizProgressSegments answered={[false, false, true, false]} current={0} onJump={() => {}} />);
    expect(screen.getByRole("button", { name: "Đến câu 3, đã trả lời" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Đến câu 1" }).firstElementChild!.className).not.toMatch(/\bbg-brand\b(?!\/)/);
    expect(screen.getByRole("button", { name: "Đến câu 3, đã trả lời" }).firstElementChild!.className).toMatch(/\bbg-brand\b(?!\/)/);
  });

  it("uses one bar past 40 questions, without a button per question", () => {
    render(<QuizProgressSegments answered={Array.from({ length: 50 }, () => false)} current={0} onJump={() => {}} />);
    expect(screen.queryAllByRole("button")).toHaveLength(0);
    expect(screen.getByRole("progressbar")).toBeTruthy();
  });
});

describe("indexAtPosition", () => {
  it("maps a click to its question and clamps the edges", () => {
    expect(indexAtPosition(0, 500, 50)).toBe(0);
    expect(indexAtPosition(255, 500, 50)).toBe(25);
    expect(indexAtPosition(500, 500, 50)).toBe(49);
    expect(indexAtPosition(-3, 500, 50)).toBe(0);
    expect(indexAtPosition(10, 0, 50)).toBe(0);
    expect(indexAtPosition(10, 500, 0)).toBe(0);
  });
});

describe("quiz result card", () => {
  const base = { correct: 6, total: 18, percentage: 33, timeLabel: "1:57:03", violations: 22, onRetake: () => {}, onExit: () => {} };

  it("congratulates a pass and shows the score, counts and split", () => {
    const onDetail = vi.fn();
    render(<QuizResultCard {...base} passed onDetail={onDetail} />);
    expect(screen.getByText("Chúc mừng!")).toBeTruthy();
    expect(screen.getByText("33%")).toBeTruthy();
    expect(screen.getByText("6 / 18 câu đúng")).toBeTruthy();
    expect(screen.getByText("12")).toBeTruthy();
    expect(screen.getByText("1:57:03")).toBeTruthy();
    expect(screen.getByRole("img", { name: "6 câu đúng, 12 câu sai" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Xem chi tiết/ }));
    expect(onDetail).toHaveBeenCalledOnce();
  });

  it("says not passed and hides the detail button when answers are hidden", () => {
    const onRetake = vi.fn();
    const onExit = vi.fn();
    render(<QuizResultCard {...base} passed={false} onRetake={onRetake} onExit={onExit} />);
    expect(screen.getByText("Chưa đạt")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Xem chi tiết/ })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /Làm lại/ }));
    fireEvent.click(screen.getByRole("button", { name: /Thoát/ }));
    expect(onRetake).toHaveBeenCalledOnce();
    expect(onExit).toHaveBeenCalledOnce();
  });

  it("never shows negative wrong answers and drops the split with no questions", () => {
    render(<QuizResultCard {...base} correct={3} total={0} percentage={0} violations={0} passed={false} />);
    expect(screen.queryByRole("img")).toBeNull();
    expect(screen.getByText("Sai").previousSibling?.textContent).toBe("0");
  });
});

describe("quiz review view", () => {
  const questions = [
    { id: "q1", question: "Tài khoản người dùng là gì?", options: ["Root", "Tạm thời", "Được ủy quyền", "Thư điện tử"], answer: "C", userAnswer: "B" },
    { id: "q2", question: "Câu 2", options: ["A1", "B1"], answer: "A", userAnswer: "A" },
    { id: "q3", question: "Câu 3", options: ["A1", "B1"], answer: "B", userAnswer: null },
  ];

  it("marks a wrong pick and the right answer, with the verdict and counts", () => {
    render(<QuizReviewView questions={questions} index={0} onIndexChange={() => {}} onOverview={() => {}} />);
    expect(screen.getByText("Trả lời sai")).toBeTruthy();
    expect(screen.getByText("1/3 câu đúng")).toBeTruthy();
    expect(screen.getByLabelText("B, đã chọn sai")).toBeTruthy();
    expect(screen.getByLabelText("C, đáp án đúng")).toBeTruthy();
    expect(screen.getByText("Bạn đã chọn")).toBeTruthy();
    expect(screen.getByText("Đáp án đúng")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Câu 1, sai" }).getAttribute("aria-current")).toBe("step");
    expect(screen.getByRole("button", { name: "Câu 2, đúng" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Câu 3, chưa trả lời" })).toBeTruthy();
  });

  it("shows both tags on a right pick, and a note when skipped", () => {
    const { rerender } = render(<QuizReviewView questions={questions} index={1} onIndexChange={() => {}} onOverview={() => {}} />);
    expect(screen.getByText("Trả lời đúng")).toBeTruthy();
    expect(screen.getByText("Bạn đã chọn")).toBeTruthy();
    expect(screen.getByText("Đáp án đúng")).toBeTruthy();
    rerender(<QuizReviewView questions={questions} index={2} onIndexChange={() => {}} onOverview={() => {}} />);
    expect(screen.getAllByText("Chưa trả lời").length).toBeGreaterThan(0);
    expect(screen.getByText("Bạn không trả lời câu hỏi này")).toBeTruthy();
  });

  it("moves between questions and goes back to the overview from the last one", () => {
    const onIndexChange = vi.fn();
    const onOverview = vi.fn();
    render(<QuizReviewView questions={questions} index={2} onIndexChange={onIndexChange} onOverview={onOverview} />);
    fireEvent.click(screen.getByRole("button", { name: /Câu trước/ }));
    expect(onIndexChange).toHaveBeenLastCalledWith(1);
    fireEvent.click(screen.getByRole("button", { name: /^Đến câu 1(, (đúng|sai))?$/ }));
    expect(onIndexChange).toHaveBeenLastCalledWith(0);
    for (const btn of screen.getAllByRole("button", { name: /Xem tổng quan/ })) fireEvent.click(btn);
    expect(onOverview).toHaveBeenCalledTimes(2);
  });
});

describe("quiz status screen", () => {
  it("shows the server's reason with both ways out on an error", () => {
    const back = vi.fn();
    const mine = vi.fn();
    render(<QuizStatusScreen tone="error" title="Không thể vào bài thi" message="Bạn đã làm bài này rồi và không được phép làm lại" primary={{ label: "Về phòng thi", onClick: back }} secondary={{ label: "Bài thi của tôi", onClick: mine }} />);
    expect(screen.getByRole("alert").textContent).toContain("Bạn đã làm bài này rồi");
    fireEvent.click(screen.getByRole("button", { name: /Về phòng thi/ }));
    fireEvent.click(screen.getByRole("button", { name: /Bài thi của tôi/ }));
    expect(back).toHaveBeenCalledOnce();
    expect(mine).toHaveBeenCalledOnce();
  });

  it("has no buttons while loading", () => {
    render(<QuizStatusScreen tone="loading" title="Đang tải bài thi" message="..." />);
    expect(screen.getByRole("status")).toBeTruthy();
    expect(screen.queryAllByRole("button")).toHaveLength(0);
  });
});
