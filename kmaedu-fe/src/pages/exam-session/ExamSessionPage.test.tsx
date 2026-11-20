// @vitest-environment jsdom
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/apis/examSessionApi", () => ({
  checkExamSessionAccessApi: vi.fn(),
  verifyExamSessionAccessCodeApi: vi.fn(),
  getExamSessionStatsApi: vi.fn(),
  getExamSessionByIdApi: vi.fn(),
  endExamRoomApi: vi.fn(),
}));
// The page reads one string through i18next; without a loaded catalog useTranslation would suspend.
vi.mock("react-i18next", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react-i18next")>()),
  useTranslation: () => ({ t: (key: string) => key }),
}));
vi.mock("@/apis/examAttemptApi", () => ({ getMyAttemptsBySessionApi: vi.fn(), getExamAttemptsBySessionApi: vi.fn() }));

const sessionApi = await import("@/apis/examSessionApi");
const attemptApi = await import("@/apis/examAttemptApi");
const { useAuthStore } = await import("@/stores/useAuthStore");
const { default: ExamSessionPage } = await import("./ExamSessionPage");

const hour = 3_600_000;
const stats = {
  id: "s1",
  title: "Phòng thi test 1",
  description: null,
  startTime: new Date(Date.now() - hour).toISOString(),
  endTime: new Date(Date.now() + hour).toISOString(),
  status: 1,
  durationMinutes: 120,
  totalQuestions: 18,
  passingScore: 0,
  currentAttempt: 0,
  maxAttempts: null,
  progress: { answered: 0, marked: 0, total: 18 },
  examRoomId: "room-1",
  quizSetTitle: "Bộ đề test 3",
  host: { id: "h1", username: "admin", name: "Admin" },
  attemptDurationMinutes: 45,
  antiCheatEnabled: true,
  allowLeaveMidway: false,
};

function Where() {
  return <p data-testid="where">{useLocation().pathname}</p>;
}

function renderPage() {
  return render(
    <MemoryRouter initialEntries={["/exam-session/s1"]}>
      <Routes>
        <Route path="/exam-session/:id" element={<ExamSessionPage />} />
        <Route path="*" element={<Where />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  useAuthStore.setState({ isAuthenticated: true, initializing: false, sessionUnavailable: false, permissions: ["exam:take"] } as never);
  vi.mocked(sessionApi.checkExamSessionAccessApi).mockResolvedValue({ hasAccess: true, accessType: "public" } as never);
  vi.mocked(sessionApi.getExamSessionStatsApi).mockResolvedValue(stats as never);
  vi.mocked(attemptApi.getMyAttemptsBySessionApi).mockResolvedValue({ examAttempts: [] } as never);
});

describe("waiting page, candidate", () => {
  it("shows the room facts, the attempt limit and the rules from the stats", async () => {
    renderPage();
    expect(await screen.findByRole("heading", { level: 1, name: "Phòng thi test 1" })).toBeTruthy();
    expect(screen.getByText("Bộ đề test 3")).toBeTruthy();
    expect(screen.getByText("Admin")).toBeTruthy();
    expect(screen.getByText("18 câu")).toBeTruthy();
    // The attempt limit (45), not the 120-minute session window.
    expect(screen.getAllByText("45 phút")).toHaveLength(2);
    expect(screen.queryByText("120 phút")).toBeNull();
    expect(screen.getByText("Không, rời trang sẽ nộp bài")).toBeTruthy();
    expect(screen.getByText("Lịch sử làm bài")).toBeTruthy();
    // Host-only parts stay hidden.
    expect(screen.queryByRole("button", { name: /Kết thúc phòng/ })).toBeNull();
    expect(screen.queryByText("Danh sách thí sinh")).toBeNull();
    expect(sessionApi.getExamSessionByIdApi).not.toHaveBeenCalled();
  });

  it("says the session does not exist when the API answers 404", async () => {
    vi.mocked(sessionApi.checkExamSessionAccessApi).mockRejectedValue(Object.assign(new Error("Phiên thi không tồn tại"), { status: 404 }));
    renderPage();
    expect(await screen.findByText("Không tìm thấy phiên thi")).toBeTruthy();
  });

  it("starts only after the pledge is ticked", async () => {
    const user = userEvent.setup();
    renderPage();
    const start = await screen.findByRole("button", { name: /Bắt đầu làm bài/ });
    expect((start as HTMLButtonElement).disabled).toBe(true);
    await user.click(screen.getByLabelText(/cam kết không gian lận/));
    expect((start as HTMLButtonElement).disabled).toBe(false);
    await user.click(start);
    expect(screen.getByTestId("where").textContent).toBe("/exam-session/s1/quiz");
  });
});

describe("waiting page, host", () => {
  const hostSession = {
    id: "s1",
    examRoomId: "room-1",
    status: 1,
    startTime: stats.startTime,
    endTime: stats.endTime,
    autoJoinByLink: false,
    assessType: 1,
    allowRetake: false,
    maxAttempts: 1,
    passingScore: 0,
    whitelist: ["u1", "u2", "u3"],
    durationMinutes: null,
    antiCheatEnabled: false,
    allowLeaveMidway: true,
    totalQuestions: 18,
    examRoom: { id: "room-1", title: "Phòng thi test 1", quizSet: { id: "q", title: "Bộ đề test 3" }, host: { id: "h1", username: "admin", name: "Admin" } },
  };

  beforeEach(() => {
    useAuthStore.setState({ permissions: ["exam_room:manage", "exam_session:manage", "exam_result:view"] } as never);
    vi.mocked(sessionApi.getExamSessionByIdApi).mockResolvedValue(hostSession as never);
  });

  it("adds the room actions and the candidates, and cannot start", async () => {
    vi.mocked(attemptApi.getExamAttemptsBySessionApi).mockResolvedValue({
      attempts: [{ userId: "u1", status: 0, user: { id: "u1", username: "sv1", name: "Nguyễn Văn An" } }],
    } as never);
    renderPage();
    expect(await screen.findByText("Danh sách thí sinh")).toBeTruthy();
    expect(screen.getByRole("button", { name: /Sao chép link/ })).toBeTruthy();
    expect(screen.getByRole("button", { name: /Kết thúc phòng/ })).toBeTruthy();
    expect(await screen.findByText("Nguyễn Văn An")).toBeTruthy();
    const roster = screen.getByText("Danh sách thí sinh").closest("section")!;
    expect(within(roster).getByText("Chưa bắt đầu").parentElement?.nextSibling?.textContent).toBe("2");
    expect((screen.getByRole("button", { name: /Bắt đầu làm bài/ }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.queryByLabelText(/cam kết không gian lận/)).toBeNull();
    expect(screen.getAllByText("Không giới hạn").length).toBeGreaterThan(0);
  });

  it("shows the empty state before anyone joins", async () => {
    vi.mocked(attemptApi.getExamAttemptsBySessionApi).mockResolvedValue({ attempts: [] } as never);
    renderPage();
    expect(await screen.findByText("Chưa có thí sinh nào tham gia")).toBeTruthy();
  });

  it("offers a retry, not the candidate view, when the host lookup fails for another reason", async () => {
    const user = userEvent.setup();
    vi.mocked(attemptApi.getExamAttemptsBySessionApi).mockResolvedValue({ attempts: [] } as never);
    vi.mocked(sessionApi.getExamSessionByIdApi)
      .mockRejectedValueOnce(Object.assign(new Error("Máy chủ đang bận"), { status: 503 }))
      .mockResolvedValue(hostSession as never);
    renderPage();
    expect(await screen.findByText("Máy chủ đang bận")).toBeTruthy();
    expect(screen.queryByLabelText(/cam kết không gian lận/)).toBeNull();
    await user.click(screen.getByRole("button", { name: "Thử lại" }));
    expect(await screen.findByText("Danh sách thí sinh")).toBeTruthy();
  });

  it("falls back to the candidate view when the session is not theirs", async () => {
    vi.mocked(sessionApi.getExamSessionByIdApi).mockRejectedValue(Object.assign(new Error("Phiên thi không tồn tại"), { status: 404 }));
    renderPage();
    await waitFor(() => expect(screen.queryByText("Danh sách thí sinh")).toBeNull());
    expect(screen.queryByRole("button", { name: /Kết thúc phòng/ })).toBeNull();
  });
});
