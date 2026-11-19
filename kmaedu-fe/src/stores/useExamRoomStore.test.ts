import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ExamRoom } from "@/types/examRoom";

vi.mock("@/components/antd/toast", () => ({ toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() } }));
vi.mock("@/apis/examRoomApi", () => ({
  getAllExamRoomsApi: vi.fn(),
  createExamRoomApi: vi.fn(),
  updateExamRoomApi: vi.fn(),
  deleteExamRoomApi: vi.fn(),
  getExamRoomsApi: vi.fn(),
  getExamRoomByIdApi: vi.fn(),
}));

const api = await import("@/apis/examRoomApi");
const { toast } = await import("@/components/antd/toast");
const { storeCache } = await import("@/lib/storeCache");
const { useExamRoomStore } = await import("./useExamRoomStore");

const room = (id: string, over: Partial<ExamRoom> = {}): ExamRoom => ({
  id,
  title: `Phòng ${id}`,
  quizSetId: "q",
  hostId: "h",
  createdAt: "2026-11-16T00:00:00.000Z",
  updatedAt: "2026-11-16T00:00:00.000Z",
  ...over,
});

beforeEach(() => {
  vi.clearAllMocks();
  storeCache.clear();
  useExamRoomStore.setState({ examRooms: [], currentExamRoom: null, loading: false, error: null });
});

describe("the list-all cache", () => {
  it("is read again after a room is created, edited or deleted", async () => {
    vi.mocked(api.getAllExamRoomsApi).mockResolvedValue({ examRooms: [room("a")] });
    vi.mocked(api.createExamRoomApi).mockResolvedValue({ examRoom: room("b") });
    vi.mocked(api.updateExamRoomApi).mockResolvedValue({ examRoom: room("a") });
    vi.mocked(api.deleteExamRoomApi).mockResolvedValue({ message: "ok" });
    const s = useExamRoomStore.getState();

    await s.fetchAllExamRooms();
    await s.createExamRoom({ title: "b", quizSetId: "q" });
    await s.fetchAllExamRooms();
    await s.updateExamRoom("a", { title: "a2" });
    await s.fetchAllExamRooms();
    await s.deleteExamRoom("a");
    await s.fetchAllExamRooms();

    expect(api.getAllExamRoomsApi).toHaveBeenCalledTimes(4);
  });
});

describe("updateExamRoom", () => {
  it("keeps the session windows and participant count the edit response does not carry", async () => {
    const windows = [{ startTime: "2026-11-16T14:00:00.000Z", endTime: null }];
    useExamRoomStore.setState({ examRooms: [room("a", { sessionWindows: windows, participantCount: 9 })] });
    vi.mocked(api.updateExamRoomApi).mockResolvedValue({ examRoom: room("a", { title: "Mới" }) });

    await useExamRoomStore.getState().updateExamRoom("a", { title: "Mới" });

    expect(useExamRoomStore.getState().examRooms[0]).toMatchObject({ title: "Mới", sessionWindows: windows, participantCount: 9 });
  });

  it("keeps the open room's sessions and host, which the edit response leaves out", async () => {
    const examSessions = [{ id: "s1", examRoomId: "a", status: 0, startTime: "2026-11-16T14:00:00.000Z", autoJoinByLink: false, assessType: 0, allowRetake: false, maxAttempts: 1, showAnswersAfterSubmit: true }];
    useExamRoomStore.setState({ currentExamRoom: room("a", { examSessions, host: { id: "h", username: "gv", name: "Giáo viên" } }) });
    vi.mocked(api.updateExamRoomApi).mockResolvedValue({ examRoom: room("a", { title: "Mới" }) });

    await useExamRoomStore.getState().updateExamRoom("a", { title: "Mới" });

    expect(useExamRoomStore.getState().currentExamRoom).toMatchObject({ title: "Mới", examSessions, host: { name: "Giáo viên" } });
  });
});

describe("deleteExamRooms", () => {
  it("deletes each room, keeps the ones that failed, and reports once", async () => {
    useExamRoomStore.setState({ examRooms: [room("a"), room("b"), room("c")] });
    vi.mocked(api.deleteExamRoomApi).mockImplementation(async (id) => {
      if (id === "b") throw new Error("Phòng thi không tồn tại");
      return { message: "ok" };
    });

    const failed = await useExamRoomStore.getState().deleteExamRooms(["a", "b", "c"]);

    expect(failed).toEqual(["b"]);
    expect(api.deleteExamRoomApi).toHaveBeenCalledTimes(3);
    expect(useExamRoomStore.getState().examRooms.map((r) => r.id)).toEqual(["b"]);
    expect(toast.success).not.toHaveBeenCalled();
    expect(toast.warning).toHaveBeenCalledTimes(1);
    expect(useExamRoomStore.getState().loading).toBe(false);
  });

  it("says how many went when all of them did", async () => {
    useExamRoomStore.setState({ examRooms: [room("a"), room("b")] });
    vi.mocked(api.deleteExamRoomApi).mockResolvedValue({ message: "ok" });

    expect(await useExamRoomStore.getState().deleteExamRooms(["a", "b"])).toEqual([]);
    expect(toast.success).toHaveBeenCalledWith("Đã xóa 2 phòng thi");
    expect(useExamRoomStore.getState().examRooms).toEqual([]);
  });
});

describe("fetchExamRoomById", () => {
  it("keeps the room asked for last when an earlier answer lands after it", async () => {
    let releaseA!: (r: ExamRoom) => void;
    vi.mocked(api.getExamRoomByIdApi).mockImplementation((id) =>
      id === "a" ? new Promise((r) => (releaseA = r)) : Promise.resolve(room("b")),
    );
    const s = useExamRoomStore.getState();
    const first = s.fetchExamRoomById("a");
    await s.fetchExamRoomById("b");
    releaseA(room("a"));
    await first;
    expect(useExamRoomStore.getState().currentExamRoom?.id).toBe("b");
    expect(useExamRoomStore.getState().loading).toBe(false);
  });

  it("reloads a room quietly: no loading state while it is on its way", async () => {
    let resolve!: (r: ExamRoom) => void;
    vi.mocked(api.getExamRoomByIdApi).mockReturnValue(new Promise((r) => (resolve = r)));
    useExamRoomStore.setState({ currentExamRoom: room("a") });

    const done = useExamRoomStore.getState().fetchExamRoomById("a", { quiet: true });
    expect(useExamRoomStore.getState().loading).toBe(false);
    resolve(room("a", { title: "Mới" }));
    await done;

    expect(useExamRoomStore.getState().currentExamRoom?.title).toBe("Mới");
    expect(useExamRoomStore.getState().loading).toBe(false);
  });
});
