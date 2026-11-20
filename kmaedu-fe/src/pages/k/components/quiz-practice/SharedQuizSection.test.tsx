// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { SharedQuizSection } from "./SharedQuizSection";

const fetchSets = vi.hoisted(() => vi.fn());
vi.mock("@/stores/useQuizPracticeStore", () => ({ useQuizPracticeStore: (select: (s: { fetchSets: typeof fetchSets }) => unknown) => select({ fetchSets }) }));

function renderSection() {
  return render(<MemoryRouter><SharedQuizSection /></MemoryRouter>);
}

beforeEach(() => fetchSets.mockReset());

describe("practice quiz section on my materials", () => {
  it("says where the sets come from and who gave them, with no link to pass on", async () => {
    fetchSets.mockResolvedValue({
      sets: [{ id: "q1", title: "Linux cơ bản", description: null, questionCount: 18, owner: { name: "Nguyễn Thu Hà" }, lastAttempt: null }],
      total: 1, page: 1, limit: 6, totalPages: 1,
    });
    renderSection();
    expect(await screen.findByText("Linux cơ bản")).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Bộ câu hỏi luyện tập" })).toBeTruthy();
    expect(screen.getByText("Bộ câu hỏi giáo viên mở cho bạn luyện tập")).toBeTruthy();
    expect(screen.getByText(/Giáo viên: Nguyễn Thu Hà/)).toBeTruthy();
    expect(screen.queryByText(/Chia sẻ bởi/)).toBeNull();
    expect(screen.queryByRole("button", { name: /Thao tác|Thêm/ })).toBeNull();
    expect(screen.queryByText("Sao chép liên kết")).toBeNull();
  });

  it("tells a learner with no sets how to get one", async () => {
    fetchSets.mockResolvedValue({ sets: [], total: 0, page: 1, limit: 6, totalPages: 0 });
    renderSection();
    expect(await screen.findByText("Chưa có bộ câu hỏi nào")).toBeTruthy();
    expect(screen.getByText(/Mở liên kết luyện tập giáo viên gửi/)).toBeTruthy();
  });

  it("loads 5 sets a page and pages with the pager, with no show-all toggle", async () => {
    const page = (n: number, count: number) => ({
      sets: Array.from({ length: count }, (_, i) => ({ id: `q${n}${i}`, title: `Bộ ${n}-${i + 1}`, description: null, questionCount: 6, owner: { name: "Nguyễn Văn A" }, lastAttempt: null })),
      total: 12, page: n, limit: 5, totalPages: 3,
    });
    fetchSets.mockImplementation(async (n: number) => page(n, n === 3 ? 2 : 5));
    renderSection();
    expect(await screen.findByText("Bộ 1-5")).toBeTruthy();
    expect(fetchSets).toHaveBeenCalledWith(1, 5);
    expect(screen.queryByRole("button", { name: /Xem tất cả|Thu gọn/ })).toBeNull();
    expect(screen.getByText("1/3")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Sau" }));
    expect(await screen.findByText("Bộ 2-1")).toBeTruthy();
    expect(fetchSets).toHaveBeenLastCalledWith(2, 5);
    expect(screen.queryByText("Bộ 1-1")).toBeNull();
  });
});
