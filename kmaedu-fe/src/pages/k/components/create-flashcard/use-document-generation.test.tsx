// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const toast = vi.hoisted(() => ({ success: vi.fn(), error: vi.fn() }));
const pdf = vi.hoisted(() => ({ options: null as null | { setFile: (f: File | null) => void; clear: () => void }, pickFile: vi.fn() }));
vi.mock("@/components/antd/toast", () => ({ toast }));
vi.mock("@/hooks/useGenerationGuard", () => ({ useGenerationGuard: () => {} }));
vi.mock("@/components/organisms/k/ai-tool/use-pdf-file-handlers", () => ({
  usePdfFileHandlers: (options: typeof pdf.options) => {
    pdf.options = options;
    return { pickFile: pdf.pickFile, removeFile: vi.fn(), canGenerate: async () => true };
  },
}));
// Small stand-ins for the AI tool's stores: only the fields and actions the create page uses.
vi.mock("@/stores/useAIGeneratorStore", async () => {
  const { create } = await import("zustand");
  const result = { file: null, uploadId: null, fileInfo: null, generatedCards: null, generatedCardsId: null };
  const useFlashcardGeneratorStore = create<Record<string, unknown>>((set) => ({
    ...result,
    isGenerating: false,
    cardCount: 30,
    keyword: "toán",
    setFile: (file: File | null) => set({ file }),
    clearResult: vi.fn(() => set(result)),
    clearFlashcards: vi.fn(() => set({ ...result, cardCount: 15, keyword: "" })),
    generateFlashcards: vi.fn(async () => set({ isGenerating: true })),
  }));
  const useTestGeneratorStore = create<Record<string, unknown>>(() => ({ isGenerating: false, file: null }));
  const useJobStore = create<Record<string, unknown>>(() => ({ currentJobId: null, cancelCurrentJob: vi.fn() }));
  return { useFlashcardGeneratorStore, useTestGeneratorStore, useJobStore };
});

const stores = await import("@/stores/useAIGeneratorStore");
const { useDocumentGeneration } = await import("./use-document-generation");

type SaveHistory = (historyId: string) => Promise<"ok" | "partial" | "create-failed" | undefined>;
const gen = stores.useFlashcardGeneratorStore as unknown as { getState: () => Record<string, any>; setState: (s: Record<string, unknown>) => void };
const test = stores.useTestGeneratorStore as unknown as { getState: () => Record<string, any>; setState: (s: Record<string, unknown>) => void };

const pdfFile = new File(["%PDF"], "bai-giang.pdf", { type: "application/pdf" });
const jobEnds = (over: Record<string, unknown> = {}) =>
  act(() => gen.setState({ isGenerating: false, generatedCardsId: "h1", generatedCards: [{ q: 1 }, { q: 2 }], ...over }));

beforeEach(() => {
  vi.clearAllMocks();
  gen.setState({ file: pdfFile, uploadId: null, fileInfo: null, generatedCards: null, generatedCardsId: null, isGenerating: false, cardCount: 30, keyword: "toán" });
  test.setState({ isGenerating: false, file: pdfFile });
});

async function started(saveHistory = vi.fn<SaveHistory>(async () => "ok")) {
  const hook = renderHook(() => useDocumentGeneration(saveHistory));
  await act(async () => {
    await hook.result.current.start();
  });
  return { ...hook, saveHistory };
}

describe("useDocumentGeneration", () => {
  it("starts the AI job quietly (this page says done once, when the set is saved)", async () => {
    await started();
    expect(gen.getState().generateFlashcards).toHaveBeenCalledWith({ quiet: true });
  });

  it("saves the cards when the job it started ends, then forgets the result and the shared file, settings kept", async () => {
    const { saveHistory } = await started();
    jobEnds();
    await waitFor(() => expect(saveHistory).toHaveBeenCalledWith("h1"));
    await waitFor(() => expect(gen.getState().generatedCardsId).toBeNull());
    expect({ file: gen.getState().file, cardCount: gen.getState().cardCount, keyword: gen.getState().keyword }).toEqual({ file: null, cardCount: 30, keyword: "toán" });
    expect(test.getState().file).toBeNull(); // the AI tool page no longer shows the saved file
  });

  it("keeps the result when the save did not go through in full, to save it again", async () => {
    const { saveHistory } = await started(vi.fn<SaveHistory>(async () => "partial"));
    jobEnds();
    await waitFor(() => expect(saveHistory).toHaveBeenCalled());
    expect(gen.getState().clearResult).not.toHaveBeenCalled();
    expect(gen.getState().generatedCardsId).toBe("h1");
  });

  it("does not save a job started elsewhere (the AI tool page)", async () => {
    const saveHistory = vi.fn<SaveHistory>(async () => "ok");
    renderHook(() => useDocumentGeneration(saveHistory));
    act(() => gen.setState({ isGenerating: true }));
    jobEnds();
    expect(saveHistory).not.toHaveBeenCalled();
  });

  it("says so when the job returned cards without a history entry to save them from", async () => {
    const { saveHistory } = await started();
    jobEnds({ generatedCardsId: null });
    await waitFor(() => expect(toast.error).toHaveBeenCalledWith("Chưa lưu được thẻ AI vừa tạo", expect.anything()));
    expect(saveHistory).not.toHaveBeenCalled();
  });

  it("a new file drops the previous result but keeps the AI settings", () => {
    renderHook(() => useDocumentGeneration(vi.fn()));
    act(() => pdf.options!.setFile(new File(["%PDF"], "khac.pdf")));
    expect(gen.getState().clearResult).toHaveBeenCalled();
    expect(gen.getState().clearFlashcards).not.toHaveBeenCalled();
    expect(gen.getState().cardCount).toBe(30);
  });

  it("ignores a second file dropped while the first one is still being checked", async () => {
    let finish!: () => void;
    pdf.pickFile.mockReturnValue(new Promise<void>((resolve) => (finish = resolve)));
    const { result } = renderHook(() => useDocumentGeneration(vi.fn()));
    let first!: Promise<unknown>;
    act(() => {
      first = result.current.pickFile(pdfFile);
      void result.current.pickFile(new File(["%PDF"], "b.pdf"));
    });
    expect(result.current.checking).toBe(true);
    expect(pdf.pickFile).toHaveBeenCalledTimes(1);
    await act(async () => {
      finish();
      await first;
    });
    expect(result.current.checking).toBe(false);
  });
});
