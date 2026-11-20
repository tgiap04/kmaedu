// @vitest-environment jsdom
import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { createMemoryRouter, RouterProvider, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const toast = vi.hoisted(() => ({ success: vi.fn(), info: vi.fn(), warning: vi.fn(), error: vi.fn() }));
vi.mock("@/components/antd/toast", () => ({ toast, useToast: () => ({ toast }) }));
vi.mock("@/components/molecules/StandardMarkdownRenderer", () => ({ StandardMarkdownRenderer: ({ content }: { content: string }) => <span>{content}</span> }));

const api = vi.hoisted(() => ({
  getExamAttemptDetailApi: vi.fn(),
  startExamAttemptApi: vi.fn(),
  fetchAndDecryptSecureQuiz: vi.fn(),
  submitSecureQuiz: vi.fn(),
}));
vi.mock("@/apis/examAttemptApi", async (orig) => ({
  ...(await orig<object>()),
  getExamAttemptDetailApi: api.getExamAttemptDetailApi,
  startExamAttemptApi: api.startExamAttemptApi,
  updateExamAttemptProgressApi: vi.fn().mockResolvedValue({}),
}));
vi.mock("@/lib/secureQuizHelpers", async (orig) => ({
  ...(await orig<object>()),
  fetchAndDecryptSecureQuiz: api.fetchAndDecryptSecureQuiz,
  submitSecureQuiz: api.submitSecureQuiz,
}));
vi.mock("@/hooks/useCheatingDetection", () => ({ useCheatingDetection: () => ({ totalViolations: 0, isWarningVisible: false, dismissWarning: vi.fn(), lastViolationType: null }) }));
vi.mock("@/stores/useAuthStore", () => {
  const state = { isAuthenticated: true, initializing: false, roles: ["STUDENT"], permissions: ["exam:take"], user: { id: "u1", name: "Khoa" }, getUser: vi.fn() };
  return { useAuthStore: (select?: (s: typeof state) => unknown) => (select ? select(state) : state) };
});

const { default: ExamQuizPage } = await import("./ExamQuizPage");

function Where() {
  return <p data-testid="where">{useLocation().pathname}</p>;
}

function renderQuiz(path = "/exam-session/s1/quiz") {
  const router = createMemoryRouter(
    [
      { path: "/exam-session/:id/quiz", element: <ExamQuizPage /> },
      { path: "*", element: <Where /> },
    ],
    { initialEntries: [path] },
  );
  return render(<RouterProvider router={router} />);
}

const question = (i: number) => ({ id: `q_${i}`, index: i, token: `t${i}`, question: `Câu hỏi ${i + 1}`, options: ["Một", "Hai"] });

function startWith(count: number, savedAnswers: Record<string, string>) {
  api.startExamAttemptApi.mockResolvedValue({ examAttempt: { id: "a1" }, isResume: false });
  api.fetchAndDecryptSecureQuiz.mockResolvedValue({
    attemptId: "a1", status: 0, currentIndex: 0, savedAnswers, markedQuestions: [], totalQuestions: count,
    timeLimitMinutes: null, startedAt: new Date().toISOString(), deadline: null, antiCheatEnabled: false, allowLeaveMidway: true,
    questions: Array.from({ length: count }, (_, i) => question(i)),
    tokenMap: new Map(Array.from({ length: count }, (_, i) => [i, `t${i}`])),
  });
}

const option = (letter: string) => screen.getByRole("radio", { name: new RegExp(`^${letter}\\s`) });
const lastSubmit = () => screen.getAllByRole("button", { name: /Nộp bài/ }).at(-1)!;

beforeEach(() => {
  for (const fn of [...Object.values(toast), ...Object.values(api)]) fn.mockReset();
});

describe("taking the exam", () => {
  it("asks before handing in when an answer was taken back", async () => {
    startWith(1, { q_0: "A" });
    renderQuiz();
    fireEvent.click(await screen.findByRole("radio", { name: /^A\s/ }));
    expect(option("A").getAttribute("aria-checked")).toBe("false");
    fireEvent.click(lastSubmit());
    expect(await screen.findByText("Xác nhận nộp bài")).toBeTruthy();
    expect(screen.getByText("Bạn mới trả lời 0/1 câu hỏi. Bạn có chắc muốn nộp bài?")).toBeTruthy();
    expect(api.submitSecureQuiz).not.toHaveBeenCalled();
  });

  it("picks with the letter keys, ignores a held key, and stops while the hand-in dialog is open", async () => {
    startWith(2, {});
    renderQuiz();
    await screen.findByRole("radio", { name: /^B\s/ });
    fireEvent.keyDown(window, { key: "b", repeat: true });
    expect(option("B").getAttribute("aria-checked")).toBe("false");
    fireEvent.keyDown(window, { key: "b" });
    expect(option("B").getAttribute("aria-checked")).toBe("true");
    // Same letter again takes the answer back, like a second click on the option.
    fireEvent.keyDown(window, { key: "b" });
    expect(option("B").getAttribute("aria-checked")).toBe("false");
    fireEvent.keyDown(window, { key: "b" });

    fireEvent.click(screen.getAllByRole("button", { name: /Nộp bài/ })[0]);
    await screen.findByText("Xác nhận nộp bài");
    fireEvent.keyDown(window, { key: "a" });
    expect(option("B").getAttribute("aria-checked")).toBe("true");
  });

  it("hands in once on a double click, and the keys stay off while it is sent", async () => {
    startWith(1, { q_0: "A" });
    let finish!: (v: unknown) => void;
    api.submitSecureQuiz.mockReturnValue(new Promise((r) => (finish = r)));
    renderQuiz();
    await screen.findByRole("radio", { name: /^A\s/ });
    fireEvent.click(lastSubmit());
    fireEvent.click(lastSubmit());
    await waitFor(() => expect(api.submitSecureQuiz).toHaveBeenCalledTimes(1));
    fireEvent.keyDown(window, { key: "b" });
    expect(option("A").getAttribute("aria-checked")).toBe("true");
    await act(async () => {
      finish({ score: 100, totalQuestions: 1, correctAnswers: 1, percentage: 100, showAnswers: false, passed: true, passingScore: 0, questions: [] });
    });
    expect(api.submitSecureQuiz).toHaveBeenCalledTimes(1);
  });

  it("sends a session that needs its code back to the session page", async () => {
    api.startExamAttemptApi.mockRejectedValue(Object.assign(new Error("Cần mã truy cập"), { status: 403 }));
    renderQuiz();
    expect((await screen.findByTestId("where")).textContent).toBe("/exam-session/s1");
  });
});

describe("viewing a finished attempt", () => {
  const detail = (withKey: boolean) => ({
    score: 75, totalQuestions: 4, correctAnswers: 3, passingScore: 50, violationCount: 0,
    examAttempt: { id: "a1", answers: {}, score: 75, timeSpentSeconds: 90, status: 1 },
    examRoom: { id: "r1", title: "Phòng thi test 1" },
    questions: ["Một", "Hai", "Ba", "Bốn"].map((text, i) => ({
      id: `q${i}`, question: `Câu ${i + 1}`, options: ["Một", "Hai", "Ba", "Bốn"], userAnswer: i < 3 ? String.fromCharCode(65 + i) : "A",
      ...(withKey ? { answer: text } : {}),
    })),
  });

  it("shows the server's grade, not a recount of the keys", async () => {
    api.getExamAttemptDetailApi.mockResolvedValue(detail(true));
    renderQuiz("/exam-session/s1/quiz?attemptId=a1&view=result");
    expect(await screen.findByText("3 / 4 câu đúng")).toBeTruthy();
    expect(screen.getByText("Chúc mừng!")).toBeTruthy();
    expect(screen.getByRole("button", { name: /Xem chi tiết/ })).toBeTruthy();
  });

  it("offers no answer review when the session hides the answers", async () => {
    api.getExamAttemptDetailApi.mockResolvedValue(detail(false));
    renderQuiz("/exam-session/s1/quiz?attemptId=a1&view=result");
    expect(await screen.findByText("3 / 4 câu đúng")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Xem chi tiết/ })).toBeNull();
  });
});
