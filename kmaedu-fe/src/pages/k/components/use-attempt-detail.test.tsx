// @vitest-environment jsdom
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/antd/toast", () => ({ toast: { error: vi.fn() } }));
vi.mock("@/apis/examAttemptApi", () => ({ getExamAttemptDetailApi: vi.fn() }));
vi.mock("@/apis/cheatingLogApi", () => ({ getUserAttemptsWithLogsApi: vi.fn() }));

const { getExamAttemptDetailApi } = await import("@/apis/examAttemptApi");
const { getUserAttemptsWithLogsApi } = await import("@/apis/cheatingLogApi");
const { useAttemptDetail } = await import("./use-attempt-detail");

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(getUserAttemptsWithLogsApi).mockResolvedValue({
    attempts: [{ id: "a1", score: 80 }, { id: "a2", score: 40 }],
    aggregatedLogs: [],
  } as never);
  vi.mocked(getExamAttemptDetailApi).mockImplementation(async (id) => ({ id }) as never);
});

describe("useAttemptDetail", () => {
  it("opens the best attempt when no attempt is named", async () => {
    const { result } = renderHook(() => useAttemptDetail());
    await act(() => result.current.show("s1", "u1"));
    expect(getExamAttemptDetailApi).toHaveBeenCalledWith("a1");
    expect(result.current.sheet.selectedAttempt).toEqual({ id: "a1" });
  });

  it("opens the attempt the row shows when it is named", async () => {
    const { result } = renderHook(() => useAttemptDetail());
    await act(() => result.current.show("s1", "u1", "a2"));
    await waitFor(() => expect(result.current.sheet.selectedAttempt).toEqual({ id: "a2" }));
    expect(getExamAttemptDetailApi).toHaveBeenCalledWith("a2");
    expect(result.current.sheet.selectedUserAttempts).toHaveLength(2);
  });
});
