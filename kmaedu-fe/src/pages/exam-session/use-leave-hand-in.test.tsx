// @vitest-environment jsdom
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, Link, RouterProvider } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/env", () => ({ env: { apiUrl: "https://api.test/api/v1" } }));
vi.mock("@/lib/deviceId", () => ({ getOrCreateDeviceId: () => "device-1" }));
vi.mock("@/apis/examAttemptApi", () => ({ leaveExamAttemptApi: vi.fn(async () => ({ handedIn: true })) }));
vi.mock("@/apis/api", () => ({ refreshAccessToken: vi.fn(async () => undefined) }));

const { leaveExamAttemptApi } = await import("@/apis/examAttemptApi");
const { refreshAccessToken } = await import("@/apis/api");
const { useLeaveHandIn } = await import("./use-leave-hand-in");

const PROGRESS = { answers: { q_0: "A" }, currentIndex: 1, markedQuestions: ["q_1"] };

function Quiz({ active }: { active: boolean }) {
  const leave = useLeaveHandIn({ attemptId: "a1", active, progress: () => PROGRESS });
  return (
    <div>
      <Link to="/other">Đi chỗ khác</Link>
      {leave.blocked && (
        <div role="dialog">
          <button type="button" onClick={() => void leave.confirmLeave()}>Nộp bài và rời đi</button>
          <button type="button" onClick={leave.stayHere}>Ở lại</button>
        </div>
      )}
    </div>
  );
}

function renderQuiz(active: boolean) {
  const router = createMemoryRouter(
    [
      { path: "/quiz", element: <Quiz active={active} /> },
      { path: "/other", element: <p>Trang khác</p> },
    ],
    { initialEntries: ["/quiz"] },
  );
  render(<RouterProvider router={router} />);
  return router;
}

const fetchMock = vi.fn(async () => new Response("{}"));

beforeEach(() => {
  vi.stubGlobal("fetch", fetchMock);
  fetchMock.mockClear();
  vi.mocked(leaveExamAttemptApi).mockClear();
});
afterEach(() => vi.unstubAllGlobals());

describe("useLeaveHandIn", () => {
  it("hands the attempt in with the latest progress when the page is closed", () => {
    renderQuiz(true);
    act(() => {
      window.dispatchEvent(new Event("pagehide"));
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledWith("https://api.test/api/v1/examattempts/a1/leave", {
      method: "POST",
      keepalive: true,
      credentials: "include",
      headers: { "Content-Type": "application/json", "X-Device-ID": "device-1" },
      body: JSON.stringify(PROGRESS),
    });
  });

  it("does not hand in when the page only goes into the back-forward cache (it may come back)", () => {
    renderQuiz(true);
    const cached = Object.assign(new Event("pagehide"), { persisted: true });
    act(() => {
      window.dispatchEvent(cached);
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("asks the browser to confirm before unloading, only while leaving would hand in", () => {
    renderQuiz(true);
    const warned = new Event("beforeunload", { cancelable: true });
    window.dispatchEvent(warned);
    expect(warned.defaultPrevented).toBe(true);
  });

  it("does nothing when the session allows leaving (or the attempt is already handed in)", () => {
    renderQuiz(false);
    const unload = new Event("beforeunload", { cancelable: true });
    act(() => {
      window.dispatchEvent(unload);
      window.dispatchEvent(new Event("pagehide"));
    });
    expect(unload.defaultPrevented).toBe(false);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("holds an in-app navigation until the candidate confirms, then hands in and goes on", async () => {
    const router = renderQuiz(true);
    await userEvent.click(screen.getByText("Đi chỗ khác"));
    expect(router.state.location.pathname).toBe("/quiz");

    await userEvent.click(screen.getByText("Nộp bài và rời đi"));
    expect(leaveExamAttemptApi).toHaveBeenCalledWith("a1", PROGRESS);
    await waitFor(() => expect(router.state.location.pathname).toBe("/other"));
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("still lets the candidate go when the hand-in request fails (the host can still end the attempt)", async () => {
    vi.mocked(leaveExamAttemptApi).mockRejectedValueOnce(new Error("network"));
    const router = renderQuiz(true);
    await userEvent.click(screen.getByText("Đi chỗ khác"));
    await userEvent.click(screen.getByText("Nộp bài và rời đi"));
    expect(leaveExamAttemptApi).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(router.state.location.pathname).toBe("/other"));
  });

  it("stays on the quiz when the candidate chooses to stay", async () => {
    const router = renderQuiz(true);
    await userEvent.click(screen.getByText("Đi chỗ khác"));
    await userEvent.click(screen.getByText("Ở lại"));
    expect(router.state.location.pathname).toBe("/quiz");
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(leaveExamAttemptApi).not.toHaveBeenCalled();
  });

  it("lets in-app navigation through freely when leaving is allowed", async () => {
    const router = renderQuiz(false);
    await userEvent.click(screen.getByText("Đi chỗ khác"));
    await waitFor(() => expect(router.state.location.pathname).toBe("/other"));
    expect(leaveExamAttemptApi).not.toHaveBeenCalled();
  });

  it("keeps the session fresh every 10 minutes while leaving would hand in, so the keepalive request is authorised", () => {
    vi.useFakeTimers();
    try {
      renderQuiz(true);
      vi.advanceTimersByTime(10 * 60_000);
      expect(refreshAccessToken).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });

  it("does not refresh the session when leaving is allowed", () => {
    vi.mocked(refreshAccessToken).mockClear();
    vi.useFakeTimers();
    try {
      renderQuiz(false);
      vi.advanceTimersByTime(30 * 60_000);
      expect(refreshAccessToken).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });
});
