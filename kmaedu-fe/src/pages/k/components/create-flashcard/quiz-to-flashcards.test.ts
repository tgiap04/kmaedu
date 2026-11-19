import { describe, expect, it } from "vitest";
import type { Quizz } from "@/types/quizset";
import { quizzesToFlashcards } from "./quiz-to-flashcards";

const quiz = (over: Partial<Quizz>): Quizz => ({
  id: "q",
  question: "Thủ đô của Việt Nam?",
  options: ["Huế", "Hà Nội", "Đà Nẵng", "Cần Thơ"],
  answer: "B",
  createdAt: "",
  updatedAt: "",
  ...over,
});

describe("quizzesToFlashcards", () => {
  it("returns nothing for an empty list", () => {
    expect(quizzesToFlashcards([])).toEqual({ cards: [], skipped: 0 });
  });

  it("turns a letter answer into the text of that option", () => {
    const { cards, skipped } = quizzesToFlashcards([quiz({})]);
    expect(cards).toEqual([{ question: "Thủ đô của Việt Nam?", answer: "Hà Nội" }]);
    expect(skipped).toBe(0);
  });

  it("accepts a lower-case letter and surrounding spaces", () => {
    expect(quizzesToFlashcards([quiz({ answer: " c " })]).cards[0].answer).toBe("Đà Nẵng");
  });

  it("matches an answer given as the option text, ignoring case and spacing", () => {
    expect(quizzesToFlashcards([quiz({ answer: "  hà   nội " })]).cards[0].answer).toBe("Hà Nội");
  });

  it("strips the 'A.' prefix from the option text but keeps its HTML", () => {
    const q = quiz({ options: ["A. <p>Huế</p>", "B. <p>Hà <b>Nội</b></p>"], answer: "B" });
    expect(quizzesToFlashcards([q]).cards[0].answer).toBe("<p>Hà <b>Nội</b></p>");
  });

  it("matches an answer typed with special characters against an option stored as HTML entities", () => {
    const q = quiz({ options: ["<p>Bell Labs</p>", "<p>AT&amp;T</p>", "<p>x &lt; y</p>", "x"], answer: "AT&T" });
    expect(quizzesToFlashcards([q])).toEqual({ cards: [{ question: "Thủ đô của Việt Nam?", answer: "<p>AT&amp;T</p>" }], skipped: 0 });
    expect(quizzesToFlashcards([quiz({ options: ["<p>Bell Labs</p>", "<p>x &lt; y</p>"], answer: "x < y" })]).cards).toHaveLength(1);
  });

  it("reads options stored as objects", () => {
    const q = quiz({ options: [{ text: "Huế" }, { content: "Hà Nội" }], answer: "B" });
    expect(quizzesToFlashcards([q]).cards[0].answer).toBe("Hà Nội");
  });

  it("keeps the question HTML as it is, trimmed", () => {
    const q = quiz({ question: "  <p>Câu <i>hỏi</i></p>  " });
    expect(quizzesToFlashcards([q]).cards[0].question).toBe("<p>Câu <i>hỏi</i></p>");
  });

  it("skips and counts questions whose correct option cannot be found", () => {
    const list = [
      quiz({ answer: "Z" }),
      quiz({ answer: "" }),
      quiz({ answer: "E" }),
      quiz({ options: ["x"], answer: "B" }),
      quiz({ options: [], answer: "A" }),
      quiz({ answer: "B" }),
    ];
    const { cards, skipped } = quizzesToFlashcards(list);
    expect(cards).toHaveLength(1);
    expect(skipped).toBe(5);
  });

  it("skips questions with no text and no image, but keeps an image-only question", () => {
    const list = [quiz({ question: "   " }), quiz({ question: "<p></p>" }), quiz({ question: '<p><img src="a.png"></p>' })];
    const { cards, skipped } = quizzesToFlashcards(list);
    expect(cards.map((c) => c.question)).toEqual(['<p><img src="a.png"></p>']);
    expect(skipped).toBe(2);
  });

  it("skips a question whose correct option is empty", () => {
    expect(quizzesToFlashcards([quiz({ options: ["", "  ", "c", "d"], answer: "B" })])).toEqual({ cards: [], skipped: 1 });
  });

  it("survives malformed items", () => {
    const bad = [{ id: "1" }, { id: "2", question: 5, answer: "A", options: ["a"] }, null] as unknown as Quizz[];
    expect(quizzesToFlashcards(bad)).toEqual({ cards: [], skipped: 3 });
  });

  it("keeps the order of the source questions", () => {
    const list = [quiz({ question: "1", answer: "A" }), quiz({ question: "2", answer: "bad" }), quiz({ question: "3", answer: "D" })];
    expect(quizzesToFlashcards(list).cards.map((c) => c.question)).toEqual(["1", "3"]);
  });
});

describe("quizzesToFlashcards keeps the answer's own words", () => {
  it("keeps an answer that starts with A–D and a space", () => {
    const { cards } = quizzesToFlashcards([quiz({ options: ["A stack is LIFO", "a queue is FIFO"], answer: "A" }), quiz({ options: ["x", "B cell"], answer: "B" })]);
    expect(cards.map((c) => c.answer)).toEqual(["A stack is LIFO", "B cell"]);
  });
  it("drops a letter prefix with punctuation, in text or in a paragraph", () => {
    const { cards } = quizzesToFlashcards([quiz({ options: ["A. Huế", "B. Hà Nội"], answer: "B" }), quiz({ options: ["<p>A) Huế</p>", "<p>B) Hà Nội</p>"], answer: "B" })]);
    expect(cards.map((c) => c.answer)).toEqual(["Hà Nội", "<p>Hà Nội</p>"]);
  });
  it("finds the option named by its full text, even when it starts with a letter and a space", () => {
    const { cards, skipped } = quizzesToFlashcards([quiz({ options: ["A cat", "D day"], answer: "D day" })]);
    expect({ answers: cards.map((c) => c.answer), skipped }).toEqual({ answers: ["D day"], skipped: 0 });
  });
  it("keeps an abbreviation such as A.I.", () => {
    const { cards } = quizzesToFlashcards([quiz({ options: ["A.I. là trí tuệ nhân tạo", "khác"], answer: "A" })]);
    expect(cards[0].answer).toBe("A.I. là trí tuệ nhân tạo");
  });
});

describe("quizzesToFlashcards reads option labels only when every option carries one", () => {
  it("drops lowercase labels when the options are labelled a, b, c… in order", () => {
    const { cards } = quizzesToFlashcards([quiz({ options: ["a. Huế", "b. Hà Nội", "c. Huế 2"], answer: "B" })]);
    expect(cards[0].answer).toBe("Hà Nội");
  });
  it("keeps an answer that only looks labelled when the other options are not", () => {
    const { cards } = quizzesToFlashcards([quiz({ options: ["Huế", "d) dấu ngoặc là đáp án", "Đà Nẵng"], answer: "B" })]);
    expect(cards[0].answer).toBe("d) dấu ngoặc là đáp án");
  });
});
