// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { MyDocumentsSection } from "./my-documents-section";

const fetchUploadsPage = vi.hoisted(() => vi.fn());
vi.mock("@/stores/useAIGeneratorStore", () => ({ useRecentUploadsStore: () => ({ fetchUploadsPage, loadFromUpload: vi.fn() }) }));
vi.mock("@/components/antd/toast", () => ({ useToast: () => ({ toast: { info: vi.fn(), error: vi.fn() } }) }));

const upload = (n: number, i: number) => ({
  id: `d${n}${i}`, filename: `tai-lieu-${n}-${i + 1}.pdf`, size: 2048, url: "u", createdAt: new Date().toISOString(), quizHistory: null, flashcardHistory: null,
});

describe("documents section on my materials", () => {
  it("loads 5 documents a page and pages on while the API says another page follows", async () => {
    fetchUploadsPage.mockImplementation(async (n: number) => ({ uploads: Array.from({ length: n === 1 ? 5 : 2 }, (_, i) => upload(n, i)), hasNext: n === 1 }));
    render(<MemoryRouter><MyDocumentsSection /></MemoryRouter>);
    expect(await screen.findByText("tai-lieu-1-5.pdf")).toBeTruthy();
    expect(fetchUploadsPage).toHaveBeenCalledWith(1, 5);
    expect(screen.queryByRole("link", { name: /Xem tất cả/ })).toBeNull();
    expect(screen.getByText("Trang 1")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Sau" }));
    expect(await screen.findByText("tai-lieu-2-1.pdf")).toBeTruthy();
    expect(fetchUploadsPage).toHaveBeenLastCalledWith(2, 5);
    expect((screen.getByRole("button", { name: "Sau" }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole("button", { name: "Trước" }) as HTMLButtonElement).disabled).toBe(false);
  });

  it("hides the pager when everything fits one page", async () => {
    fetchUploadsPage.mockResolvedValue({ uploads: [upload(1, 0)], hasNext: false });
    render(<MemoryRouter><MyDocumentsSection /></MemoryRouter>);
    expect(await screen.findByText("tai-lieu-1-1.pdf")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Sau" })).toBeNull();
  });
});
