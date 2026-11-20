// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PracticeIntroCard } from "./practice-intro-card";

const renderCard = (over: Partial<Parameters<typeof PracticeIntroCard>[0]> = {}) => {
  const onStart = vi.fn();
  render(<PracticeIntroCard questionCount={10} busy={false} problem={null} onStart={onStart} history={<p>lịch sử các lượt</p>} {...over} />);
  return onStart;
};

describe("practice intro card", () => {
  it("states the count and starts the practice", () => {
    const onStart = renderCard();
    expect(screen.getByText("10 câu hỏi.")).toBeTruthy();
    expect(screen.getByRole("tab", { name: "Luyện tập" }).getAttribute("aria-selected")).toBe("true");
    fireEvent.click(screen.getByRole("button", { name: /Bắt đầu \/ Tiếp tục/ }));
    expect(onStart).toHaveBeenCalledOnce();
  });

  it("sums the set up in three stat cards", () => {
    renderCard();
    expect(screen.getByText("Số câu hỏi").nextElementSibling?.textContent).toBe("10 câu");
    expect(screen.getByText("Hình thức").nextElementSibling?.textContent).toBe("Trắc nghiệm");
    expect(screen.getByText("Đáp án").nextElementSibling?.textContent).toBe("Sau khi nộp bài");
    expect(screen.getByRole("heading", { name: "Bắt đầu luyện tập" })).toBeTruthy();
    expect(screen.getByText(/Nếu bạn đang làm dở/)).toBeTruthy();
  });

  it("switches to the history tab and back", () => {
    renderCard();
    expect(screen.queryByText("lịch sử các lượt")).toBeNull();
    fireEvent.click(screen.getByRole("tab", { name: "Lịch sử" }));
    expect(screen.getByText("lịch sử các lượt")).toBeTruthy();
    expect(screen.getByRole("tabpanel").getAttribute("aria-labelledby")).toBe(screen.getByRole("tab", { name: "Lịch sử" }).id);
    fireEvent.click(screen.getByRole("tab", { name: "Luyện tập" }));
    expect(screen.getByRole("button", { name: /Bắt đầu/ })).toBeTruthy();
  });

  it("locks the button while loading and shows a problem", () => {
    const onStart = renderCard({ busy: true, problem: "Không thể bắt đầu, thử lại sau" });
    const button = screen.getByRole("button", { name: /Đang tải/ }) as HTMLButtonElement;
    expect(button.disabled).toBe(true);
    fireEvent.click(button);
    expect(onStart).not.toHaveBeenCalled();
    expect(screen.getByRole("alert").textContent).toBe("Không thể bắt đầu, thử lại sau");
  });
});
