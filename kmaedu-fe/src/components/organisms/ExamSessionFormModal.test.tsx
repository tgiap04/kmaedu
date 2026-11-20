// @vitest-environment jsdom
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ASSESS_TYPE, QUESTION_SELECTION_MODE } from "@/types/examSession";

vi.mock("@/apis/examRoomApi", () => ({
  getAvailableLabelsForExamRoomApi: vi.fn(async () => ({ totalQuestions: 40, labels: [], unlabeledCount: 40 })),
}));
vi.mock("@/apis/examSessionApi", () => ({
  getExamSessionSharingSettingsApi: vi.fn(async () => ({ whitelist: [] })),
  searchUsersForWhitelistApi: vi.fn(async () => ({ users: [] })),
}));

const { ExamSessionFormModal } = await import("./ExamSessionFormModal");

function openModal(props: Partial<Parameters<typeof ExamSessionFormModal>[0]> = {}) {
  const onSubmit = vi.fn(async () => true);
  const onOpenChange = vi.fn();
  render(
    <ExamSessionFormModal open mode="create" examRoomId="r1" onOpenChange={onOpenChange} onSubmit={onSubmit} {...props} />,
  );
  return { onSubmit, onOpenChange };
}

beforeEach(() => vi.clearAllMocks());

describe("the exam session form", () => {
  it("groups the settings under titled sections", async () => {
    openModal();
    const dialog = await screen.findByRole("dialog");
    for (const title of ["Thời gian", "Quyền truy cập", "Câu hỏi", "Chấm điểm & kết quả", "Quy định & Bảo mật"]) {
      expect(within(dialog).getByRole("heading", { name: title })).toBeTruthy();
    }
  });

  it("creates a public session with the rules chosen", async () => {
    const { onSubmit, onOpenChange } = openModal();
    await userEvent.click(await screen.findByRole("switch", { name: "Giới hạn thời gian làm bài" }));
    await userEvent.click(screen.getByRole("switch", { name: "Cho phép thoát giữa chừng" }));
    await userEvent.click(screen.getByRole("button", { name: "Tạo phiên thi" }));

    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      assessType: ASSESS_TYPE.PUBLIC,
      accessCode: null,
      whitelist: [],
      durationMinutes: 30,
      antiCheatEnabled: true,
      allowLeaveMidway: false,
      questionSelectionMode: QUESTION_SELECTION_MODE.ALL,
    });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("asks for a 6-digit code when access is by code, next to the field", async () => {
    const { onSubmit } = openModal();
    await userEvent.click(await screen.findByRole("radio", { name: /Mã truy cập/ }));
    await userEvent.click(screen.getByRole("button", { name: "Tạo phiên thi" }));
    expect(await screen.findByText("Vui lòng nhập mã truy cập")).toBeTruthy();
    expect(onSubmit).not.toHaveBeenCalled();

    await userEvent.type(screen.getByLabelText(/Mã truy cập \(6 chữ số\)/), "12ab3456");
    await userEvent.click(screen.getByRole("button", { name: "Tạo phiên thi" }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).toMatchObject({ assessType: ASSESS_TYPE.PRIVATE, accessCode: "123456" });
  });

  it("opens an existing session with its own settings and saves them", async () => {
    const session = {
      id: "s1",
      examRoomId: "r1",
      startTime: "2026-11-20T08:00:00.000Z",
      endTime: "2026-11-20T10:00:00.000Z",
      status: 0,
      assessType: ASSESS_TYPE.PUBLIC,
      allowRetake: true,
      maxAttempts: 3,
      passingScore: 60,
      showAnswersAfterSubmit: false,
      durationMinutes: 45,
      antiCheatEnabled: false,
      allowLeaveMidway: false,
    };
    const { onSubmit } = openModal({ mode: "edit", session: session as never });
    expect(await screen.findByRole("heading", { name: "Chỉnh sửa phiên thi" })).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "Lưu thay đổi" }));
    await waitFor(() => expect(onSubmit).toHaveBeenCalledTimes(1));
    expect(onSubmit.mock.calls[0][0]).toMatchObject({
      allowRetake: true,
      maxAttempts: 3,
      passingScore: 60,
      showAnswersAfterSubmit: false,
      durationMinutes: 45,
      antiCheatEnabled: false,
      allowLeaveMidway: false,
    });
  });
});
