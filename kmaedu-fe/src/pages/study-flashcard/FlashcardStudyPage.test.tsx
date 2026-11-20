// @vitest-environment jsdom
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import FlashcardStudyPage from "./FlashcardStudyPage";

const api = vi.hoisted(() => ({
  check: vi.fn(),
  study: vi.fn(),
  progress: vi.fn(),
  add: vi.fn(),
  save: vi.fn(),
  toastError: vi.fn(),
}));
vi.mock("@/apis/flashcardSetApi", () => ({ checkFlashcardSetAccess: api.check, getFlashcardSetForStudy: api.study, getFlashcardSetPublicInfo: vi.fn() }));
vi.mock("@/apis/flashcardStudyApi", () => ({ getProgressApi: api.progress, addStudiedCardApi: api.add, saveProgressApi: api.save }));
vi.mock("@/components/antd/toast", () => ({ toast: { error: api.toastError, success: vi.fn(), info: vi.fn() } }));
vi.mock("@/stores/useAuthStore", () => {
  const state = { isAuthenticated: true, initializing: false, roles: ["STUDENT"], permissions: ["flashcard:study"], logout: vi.fn(), user: { name: "Trần Minh Khoa", username: "khoa", email: "khoa@example.com" } };
  return { useAuthStore: (select?: (s: typeof state) => unknown) => (select ? select(state) : state) };
});
vi.mock("@/components/molecules/StandardMarkdownRenderer", () => ({ StandardMarkdownRenderer: ({ content }: { content: string }) => <span>{content}</span> }));

const cards = [
  { id: "c1", question: "Thư mục /dev/disk/by-label dùng để làm gì?", answer: "Liệt kê ổ đĩa theo nhãn" },
  { id: "c2", question: "Lệnh nào liệt kê tiến trình?", answer: "ps" },
  { id: "c3", question: "fstab nằm ở đâu?", answer: "/etc/fstab" },
];

async function open(studied: string[] = []) {
  api.check.mockResolvedValue({ hasAccess: true, requiresCode: false, accessType: "public" });
  api.study.mockResolvedValue({ flashCards: cards, title: "Linux cơ bản", description: "", viewCount: 4, creator: { name: "Admin", username: "admin" } });
  api.progress.mockResolvedValue({ studiedCardIds: studied, totalCards: 3, progressPercentage: 0 });
  render(
    <MemoryRouter initialEntries={["/study-flashcard/s1"]}>
      <Routes><Route path="/study-flashcard/:id" element={<FlashcardStudyPage />} /></Routes>
    </MemoryRouter>,
  );
  await screen.findByText(cards[0].question);
}

const position = () => screen.getByRole("progressbar").getAttribute("aria-valuenow");

beforeEach(() => {
  for (const fn of Object.values(api)) fn.mockReset();
  api.add.mockResolvedValue({});
  api.save.mockResolvedValue({});
});

describe("flashcard study page", () => {
  it("counts a remembered card and moves on", async () => {
    await open();
    expect(screen.getByText("0 đã học · 0%")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Đã nhớ/ }));
    expect(api.add).toHaveBeenCalledWith("s1", "c1");
    expect(screen.getByText("1 đã học · 33%")).toBeTruthy();
    expect(position()).toBe("2");
  });

  it("takes a forgotten card out of the studied list", async () => {
    await open(["c1", "c2"]);
    expect(screen.getByText("2 đã học · 67%")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /Chưa nhớ/ }));
    expect(api.save).toHaveBeenCalledWith("s1", ["c2"]);
    expect(screen.getByText("1 đã học · 33%")).toBeTruthy();
    expect(position()).toBe("2");
  });

  it("saves nothing when the verdict changes nothing", async () => {
    await open(["c1"]);
    fireEvent.click(screen.getByRole("button", { name: /Đã nhớ/ })); // c1 was already studied
    fireEvent.click(screen.getByRole("button", { name: /Chưa nhớ/ })); // c2 never was
    expect(position()).toBe("3");
    expect(api.add).not.toHaveBeenCalled();
    expect(api.save).not.toHaveBeenCalled();
  });

  it("moves with Sau without counting the card", async () => {
    await open();
    fireEvent.click(screen.getByRole("button", { name: /^Sau/ }));
    expect(position()).toBe("2");
    expect(api.add).not.toHaveBeenCalled();
    expect(screen.getByText("0 đã học · 0%")).toBeTruthy();
  });

  it("stays on the last card after a verdict", async () => {
    await open();
    fireEvent.click(screen.getByRole("button", { name: /^Sau/ }));
    fireEvent.click(screen.getByRole("button", { name: /^Sau/ }));
    fireEvent.click(screen.getByRole("button", { name: /Đã nhớ/ }));
    expect(position()).toBe("3");
    expect((screen.getByRole("button", { name: /^Sau/ }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("tells the learner when the progress could not be saved", async () => {
    await open();
    api.add.mockRejectedValue(new Error("offline"));
    fireEvent.click(screen.getByRole("button", { name: /Đã nhớ/ }));
    await vi.waitFor(() => expect(api.toastError).toHaveBeenCalledOnce());
  });

  it("flips with Space on the page and ← → move", async () => {
    await open();
    fireEvent.keyDown(window, { key: " " });
    expect(screen.getByRole("button", { name: /Câu trả lời\s*Liệt kê ổ đĩa theo nhãn/ })).toBeTruthy();
    fireEvent.keyDown(window, { key: "ArrowRight" });
    expect(position()).toBe("2");
    fireEvent.keyDown(window, { key: "ArrowLeft" });
    expect(position()).toBe("1");
  });

  it("shows the learner's avatar in the header, like the other layouts", async () => {
    await open();
    const account = screen.getByRole("button", { name: "Tài khoản" });
    expect(account.querySelector("img")?.getAttribute("src")).toBe("/avatars/student.webp");
  });

  it("leaves Space on a focused button to that button", async () => {
    await open();
    fireEvent.keyDown(screen.getByRole("button", { name: /Đã nhớ/ }), { key: " " });
    // The card reads its visible face: the question, not a bare "flip" label.
    expect(screen.getByRole("button", { name: /Câu hỏi\s*Thư mục \/dev\/disk\/by-label dùng để làm gì\?/ })).toBeTruthy();
  });
});
