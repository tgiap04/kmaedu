// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { MyFlashcardsSection } from "./my-flashcards-section";

const fetchFlashcards = vi.hoisted(() => vi.fn());
vi.mock("@/stores/useStudentMaterialsStore", () => ({ useStudentMaterialsStore: () => ({ fetchFlashcards, updateFlashcardPin: vi.fn() }) }));
vi.mock("@/components/antd/toast", () => ({ useToast: () => ({ toast: { success: vi.fn(), error: vi.fn() } }) }));

const page = (n: number, count: number) => ({
  flashcardSets: Array.from({ length: count }, (_, i) => ({
    id: `f${n}${i}`, title: `Thẻ ${n}-${i + 1}`, flashcardCount: 6, viewCount: 3, lastViewedAt: new Date().toISOString(), isPinned: n === 1 && i === 4,
  })),
  total: 12, totalPages: 3,
});

describe("flashcard section on my materials", () => {
  it("loads 5 sets a page, pinned first, and pages with the pager, with no show-all toggle", async () => {
    fetchFlashcards.mockImplementation(async (n: number) => page(n, n === 3 ? 2 : 5));
    render(<MemoryRouter><MyFlashcardsSection /></MemoryRouter>);
    expect(await screen.findByText("Thẻ 1-1")).toBeTruthy();
    expect(fetchFlashcards).toHaveBeenCalledWith(1, 5);
    const pinned = screen.getByText("Thẻ 1-5");
    expect(pinned.compareDocumentPosition(screen.getByText("Thẻ 1-1")) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Xem tất cả|Thu gọn/ })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Sau" }));
    expect(await screen.findByText("Thẻ 2-1")).toBeTruthy();
    expect(fetchFlashcards).toHaveBeenLastCalledWith(2, 5);
    expect(screen.getByText("2/3")).toBeTruthy();
  });
});
