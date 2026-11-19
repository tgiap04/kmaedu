import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { MonitorIcon, PlusIcon } from "@phosphor-icons/react";
import { PageHeader } from "@/components/k-page/page-header";
import { ExamRoomModal } from "@/components/organisms/ExamRoomModal";
import { DeleteConfirmDialog } from "@/components/organisms/DeleteConfirmDialog";
import { Button } from "@/components/antd/button";
import type { ExamRoomFormData } from "@/components/molecules/ExamRoomForm";
import { useNow } from "@/hooks/useNow";
import { useExamRoomStore } from "@/stores/useExamRoomStore";
import { useQuizSetStore } from "@/stores/useQuizSetStore";
import { RoomBreadcrumb } from "./components/exam-room-list/room-breadcrumb";
import { RoomListPanel } from "./components/exam-room-list/room-list-panel";
import { RoomListStats } from "./components/exam-room-list/room-list-stats";
import { RoomListToolbar } from "./components/exam-room-list/room-list-toolbar";
import { useExamRoomList } from "./components/exam-room-list/use-exam-room-list";

type Pending = { kind: "one"; id: string } | { kind: "selected" } | null;

export default function ManageExamRoomPage() {
  const navigate = useNavigate();
  const { examRooms, loading, fetchAllExamRooms, createExamRoom, updateExamRoom, deleteExamRoom, deleteExamRooms } = useExamRoomStore();
  const { fetchAllQuizSets, quizSetsK } = useQuizSetStore();
  const now = useNow();
  const list = useExamRoomList(examRooms, now);

  const [createOpen, setCreateOpen] = useState(false);
  // Opened from a quiz set ("Sử dụng đề thi này"): ?quizSetId= prefills the create form once.
  const [searchParams, setSearchParams] = useSearchParams();
  const [createInitial, setCreateInitial] = useState<ExamRoomFormData | undefined>();
  const [editing, setEditing] = useState<{ id: string; data: ExamRoomFormData } | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Pending>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    void fetchAllExamRooms().catch(() => {});
  }, [fetchAllExamRooms]);

  useEffect(() => {
    const quizSetId = searchParams.get("quizSetId");
    if (!quizSetId) return;
    setCreateInitial({ title: "", description: "", quizSetId });
    setCreateOpen(true);
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

  const quizSetOptions = useMemo(() => quizSetsK.map((qs) => ({ id: qs.id, title: qs.title, questionCount: qs.questionCount })), [quizSetsK]);

  const openEdit = useCallback(
    (id: string) => {
      const room = examRooms.find((item) => item.id === id);
      if (!room) return;
      // The backend marks rooms whose set was deleted; the form also drops ids missing from the list.
      setEditing({ id, data: { title: room.title, description: room.description || "", quizSetId: room.sourceDeleted ? "" : room.quizSetId } });
    },
    [examRooms],
  );

  const handleCreate = async (data: ExamRoomFormData) => {
    try {
      await createExamRoom({ title: data.title, description: data.description, quizSetId: data.quizSetId });
      setCreateOpen(false);
      setCreateInitial(undefined);
    } catch {
      // The store has told the user; the form stays open to try again.
    }
  };

  const handleEdit = async (data: ExamRoomFormData) => {
    if (!editing) return;
    try {
      await updateExamRoom(editing.id, { title: data.title, description: data.description, quizSetId: data.quizSetId });
      setEditing(null);
    } catch {
      // As above.
    }
  };

  const confirmDelete = async () => {
    if (!pendingDelete) return;
    setDeleting(true);
    try {
      if (pendingDelete.kind === "one") await deleteExamRoom(pendingDelete.id);
      else await deleteExamRooms([...list.selected]);
      setPendingDelete(null);
    } catch {
      // As above; the dialog stays open.
    } finally {
      setDeleting(false);
    }
  };

  const handlers = {
    onOpen: (id: string) => navigate(`/k/manage-exam-room/${id}`),
    onResults: (id: string) => navigate(`/k/manage-exam-room/${id}?tab=stats`),
    onEdit: openEdit,
    onDelete: (id: string) => setPendingDelete({ kind: "one", id }),
  };

  const firstLoad = loading && examRooms.length === 0;

  return (
    <div className="space-y-5">
      <PageHeader
        icon={<MonitorIcon />}
        title="Danh sách phòng thi"
        subtitle="Quản lý các phòng thi đã tạo và theo dõi kết quả"
        eyebrow={<RoomBreadcrumb current="Danh sách phòng thi" />}
        large
        actions={
          <Button variant="solid" size="lg" onClick={() => setCreateOpen(true)} className="!h-12 !px-6 !text-[15px] !font-semibold">
            <PlusIcon weight="bold" />
            Tạo phòng thi
          </Button>
        }
      />

      {firstLoad ? (
        <div className="animate-pulse space-y-5" aria-busy="true">
          <div className="grid gap-4 min-[480px]:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }, (_, i) => <div key={i} className="h-[104px] rounded-lg bg-surface-soft" />)}
          </div>
          <div className="h-[76px] rounded-lg bg-surface-soft" />
          <div className="h-72 rounded-lg bg-surface-soft" />
        </div>
      ) : (
        <>
          <RoomListStats stats={list.stats} />
          <RoomListToolbar filters={list.filters} onChange={list.changeFilters} view={list.view} onViewChange={list.setView} />
          <RoomListPanel
            list={list}
            hasRooms={examRooms.length > 0}
            onCreate={() => setCreateOpen(true)}
            onDeleteSelected={() => setPendingDelete({ kind: "selected" })}
            {...handlers}
          />
        </>
      )}

      <ExamRoomModal
        open={createOpen}
        onOpenChange={(open) => {
          setCreateOpen(open);
          if (!open) setCreateInitial(undefined);
        }}
        mode="create"
        initialData={createInitial}
        quizSets={quizSetOptions}
        isLoadingQuizSets={quizSetsLoading}
        isLoading={loading}
        onSubmit={handleCreate}
      />

      <ExamRoomModal
        open={editing !== null}
        onOpenChange={(open) => !open && setEditing(null)}
        mode="edit"
        quizSets={quizSetOptions}
        isLoadingQuizSets={quizSetsLoading}
        isLoading={loading}
        initialData={editing?.data}
        onSubmit={handleEdit}
      />

      <DeleteConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && !deleting && setPendingDelete(null)}
        title={pendingDelete?.kind === "selected" ? `Xóa ${list.selected.size} phòng thi` : "Xóa phòng thi"}
        description={
          pendingDelete?.kind === "selected"
            ? "Mọi phiên thi và bài làm trong các phòng đã chọn sẽ bị xóa. Hành động này không thể hoàn tác."
            : "Bạn có chắc chắn muốn xóa phòng thi này? Hành động này không thể hoàn tác."
        }
        isLoading={deleting}
        onConfirm={confirmDelete}
      />
    </div>
  );
}
