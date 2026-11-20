// @vitest-environment jsdom
/**
 * Pages that load on mount must toast once. StrictMode mounts, unmounts and mounts again in dev, so a
 * load without a cancel flag runs to the end twice and toasts twice.
 */
import { StrictMode } from "react";
import { act, render, waitFor } from "@testing-library/react";
import { createMemoryRouter, RouterProvider } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

const toast = vi.hoisted(() => ({ success: vi.fn(), info: vi.fn(), warning: vi.fn(), error: vi.fn() }));
vi.mock("@/components/antd/toast", () => ({ toast, useToast: () => ({ toast }) }));

const api = vi.hoisted(() => ({
  getDevicesApi: vi.fn(),
  getProfileApi: vi.fn(),
  getExamSessionByIdApi: vi.fn(),
  checkExamSessionAccessApi: vi.fn(),
  getExamAttemptsBySessionApi: vi.fn(),
  getSessionCheatingStatsApi: vi.fn(),
  getExamAttemptDetailApi: vi.fn(),
  startExamAttemptApi: vi.fn(),
  fetchAndDecryptSecureQuiz: vi.fn(),
}));
vi.mock("@/apis/devicesApi", () => ({ getDevicesApi: api.getDevicesApi, logoutDeviceApi: vi.fn(), logoutAllOthersApi: vi.fn() }));
vi.mock("@/apis/profileApi", async (orig) => ({ ...(await orig<object>()), getProfileApi: api.getProfileApi }));
vi.mock("@/apis/examSessionApi", async (orig) => ({
  ...(await orig<object>()),
  getExamSessionByIdApi: api.getExamSessionByIdApi,
  checkExamSessionAccessApi: api.checkExamSessionAccessApi,
}));
vi.mock("react-i18next", async (orig) => ({ ...(await orig<object>()), useTranslation: () => ({ t: (key: string) => key }) }));
vi.mock("@/apis/cheatingLogApi", async (orig) => ({ ...(await orig<object>()), getSessionCheatingStatsApi: api.getSessionCheatingStatsApi }));
vi.mock("@/apis/examAttemptApi", async (orig) => ({
  ...(await orig<object>()),
  getExamAttemptsBySessionApi: api.getExamAttemptsBySessionApi,
  getExamAttemptDetailApi: api.getExamAttemptDetailApi,
  startExamAttemptApi: api.startExamAttemptApi,
  updateExamAttemptProgressApi: vi.fn().mockResolvedValue({}),
}));
vi.mock("@/lib/secureQuizHelpers", async (orig) => ({ ...(await orig<object>()), fetchAndDecryptSecureQuiz: api.fetchAndDecryptSecureQuiz }));
vi.mock("@/hooks/useCheatingDetection", () => ({ useCheatingDetection: () => ({ totalViolations: 0, isWarningVisible: false, dismissWarning: vi.fn(), lastViolationType: null }) }));
vi.mock("@/stores/useAuthStore", () => {
  const state = { isAuthenticated: true, initializing: false, roles: ["STUDENT"], permissions: ["exam:take"], user: { id: "u1", name: "Khoa" }, getUser: vi.fn() };
  return { useAuthStore: (select?: (s: typeof state) => unknown) => (select ? select(state) : state) };
});

function renderStrict(path: string, route: string, page: React.ReactNode) {
  const router = createMemoryRouter([{ path: route, element: page }], { initialEntries: [path] });
  return render(
    <StrictMode>
      <RouterProvider router={router} />
    </StrictMode>,
  );
}

const fail = () => Promise.reject(Object.assign(new Error("Máy chủ đang bận"), { status: 500 }));
// Let the second StrictMode run finish its awaits (each load chains at most three) without a timer.
const settle = async () => {
  for (let i = 0; i < 5; i++) await act(async () => {});
};

beforeEach(() => {
  for (const fn of [...Object.values(toast), ...Object.values(api)]) fn.mockReset();
});

describe("load-on-mount toasts under StrictMode", () => {
  it("result view of a finished attempt says so once", async () => {
    const { default: ExamQuizPage } = await import("@/pages/exam-session/ExamQuizPage");
    api.getExamAttemptDetailApi.mockResolvedValue({
      examAttempt: { id: "a1", answers: {}, score: 100, timeSpentSeconds: 60 },
      questions: [{ id: "q1", question: "Q", options: ["A1", "B1"], answer: "A", userAnswer: "A" }],
      passingScore: 50,
      violationCount: 0,
      examRoom: { title: "Phòng thi test 1" },
    });
    renderStrict("/exam-session/s1/quiz?attemptId=a1&view=result", "/exam-session/:id/quiz", <ExamQuizPage />);
    await waitFor(() => expect(toast.success).toHaveBeenCalled());
    await settle();
    expect(toast.success).toHaveBeenCalledTimes(1);
  });

  it("resuming an attempt tells the candidate once", async () => {
    const { default: ExamQuizPage } = await import("@/pages/exam-session/ExamQuizPage");
    api.startExamAttemptApi.mockResolvedValue({ examAttempt: { id: "a1" }, isResume: true });
    api.fetchAndDecryptSecureQuiz.mockResolvedValue({
      attemptId: "a1", status: 0, currentIndex: 0, savedAnswers: { q_0: "A" }, markedQuestions: [], totalQuestions: 1,
      timeLimitMinutes: null, startedAt: new Date().toISOString(), deadline: null, antiCheatEnabled: true, allowLeaveMidway: false,
      questions: [{ id: "q_0", index: 0, token: "t", question: "Q", options: ["a", "b"] }], tokenMap: new Map([[0, "t"]]),
    });
    renderStrict("/exam-session/s1/quiz", "/exam-session/:id/quiz", <ExamQuizPage />);
    await waitFor(() => expect(toast.info).toHaveBeenCalled());
    await settle();
    expect(toast.info).toHaveBeenCalledTimes(1);
    expect(toast.warning).toHaveBeenCalledTimes(1);
  });

  it("a quiz that cannot start reports the error once", async () => {
    const { default: ExamQuizPage } = await import("@/pages/exam-session/ExamQuizPage");
    api.startExamAttemptApi.mockImplementation(fail);
    renderStrict("/exam-session/s1/quiz", "/exam-session/:id/quiz", <ExamQuizPage />);
    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    await settle();
    expect(toast.error).toHaveBeenCalledTimes(1);
  });

  it("session analytics reports a failed load once", async () => {
    const { default: Page } = await import("@/pages/k/ExamRoomSessionAnalyticsPage");
    api.getExamSessionByIdApi.mockImplementation(fail);
    api.getExamAttemptsBySessionApi.mockImplementation(fail);
    api.getSessionCheatingStatsApi.mockImplementation(fail);
    renderStrict("/k/manage-exam-room/r1/sessions/s1", "/k/manage-exam-room/:id/sessions/:sessionId", <Page />);
    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    await settle();
    expect(toast.error).toHaveBeenCalledTimes(1);
  });

  it("profile reports a failed load once", async () => {
    const { default: ProfilePage } = await import("@/pages/k/ProfilePage");
    api.getProfileApi.mockImplementation(fail);
    api.getDevicesApi.mockResolvedValue({ devices: [] });
    renderStrict("/k/profile", "/k/profile", <ProfilePage />);
    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    await settle();
    expect(toast.error).toHaveBeenCalledTimes(1);
  });

  it("exam session waiting page reports a failed load once", async () => {
    const { default: ExamSessionPage } = await import("@/pages/exam-session/ExamSessionPage");
    api.checkExamSessionAccessApi.mockImplementation(fail);
    renderStrict("/exam-session/s1", "/exam-session/:id", <ExamSessionPage />);
    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    await settle();
    expect(toast.error).toHaveBeenCalledTimes(1);
  });

  it("device list reports a failed load once", async () => {
    const { DeviceList } = await import("@/components/molecules/profile/DeviceList");
    api.getDevicesApi.mockImplementation(fail);
    renderStrict("/", "/", <DeviceList />);
    await waitFor(() => expect(toast.error).toHaveBeenCalled());
    await settle();
    expect(toast.error).toHaveBeenCalledTimes(1);
  });
});
