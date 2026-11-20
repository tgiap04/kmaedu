// @vitest-environment jsdom
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ExamRoom } from "@/types/examRoom";

vi.mock("@/apis/examRoomApi", () => ({
  getAllExamRoomsApi: vi.fn(),
  deleteExamRoomApi: vi.fn(),
  createExamRoomApi: vi.fn(),
  updateExamRoomApi: vi.fn(),
  getExamRoomsApi: vi.fn(),
  getExamRoomByIdApi: vi.fn(),
}));
vi.mock("@/stores/useQuizSetStore", () => ({
  useQuizSetStore: () => ({ fetchAllQuizSets: () => Promise.resolve(), quizSetsK: [] }),
}));

const api = await import("@/apis/examRoomApi");
const { storeCache } = await import("@/lib/storeCache");
const { useExamRoomStore } = await import("@/stores/useExamRoomStore");
const { default: ManageExamRoomPage } = await import("./ManageExamRoomPage");

const hour = 3_600_000;
const at = (offset: number) => new Date(Date.now() + offset).toISOString();
const room = (id: string, title: string, windows: ExamRoom["sessionWindows"], participantCount = 0): ExamRoom => ({
  id,
  title,
  quizSetId: "q",
  hostId: "h",
  createdAt: at(-24 * hour),
  updatedAt: at(-24 * hour),
  quizSet: { id: "q", title: "Bộ đề test 3", _count: { detailsQuizQuestions: 18 } },
  sessionWindows: windows,
  participantCount,
});

const ROOMS = [
  room("r1", "Phòng thi test 1", [{ startTime: at(-hour), endTime: at(hour) }], 48),
  room("r2", "Luyện đề hàng tuần", [{ startTime: at(-30 * hour), endTime: at(-29 * hour) }], 32),
  room("r3", "Ôn tập Linux nâng cao", [{ startTime: at(-50 * hour), endTime: at(-49 * hour) }], 55),
];

const open = () => render(<MemoryRouter><ManageExamRoomPage /></MemoryRouter>);

function Where() {
  const location = useLocation();
  return <p data-testid="where">{location.pathname + location.search}</p>;
}
const openAt = (url: string) =>
  render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/k/manage-exam-room" element={<ManageExamRoomPage />} />
        <Route path="/k/manage-exam-room/new" element={<Where />} />
      </Routes>
    </MemoryRouter>,
  );

beforeEach(() => {
  vi.clearAllMocks();
  storeCache.clear();
  useExamRoomStore.setState({ examRooms: [], loading: false, error: null });
  vi.mocked(api.getAllExamRoomsApi).mockResolvedValue({ examRooms: ROOMS });
});

describe("the exam room list page", () => {
  it("lists each room with its quiz set, status and participants, and totals them", async () => {
    open();
    const table = await screen.findByRole("table", { name: "Danh sách phòng thi" });
    const first = within(table).getAllByRole("row")[1];
    expect(within(first).getByText("Phòng thi test 1")).toBeTruthy();
    expect(within(first).getByText("Đề: Bộ đề test 3 • 18 câu")).toBeTruthy();
    expect(within(first).getAllByText("Đang diễn ra").length).toBeGreaterThan(0);
    expect(within(first).getAllByRole("button", { name: "Vào phòng" }).length).toBeGreaterThan(0);
    expect(within(table).getAllByRole("button", { name: "Xem kết quả" }).length).toBeGreaterThan(0);
    expect(screen.getByText("135")).toBeTruthy(); // 48 + 32 + 55
    expect(screen.getByText("Hiển thị 1 – 3 / 3 phòng thi")).toBeTruthy();
  });

  it("deletes the ticked rooms after a confirmation, one request each", async () => {
    vi.mocked(api.deleteExamRoomApi).mockResolvedValue({ message: "ok" });
    const user = userEvent.setup();
    open();
    await user.click(await screen.findByRole("checkbox", { name: "Chọn phòng Phòng thi test 1" }));
    await user.click(screen.getByRole("checkbox", { name: "Chọn phòng Luyện đề hàng tuần" }));
    await user.click(screen.getByRole("button", { name: /Xóa 2 phòng/ }));

    const dialog = await screen.findByRole("dialog");
    expect(api.deleteExamRoomApi).not.toHaveBeenCalled();
    await user.click(within(dialog).getByRole("button", { name: "Xóa" }));

    await waitFor(() => expect(api.deleteExamRoomApi).toHaveBeenCalledTimes(2));
    expect(vi.mocked(api.deleteExamRoomApi).mock.calls.map((c) => c[0]).sort()).toEqual(["r1", "r2"]);
    await waitFor(() => expect(screen.queryByText("Phòng thi test 1")).toBeNull());
    expect(screen.getByText("Ôn tập Linux nâng cao")).toBeTruthy();
  });

  it("filters by status and offers to clear the filter when nothing matches", async () => {
    const user = userEvent.setup();
    open();
    await screen.findByText("Phòng thi test 1");
    await user.type(screen.getByRole("textbox", { name: "Tìm kiếm phòng thi" }), "khong co phong nay");
    expect(await screen.findByText("Không có phòng thi phù hợp")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Xóa bộ lọc" }));
    expect(await screen.findByText("Phòng thi test 1")).toBeTruthy();
  });

  it("opens the create page from the header button", async () => {
    openAt("/k/manage-exam-room");
    await userEvent.click(await screen.findByRole("button", { name: /Tạo phòng thi/ }));
    expect((await screen.findByTestId("where")).textContent).toBe("/k/manage-exam-room/new");
  });

  it("sends ?quizSetId= on to the create page, prefilled", async () => {
    openAt("/k/manage-exam-room?quizSetId=qs%201");
    expect((await screen.findByTestId("where")).textContent).toBe("/k/manage-exam-room/new?quizSetId=qs%201");
  });
});
