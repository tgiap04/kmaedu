// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { SessionHistoryDialog } from "./session-history-dialog";

const list = vi.hoisted(() => vi.fn());
vi.mock("@/apis/examAttemptApi", () => ({ getMyAttemptsBySessionApi: list }));

const session = {
  examSessionId: "s1", examRoomId: "r1", title: "Phòng thi test 1", description: null, showAnswersAfterSubmit: true,
  attemptCount: 2, bestScore: 6, bestPercentage: 33, lastAttemptAt: "2026-11-20T10:16:03.000Z",
  hasInProgress: true, inProgressAttemptId: "a2", totalViolations: 22, isPinned: false,
};

describe("session history dialog time", () => {
  it("shows the time spent from GET /examattempts/list rows, which carry no timeSpentSeconds", async () => {
    list.mockResolvedValue({
      examAttempts: [
        { id: "a1", status: 1, score: 33, totalQuestions: 18, correctAnswers: 6, startedAt: "2026-11-20T08:19:00.000Z", finishedAt: "2026-11-20T10:16:03.000Z", violationCount: 22 },
        { id: "a2", status: 0, score: 0, totalQuestions: 18, correctAnswers: 0, startedAt: "2026-11-20T11:00:00.000Z", finishedAt: null, violationCount: 0 },
      ],
      total: 2, page: 1, limit: 50, totalPages: 1,
    });
    render(<MemoryRouter><SessionHistoryDialog session={session} /></MemoryRouter>);
    expect(await screen.findByText("1:57:03")).toBeTruthy();
    expect(screen.getAllByText("-")).toHaveLength(1); // the one still in progress
  });
});
