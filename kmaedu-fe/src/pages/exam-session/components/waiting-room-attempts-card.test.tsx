// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { MyAttemptItem } from "@/apis/examAttemptApi";
import { WaitingRoomAttemptsCard } from "./waiting-room-attempts-card";

/** Shaped like a row of GET /examattempts/list: the server sends no timeSpentSeconds. */
const attempt = (over: Partial<MyAttemptItem>): MyAttemptItem => ({
  id: "a1",
  status: 1,
  score: 33,
  totalQuestions: 18,
  correctAnswers: 6,
  startedAt: "2026-11-20T08:19:00.000Z",
  finishedAt: "2026-11-20T10:16:03.000Z",
  violationCount: 22,
  ...over,
});

function renderCard(item: MyAttemptItem) {
  return render(<WaitingRoomAttemptsCard attempts={[item]} loading={false} passingScore={0} onContinue={() => {}} onView={() => {}} />);
}

describe("waiting room attempts card time", () => {
  it("shows the time from start to hand-in", () => {
    renderCard(attempt({}));
    expect(screen.getByText("1:57:03")).toBeTruthy();
    expect(screen.queryByText(/NaN/)).toBeNull();
  });

  it("pads a short attempt as minutes and seconds", () => {
    renderCard(attempt({ finishedAt: "2026-11-20T08:24:07.000Z" }));
    expect(screen.getByText("5:07")).toBeTruthy();
  });

  it("shows no time for an attempt still in progress", () => {
    const { container } = renderCard(attempt({ status: 0, finishedAt: null }));
    expect(container.textContent).not.toMatch(/NaN|\d+:\d{2}:\d{2}/);
    expect(screen.getByText("Tiếp tục làm bài")).toBeTruthy();
  });

  it("shows no time when the dates are unusable", () => {
    const { container } = renderCard(attempt({ startedAt: "không phải ngày", finishedAt: "2026-11-20T10:16:03.000Z" }));
    expect(container.textContent).not.toMatch(/NaN/);
  });

  it("never shows a negative time when hand-in is recorded before the start", () => {
    const { container } = renderCard(attempt({ finishedAt: "2026-11-20T08:18:00.000Z" }));
    expect(container.textContent).not.toMatch(/NaN|-\d/);
  });
});
