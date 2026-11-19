import { describe, expect, it, vi } from "vitest";
import { BATCH_SIZE } from "./flashcard-create-logic";
import { PartialSaveError, saveCardsInBatches } from "./save-cards-in-batches";

const cards = (n: number) => Array.from({ length: n }, (_, i) => ({ question: `q${i}`, answer: `a${i}` }));

describe("saveCardsInBatches", () => {
  it("does nothing for no cards", async () => {
    const add = vi.fn();
    expect(await saveCardsInBatches("S", [], add)).toBe(0);
    expect(add).not.toHaveBeenCalled();
  });

  it("sends the cards in order, one batch at a time, into the one set", async () => {
    const sizes: number[] = [];
    const add = vi.fn(async ({ flashcards }: { flashcardsetIds: string[]; flashcards: { question: string }[] }) => {
      sizes.push(flashcards.length);
    });
    const total = BATCH_SIZE * 2 + 3;
    expect(await saveCardsInBatches("S", cards(total), add)).toBe(total);
    expect(sizes).toEqual([BATCH_SIZE, BATCH_SIZE, 3]);
    expect(add.mock.calls.every(([arg]) => arg.flashcardsetIds.length === 1 && arg.flashcardsetIds[0] === "S")).toBe(true);
    expect(add.mock.calls[2][0].flashcards[0].question).toBe(`q${BATCH_SIZE * 2}`);
  });

  it("stops at the first failing batch and reports how many cards were already saved", async () => {
    let call = 0;
    const add = vi.fn(async () => {
      if (++call === 2) throw new Error("boom");
    });
    const error = await saveCardsInBatches("S", cards(BATCH_SIZE * 3), add).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(PartialSaveError);
    expect((error as PartialSaveError).added).toBe(BATCH_SIZE);
    expect((error as PartialSaveError).message).toContain("boom");
    expect(add).toHaveBeenCalledTimes(2);
  });

  it("reports zero saved when the first batch fails", async () => {
    const error = await saveCardsInBatches("S", cards(2), async () => {
      throw new Error("down");
    }).catch((e: unknown) => e);
    expect((error as PartialSaveError).added).toBe(0);
  });
});

describe("saveCardsInBatches waits and tries a batch again on 429", () => {
  const cards = Array.from({ length: 3 }, (_, i) => ({ question: `q${i}`, answer: "a" }));
  const tooMany = () => Object.assign(new Error("Too Many Requests"), { status: 429 });
  it("retries the same batch after a wait that grows, then goes on", async () => {
    const waits: number[] = [];
    let calls = 0;
    const added = await saveCardsInBatches("s", cards, async () => {
      calls++;
      if (calls <= 2) throw tooMany();
    }, { wait: async (ms) => void waits.push(ms) });
    expect({ added, calls, waits }).toEqual({ added: 3, calls: 3, waits: [2000, 4000] });
  });
  it("gives up after the retries and reports what got in", async () => {
    const err = await saveCardsInBatches("s", cards, async () => {
      throw tooMany();
    }, { retries: 2, wait: async () => {} }).catch((e) => e);
    expect(err).toBeInstanceOf(PartialSaveError);
    expect((err as PartialSaveError).added).toBe(0);
  });
  it("does not retry any other error", async () => {
    let calls = 0;
    await saveCardsInBatches("s", cards, async () => {
      calls++;
      throw Object.assign(new Error("bad"), { status: 400 });
    }, { wait: async () => {} }).catch(() => {});
    expect(calls).toBe(1);
  });
});
