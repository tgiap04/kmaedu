import { displayUserName } from "@/lib/user/display-user-name";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { DoorOpenIcon, PlusCircleIcon } from "@phosphor-icons/react";
import { PageHeader } from "@/components/k-page/page-header";
import { getExamAttemptsByRoomApi, type ExamAttemptListItem } from "@/apis/examAttemptApi";
import { ExamRoomModal } from "@/components/organisms/ExamRoomModal";
import { DeleteConfirmDialog } from "@/components/organisms/DeleteConfirmDialog";
import { RoomStatsSection } from "@/components/organisms/k/RoomStatsSection";
import { ExamRoomList, type ExamRoom as ExamRoomListType } from "@/components/organisms/k/ExamRoomList";
import { RecentParticipantsList, type Participant } from "@/components/organisms/k/RecentParticipantsList";
import { Button } from "@/components/antd/button";
import type { ExamRoomFormData } from "@/components/molecules/ExamRoomForm";
import { useExamRoomStore } from "@/stores/useExamRoomStore";
import { useQuizSetStore } from "@/stores/useQuizSetStore";

export default function ManageExamRoomPage() {
  const navigate = useNavigate();
  const {
    examRooms,
    loading,
    fetchAllExamRooms,
    createExamRoom,
    updateExamRoom,
    deleteExamRoom,
  } = useExamRoomStore();
  const { fetchAllQuizSets, quizSetsK } = useQuizSetStore();

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  // Opened from a quiz set ("Sử dụng đề thi này"): ?quizSetId= prefills the create form once.
  const [searchParams, setSearchParams] = useSearchParams();
  const [createInitial, setCreateInitial] = useState<ExamRoomFormData | undefined>();
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);
  const [editFormData, setEditFormData] = useState<ExamRoomFormData | undefined>();
  const [recentParticipants, setRecentParticipants] = useState<Participant[]>([]);
  const [loadingParticipants, setLoadingParticipants] = useState(false);

  useEffect(() => {
    fetchAllExamRooms();
  }, [fetchAllExamRooms]);

  useEffect(() => {
    const quizSetId = searchParams.get("quizSetId");
    if (!quizSetId) return;
    setCreateInitial({ title: "", description: "", quizSetId });
    setIsCreateModalOpen(true);
    setSearchParams((params) => {
      params.delete("quizSetId");
      return params;
    }, { replace: true });
  }, [searchParams, setSearchParams]);

  // Until the user's quiz sets arrive, the room form cannot tell a valid set from a deleted one.
  const [quizSetsLoading, setQuizSetsLoading] = useState(true);
  useEffect(() => {
    void fetchAllQuizSets().finally(() => setQuizSetsLoading(false));
  }, [fetchAllQuizSets]);

  useEffect(() => {
    const fetchRecentParticipants = async () => {
      if (examRooms.length === 0) return;

      setLoadingParticipants(true);
      try {
        const attemptsPromises = examRooms.map((room) =>
          getExamAttemptsByRoomApi(room.id, 1, 10, true).catch(() => ({
            attempts: [],
            total: 0,
            page: 1,
            limit: 10,
            totalPages: 0,
          })),
        );

        const results = await Promise.all(attemptsPromises);
        const allAttempts: ExamAttemptListItem[] = [];

        results.forEach((result, index) => {
          result.attempts.forEach((attempt) => {
            allAttempts.push({
              ...attempt,
              examRoomTitle: examRooms[index].title,
            } as ExamAttemptListItem & { examRoomTitle: string });
          });
        });

        const participants: Participant[] = allAttempts
          .sort((a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime())
          .slice(0, 5)
          .map((attempt) => ({
            id: attempt.id,
            name: displayUserName(attempt.user),
            examName: (attempt as ExamAttemptListItem & { examRoomTitle?: string }).examRoomTitle || "Phòng thi",
            status: "offline",
          }));

        setRecentParticipants(participants);
      } catch (error) {
        console.error("Failed to fetch recent participants:", error);
      } finally {
        setLoadingParticipants(false);
      }
    };

    fetchRecentParticipants();
  }, [examRooms]);

  const stats = useMemo(() => {
    const activeRooms = examRooms.length;
    const totalParticipants = examRooms.reduce((sum, room) => sum + (room._count?.examSessions || 0), 0);

    return {
      activeRooms,
      totalParticipants,
      ongoingExams: 0,
      completedToday: 0,
    };
  }, [examRooms]);

  const transformedRooms = useMemo<ExamRoomListType[]>(() => {
    return examRooms.map((room) => ({
      id: room.id,
      name: room.title,
      roomType: room.quizSet?.title || "Chưa có bộ đề",
      questionCount: room.quizSet?._count?.detailsQuizQuestions || room.quizSet?.questionCount || 0,
      isPrivate: false,
    }));
  }, [examRooms]);

  const quizSetOptions = useMemo(
    () =>
      quizSetsK.map((qs) => ({
        id: qs.id,
        title: qs.title,
        questionCount: qs.questionCount,
      })),
    [quizSetsK],
  );

  const handleEditRoom = useCallback(
    (id: string) => {
      const room = examRooms.find((item) => item.id === id);
      if (!room) return;

      setEditFormData({
        title: room.title,
        description: room.description || "",
        // The backend marks rooms whose set was deleted; the form also drops ids missing from the list.
        quizSetId: room.sourceDeleted ? "" : room.quizSetId,
      });
      setSelectedRoomId(id);
      setIsEditModalOpen(true);
    },
    [examRooms],
  );

  const handleCreateSubmit = useCallback(
    async (data: ExamRoomFormData) => {
      try {
        await createExamRoom({
          title: data.title,
          description: data.description,
          quizSetId: data.quizSetId,
        });
        setIsCreateModalOpen(false);
        setCreateInitial(undefined);
      } catch (error) {
        console.error("Create exam room error:", error);
      }
    },
    [createExamRoom],
  );

  const handleEditSubmit = useCallback(
    async (data: ExamRoomFormData) => {
      if (!selectedRoomId) return;

      try {
        await updateExamRoom(selectedRoomId, {
          title: data.title,
          description: data.description,
          quizSetId: data.quizSetId,
        });
        setIsEditModalOpen(false);
        setSelectedRoomId(null);
        setEditFormData(undefined);
      } catch (error) {
        console.error("Update exam room error:", error);
      }
    },
    [selectedRoomId, updateExamRoom],
  );

  const handleConfirmDelete = useCallback(async () => {
    if (!selectedRoomId) return;

    try {
      await deleteExamRoom(selectedRoomId);
      setIsDeleteDialogOpen(false);
      setSelectedRoomId(null);
    } catch (error) {
      console.error("Delete exam room error:", error);
    }
  }, [selectedRoomId, deleteExamRoom]);

  if (loading && examRooms.length === 0) {
    return (
      <div className="animate-pulse">
        <div className="mb-6 h-16 w-72 rounded-lg bg-surface-soft" />
        <div className="mb-6 grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="h-28 rounded-lg bg-surface-soft" />
          ))}
        </div>
        <div className="h-64 rounded-lg bg-surface-soft" />
      </div>
    );
  }

  return (
    <div>
      <div>
        <PageHeader
          icon={<DoorOpenIcon />}
          title="Quản lý phòng thi"
          subtitle="Tạo và quản lý các phòng thi trực tuyến"
          actions={
            <Button onClick={() => setIsCreateModalOpen(true)}>
              <PlusCircleIcon className="mr-2 h-4 w-4" />
              Tạo phòng thi mới
            </Button>
          }
        />

        <RoomStatsSection stats={stats} />

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <ExamRoomList
              rooms={transformedRooms}
              onViewRoom={(id) => navigate(`/k/manage-exam-room/${id}`)}
              onEditRoom={handleEditRoom}
              onDeleteRoom={(id) => {
                setSelectedRoomId(id);
                setIsDeleteDialogOpen(true);
              }}
            />
          </div>

          <div className="lg:col-span-1">
            {loadingParticipants ? (
              <div className="h-64 animate-pulse rounded-lg bg-surface-soft" />
            ) : (
              <RecentParticipantsList participants={recentParticipants} onViewAll={() => {}} />
            )}
          </div>
        </div>
      </div>

      <ExamRoomModal
        open={isCreateModalOpen}
        onOpenChange={(open) => {
          setIsCreateModalOpen(open);
          if (!open) setCreateInitial(undefined);
        }}
        mode="create"
        initialData={createInitial}
        quizSets={quizSetOptions}
        isLoadingQuizSets={quizSetsLoading}
        isLoading={loading}
        onSubmit={handleCreateSubmit}
      />

      <ExamRoomModal
        open={isEditModalOpen}
        onOpenChange={setIsEditModalOpen}
        mode="edit"
        quizSets={quizSetOptions}
        isLoadingQuizSets={quizSetsLoading}
        isLoading={loading}
        initialData={editFormData}
        onSubmit={handleEditSubmit}
      />

      <DeleteConfirmDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        title="Xóa phòng thi"
        description="Bạn có chắc chắn muốn xóa phòng thi này? Hành động này không thể hoàn tác."
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
