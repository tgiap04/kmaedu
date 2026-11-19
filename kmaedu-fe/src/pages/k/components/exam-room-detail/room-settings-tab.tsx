import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PencilSimpleLineIcon } from "@phosphor-icons/react";
import { ExamRoomForm, type ExamRoomFormData } from "@/components/molecules/ExamRoomForm";
import { DeleteConfirmDialog } from "@/components/organisms/DeleteConfirmDialog";
import { useExamRoomStore } from "@/stores/useExamRoomStore";
import { useQuizSetStore } from "@/stores/useQuizSetStore";
import type { ExamRoom } from "@/types/examRoom";
import { RoomDangerPanel, RoomOverviewPanel } from "./room-settings-aside";

interface Props {
  room: ExamRoom;
  sessions: number;
  onOpenSessions: () => void;
}

/**
 * The room's settings across the whole card: the form in the main column (fields two by two), the room's
 * facts and its deletion beside it once the card is about 1024px wide, below it on a narrower card.
 */
export function RoomSettingsTab({ room, sessions, onOpenSessions }: Props) {
  const navigate = useNavigate();
  const { updateExamRoom, deleteExamRoom } = useExamRoomStore();
  const { fetchAllQuizSets, quizSetsK } = useQuizSetStore();
  const [quizSetsLoading, setQuizSetsLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [formKey, setFormKey] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    void fetchAllQuizSets().finally(() => setQuizSetsLoading(false));
  }, [fetchAllQuizSets]);

  const quizSets = useMemo(() => quizSetsK.map((qs) => ({ id: qs.id, title: qs.title, questionCount: qs.questionCount })), [quizSetsK]);
  // The backend marks a room whose set was deleted; the form also drops ids missing from the list.
  const initial = useMemo<ExamRoomFormData>(
    () => ({ title: room.title, description: room.description || "", quizSetId: room.sourceDeleted ? "" : room.quizSetId }),
    [room],
  );

  const save = async (data: ExamRoomFormData) => {
    setSaving(true);
    try {
      await updateExamRoom(room.id, { title: data.title, description: data.description, quizSetId: data.quizSetId });
    } catch {
      // The store has told the user; the form keeps what was typed.
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    setDeleting(true);
    try {
      await deleteExamRoom(room.id);
      navigate("/k/manage-exam-room", { replace: true });
    } catch {
      setDeleting(false);
    }
  };

  return (
    <>
      {/* Laid out by the card's own width: beside each other only when the form keeps room for two columns of fields. */}
      <div className="@container">
        <div className="grid gap-5 @5xl:grid-cols-[minmax(0,1fr)_22rem]">
        <section className="rounded-lg border border-hairline-soft p-5 md:p-6">
          <header className="mb-6 flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-brand-soft text-brand">
              <PencilSimpleLineIcon weight="duotone" className="size-5" aria-hidden />
            </span>
            <div className="min-w-0">
              <h3 className="text-base font-semibold text-ink">Thông tin chung</h3>
              <p className="mt-0.5 text-sm text-muted-foreground">Tên, mô tả và bộ đề của phòng. Phiên thi đã tạo vẫn giữ đề lúc tạo khi bạn đổi bộ đề.</p>
            </div>
          </header>
          <ExamRoomForm
            key={formKey}
            layout="wide"
            initialData={initial}
            quizSets={quizSets}
            isLoading={saving}
            isLoadingQuizSets={quizSetsLoading}
            onSubmit={save}
            onCancel={() => setFormKey((k) => k + 1)}
            submitLabel="Lưu thay đổi"
          />
        </section>

        <aside className="grid content-start items-start gap-5 @2xl:grid-cols-2 @5xl:grid-cols-1">
          <RoomOverviewPanel room={room} sessions={sessions} onOpenSessions={onOpenSessions} />
          <RoomDangerPanel onDelete={() => setConfirmDelete(true)} />
        </aside>
        </div>
      </div>

      <DeleteConfirmDialog
        open={confirmDelete}
        onOpenChange={(open) => !deleting && setConfirmDelete(open)}
        title="Xóa phòng thi"
        description={`Xóa "${room.title}"? Mọi phiên thi và bài làm trong phòng sẽ bị xóa. Hành động này không thể hoàn tác.`}
        isLoading={deleting}
        onConfirm={remove}
      />
    </>
  );
}
