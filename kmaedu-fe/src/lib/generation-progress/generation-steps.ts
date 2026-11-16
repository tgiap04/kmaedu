/** Newest `ai.generation.progress` of a job, as `GET /ai/job/:id` returns it. */
export interface GenerationProgress {
  stage: string;
  at: number;
  done?: number;
  total?: number;
  waited?: number;
  maxWaits?: number;
}

export type GenerationStepState = "done" | "active" | "pending";

export interface GenerationStep {
  key: string;
  label: string;
  detail?: string;
  state: GenerationStepState;
}

/** ai-service waits for the graph in 30 s hops (its retry tier). */
const WAIT_HOP_MINUTES = 0.5;

/** In the order ai-service runs them; a step it skips (already OCR'd, graph ready) shows as done. */
const STEPS: Array<{ key: string; label: (itemWord: string) => string }> = [
  { key: "queued", label: () => "Gửi yêu cầu" },
  { key: "processing_document", label: () => "Đọc và tách nội dung tài liệu" },
  { key: "waiting_graph", label: () => "Phân tích tài liệu, dựng đồ thị kiến thức" },
  { key: "planning", label: () => "Lập kế hoạch theo chủ đề" },
  { key: "generating", label: (itemWord) => `Tạo ${itemWord}` },
  { key: "reviewing", label: () => "Lọc trùng và kiểm tra" },
];

function minutes(hops: number): number {
  return Math.max(1, Math.round(hops * WAIT_HOP_MINUTES));
}

function detailOf(progress: GenerationProgress): string | undefined {
  if (progress.stage === "generating" && progress.total) {
    return `Đã xong ${progress.done ?? 0}/${progress.total} lượt`;
  }
  if (progress.stage === "waiting_graph" && progress.waited && progress.maxWaits) {
    return `Đã chờ khoảng ${minutes(progress.waited)} phút (tối đa ${minutes(progress.maxWaits)} phút)`;
  }
  return undefined;
}

/** The step list for the loading panel: everything before the reported stage is done. */
export function describeGenerationSteps(progress: GenerationProgress | null | undefined, itemWord: string): GenerationStep[] {
  const reported = progress ? STEPS.findIndex((step) => step.key === progress.stage) : -1;
  const activeIndex = Math.max(0, reported);
  return STEPS.map((step, index) => {
    const state: GenerationStepState = index < activeIndex ? "done" : index === activeIndex ? "active" : "pending";
    const detail = state === "active" && progress && reported >= 0 ? detailOf(progress) : undefined;
    return { key: step.key, label: step.label(itemWord), state, ...(detail ? { detail } : {}) };
  });
}
