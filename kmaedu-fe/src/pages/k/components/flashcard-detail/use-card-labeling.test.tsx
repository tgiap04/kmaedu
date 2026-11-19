// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { FlashcardSetLabel } from "@/apis/flashcardSetApi";
import type { Flashcard } from "@/types/flashcardSet";

const api = vi.hoisted(() => ({ createFlashcardLabelApi: vi.fn() }));
const toast = vi.hoisted(() => ({ error: vi.fn(), success: vi.fn() }));
const invalidateCache = vi.hoisted(() => vi.fn());
vi.mock("@/apis/flashcardSetApi", () => api);
vi.mock("@/components/antd/toast", () => ({ toast }));
vi.mock("@/stores/useFlashcardSetStore", () => ({ useFlashcardSetStore: (pick: (s: unknown) => unknown) => pick({ invalidateCache }) }));

const { useCardLabeling } = await import("./use-card-labeling");

const label = (id: string, order: number, createdAt = "2026-01-01"): FlashcardSetLabel =>
  ({ id, flashCardSetId: "s1", name: id, description: null, color: null, order, createdAt, updatedAt: createdAt }) as FlashcardSetLabel;
const card = { id: "c1", question: "q", answer: "a", createdAt: "", updatedAt: "" } as Flashcard;

function setup(labels = [label("b", 1), label("a", 0)]) {
  const cards = { assignLabel: vi.fn(async () => true), relabel: vi.fn() };
  const set = { labels, reloadLabels: vi.fn(async () => undefined), patchLabels: vi.fn() };
  const { result } = renderHook(() => useCardLabeling("s1", cards, set));
  return { result, cards, set };
}

beforeEach(() => vi.clearAllMocks());

describe("useCardLabeling", () => {
  it("lists the labels in set order", () => {
    expect(setup().result.current.labels.map((l) => l.id)).toEqual(["a", "b"]);
  });

  it("creates a label after the others, in the next palette colour, then assigns it and reloads the list", async () => {
    const made = label("new", 2);
    api.createFlashcardLabelApi.mockResolvedValue({ label: made });
    const { result, cards, set } = setup();
    let ok: boolean | undefined;
    await act(async () => {
      ok = await result.current.create(card, "Đại số");
    });
    expect(api.createFlashcardLabelApi).toHaveBeenCalledWith("s1", expect.objectContaining({ name: "Đại số", order: 2, color: expect.stringMatching(/^#/) }));
    expect(cards.assignLabel).toHaveBeenCalledWith(card, made, expect.any(String));
    expect(set.reloadLabels).toHaveBeenCalled();
    expect(invalidateCache).toHaveBeenCalled();
    expect(ok).toBe(true);
  });

  it("a refused create (the name exists) says so, reloads the list to show that label, assigns nothing", async () => {
    api.createFlashcardLabelApi.mockRejectedValue(new Error("Nhãn với tên này đã tồn tại"));
    const { result, cards, set } = setup();
    let ok: boolean | undefined;
    await act(async () => {
      ok = await result.current.create(card, "a");
    });
    expect(ok).toBe(false);
    expect(toast.error).toHaveBeenCalledWith("Tạo nhãn thất bại", { description: "Nhãn với tên này đã tồn tại" });
    expect(cards.assignLabel).not.toHaveBeenCalled();
    expect(set.reloadLabels).toHaveBeenCalled();
  });

  it("a failed assign reloads the labels (the label may be gone)", async () => {
    const { result, cards, set } = setup();
    cards.assignLabel.mockResolvedValue(false);
    await act(async () => {
      await result.current.assign(card, "a");
    });
    expect(set.reloadLabels).toHaveBeenCalled();
  });

  it("an unknown label is not sent, and the list is read again", async () => {
    const { result, cards, set } = setup();
    let ok: boolean | undefined;
    await act(async () => {
      ok = await result.current.assign(card, "gone");
    });
    expect({ ok, assigned: cards.assignLabel.mock.calls.length, reloaded: set.reloadLabels.mock.calls.length }).toEqual({ ok: false, assigned: 0, reloaded: 1 });
  });

  it("a saved label is patched onto the list and the cards before the list is read again", async () => {
    const { result, cards, set } = setup();
    const change = { labelId: "a", label: { id: "a", name: "Mới", color: "#EF4444" } };
    await act(async () => {
      await result.current.onLabelsChanged(change);
    });
    expect(set.patchLabels).toHaveBeenCalledWith(change);
    expect(cards.relabel).toHaveBeenCalledWith("a", change.label);
    expect(set.reloadLabels).toHaveBeenCalled();
  });

  it("a new label touches no card", async () => {
    const { result, cards, set } = setup();
    await act(async () => {
      await result.current.onLabelsChanged();
    });
    expect(cards.relabel).not.toHaveBeenCalled();
    expect(set.patchLabels).not.toHaveBeenCalled();
    expect(set.reloadLabels).toHaveBeenCalled();
  });
});
