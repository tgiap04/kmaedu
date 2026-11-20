import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/antd/toast", () => ({ toast: { success: vi.fn(), error: vi.fn(), info: vi.fn() } }));
vi.mock("@/apis/examRoomApi", () => ({ getExamRoomSessionsApi: vi.fn() }));
vi.mock("@/apis/examSessionApi", () => ({
  createExamSessionApi: vi.fn(),
  updateExamSessionApi: vi.fn(),
  deleteExamSessionApi: vi.fn(),
  refreshSnapshotApi: vi.fn(),
  endExamRoomApi: vi.fn(),
}));

const api = await import("@/apis/examSessionApi");
const { toast } = await import("@/components/antd/toast");
const { storeCache } = await import("@/lib/storeCache");
const { useExamRoomDetailStore } = await import("./useExamRoomDetailStore");

const LIST_KEY = storeCache.createKey("examrooms-all", {});
const session = { id: "s1", examRoomId: "r1", startTime: "2026-11-16T14:00:00.000Z", endTime: null, status: 0 };

beforeEach(() => {
  vi.clearAllMocks();
  storeCache.clear();
  storeCache.set(LIST_KEY, { examRooms: [] });
  useExamRoomDetailStore.getState().reset();
});

describe("session changes", () => {
  it("make the room list read again, since its session windows moved", async () => {
    const s = useExamRoomDetailStore.getState();
    vi.mocked(api.createExamSessionApi).mockResolvedValue({ examSession: session } as never);
    await s.createSession({ examRoomId: "r1", startTime: session.startTime } as never);
    expect(storeCache.get(LIST_KEY)).toBeNull();

    storeCache.set(LIST_KEY, { examRooms: [] });
    vi.mocked(api.updateExamSessionApi).mockResolvedValue({ examSession: session } as never);
    await s.updateSession("s1", {});
    expect(storeCache.get(LIST_KEY)).toBeNull();

    storeCache.set(LIST_KEY, { examRooms: [] });
    vi.mocked(api.deleteExamSessionApi).mockResolvedValue({ message: "ok" });
    await s.deleteSession("s1", "r1");
    expect(storeCache.get(LIST_KEY)).toBeNull();
  });
});

describe("session attempt rules in the local list", () => {
  const rules = { durationMinutes: 45, antiCheatEnabled: false, allowLeaveMidway: false };

  it("keeps the three rules of a new or edited session, so the edit form opens with them", async () => {
    const s = useExamRoomDetailStore.getState();
    vi.mocked(api.createExamSessionApi).mockResolvedValue({ examSession: { ...session, ...rules } } as never);
    await s.createSession({ examRoomId: "r1", startTime: session.startTime } as never);
    expect(useExamRoomDetailStore.getState().sessions[0]).toMatchObject(rules);

    const changed = { durationMinutes: null, antiCheatEnabled: true, allowLeaveMidway: true };
    vi.mocked(api.updateExamSessionApi).mockResolvedValue({ examSession: { ...session, ...changed } } as never);
    await s.updateSession("s1", {});
    expect(useExamRoomDetailStore.getState().sessions[0]).toMatchObject(changed);
  });
});

describe("endRoom", () => {
  it("ends the running sessions, drops the cached lists and says how many", async () => {
    storeCache.set(storeCache.createKey("examroom-sessions", { examRoomId: "r1", page: 1, limit: 10 }), {});
    vi.mocked(api.endExamRoomApi).mockResolvedValue({ ended: 2, closedAttempts: 0, endedAt: "2026-11-16T14:30:00.000Z" });

    expect(await useExamRoomDetailStore.getState().endRoom("r1")).toBe(true);

    expect(api.endExamRoomApi).toHaveBeenCalledWith("r1");
    expect(storeCache.get(LIST_KEY)).toBeNull();
    expect(storeCache.get(storeCache.createKey("examroom-sessions", { examRoomId: "r1", page: 1, limit: 10 }))).toBeNull();
    expect(toast.success).toHaveBeenCalledWith("Đã kết thúc 2 phiên thi");
    expect(useExamRoomDetailStore.getState().mutationLoading).toBe(false);
  });

  it("says how many open attempts it handed in", async () => {
    vi.mocked(api.endExamRoomApi).mockResolvedValue({ ended: 1, closedAttempts: 3, endedAt: "2026-11-16T14:30:00.000Z" });
    expect(await useExamRoomDetailStore.getState().endRoom("r1")).toBe(true);
    expect(toast.success).toHaveBeenCalledWith("Đã kết thúc 1 phiên thi, nộp hộ 3 bài đang làm");
  });

  it("says so when nothing was running", async () => {
    vi.mocked(api.endExamRoomApi).mockResolvedValue({ ended: 0, closedAttempts: 0, endedAt: "2026-11-16T14:30:00.000Z" });
    expect(await useExamRoomDetailStore.getState().endRoom("r1")).toBe(true);
    expect(toast.info).toHaveBeenCalledWith("Không có phiên thi nào đang diễn ra");
  });

  it("reports a failure and leaves the caches alone", async () => {
    vi.mocked(api.endExamRoomApi).mockRejectedValue(new Error("down"));
    expect(await useExamRoomDetailStore.getState().endRoom("r1")).toBe(false);
    expect(toast.error).toHaveBeenCalledWith("Không thể kết thúc phòng thi");
    expect(storeCache.get(LIST_KEY)).not.toBeNull();
    expect(useExamRoomDetailStore.getState().mutationLoading).toBe(false);
  });
});
