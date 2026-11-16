import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Check, Copy, DoorOpen, Plus } from "lucide-react";
import { toast } from "@/components/antd/toast";
import { Button } from "@/components/antd/button";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/antd/breadcrumb";
import { PageHeader } from "@/components/k-page/page-header";
import { SectionCard, SectionMessage } from "@/components/k-page/section-card";
import { DeleteConfirmDialog } from "@/components/organisms/DeleteConfirmDialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/antd/dialog";
import { ExamSessionFormModal } from "@/components/organisms/ExamSessionFormModal";
import { Skeleton } from "@/components/antd/skeleton";
import { ASSESS_TYPE } from "@/types/examSession";
import type { ExamSessionBasic } from "@/types/examRoom";
import { useExamRoomDetailStore } from "@/stores/useExamRoomDetailStore";
import { useExamRoomStore } from "@/stores/useExamRoomStore";
import { useCan } from "@/hooks/useCan";
import { RoomDetailStats, RoomInfoCard } from "./components/room-detail-overview";
import { RoomSessionsSection } from "./components/room-sessions-section";

const PAGE_SIZE = 10;

export default function ManageExamRoomDetailPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { currentExamRoom, fetchExamRoomById, loading } = useExamRoomStore();
  const {
    sessions,
    sessionsTotalPages,
    totalDistinctParticipants,
    loadingSessions,
    mutationLoading,
    fetchSessions,
    createSession,
    updateSession,
    deleteSession,
    refreshSnapshot,
    reset,
  } = useExamRoomDetailStore();

  const canManageSessions = useCan("exam_session:manage");
  const [refreshingId, setRefreshingId] = useState<string | null>(null);
  const [sessionsPage, setSessionsPage] = useState(1);
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [editingSession, setEditingSession] = useState<ExamSessionBasic | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(null);

  useEffect(() => {
    if (id) {
      fetchExamRoomById(id);
    }

    return () => {
      reset();
    };
  }, [id, fetchExamRoomById, reset]);

  useEffect(() => {
    if (id) {
      fetchSessions(id, sessionsPage, PAGE_SIZE);
    }
  }, [id, sessionsPage, fetchSessions]);

  const stats = useMemo(() => {
    const now = new Date();
    const total = sessions.length;
    const upcoming = sessions.filter((s) => new Date(s.startTime) > now).length;
    const ongoing = sessions.filter((s) => {
      const start = new Date(s.startTime);
      const end = s.endTime ? new Date(s.endTime) : null;
      return start <= now && (!end || end > now);
    }).length;
    const completed = sessions.filter((s) => {
      const end = s.endTime ? new Date(s.endTime) : null;
      return end && end <= now;
    }).length;
    const totalAttempts = sessions.reduce((sum, s) => sum + (s._count?.examAttempts || 0), 0);

    return {
      total,
      upcoming,
      ongoing,
      completed,
      totalAttempts,
      totalParticipants: totalDistinctParticipants,
    };
  }, [sessions, totalDistinctParticipants]);

  const handleCopyLink = () => {
    if (!selectedSessionId) return;
    const link = `${window.location.origin}/exam-session/${selectedSessionId}`;
    navigator.clipboard.writeText(link);
    setCopied(true);
    toast.success("Đã sao chép link!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleFormSubmit = async (data: {
    startTime: string;
    endTime?: string;
    assessType: ASSESS_TYPE;
    accessCode?: string | null;
    whitelist?: string[];
    allowRetake: boolean;
    maxAttempts: number;
    showAnswersAfterSubmit?: boolean;
    passingScore?: number;
    questionCount?: number | null;
    questionSelectionMode?: number;
    labelQuestionConfig?: any[] | null;
    shuffleQuestions?: boolean;
  }) => {
    let success = false;

    if (formMode === "create") {
      success = await createSession({ examRoomId: id, ...data });
    } else if (editingSession) {
      success = await updateSession(editingSession.id, data);
    }

    return success;
  };

  const handleRefreshSnapshot = async (sessionId: string) => {
    setRefreshingId(sessionId);
    const result = await refreshSnapshot(sessionId);
    setRefreshingId(null);
    if (result === "locked") {
      await fetchSessions(id, sessionsPage, PAGE_SIZE, { forceRefresh: true });
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-16 w-72 rounded-2xl" />
        <Skeleton className="h-28 w-full rounded-2xl" />
        <Skeleton className="h-[320px] w-full rounded-[20px]" />
      </div>
    );
  }

  if (!currentExamRoom) {
    return (
      <SectionCard icon={<DoorOpen />} title="Phòng thi" plain>
        <SectionMessage title="Không tìm thấy phòng thi" hint="Phòng thi có thể đã bị xóa." />
        <div className="flex justify-center pb-6">
          <Button variant="outline" onClick={() => navigate("/k/manage-exam-room")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Quay lại danh sách
          </Button>
        </div>
      </SectionCard>
    );
  }

  const openCreate = () => {
    setFormMode("create");
    setEditingSession(null);
    setFormModalOpen(true);
  };

  return (
    <div>
      <div>
        <PageHeader
          icon={<DoorOpen />}
          title={currentExamRoom.title}
          subtitle="Chi tiết phòng thi và các phiên thi liên quan"
          eyebrow={
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link to="/k/manage-exam-room">Quản lý Phòng thi</Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>{currentExamRoom.title}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          }
          actions={
            <Button onClick={openCreate} size="lg">
              <Plus className="mr-2 h-4 w-4" />
              Tạo phiên thi
            </Button>
          }
        />

        <RoomDetailStats stats={stats} />
        <RoomInfoCard room={currentExamRoom} />

        <RoomSessionsSection
          sessions={sessions}
          loading={loadingSessions}
          counts={stats}
          page={sessionsPage}
          totalPages={sessionsTotalPages}
          onPageChange={setSessionsPage}
          canManage={canManageSessions}
          refreshingId={refreshingId}
          onRefreshSnapshot={handleRefreshSnapshot}
          onCreate={openCreate}
          onShare={(session) => { setSelectedSessionId(session.id); setShareDialogOpen(true); setCopied(false); }}
          onStats={(session) => navigate(`/k/manage-exam-room/${id}/session/${session.id}`)}
          onEdit={(session) => { setFormMode("edit"); setEditingSession(session); setFormModalOpen(true); }}
          onDelete={(session) => { setDeletingSessionId(session.id); setDeleteDialogOpen(true); }}
        />

      <Dialog open={shareDialogOpen} onOpenChange={setShareDialogOpen}>
        <DialogContent className="sm:max-w-md border-hairline bg-canvas">
          <DialogHeader><DialogTitle className="text-ink">Chia sẻ phiên thi</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={selectedSessionId ? `${window.location.origin}/exam-session/${selectedSessionId}` : ""}
                className="flex-1 rounded-md border border-hairline bg-surface-soft px-3 py-2 text-sm text-ink"
              />
              <Button variant="outline" size="sm" className="border-hairline" onClick={handleCopyLink}>
                {copied ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">Chia sẻ link này để mọi người có thể truy cập phiên thi.</p>
          </div>
        </DialogContent>
      </Dialog>

      <ExamSessionFormModal
        open={formModalOpen}
        onOpenChange={setFormModalOpen}
        mode={formMode}
        examRoomId={id}
        session={editingSession}
        onSubmit={handleFormSubmit}
        isLoading={mutationLoading}
      />

      <DeleteConfirmDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        title="Xóa phiên thi"
        description="Bạn có chắc chắn muốn xóa phiên thi này? Tất cả dữ liệu liên quan sẽ bị xóa vĩnh viễn."
        isLoading={mutationLoading}
        onConfirm={async () => {
          if (!deletingSessionId) return;
          const success = await deleteSession(deletingSessionId, id);
          if (success) {
            setDeleteDialogOpen(false);
            setDeletingSessionId(null);
            fetchSessions(id, sessionsPage, PAGE_SIZE, { forceRefresh: true });
          }
        }}
      />
      </div>
    </div>
  );
}
