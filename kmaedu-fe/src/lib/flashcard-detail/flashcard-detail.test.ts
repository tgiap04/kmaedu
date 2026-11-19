import { describe, expect, it } from "vitest";
import type { Flashcard } from "@/types/flashcardSet";
import { ALL_CARDS, UNLABELED, completionRate, copyPayload, filterCards, formatStudyTime, hasContent, labelCounts, isSimpleHtml, relabelCards, pageNumbers, pageOf, studiedCount, textToHtml } from "./flashcard-detail";

const card = (id: string, question: string, answer: string, label?: { id: string; name: string }): Flashcard => ({
  id,
  question,
  answer,
  createdAt: "",
  updatedAt: "",
  label: label ? { ...label, color: null } : undefined,
});

describe("formatStudyTime", () => {
  it("is 0 phút without cards", () => expect(formatStudyTime(0)).toBe("0 phút"));
  it("rounds a single card (36 s) up to 1 phút", () => expect(formatStudyTime(1)).toBe("1 phút"));
  it("gives 30 phút for 50 cards", () => expect(formatStudyTime(50)).toBe("30 phút"));
  it("rounds to the nearest minute", () => {
    expect(formatStudyTime(5)).toBe("3 phút"); // 180 s
    expect(formatStudyTime(7)).toBe("4 phút"); // 252 s = 4.2
    expect(formatStudyTime(8)).toBe("5 phút"); // 288 s = 4.8
  });
  it("switches to hours at 60 phút", () => {
    expect(formatStudyTime(99)).toBe("59 phút");
    expect(formatStudyTime(100)).toBe("1 giờ");
    expect(formatStudyTime(108)).toBe("1 giờ 5 phút");
    expect(formatStudyTime(200)).toBe("2 giờ");
  });
  it("treats a negative or fractional count as no cards / whole cards", () => {
    expect(formatStudyTime(-3)).toBe("0 phút");
    expect(formatStudyTime(Number.NaN)).toBe("0 phút");
  });
});

describe("completionRate", () => {
  const ids = ["a", "b", "c", "d"];
  it("is null when there is no card", () => expect(completionRate(["a"], [])).toBeNull());
  it("is null when nothing was studied", () => expect(completionRate([], ids)).toBeNull());
  it("is the studied share, rounded", () => {
    expect(completionRate(["a", "b"], ids)).toBe(50);
    expect(completionRate(["a"], ["a", "b", "c"])).toBe(33);
    expect(completionRate(["a", "b"], ["a", "b", "c"])).toBe(67);
    expect(completionRate(ids, ids)).toBe(100);
  });
  it("ignores ids of cards that no longer exist and duplicates", () => {
    expect(completionRate(["a", "x", "y"], ids)).toBe(25);
    expect(completionRate(["a", "a", "a"], ids)).toBe(25);
    expect(completionRate(["x"], ids)).toBeNull();
  });
});

describe("filterCards", () => {
  const l1 = { id: "l1", name: "Linux" };
  const list = [
    card("1", "<p>Linux cơ bản</p>", "<p>Lệnh <b>pwd</b>, ls</p>", l1),
    card("2", "<p>Mạng máy tính</p>", "<p>Mô hình OSI</p>"),
    card("3", "<p>Đăng nhập</p>", "<p>Xác thực</p>", { id: "l2", name: "Bảo mật" }),
  ];
  it("keeps everything for all cards and an empty search", () => expect(filterCards(list, ALL_CARDS, "  ")).toHaveLength(3));
  it("filters by label id", () => expect(filterCards(list, "l1", "").map((c) => c.id)).toEqual(["1"]));
  it("filters the cards without a label", () => expect(filterCards(list, UNLABELED, "").map((c) => c.id)).toEqual(["2"]));
  it("searches both faces ignoring case, accents and tags", () => {
    expect(filterCards(list, ALL_CARDS, "MANG may").map((c) => c.id)).toEqual(["2"]);
    expect(filterCards(list, ALL_CARDS, "pwd").map((c) => c.id)).toEqual(["1"]);
    expect(filterCards(list, ALL_CARDS, "dang nhap").map((c) => c.id)).toEqual(["3"]);
    expect(filterCards(list, ALL_CARDS, "<b>")).toEqual([]);
  });
  it("combines the label and the search", () => {
    expect(filterCards(list, "l1", "osi")).toEqual([]);
    expect(filterCards(list, "l1", "linux").map((c) => c.id)).toEqual(["1"]);
  });
});

describe("labelCounts", () => {
  const l1 = { id: "l1", name: "Linux" };
  const l2 = { id: "l2", name: "Mạng" };
  it("is empty for no card", () => {
    const got = labelCounts([]);
    expect([...got.byLabel]).toEqual([]);
    expect(got.unlabeled).toBe(0);
  });
  it("counts the cards of each label and the cards without one", () => {
    const got = labelCounts([card("1", "q", "a", l1), card("2", "q", "a"), card("3", "q", "a", l1), card("4", "q", "a", l2), card("5", "q", "a")]);
    expect(got.byLabel.get("l1")).toBe(2);
    expect(got.byLabel.get("l2")).toBe(1);
    expect(got.byLabel.has("l3")).toBe(false);
    expect(got.unlabeled).toBe(2);
  });
  it("agrees with filterCards for every label", () => {
    const list = [card("1", "q", "a", l1), card("2", "q", "a"), card("3", "q", "a", l2)];
    const got = labelCounts(list);
    expect(got.byLabel.get("l1")).toBe(filterCards(list, "l1", "").length);
    expect(got.unlabeled).toBe(filterCards(list, UNLABELED, "").length);
  });
});

describe("relabelCards", () => {
  const list = [card("1", "a", "b", { id: "l1", name: "Cũ" }), card("2", "c", "d", { id: "l2", name: "Khác" }), card("3", "e", "f")];
  it("renames / recolours the label on every card that carries it, and only there", () => {
    const out = relabelCards(list, "l1", { id: "l1", name: "Mới", color: "#EF4444" });
    expect(out.map((c) => c.label?.name ?? null)).toEqual(["Mới", "Khác", null]);
    expect(out[0].label?.color).toBe("#EF4444");
  });
  it("takes a deleted label off its cards (they become unlabeled)", () => {
    const out = relabelCards(list, "l1", null);
    expect(out.map((c) => c.label?.id ?? null)).toEqual([null, "l2", null]);
  });
  it("leaves the list it was given untouched", () => {
    relabelCards(list, "l1", null);
    expect(list[0].label?.id).toBe("l1");
  });
});

describe("pageOf", () => {
  const list = Array.from({ length: 25 }, (_, i) => i + 1);
  it("slices a page", () => expect(pageOf(list, 2, 10)).toEqual({ rows: list.slice(10, 20), page: 2, totalPages: 3 }));
  it("keeps the short last page", () => expect(pageOf(list, 3, 10).rows).toEqual([21, 22, 23, 24, 25]));
  it("clamps a page past the end or before the start", () => {
    expect(pageOf(list, 9, 10).page).toBe(3);
    expect(pageOf(list, 0, 10).page).toBe(1);
  });
  it("has one empty page for an empty list", () => expect(pageOf([], 1, 10)).toEqual({ rows: [], page: 1, totalPages: 1 }));
  it("fits exactly on one page", () => expect(pageOf(list.slice(0, 10), 1, 10).totalPages).toBe(1));
});

describe("isSimpleHtml / textToHtml", () => {
  it("accepts empty content and plain paragraphs", () => {
    expect(isSimpleHtml("")).toBe(true);
    expect(isSimpleHtml("<p>Mạng máy tính</p>")).toBe(true);
    expect(isSimpleHtml("Linux")).toBe(true);
    expect(isSimpleHtml("<p>a &amp; b</p>")).toBe(true);
  });
  it("rejects formatting, images, lists and several paragraphs", () => {
    expect(isSimpleHtml("<p>Lệnh <b>pwd</b></p>")).toBe(false);
    expect(isSimpleHtml("<p><img src=\"x\"></p>")).toBe(false);
    expect(isSimpleHtml("<ul><li>a</li></ul>")).toBe(false);
    expect(isSimpleHtml("<p>a</p><p>b</p>")).toBe(false);
  });
  it("wraps typed text in a paragraph and escapes it", () => {
    expect(textToHtml("Linux")).toBe("<p>Linux</p>");
    expect(textToHtml("  a < b & c  ")).toBe("<p>a &lt; b &amp; c</p>");
    expect(textToHtml("   ")).toBe("");
  });
});

describe("copyPayload", () => {
  it("keeps the html of both faces and drops cards with an empty face", () => {
    const cards = [card("1", "<p>q</p>", "<p>a</p>"), card("2", "  ", "<p>a</p>"), card("3", "<p>q</p>", ""), card("4", "<p><img src=\"x\"></p>", "<p>a</p>")];
    expect(copyPayload(cards)).toEqual([
      { question: "<p>q</p>", answer: "<p>a</p>" },
      { question: "<p><img src=\"x\"></p>", answer: "<p>a</p>" },
    ]);
  });
});

describe("hasContent", () => {
  it("is false for nothing, the empty editor and spaces", () => {
    expect(hasContent("")).toBe(false);
    expect(hasContent("<p></p>")).toBe(false);
    expect(hasContent("<p> &nbsp; </p>")).toBe(false);
  });
  it("is true for text or an image", () => {
    expect(hasContent("<p>Linux</p>")).toBe(true);
    expect(hasContent("<p><img src=\"x\"></p>")).toBe(true);
  });
});

describe("pageNumbers", () => {
  it("lists every page when there are five or fewer", () => {
    expect(pageNumbers(1, 1)).toEqual([1]);
    expect(pageNumbers(2, 4)).toEqual([1, 2, 3, 4]);
  });
  it("keeps five numbers around the current page", () => {
    expect(pageNumbers(1, 10)).toEqual([1, 2, 3, 4, 5]);
    expect(pageNumbers(3, 10)).toEqual([1, 2, 3, 4, 5]);
    expect(pageNumbers(5, 10)).toEqual([3, 4, 5, 6, 7]);
    expect(pageNumbers(9, 10)).toEqual([6, 7, 8, 9, 10]);
    expect(pageNumbers(10, 10)).toEqual([6, 7, 8, 9, 10]);
  });
  it("has nothing for no page", () => expect(pageNumbers(1, 0)).toEqual([]));
});

describe("studiedCount", () => {
  it("counts distinct studied ids that are still cards of the set", () => {
    expect(studiedCount(["a", "a", "x", "b"], ["a", "b", "c"])).toBe(2);
    expect(studiedCount([], ["a"])).toBe(0);
    expect(studiedCount(["a"], [])).toBe(0);
  });
});
