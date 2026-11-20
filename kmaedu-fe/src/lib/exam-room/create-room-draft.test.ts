import { describe, expect, it } from "vitest";
import { QUESTION_SELECTION_MODE } from "@/types/examSession";
import { defaultDraft, toRoomPayload, toSessionPayload, validateDraft, type CreateRoomDraft } from "./create-room-draft";

// 2026-11-18 10:15 local time
const NOW = new Date(2026, 10, 18, 10, 15);

function draft(patch: Partial<CreateRoomDraft> = {}): CreateRoomDraft {
  return { ...defaultDraft(NOW), title: "Kiểm tra giữa kỳ", quizSetId: "qs-1", ...patch };
}

describe("defaultDraft", () => {
  it("matches the design: 30 minutes, one attempt, whole quiz, results shown, deadline at 23:59 today, anti-cheat on, leaving off", () => {
    expect(defaultDraft(NOW)).toEqual({
      title: "",
      description: "",
      quizSetId: "",
      durationMinutes: 30,
      maxAttempts: 1,
      questionMode: "all",
      questionCount: null,
      showAnswersAfterSubmit: true,
      limitJoinWindow: true,
      joinDeadline: "2026-11-18T23:59",
      antiCheatEnabled: true,
      allowLeaveMidway: false,
    });
  });

  it("prefills the quiz set passed in", () => {
    expect(defaultDraft(NOW, "qs-9").quizSetId).toBe("qs-9");
  });
});

describe("validateDraft", () => {
  it("accepts a complete draft", () => {
    expect(validateDraft(draft(), NOW)).toEqual({});
  });

  it("requires a name and a quiz set; blank names count as missing", () => {
    expect(validateDraft(draft({ title: "   ", quizSetId: "" }), NOW)).toEqual({
      title: "Vui lòng nhập tên phòng thi",
      quizSetId: "Vui lòng chọn bộ đề",
    });
  });

  it("caps the name at 100 and the description at 500 characters", () => {
    expect(validateDraft(draft({ title: "a".repeat(100), description: "b".repeat(500) }), NOW)).toEqual({});
    expect(validateDraft(draft({ title: "a".repeat(101), description: "b".repeat(501) }), NOW)).toEqual({
      title: "Tên phòng thi tối đa 100 ký tự",
      description: "Mô tả tối đa 500 ký tự",
    });
  });

  it("keeps the duration between 1 and 1440 whole minutes", () => {
    expect(validateDraft(draft({ durationMinutes: 1 }), NOW)).toEqual({});
    expect(validateDraft(draft({ durationMinutes: 1440 }), NOW)).toEqual({});
    for (const durationMinutes of [0, 1441, 2.5, Number.NaN]) {
      expect(validateDraft(draft({ durationMinutes }), NOW).durationMinutes).toBe("Thời gian làm bài từ 1 đến 1440 phút");
    }
  });

  it("asks for a question count within the quiz set only in count mode", () => {
    expect(validateDraft(draft({ questionMode: "all", questionCount: null }), NOW)).toEqual({});
    expect(validateDraft(draft({ questionMode: "count", questionCount: null }), NOW).questionCount).toBe("Nhập số câu cần làm");
    expect(validateDraft(draft({ questionMode: "count", questionCount: 0 }), NOW).questionCount).toBe("Nhập số câu cần làm");
    expect(validateDraft(draft({ questionMode: "count", questionCount: 20 }), NOW, 20)).toEqual({});
    expect(validateDraft(draft({ questionMode: "count", questionCount: 21 }), NOW, 20).questionCount).toBe("Bộ đề chỉ có 20 câu");
  });

  it("needs a join deadline in the future only while the window is limited", () => {
    expect(validateDraft(draft({ limitJoinWindow: false, joinDeadline: "" }), NOW)).toEqual({});
    expect(validateDraft(draft({ joinDeadline: "" }), NOW).joinDeadline).toBe("Chọn thời hạn tham gia");
    expect(validateDraft(draft({ joinDeadline: "2026-11-18T10:15" }), NOW).joinDeadline).toBe("Thời hạn phải sau thời điểm hiện tại");
    expect(validateDraft(draft({ joinDeadline: "2026-11-18T10:16" }), NOW)).toEqual({});
  });
});

describe("payloads", () => {
  it("sends the room's trimmed name, description and quiz set", () => {
    expect(toRoomPayload(draft({ title: "  Giữa kỳ  ", description: "  Ca sáng " }))).toEqual({
      title: "Giữa kỳ",
      description: "Ca sáng",
      quizSetId: "qs-1",
    });
    expect(toRoomPayload(draft({ description: "   " })).description).toBeUndefined();
  });

  it("opens the first session now, until the deadline, with the chosen rules", () => {
    expect(toSessionPayload(draft({ maxAttempts: 3, questionMode: "count", questionCount: 15 }), "room-1", NOW)).toEqual({
      examRoomId: "room-1",
      startTime: NOW.toISOString(),
      endTime: new Date(2026, 10, 18, 23, 59).toISOString(),
      // "3 lần" in total: maxAttempts is the total.
      allowRetake: true,
      maxAttempts: 3,
      showAnswersAfterSubmit: true,
      questionSelectionMode: QUESTION_SELECTION_MODE.RANDOM_TOTAL,
      questionCount: 15,
      durationMinutes: 30,
      antiCheatEnabled: true,
      allowLeaveMidway: false,
    });
  });

  it("leaves the session open-ended without a deadline and uses every question in whole-quiz mode", () => {
    const payload = toSessionPayload(draft({ limitJoinWindow: false, questionMode: "all", questionCount: 7 }), "room-1", NOW);
    expect(payload.endTime).toBeUndefined();
    expect(payload).toMatchObject({ allowRetake: false, maxAttempts: 1, questionSelectionMode: QUESTION_SELECTION_MODE.ALL, questionCount: null });
  });

  it("sends the attempts chosen as the total, with retakes allowed above one", () => {
    const sent = (maxAttempts: number) => toSessionPayload(draft({ maxAttempts }), "room-1", NOW);
    expect(sent(1)).toMatchObject({ allowRetake: false, maxAttempts: 1 });
    expect(sent(2)).toMatchObject({ allowRetake: true, maxAttempts: 2 });
    expect(sent(10)).toMatchObject({ allowRetake: true, maxAttempts: 10 });
  });
});
