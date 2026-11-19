import { BATCH_BYTES, BATCH_SIZE, batchCards } from "./flashcard-create-logic";

export interface CardInput {
  question: string;
  answer: string;
}
export type AddCards = (args: { flashcardsetIds: string[]; flashcards: CardInput[] }) => Promise<unknown>;

/** A batch failed: `added` cards of the earlier batches are already in the set. */
export class PartialSaveError extends Error {
  constructor(message: string, readonly added: number, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "PartialSaveError";
  }
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));
const isRateLimited = (error: unknown) => (error as { status?: unknown } | null)?.status === 429;

/**
 * Adds the cards to the set a batch at a time, in order; stops at the first failing batch. Returns how many were
 * saved. A batch the gateway turns away for rate (429, a big set sends many requests) is tried again after
 * 2 s, 4 s, 8 s… up to `retries` times; any other error stops at once.
 */
export async function saveCardsInBatches(
  setId: string,
  cards: CardInput[],
  add: AddCards,
  { retries = 3, wait = sleep }: { retries?: number; wait?: (ms: number) => Promise<void> } = {},
): Promise<number> {
  let added = 0;
  for (const batch of batchCards(cards, BATCH_SIZE, BATCH_BYTES)) {
    for (let attempt = 0; ; attempt++) {
      try {
        await add({ flashcardsetIds: [setId], flashcards: batch });
        break;
      } catch (error) {
        if (isRateLimited(error) && attempt < retries) {
          await wait(2000 * 2 ** attempt);
          continue;
        }
        throw new PartialSaveError(error instanceof Error ? error.message : String(error), added, { cause: error });
      }
    }
    added += batch.length;
  }
  return added;
}
