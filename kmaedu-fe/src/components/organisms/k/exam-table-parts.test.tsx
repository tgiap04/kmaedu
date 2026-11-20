// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ExamRowActions, type ExamTableData } from "./exam-table-parts";

const exam: ExamTableData = {
  id: "q1", name: "Mạng máy tính", description: "", questionCount: 6, status: "private",
  createdDate: "20/11/2026", createdTime: "10:00", lastStudied: null, tags: [],
};

describe("exam row actions", () => {
  it("shows view, edit and delete as icon-only buttons named by their action, with no more-menu", () => {
    const handlers = { onView: vi.fn(), onEdit: vi.fn(), onDelete: vi.fn() };
    render(<ExamRowActions exam={exam} handlers={handlers} />);

    expect(screen.queryByRole("button", { name: /Tùy chọn/ })).toBeNull();
    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(3);
    for (const b of buttons) expect(b.textContent).toBe("");

    fireEvent.click(screen.getByRole("button", { name: "Xem Mạng máy tính" }));
    fireEvent.click(screen.getByRole("button", { name: "Sửa Mạng máy tính" }));
    fireEvent.click(screen.getByRole("button", { name: "Xóa Mạng máy tính" }));
    expect(handlers.onView).toHaveBeenCalledWith("q1");
    expect(handlers.onEdit).toHaveBeenCalledWith("q1");
    expect(handlers.onDelete).toHaveBeenCalledWith("q1");
  });
});
