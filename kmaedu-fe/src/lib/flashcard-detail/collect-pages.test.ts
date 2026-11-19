import { describe, expect, it } from "vitest";
import type { Flashcard } from "@/types/flashcardSet";
import { COLLECT_CONCURRENCY, PAGE_LIMIT, collectPages } from "./flashcard-detail";

const card = (id: string, question: string, answer: string, label?: { id: string; name: string }): Flashcard => ({
  id,
  question,
  answer,
  createdAt: "",
  updatedAt: "",
  label: label ? { ...label, color: null } : undefined,
});

describe("collectPages", () => {
  const pages = (total: number, limit: number) => (page: number, lim: number) => {
    expect(lim).toBe(limit);
    const all = Array.from({ length: total }, (_, i) => card(String(i + 1), `q${i + 1}`, "a"));
    return Promise.resolve({ flashCards: all.slice((page - 1) * lim, page * lim), pagination: { totalPages: Math.max(1, Math.ceil(total / lim)) } });
  };
  it("reads every page in order", async () => {
    const got = await collectPages(pages(230, PAGE_LIMIT));
    expect(got).toHaveLength(230);
    expect(got[0].id).toBe("1");
    expect(got[229].id).toBe("230");
  });
  it("starts no new page read once one page has failed", async () => {
    const started: number[] = [];
    const run = collectPages(async (page) => {
      started.push(page);
      if (page === 1) return { flashCards: [card("1", "q1", "a")], pagination: { totalPages: 8 } };
      if (page === 2) throw new Error("429");
      await new Promise((r) => setTimeout(r, 5));
      return { flashCards: [card(String(page), `q${page}`, "a")], pagination: { totalPages: 8 } };
    });
    await expect(run).rejects.toThrow("429");
    await new Promise((r) => setTimeout(r, 30));
    expect(started.every((page) => page <= 1 + COLLECT_CONCURRENCY)).toBe(true);
  });
  it("asks for no more page once the read is no longer wanted (a newer one replaced it)", async () => {
    const started: number[] = [];
    let wanted = true;
    await collectPages(async (page) => {
      started.push(page);
      wanted = false; // replaced right after page 1 came back
      return { flashCards: [card(String(page), "q", "a")], pagination: { totalPages: 6 } };
    }, () => !wanted);
    expect(started).toEqual([1]);
  });
  it("handles a set with no card and a single page", async () => {
    expect(await collectPages(pages(0, PAGE_LIMIT))).toEqual([]);
    expect(await collectPages(pages(7, PAGE_LIMIT))).toHaveLength(7);
  });
  it("drops a card that a later page returns again (unstable server order) and keeps the first copy", async () => {
    const got = await collectPages(async (page) => {
      if (page === 1) return { flashCards: [card("1", "q1", "a"), card("2", "q2", "a")], pagination: { totalPages: 2 } };
      return { flashCards: [card("2", "q2-again", "a"), card("3", "q3", "a")], pagination: { totalPages: 2 } };
    });
    expect(got.map((c) => c.id)).toEqual(["1", "2", "3"]);
    expect(got[1].question).toBe("q2");
  });
  it("never has more than COLLECT_CONCURRENCY page reads in flight and still joins pages in order", async () => {
    let inFlight = 0;
    let peak = 0;
    const got = await collectPages(async (page) => {
      inFlight += 1;
      peak = Math.max(peak, inFlight);
      await new Promise((resolve) => setTimeout(resolve, 5 - (page % 3))); // finish out of order
      inFlight -= 1;
      return { flashCards: [card(`p${page}`, "q", "a")], pagination: { totalPages: 12 } };
    });
    expect(peak).toBeLessThanOrEqual(COLLECT_CONCURRENCY);
    expect(peak).toBeGreaterThan(1);
    expect(got.map((c) => c.id)).toEqual(Array.from({ length: 12 }, (_, i) => `p${i + 1}`));
  });
  it("lets a failing page reject the whole read", async () => {
    await expect(collectPages(async (page) => {
      if (page === 2) throw new Error("boom");
      return { flashCards: [], pagination: { totalPages: 3 } };
    })).rejects.toThrow("boom");
  });
});
