// @vitest-environment jsdom
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import type { UserAttemptWithLogs } from "@/apis/cheatingLogApi";
import type { ExamAttemptDetail } from "@/apis/examAttemptApi";
import { AttemptDetailSheet } from "./attempt-detail-sheet";

const attempt = (id: string, score: number, startedAt: string) =>
  ({ id, score, startedAt, timeSpentSeconds: 120, correctAnswers: 0, totalQuestions: 10, violationCount: 0 }) as unknown as UserAttemptWithLogs;

const shown = (id: string, score: number) =>
  ({ id, score, timeSpentSeconds: 120, user: { id: "u", username: "levanc", name: "Lê Văn C" } }) as unknown as ExamAttemptDetail;

const open = (selected: ExamAttemptDetail) =>
  render(
    <AttemptDetailSheet
      open
      onOpenChange={() => {}}
      loadingDetail={false}
      selectedAttempt={selected}
      selectedUserAttempts={[attempt("a1", 90, "2026-11-18T10:00:00.000Z"), attempt("a2", 40, "2026-11-18T11:00:00.000Z")]}
      selectedLogs={[]}
      passingScore={50}
    />,
  );

describe("attemptDetailSheet", () => {
  it("names the attempt it shows, and marks the best one wherever it is", () => {
    open(shown("a2", 40));
    expect(screen.getByRole("heading", { name: "Bài làm đang xem" })).toBeTruthy();
    const best = screen.getByText("Lần 1").closest("div.rounded-lg") as HTMLElement;
    expect(within(best).getByText("Cao nhất")).toBeTruthy();
    const latest = screen.getByText("Lần 2").closest("div.rounded-lg") as HTMLElement;
    expect(within(latest).getByText("Đang xem")).toBeTruthy();
    expect(within(latest).queryByText("Cao nhất")).toBeNull();
  });

  it("keeps the best-score heading when the best attempt is the one shown", () => {
    open(shown("a1", 90));
    expect(screen.getByRole("heading", { name: "Điểm cao nhất" })).toBeTruthy();
    expect(screen.queryByText("Đang xem")).toBeNull();
  });
});
