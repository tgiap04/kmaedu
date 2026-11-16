import { describe, expect, it } from "vitest";
import { describeGenerationSteps } from "./generation-steps";

const states = (steps: ReturnType<typeof describeGenerationSteps>) => steps.map((s) => `${s.key}:${s.state}`);

describe("describeGenerationSteps", () => {
  it("shows the request as the active step before any report arrives", () => {
    const steps = describeGenerationSteps(null, "câu hỏi");
    expect(states(steps)[0]).toBe("queued:active");
    expect(steps.slice(1).every((s) => s.state === "pending")).toBe(true);
  });

  it("marks earlier steps done, the reported one active and later ones pending", () => {
    const steps = describeGenerationSteps({ stage: "planning", at: 1 }, "câu hỏi");
    expect(states(steps)).toEqual([
      "queued:done",
      "uploading:done",
      "processing_document:done",
      "waiting_graph:done",
      "planning:active",
      "generating:pending",
      "reviewing:pending",
    ]);
  });

  it("counts the finished model calls while generating, with the item word in the label", () => {
    const steps = describeGenerationSteps({ stage: "generating", at: 1, done: 1, total: 3 }, "flashcard");
    const active = steps.find((s) => s.state === "active")!;
    expect(active.label).toBe("Tạo flashcard");
    expect(active.detail).toBe("Đã xong 1/3 lượt");
  });

  it("turns graph-wait counters into minutes", () => {
    const steps = describeGenerationSteps({ stage: "waiting_graph", at: 1, waited: 4, maxWaits: 40 }, "câu hỏi");
    expect(steps.find((s) => s.state === "active")!.detail).toBe("Đã chờ khoảng 2 phút (tối đa 20 phút)");
  });

  it("has no detail when the counters are missing", () => {
    const steps = describeGenerationSteps({ stage: "generating", at: 1 }, "câu hỏi");
    expect(steps.find((s) => s.state === "active")!.detail).toBeUndefined();
  });

  it("keeps the request step active for a stage it does not know", () => {
    const steps = describeGenerationSteps({ stage: "something_new", at: 1 }, "câu hỏi");
    expect(states(steps)[0]).toBe("queued:active");
  });

  it("shows the upload to storage as its own step right after the request", () => {
    const steps = describeGenerationSteps({ stage: "uploading", at: 1 }, "câu hỏi");
    expect(states(steps).slice(0, 3)).toEqual(["queued:done", "uploading:active", "processing_document:pending"]);
    expect(steps[1].label).toBe("Tải tài liệu lên kho lưu trữ");
  });
});
