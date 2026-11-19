import { create } from "zustand";
import {
  getExamRoomsApi,
  createExamRoomApi,
  updateExamRoomApi,
  deleteExamRoomApi,
  getExamRoomByIdApi,
  getAllExamRoomsApi,
  type CredentialsCreateExamRoom,
  type CredentialsUpdateExamRoom,
  type CredentialsGetExamRooms,
} from "@/apis/examRoomApi";
import { ExamRoom } from "@/types/examRoom";
import { storeCache, CacheTTL } from "@/lib/storeCache";
import { toast } from "@/components/antd/toast";

/** Prefix of every cached room list: the paged one ("examrooms:…") and list-all ("examrooms-all:"). */
const ROOM_CACHE = "examrooms";

interface ExamRoomStore {
  examRooms: ExamRoom[];
  currentExamRoom: ExamRoom | null;
  loading: boolean;
  error: string | null;

  // Actions
  fetchExamRooms: (
    params: CredentialsGetExamRooms,
    options?: { forceRefresh?: boolean }
  ) => Promise<any>;
  fetchAllExamRooms: (options?: { forceRefresh?: boolean }) => Promise<any>;
  /** `quiet` reloads the room on screen (after a session change) without the loading state. */
  fetchExamRoomById: (id: string, options?: { quiet?: boolean }) => Promise<void>;
  createExamRoom: (credentials: CredentialsCreateExamRoom) => Promise<void>;
  updateExamRoom: (
    id: string,
    credentials: CredentialsUpdateExamRoom
  ) => Promise<void>;
  deleteExamRoom: (id: string) => Promise<void>;
  /** Deletes the rooms one after another; returns the ids that could not be deleted. */
  deleteExamRooms: (ids: string[]) => Promise<string[]>;
  invalidateCache: () => void;
}

/** The newest fetchExamRoomById call: only its answer may land. */
let roomRequest = 0;

export const useExamRoomStore = create<ExamRoomStore>((set) => ({
  examRooms: [],
  currentExamRoom: null,
  loading: false,
  error: null,

  fetchExamRooms: async (params, options = {}) => {
    const { forceRefresh = false } = options;
    const cacheKey = storeCache.createKey("examrooms", params);

    try {
      set({ loading: true, error: null });

      const response = await storeCache.fetchWithCache(
        cacheKey,
        async () => {
          return await getExamRoomsApi(params);
        },
        {
          ttl: CacheTTL.FIVE_MINUTES,
          forceRefresh,
        }
      );

      set({
        examRooms: response.examRooms,
        loading: false,
      });

      return response;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      set({
        error: errorMessage,
        loading: false,
      });
      toast.error("Lấy danh sách phòng thi thất bại", {
        description: errorMessage,
      });
      console.error("Lấy danh sách phòng thi thất bại:", error);
      throw error;
    }
  },

  fetchAllExamRooms: async (options = {}) => {
    const { forceRefresh = false } = options;
    const cacheKey = storeCache.createKey("examrooms-all", {});

    try {
      set({ loading: true, error: null });

      const response = await storeCache.fetchWithCache(
        cacheKey,
        async () => {
          return await getAllExamRoomsApi();
        },
        {
          ttl: CacheTTL.FIVE_MINUTES,
          forceRefresh,
        }
      );

      set({
        examRooms: response.examRooms,
        loading: false,
      });

      return response;
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      set({
        error: errorMessage,
        loading: false,
      });
      toast.error("Lấy danh sách phòng thi thất bại", {
        description: errorMessage,
      });
      console.error("Lấy danh sách phòng thi thất bại:", error);
      throw error;
    }
  },

  fetchExamRoomById: async (id, options = {}) => {
    const token = ++roomRequest;
    try {
      set({ loading: !options.quiet, error: null });

      const examRoom = await getExamRoomByIdApi(id);

      // Opening room A then room B quickly: A's late answer must not replace B.
      if (token !== roomRequest) return;
      set({
        currentExamRoom: examRoom,
        loading: false,
      });
    } catch (error) {
      if (token !== roomRequest) return;
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      set({
        error: errorMessage,
        loading: false,
      });
      toast.error("Lấy thông tin phòng thi thất bại", {
        description: errorMessage,
      });
      console.error("Lấy thông tin phòng thi thất bại:", error);
      throw error;
    }
  },

  createExamRoom: async (credentials: CredentialsCreateExamRoom) => {
    try {
      set({ loading: true, error: null });

      const response = await createExamRoomApi(credentials);

      // Invalidate cache sau khi tạo mới
      storeCache.invalidate(ROOM_CACHE);

      // Thêm exam room mới vào danh sách
      set((state) => ({
        examRooms: [response.examRoom, ...state.examRooms],
        loading: false,
      }));

      toast.success("Tạo phòng thi thành công");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      set({
        error: errorMessage,
        loading: false,
      });
      toast.error("Tạo phòng thi thất bại", {
        description: errorMessage,
      });
      console.error("Tạo phòng thi thất bại:", error);
      throw error;
    }
  },

  updateExamRoom: async (
    id: string,
    credentials: CredentialsUpdateExamRoom
  ) => {
    try {
      set({ loading: true, error: null });

      const response = await updateExamRoomApi(id, credentials);

      // Invalidate cache sau khi cập nhật
      storeCache.invalidate(ROOM_CACHE);

      // Cập nhật exam room trong danh sách
      set((state) => ({
        // The edit response has no session windows or participant count: keep the listed ones.
        examRooms: state.examRooms.map((room) =>
          room.id === id ? { ...room, ...response.examRoom } : room
        ),
        // Nor the open room's sessions and host: keep those as well.
        currentExamRoom:
          state.currentExamRoom?.id === id
            ? { ...state.currentExamRoom, ...response.examRoom }
            : state.currentExamRoom,
        loading: false,
      }));

      toast.success("Cập nhật phòng thi thành công");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      set({
        error: errorMessage,
        loading: false,
      });
      toast.error("Cập nhật phòng thi thất bại", {
        description: errorMessage,
      });
      console.error("Cập nhật phòng thi thất bại:", error);
      throw error;
    }
  },

  deleteExamRoom: async (id: string) => {
    try {
      set({ loading: true, error: null });

      await deleteExamRoomApi(id);

      // Invalidate cache sau khi xóa
      storeCache.invalidate(ROOM_CACHE);

      // Xóa exam room khỏi danh sách
      set((state) => ({
        examRooms: state.examRooms.filter((room) => room.id !== id),
        currentExamRoom:
          state.currentExamRoom?.id === id ? null : state.currentExamRoom,
        loading: false,
      }));

      toast.success("Xóa phòng thi thành công");
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      set({
        error: errorMessage,
        loading: false,
      });
      toast.error("Xóa phòng thi thất bại", {
        description: errorMessage,
      });
      console.error("Xóa phòng thi thất bại:", error);
      throw error;
    }
  },

  deleteExamRooms: async (ids) => {
    set({ loading: true, error: null });
    const failed: string[] = [];
    for (const id of ids) {
      try {
        await deleteExamRoomApi(id);
      } catch (error) {
        console.error("Xóa phòng thi thất bại:", id, error);
        failed.push(id);
      }
    }
    storeCache.invalidate(ROOM_CACHE);
    const gone = new Set(ids.filter((id) => !failed.includes(id)));
    set((state) => ({
      examRooms: state.examRooms.filter((room) => !gone.has(room.id)),
      currentExamRoom: state.currentExamRoom && gone.has(state.currentExamRoom.id) ? null : state.currentExamRoom,
      loading: false,
    }));
    if (failed.length === 0) toast.success(`Đã xóa ${gone.size} phòng thi`);
    else toast.warning(`Đã xóa ${gone.size} phòng thi, ${failed.length} phòng không xóa được`);
    return failed;
  },

  invalidateCache: () => {
    storeCache.invalidate(ROOM_CACHE);
  },
}));
