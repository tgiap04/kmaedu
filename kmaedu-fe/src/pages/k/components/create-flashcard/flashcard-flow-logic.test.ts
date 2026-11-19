import { describe, expect, it, vi } from "vitest";
import { ApiRequestError } from "@/apis/api";
import { aiJobBlock, createAndFill, createFailureMessage, onJobEnd, pathAfterCreate } from "./flashcard-flow-logic";
import { PartialSaveError } from "./save-cards-in-batches";

describe("createAndFill", () => {
  it("creates the set and does not fill when there is nothing to fill with", async () => {
    const create = vi.fn().mockResolvedValue("s1");
    expect(await createAndFill({ create })).toEqual({ status: "ok", setId: "s1", message: undefined });
  });

  it("fills the set that was just created and returns the fill message", async () => {
    const fill = vi.fn().mockResolvedValue("Đã tạo bộ thẻ với 3 thẻ");
    const result = await createAndFill({ create: async () => "s1", fill });
    expect(fill).toHaveBeenCalledWith("s1");
    expect(result).toEqual({ status: "ok", setId: "s1", message: "Đã tạo bộ thẻ với 3 thẻ" });
  });

  it("reports a failed create without ever calling fill", async () => {
    const fill = vi.fn();
    const boom = new Error("403");
    const result = await createAndFill({ create: async () => { throw boom; }, fill });
    expect(result).toEqual({ status: "create-failed", setId: null, error: boom });
    expect(fill).not.toHaveBeenCalled();
  });

  it("keeps the created set when the fill fails and says how many cards got in", async () => {
    const err = new PartialSaveError("batch 2 failed", 50);
    const result = await createAndFill({ create: async () => "s1", fill: async () => { throw err; } });
    expect(result).toEqual({ status: "partial", setId: "s1", added: 50, error: err });
  });

  it("does not know the card count when the fill fails for another reason", async () => {
    const err = new Error("history missing");
    const result = await createAndFill({ create: async () => "s1", fill: async () => { throw err; } });
    expect(result).toEqual({ status: "partial", setId: "s1", added: null, error: err });
  });
});

describe("pathAfterCreate", () => {
  it("opens the new set when the set exists, even if filling failed", () => {
    expect(pathAfterCreate({ status: "ok", setId: "s1" }, true)).toBe("/k/manage-flashcard-set/s1");
    expect(pathAfterCreate({ status: "partial", setId: "s1", added: 0, error: null }, true)).toBe("/k/manage-flashcard-set/s1");
  });
  it("stays where it is when the set could not be created", () => {
    expect(pathAfterCreate({ status: "create-failed", setId: null, error: null }, true)).toBeNull();
  });
  it("does not pull a user who already left the page", () => {
    expect(pathAfterCreate({ status: "ok", setId: "s1" }, false)).toBeNull();
    expect(pathAfterCreate({ status: "partial", setId: "s1", added: 1, error: null }, false)).toBeNull();
  });
});

describe("onJobEnd (auto-save when the AI job ends)", () => {
  const ended = { wasGenerating: true, isGenerating: false, wantsSave: true, historyId: "h1", cardCount: 12 };
  it("waits while the job runs, and before it ever ran", () => {
    expect(onJobEnd({ ...ended, isGenerating: true })).toBe("wait");
    expect(onJobEnd({ ...ended, wasGenerating: false })).toBe("wait");
  });
  it("saves the cards of a finished job the user asked to save", () => {
    expect(onJobEnd(ended)).toBe("save");
  });
  it("skips when the user did not ask (job started elsewhere) or cancelled", () => {
    expect(onJobEnd({ ...ended, wantsSave: false })).toBe("skip");
  });
  it("skips a failed job: no history id, the store already showed the error", () => {
    expect(onJobEnd({ ...ended, historyId: null, cardCount: 0 })).toBe("skip");
  });
  it("says so when a job made cards but no history entry to save them from", () => {
    expect(onJobEnd({ ...ended, historyId: null })).toBe("unsaved");
  });
  it("does not make a set for a job that produced a history entry with 0 cards", () => {
    expect(onJobEnd({ ...ended, cardCount: 0 })).toBe("empty");
  });
});

describe("aiJobBlock (another AI job owns the shared job slot)", () => {
  it("is free when nothing runs", () => {
    expect(aiJobBlock({ testGenerating: false, flashcardGenerating: false, hasJob: false })).toBe(false);
  });
  it("blocks while the quiz-generator job runs", () => {
    expect(aiJobBlock({ testGenerating: true, flashcardGenerating: false, hasJob: true })).toBe(true);
  });
  it("blocks while a job id is held but no flashcard job is running", () => {
    expect(aiJobBlock({ testGenerating: false, flashcardGenerating: false, hasJob: true })).toBe(true);
  });
  it("does not block a flashcard job's own run (a resumed job marks both stores)", () => {
    expect(aiJobBlock({ testGenerating: false, flashcardGenerating: true, hasJob: true })).toBe(false);
    expect(aiJobBlock({ testGenerating: true, flashcardGenerating: true, hasJob: true })).toBe(false);
  });
});

describe("createAndFill into a set made before (retrying a save)", () => {
  it("fills that set and creates none", async () => {
    let created = 0;
    const filled: string[] = [];
    const result = await createAndFill({
      create: async () => {
        created++;
        return "new";
      },
      fill: async (setId) => {
        filled.push(setId);
        return "ok";
      },
      existingSetId: "kept",
    });
    expect({ created, filled, result }).toEqual({ created: 0, filled: ["kept"], result: { status: "ok", setId: "kept", message: "ok" } });
  });
});

describe("createFailureMessage", () => {
  const err = (status?: number) => Object.assign(new ApiRequestError("Network Error"), { status });
  it("warns that the set may exist when no answer came back (a retry could make a copy)", () => {
    const m = createFailureMessage(err(undefined));
    expect(m.title).toMatch(/Không rõ/);
    expect(m.description).toMatch(/kiểm tra danh sách/i);
  });
  it("is a plain failure when the server answered", () => {
    expect(createFailureMessage(err(400)).title).toBe("Tạo bộ thẻ thất bại");
  });
});
