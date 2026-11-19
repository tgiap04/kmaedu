// @vitest-environment jsdom
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { FlashcardSetLabel } from "@/apis/flashcardSetApi";
import type { Flashcard } from "@/types/flashcardSet";

const api = vi.hoisted(() => ({ createFlashcardLabelApi: vi.fn(), updateFlashcardLabelApi: vi.fn(), deleteFlashcardLabelApi: vi.fn() }));
vi.mock("@/apis/flashcardSetApi", () => api);
vi.mock("@/components/antd/toast", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/stores/useFlashcardSetStore", () => ({ useFlashcardSetStore: (pick: (s: unknown) => unknown) => pick({ invalidateCache: vi.fn() }) }));

const { FlashcardLabelManager } = await import("./flashcard-label-manager");

const label = (id: string, name: string, order: number): FlashcardSetLabel =>
  ({ id, flashCardSetId: "s1", name, description: null, color: "#10B981", order, createdAt: "2026-01-01", updatedAt: "2026-01-01" }) as FlashcardSetLabel;
const labels = [label("l1", "Ngữ pháp", 0), label("l2", "Từ vựng", 3)];
const cards = [
  { id: "c1", question: "q", answer: "a", createdAt: "", updatedAt: "", label: { id: "l1", name: "Ngữ pháp", color: null } },
  { id: "c2", question: "q", answer: "a", createdAt: "", updatedAt: "" },
] as Flashcard[];

function setup() {
  const onChanged = vi.fn(async () => undefined);
  const onOpenLabel = vi.fn();
  const user = userEvent.setup();
  render(<FlashcardLabelManager setId="s1" labels={labels} cards={cards} onChanged={onChanged} onOpenLabel={onOpenLabel} />);
  return { user, onChanged, onOpenLabel };
}

beforeEach(() => vi.clearAllMocks());

describe("flashcard label manager", () => {
  it("shows each label with the number of its cards, and the cards without one", () => {
    setup();
    expect(screen.getByRole("button", { name: /Ngữ pháp.*1 thẻ/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Từ vựng.*0 thẻ/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Chưa gán nhãn.*1 thẻ/ })).toBeTruthy();
  });

  it("a click on a label opens its cards", async () => {
    const { user, onOpenLabel } = setup();
    await user.click(screen.getByRole("button", { name: /^Từ vựng/ }));
    expect(onOpenLabel).toHaveBeenCalledWith("l2");
  });

  it("a new label goes after the others and changes no card", async () => {
    api.createFlashcardLabelApi.mockResolvedValue({ label: label("l3", "Đại số", 4) });
    const { user, onChanged } = setup();
    await user.click(screen.getByRole("button", { name: "Thêm nhãn" }));
    await user.type(screen.getByRole("textbox", { name: "Tên nhãn" }), "Đại số{Enter}");
    await waitFor(() => expect(onChanged).toHaveBeenCalled());
    expect(api.createFlashcardLabelApi).toHaveBeenCalledWith("s1", expect.objectContaining({ name: "Đại số", order: 4 }));
    expect(onChanged).toHaveBeenCalledWith(undefined);
  });

  it("a renamed label is passed on, so its cards can show the new name", async () => {
    api.updateFlashcardLabelApi.mockResolvedValue({ label: label("l1", "Văn phạm", 0) });
    const { user, onChanged } = setup();
    await user.click(screen.getByRole("button", { name: "Sửa Ngữ pháp" }));
    const name = screen.getByRole("textbox", { name: "Tên nhãn" });
    await user.clear(name);
    await user.type(name, "Văn phạm{Enter}");
    await waitFor(() => expect(onChanged).toHaveBeenCalled());
    expect(onChanged).toHaveBeenCalledWith({ labelId: "l1", label: { id: "l1", name: "Văn phạm", color: "#10B981" } });
  });

  it("a deleted label is passed on as gone, once the dialog is confirmed", async () => {
    api.deleteFlashcardLabelApi.mockResolvedValue({ message: "ok" });
    const { user, onChanged } = setup();
    await user.click(screen.getByRole("button", { name: "Xóa Từ vựng" }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText(/Xóa nhãn "Từ vựng"/)).toBeTruthy();
    await user.click(within(dialog).getByRole("button", { name: "Xóa" }));
    await waitFor(() => expect(onChanged).toHaveBeenCalledWith({ labelId: "l2", label: null }));
    expect(api.deleteFlashcardLabelApi).toHaveBeenCalledWith("s1", "l2");
  });

  it("a failed save changes nothing on the page", async () => {
    api.updateFlashcardLabelApi.mockRejectedValue(new Error("409"));
    const { user, onChanged } = setup();
    await user.click(screen.getByRole("button", { name: "Sửa Ngữ pháp" }));
    await user.type(screen.getByRole("textbox", { name: "Tên nhãn" }), "x{Enter}");
    await waitFor(() => expect(api.updateFlashcardLabelApi).toHaveBeenCalled());
    expect(onChanged).not.toHaveBeenCalled();
  });
});
