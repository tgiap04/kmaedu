import { describe, expect, it } from "vitest";
import { fileQuestions } from "./exam-question-picker";
import {
  type ChapterPick,
  addChapter,
  chapterSummary,
  defaultChapter,
  groupForExam,
  moveToChapter,
  pickInto,
  recolorChapter,
  removeChapter,
  renameChapter,
} from "./exam-chapters";
import { CHAPTER_COLORS } from "./chapter-colors";

const [RED, ORANGE, GREEN] = CHAPTER_COLORS.map((c) => c.value);

const fileA = { id: "A", historyId: "hA", filename: "Hệ điều hành.pdf" };
const fileB = { id: "B", historyId: "hB", filename: "Mạng.pdf" };
const qa = fileQuestions(fileA, [
  { question: "A0", options: ["x", "y"], answer: "x" },
  { question: "A1", options: ["x", "y"], answer: "y" },
  { question: "A2", options: ["x", "y"], answer: "x" },
]);
const qb = fileQuestions(fileB, [{ question: "B0", options: ["x", "y"], answer: "x" }]);

describe("defaultChapter / addChapter", () => {
  it("starts a file with one chapter named after the file", () => {
    expect(defaultChapter("A", "Hệ điều hành.pdf")).toEqual({ id: "A#1", fileId: "A", name: "Hệ điều hành", color: RED });
  });
  it("gives each new chapter the next palette colour, wrapping around", () => {
    expect(defaultChapter("B", "b.pdf", 1).color).toBe(ORANGE);
    expect(defaultChapter("C", "c.pdf", CHAPTER_COLORS.length).color).toBe(RED);
    const list = addChapter([defaultChapter("A", "a.pdf"), defaultChapter("B", "b.pdf", 1)], "A");
    expect(list.find((c) => c.id === "A#2")?.color).toBe(GREEN);
  });
  it("adds 'Chương N' with an id unique within the file, after the file's other chapters", () => {
    let list = [defaultChapter("A", "a.pdf"), defaultChapter("B", "b.pdf")];
    list = addChapter(list, "A");
    expect(list.map((c) => [c.id, c.name])).toEqual([["A#1", "a"], ["A#2", "Chương 2"], ["B#1", "b"]]);
    list = removeChapter(list, new Map(), "A#1").chapters;
    list = addChapter(list, "A");
    expect(list.map((c) => c.id)).toEqual(["A#2", "A#3", "B#1"]);
    // "Chương 2" is still taken in the file, so the new one must not reuse it (equal names would merge).
    expect(list[1].name).toBe("Chương 3");
  });
  it("never repeats a name already used in the file", () => {
    let list = addChapter(addChapter([defaultChapter("A", "a.pdf")], "A"), "A"); // a, Chương 2, Chương 3
    list = removeChapter(list, new Map(), "A#2").chapters; // a, Chương 3
    list = addChapter(list, "A");
    expect(list.map((c) => c.name)).toEqual(["a", "Chương 3", "Chương 4"]);
  });
});

describe("recolorChapter", () => {
  const list = [defaultChapter("A", "a.pdf"), defaultChapter("B", "b.pdf", 1)];
  it("changes only that chapter's colour", () => {
    const out = recolorChapter(list, "B#1", GREEN);
    expect(out.map((c) => c.color)).toEqual([RED, GREEN]);
    expect(list[1].color).toBe(ORANGE);
  });
  it("ignores a value that is not a #rrggbb colour (the label API would reject it)", () => {
    expect(recolorChapter(list, "A#1", "red")).toBe(list);
    expect(recolorChapter(list, "A#1", "#fff")).toBe(list);
  });
});

describe("renameChapter", () => {
  const list = [defaultChapter("A", "a.pdf")];
  it("trims and cuts to 100 characters", () => {
    expect(renameChapter(list, "A#1", "  Chương 1  ")[0].name).toBe("Chương 1");
    expect(renameChapter(list, "A#1", "x".repeat(120))[0].name).toHaveLength(100);
  });
  it("ignores an empty name", () => {
    expect(renameChapter(list, "A#1", "   ")[0].name).toBe("a");
  });
});

describe("pickInto / moveToChapter", () => {
  it("ticks into the given chapter and leaves already-picked questions where they are", () => {
    let picked = pickInto(new Map(), [qa[0]], "A#1", true);
    picked = pickInto(picked, qa, "A#2", true);
    expect([...picked.values()].map((p) => [p.id, p.chapterId])).toEqual([["hA:0", "A#1"], ["hA:1", "A#2"], ["hA:2", "A#2"]]);
    expect([...pickInto(picked, [qa[1]], "A#2", false).keys()]).toEqual(["hA:0", "hA:2"]);
  });
  it("moves picked questions to another chapter, ignoring ones not picked", () => {
    const picked = pickInto(new Map(), [qa[0]], "A#1", true);
    const moved = moveToChapter(picked, ["hA:0", "hA:9"], "A#2");
    expect([...moved.values()].map((p) => p.chapterId)).toEqual(["A#2"]);
    expect(picked.get("hA:0")?.chapterId).toBe("A#1");
  });
});

describe("removeChapter", () => {
  const list = addChapter([defaultChapter("A", "a.pdf"), defaultChapter("B", "b.pdf")], "A");
  const picked = pickInto(pickInto(new Map(), [qa[0]], "A#1", true), [qa[1]], "A#2", true);

  it("moves its questions to the file's first other chapter", () => {
    const out = removeChapter(list, picked, "A#2");
    expect(out.chapters.map((c) => c.id)).toEqual(["A#1", "B#1"]);
    expect(out.picked.get("hA:1")?.chapterId).toBe("A#1");
  });
  it("refuses to remove a file's last chapter", () => {
    const out = removeChapter(list, picked, "B#1");
    expect(out.chapters).toBe(list);
    expect(out.picked).toBe(picked);
  });
});

describe("groupForExam", () => {
  const chapters = [defaultChapter("A", "a.pdf"), { id: "A#2", fileId: "A", name: "Chương 2", color: ORANGE }, { id: "B#1", fileId: "B", name: " Chương 2 ", color: GREEN }];
  const picked: Map<string, ChapterPick> = pickInto(pickInto(pickInto(new Map(), [qa[2]], "A#2", true), [qb[0]], "B#1", true), [qa[0], qa[1]], "A#1", true);

  it("follows chapter order, keeps pick order inside, merges equal names and skips empty chapters", () => {
    const groups = groupForExam([...picked.values()], [...chapters, { id: "A#3", fileId: "A", name: "Trống", color: RED }]);
    expect(groups.map((g) => [g.name, g.quizzes.map((q) => q.question)])).toEqual([
      ["a", ["A0", "A1"]],
      ["Chương 2", ["A2", "B0"]],
    ]);
    expect(groups[0].quizzes[0]).toEqual({ question: "A0", options: ["x", "y"], answer: "x" });
  });
  it("carries each chapter's colour; a merged chapter keeps the first one's", () => {
    const groups = groupForExam([...picked.values()], chapters);
    expect(groups.map((g) => g.color)).toEqual([RED, ORANGE]);
  });
  it("shuffles inside a chapter only", () => {
    const groups = groupForExam([...picked.values()], chapters, () => 0);
    expect(groups.map((g) => g.quizzes.map((q) => q.question))).toEqual([["A1", "A0"], ["B0", "A2"]]);
  });
  it("returns nothing when nothing is picked", () => {
    expect(groupForExam([], chapters)).toEqual([]);
  });
});

describe("chapterSummary", () => {
  it("counts per chapter and flags names that will be merged", () => {
    const chapters = [{ id: "A#1", fileId: "A", name: "Chương 1", color: RED }, { id: "B#1", fileId: "B", name: "chương 1 ", color: RED }, { id: "B#2", fileId: "B", name: "Khác", color: RED }];
    const picked = pickInto(pickInto(new Map(), [qa[0], qa[1]], "A#1", true), [qb[0]], "B#1", true);
    expect(chapterSummary(chapters, picked)).toEqual([
      { chapter: chapters[0], count: 2, merged: true },
      { chapter: chapters[1], count: 1, merged: true },
      { chapter: chapters[2], count: 0, merged: false },
    ]);
  });
});
