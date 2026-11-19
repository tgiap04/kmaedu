import { useEffect, useRef, useState } from "react";
import { toast } from "@/components/antd/toast";
import { useGenerationGuard } from "@/hooks/useGenerationGuard";
import { usePdfFileHandlers } from "@/components/organisms/k/ai-tool/use-pdf-file-handlers";
import { singleFlight } from "@/lib/single-flight";
import { useFlashcardGeneratorStore, useJobStore, useTestGeneratorStore } from "@/stores/useAIGeneratorStore";
import { aiJobBlock, onJobEnd } from "./flashcard-flow-logic";
import type { SubmitStatus } from "./use-create-flashcard-submit";

/**
 * The "Từ tài liệu" tab. The AI machinery of the AI tool page (upload, job polling, result) is reused as is;
 * this adds what the create page needs on top: save the cards when the job ends (only if the user asked on
 * this page), refuse to start while another AI job holds the shared job slot, and ignore a second click
 * while the file is still being checked.
 */
export function useDocumentGeneration(saveHistory: (historyId: string) => Promise<SubmitStatus | undefined>) {
  const gen = useFlashcardGeneratorStore();
  const testGenerating = useTestGeneratorStore((s) => s.isGenerating);
  const hasJob = useJobStore((s) => !!s.currentJobId);
  useGenerationGuard(gen.isGenerating);
  const { pickFile, removeFile, canGenerate: pdfOk } = usePdfFileHandlers({
    file: gen.file,
    setFile: (file) => {
      gen.clearResult(); // a new file must not keep the cards of the previous one (the settings stay)
      gen.setFile(file);
    },
    clear: gen.clearResult,
  });
  // A second drop while the first file is still being checked is ignored (the checks would race).
  const [pickGuard] = useState(singleFlight);
  const [checking, setChecking] = useState(false);
  const pick = (file: File) =>
    pickGuard(async () => {
      setChecking(true);
      try {
        await pickFile(file);
      } finally {
        setChecking(false);
      }
    });
  const [wantsSave, setWantsSave] = useState(false); // the user pressed the button on this page before the job finished
  const wasGenerating = useRef(gen.isGenerating);
  const [guard] = useState(singleFlight);

  const resultCount = gen.generatedCardsId && gen.generatedCards ? gen.generatedCards.length : 0;
  const blocked = resultCount === 0 && aiJobBlock({ testGenerating, flashcardGenerating: gen.isGenerating, hasJob });

  /** Saved in full: forget the result and the file (the AI tool page shares it, so it is cleared there too). */
  const forgetSaved = () => {
    const { file, clearResult } = useFlashcardGeneratorStore.getState();
    clearResult();
    if (file && useTestGeneratorStore.getState().file === file) useTestGeneratorStore.setState({ file: null, uploadId: null, fileInfo: null });
  };
  const saveResult = async () => {
    const { generatedCardsId } = useFlashcardGeneratorStore.getState();
    // Only a full save forgets the cards: after a failed one they stay here, to save again into the same set.
    if (generatedCardsId && (await saveHistory(generatedCardsId)) === "ok") forgetSaved();
  };

  // The job ended: save its cards if the user asked (a failure was already toasted by the store).
  useEffect(() => {
    const action = onJobEnd({ wasGenerating: wasGenerating.current, isGenerating: gen.isGenerating, wantsSave, historyId: gen.generatedCardsId, cardCount: gen.generatedCards?.length ?? 0 });
    wasGenerating.current = gen.isGenerating;
    if (action === "wait") return;
    setWantsSave(false);
    if (action === "save") void saveResult();
    else if (action === "empty") toast.error("AI không tạo được thẻ nào", { description: "Thử lại với file khác hoặc đổi từ khóa." });
    else if (action === "unsaved") toast.error("Chưa lưu được thẻ AI vừa tạo", { description: "Kết quả không có mã lịch sử để lưu vào bộ thẻ. Bấm \"Tạo Flashcard\" để thử lại." });
  }, [gen.isGenerating]); // eslint-disable-line react-hooks/exhaustive-deps

  /** Start the AI job; the cards are saved when it ends. */
  const start = () =>
    guard(async () => {
      if (!(await pdfOk())) return;
      // Read the stores now: another job may have started while the file was being checked.
      const other = aiJobBlock({
        testGenerating: useTestGeneratorStore.getState().isGenerating,
        flashcardGenerating: useFlashcardGeneratorStore.getState().isGenerating,
        hasJob: !!useJobStore.getState().currentJobId,
      });
      if (other) return;
      setWantsSave(true);
      await gen.generateFlashcards({ quiet: true }); // this page says "done" once, when the set is saved
      if (!useFlashcardGeneratorStore.getState().isGenerating) setWantsSave(false); // refused before it started
    });

  const cancel = async () => {
    setWantsSave(false);
    await useJobStore.getState().cancelCurrentJob();
    useFlashcardGeneratorStore.setState({ isGenerating: false });
  };

  return {
    gen,
    hasJob,
    pickFile: pick,
    checking,
    removeFile,
    resultCount,
    blocked,
    hasFile: !!gen.file || !!gen.uploadId,
    /** This page started the running job, so the tabs stay put until it ends. */
    startedHere: wantsSave && gen.isGenerating,
    saveResult,
    start,
    cancel,
  };
}
