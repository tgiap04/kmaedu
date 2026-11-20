// @vitest-environment jsdom
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ExamRoom } from "@/types/examRoom";

vi.mock("@/apis/examRoomApi", () => ({ getExamRoomByIdApi: vi.fn(), getExamRoomSessionsApi: vi.fn() }));
vi.mock("@/apis/examSessionApi", () => ({ endExamRoomApi: vi.fn() }));
vi.mock("@/apis/examAttemptApi", () => ({ getRoomOverviewApi: vi.fn(), getRoomCandidatesApi: vi.fn(), getExamAttemptDetailApi: vi.fn() }));
vi.mock("@/apis/cheatingLogApi", () => ({ getUserAttemptsWithLogsApi: vi.fn() }));
vi.mock("@/apis/quizsetApi", () => ({ getAllQuizSetsApi: vi.fn(async () => ({ quizSets: [] })) }));
vi.mock("@/lib/download-file", () => ({ saveBlob: vi.fn() }));

const roomApi = await import("@/apis/examRoomApi");
const { ApiRequestError } = await import("@/apis/api");
const sessionApi = await import("@/apis/examSessionApi");
const attemptApi = await import("@/apis/examAttemptApi");
const { useExamRoomStore } = await import("@/stores/useExamRoomStore");
const { useAuthStore } = await import("@/stores/useAuthStore");
const { saveBlob } = await import("@/lib/download-file");
const { default: ManageExamRoomDetailPage } = await import("./ManageExamRoomDetailPage");
const { formatStamp } = await import("@/lib/exam-room/room-status");

const hour = 3_600_000;
const session = (id: string, startOffset: number, endOffset: number | null) => ({
  id,
  examRoomId: "r1",
  status: 0,
  startTime: new Date(Date.now() + startOffset).toISOString(),
  endTime: endOffset === null ? undefined : new Date(Date.now() + endOffset).toISOString(),
  autoJoinByLink: false,
  assessType: 0,
  allowRetake: false,
  maxAttempts: 1,
  showAnswersAfterSubmit: true,
});

const room = (examSessions: ExamRoom["examSessions"]): ExamRoom => ({
  id: "r1",
  title: "Phòng thi test 1",
  quizSetId: "q1",
  hostId: "h",
  createdAt: "2026-11-16T00:00:00.000Z",
  updatedAt: "2026-11-16T00:00:00.000Z",
  quizSet: { id: "q1", title: "Đề test 3" },
  host: { id: "h", username: "admin", name: "Admin" },
  examSessions,
});

function Where() {
  const location = useLocation();
  return <output data-testid="where">{location.search}</output>;
}

const open = (search = "") =>
  render(
    <MemoryRouter initialEntries={[`/k/manage-exam-room/r1${search}`]}>
      <Routes>
        <Route path="/k/manage-exam-room/:id" element={<><ManageExamRoomDetailPage /><Where /></>} />
      </Routes>
    </MemoryRouter>,
  );

beforeEach(() => {
  vi.clearAllMocks();
  useExamRoomStore.setState({ currentExamRoom: null, loading: false, error: null });
  useAuthStore.setState({ permissions: ["exam_room:manage", "exam_session:manage", "exam_result:view"] });
  vi.mocked(attemptApi.getRoomOverviewApi).mockResolvedValue({
    candidates: 48, completed: 36, inProgress: 12, notStarted: 0, cancelled: 0, averageScore: 81.5, passed: 30,
    scoreBuckets: Array.from({ length: 10 }, () => 0), timeline: { window: "30m", from: new Date().toISOString(), bucketMinutes: 2, counts: [] },
  });
  vi.mocked(attemptApi.getRoomCandidatesApi).mockResolvedValue({ candidates: [], total: 0, page: 1, limit: 10, totalPages: 0 });
});

describe("the exam room detail page", () => {
  it("shows the room, its numbers and the candidates tab first", async () => {
    vi.mocked(roomApi.getExamRoomByIdApi).mockResolvedValue(room([session("s1", -hour, hour), session("s0", -48 * hour, -47 * hour)]));
    open();
    expect(await screen.findByRole("heading", { name: "Phòng thi test 1" })).toBeTruthy();
    expect(screen.getByText("Đang diễn ra", { selector: "span" })).toBeTruthy();
    expect(await screen.findByRole("tab", { name: "Danh sách thí sinh (48)", selected: true })).toBeTruthy();
    expect(screen.getByRole("tab", { name: "Phiên thi (2)" })).toBeTruthy();
    expect(screen.getByRole("img", { name: "Đã nộp 75%" })).toBeTruthy();
    expect(screen.getByText("Admin")).toBeTruthy();
    // The room card shows when the room was created; end times belong to sessions.
    expect(screen.getByText("Thời gian tạo")).toBeTruthy();
    expect(screen.getByText(formatStamp("2026-11-16T00:00:00.000Z"))).toBeTruthy();
    expect(screen.queryByText("Thời gian kết thúc")).toBeNull();
  });

  it("ends the room after a confirmation, then reads the room again", async () => {
    vi.mocked(roomApi.getExamRoomByIdApi).mockResolvedValueOnce(room([session("s1", -hour, hour)]));
    vi.mocked(roomApi.getExamRoomByIdApi).mockResolvedValue(room([session("s1", -hour, -1000)]));
    vi.mocked(sessionApi.endExamRoomApi).mockResolvedValue({ ended: 1, closedAttempts: 0, endedAt: new Date().toISOString() });
    const user = userEvent.setup();
    open();

    await user.click(await screen.findByRole("button", { name: "Kết thúc phòng" }));
    const dialog = await screen.findByRole("dialog");
    expect(within(dialog).getByText(/Đóng ngay 1 phiên đang diễn ra/)).toBeTruthy();
    expect(within(dialog).getByText(/nộp hộ ngay/)).toBeTruthy();
    expect(sessionApi.endExamRoomApi).not.toHaveBeenCalled();
    await user.click(within(dialog).getByRole("button", { name: "Kết thúc" }));

    await waitFor(() => expect(sessionApi.endExamRoomApi).toHaveBeenCalledWith("r1"));
    await waitFor(() => expect(roomApi.getExamRoomByIdApi).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(screen.queryByRole("button", { name: "Kết thúc phòng" })).toBeNull());
  });

  it("offers no end button to someone who cannot manage sessions", async () => {
    useAuthStore.setState({ permissions: ["exam_room:manage", "exam_result:view"] });
    vi.mocked(roomApi.getExamRoomByIdApi).mockResolvedValue(room([session("s1", -hour, hour)]));
    open();
    expect(await screen.findByRole("heading", { name: "Phòng thi test 1" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Kết thúc phòng" })).toBeNull();
  });

  it("exports every candidate under the filters on screen as a CSV", async () => {
    vi.mocked(roomApi.getExamRoomByIdApi).mockResolvedValue(room([session("s1", -hour, hour)]));
    const one = { userId: "u1", user: { id: "u1", username: "levanc", name: "Lê Văn C" }, status: "submitted" as const, attemptId: "a1", sessionId: "s1", startedAt: null, finishedAt: null, score: 90, passed: true, timeSpentSeconds: 120, attemptCount: 1 };
    vi.mocked(attemptApi.getRoomCandidatesApi).mockResolvedValue({ candidates: [one], total: 1, page: 1, limit: 10, totalPages: 1 });
    const user = userEvent.setup();
    open();
    await screen.findByText("Lê Văn C");
    await user.click(screen.getByRole("button", { name: /Lọc trạng thái/ }));
    await user.click(await screen.findByRole("menuitem", { name: /Đã nộp/ }));
    await waitFor(() => expect(attemptApi.getRoomCandidatesApi).toHaveBeenLastCalledWith("r1", { page: 1, limit: 10, status: "submitted" }));
    await user.click(screen.getByRole("button", { name: /Xuất báo cáo/ }));
    await waitFor(() => expect(saveBlob).toHaveBeenCalledTimes(1));
    expect(attemptApi.getRoomCandidatesApi).toHaveBeenLastCalledWith("r1", { page: 1, limit: 100, status: "submitted" });
    expect(vi.mocked(saveBlob).mock.calls[0][1]).toBe("thi-sinh-phong-thi-test-1.csv");
  });

  it("offers no end button when nothing is running", async () => {
    vi.mocked(roomApi.getExamRoomByIdApi).mockResolvedValue(room([session("s1", hour, 2 * hour)]));
    open();
    expect(await screen.findByRole("heading", { name: "Phòng thi test 1" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Kết thúc phòng" })).toBeNull();
    expect(screen.getByText("Sắp diễn ra", { selector: "span" })).toBeTruthy();
  });

  it("opens the stats tab from \"Xem kết quả\" and from the link", async () => {
    vi.mocked(roomApi.getExamRoomByIdApi).mockResolvedValue(room([]));
    const user = userEvent.setup();
    open();
    await user.click(await screen.findByRole("button", { name: "Xem kết quả" }));
    expect(screen.getByRole("tab", { name: "Thống kê chi tiết", selected: true })).toBeTruthy();
    expect(screen.getByTestId("where").textContent).toBe("?tab=stats");
  });

  it("shows the room's facts beside its settings, and leads to its quiz set and sessions", async () => {
    vi.mocked(roomApi.getExamRoomByIdApi).mockResolvedValue(room([session("s1", hour, 2 * hour)]));
    vi.mocked(roomApi.getExamRoomSessionsApi).mockResolvedValue({ sessions: [], total: 0, page: 1, limit: 10, totalPages: 0 });
    const user = userEvent.setup();
    open("?tab=settings");
    expect(await screen.findByRole("heading", { name: "Tổng quan" })).toBeTruthy();
    expect(screen.getByRole("link", { name: /Mở bộ đề/ }).getAttribute("href")).toBe("/k/manage-quiz-set/q1");
    expect(screen.getByRole("textbox", { name: /Tiêu đề/ })).toHaveProperty("value", "Phòng thi test 1");
    await user.click(screen.getByRole("button", { name: /Quản lý phiên/ }));
    expect(screen.getByRole("tab", { name: "Phiên thi (1)", selected: true })).toBeTruthy();
    expect(screen.getByTestId("where").textContent).toBe("?tab=sessions");
  });

  it("offers a retry when the room could not be read for a reason other than not found", async () => {
    vi.mocked(roomApi.getExamRoomByIdApi).mockRejectedValueOnce(Object.assign(new ApiRequestError("down"), { status: 503 }));
    vi.mocked(roomApi.getExamRoomByIdApi).mockResolvedValue(room([]));
    const user = userEvent.setup();
    open();
    expect(await screen.findByText("Không tải được phòng thi")).toBeTruthy();
    expect(screen.queryByText("Không tìm thấy phòng thi")).toBeNull();
    await user.click(screen.getByRole("button", { name: "Thử lại" }));
    expect(await screen.findByRole("heading", { name: "Phòng thi test 1" })).toBeTruthy();
  });

  it("says the room is gone when it cannot be read", async () => {
    vi.mocked(roomApi.getExamRoomByIdApi).mockRejectedValue(Object.assign(new ApiRequestError("404"), { status: 404 }));
    open("?tab=settings");
    expect(await screen.findByText("Không tìm thấy phòng thi")).toBeTruthy();
  });
});
