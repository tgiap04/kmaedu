// @vitest-environment jsdom
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/apis/examRoomApi", () => ({ createExamRoomApi: vi.fn() }));
vi.mock("@/apis/examSessionApi", () => ({ createExamSessionApi: vi.fn() }));
vi.mock("@/components/antd/toast", () => ({ toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn(), info: vi.fn() } }));
vi.mock("@/stores/useQuizSetStore", () => ({
  useQuizSetStore: () => ({
    fetchAllQuizSets: () => Promise.resolve(),
    quizSetsK: [
      { id: "qs1", title: "Bộ đề Hệ điều hành", questionCount: 40 },
      { id: "qs2", title: "Bộ đề Mạng máy tính", questionCount: 25 },
    ],
  }),
}));

const roomApi = await import("@/apis/examRoomApi");
const sessionApi = await import("@/apis/examSessionApi");
const { toast } = await import("@/components/antd/toast");
const { default: ManageExamRoomCreatePage } = await import("./ManageExamRoomCreatePage");

function Where() {
  const location = useLocation();
  return <p data-testid="where">{location.pathname + location.search}</p>;
}

function open(url = "/k/manage-exam-room/new") {
  render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/k/manage-exam-room/new" element={<ManageExamRoomCreatePage />} />
        <Route path="/k/manage-exam-room/:id" element={<Where />} />
        <Route path="/k/manage-exam-room" element={<Where />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  // jsdom has no IntersectionObserver (the stepper follows the card in view).
  vi.stubGlobal("IntersectionObserver", class { observe() {} disconnect() {} });
  window.scrollTo = vi.fn() as unknown as typeof window.scrollTo;
  vi.mocked(roomApi.createExamRoomApi).mockResolvedValue({ examRoom: { id: "room-9", title: "Giữa kỳ" } } as never);
  vi.mocked(sessionApi.createExamSessionApi).mockResolvedValue({ examSession: { id: "s-1", examRoomId: "room-9" } } as never);
});

describe("the create exam room page", () => {
  it("keeps the candidate on the form and names the missing fields when Tiếp tục is pressed empty", async () => {
    open();
    await userEvent.click(screen.getByRole("button", { name: /Tiếp tục/ }));
    expect(await screen.findByText("Vui lòng nhập tên phòng thi")).toBeTruthy();
    expect(screen.getByText("Vui lòng chọn bộ đề")).toBeTruthy();
    expect(roomApi.createExamRoomApi).not.toHaveBeenCalled();
  });

  it("reviews the settings, then creates the room and its first session with them and opens the room", async () => {
    open("/k/manage-exam-room/new?quizSetId=qs2");
    await userEvent.type(screen.getByLabelText(/Tên phòng thi/), "  Giữa kỳ HĐH  ");
    await userEvent.click(screen.getByRole("switch", { name: "Cho phép thoát giữa chừng" }));
    await userEvent.click(screen.getByRole("button", { name: /Tiếp tục/ }));

    expect(await screen.findByText("Bộ đề Mạng máy tính")).toBeTruthy();
    expect(screen.getByText("Giữa kỳ HĐH")).toBeTruthy();
    expect(screen.getByText("Thí sinh rời trang rồi quay lại làm tiếp được")).toBeTruthy();
    await userEvent.click(screen.getByRole("button", { name: "Tạo phòng thi" }));

    await waitFor(() => expect(screen.getByTestId("where").textContent).toBe("/k/manage-exam-room/room-9"));
    // One toast for the whole creation, not one for the room and one for its session.
    expect(toast.success).toHaveBeenCalledTimes(1);
    expect(toast.success).toHaveBeenCalledWith("Đã tạo phòng thi và mở phiên thi đầu tiên");
    expect(toast.error).not.toHaveBeenCalled();
    expect(roomApi.createExamRoomApi).toHaveBeenCalledWith({ title: "Giữa kỳ HĐH", description: undefined, quizSetId: "qs2" });
    expect(sessionApi.createExamSessionApi).toHaveBeenCalledWith(
      expect.objectContaining({
        examRoomId: "room-9",
        maxAttempts: 1,
        allowRetake: false,
        durationMinutes: 30,
        antiCheatEnabled: true,
        allowLeaveMidway: true,
        showAnswersAfterSubmit: true,
        questionCount: null,
      }),
    );
  });

  it("opens the room's sessions tab when the room was created but its session was not", async () => {
    vi.mocked(sessionApi.createExamSessionApi).mockRejectedValue(new Error("snapshot"));
    open("/k/manage-exam-room/new?quizSetId=qs1");
    await userEvent.type(screen.getByLabelText(/Tên phòng thi/), "Cuối kỳ");
    await userEvent.click(screen.getByRole("button", { name: /Tiếp tục/ }));
    await userEvent.click(await screen.findByRole("button", { name: "Tạo phòng thi" }));
    await waitFor(() => expect(screen.getByTestId("where").textContent).toBe("/k/manage-exam-room/room-9?tab=sessions"));
    expect(toast.success).not.toHaveBeenCalled();
    expect(toast.error).not.toHaveBeenCalled();
    expect(toast.warning).toHaveBeenCalledTimes(1);
    expect(vi.mocked(toast.warning).mock.calls[0][0]).toBe("Đã tạo phòng thi nhưng chưa mở được phiên thi");
  });

  it("goes back to the list on Hủy without creating anything", async () => {
    open();
    await userEvent.click(screen.getByRole("button", { name: "Hủy" }));
    expect(screen.getByTestId("where").textContent).toBe("/k/manage-exam-room");
    expect(roomApi.createExamRoomApi).not.toHaveBeenCalled();
  });
});
