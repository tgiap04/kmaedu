import { type ComponentProps, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCircleIcon, CopyIcon, PlusIcon } from "@phosphor-icons/react";
import { Button } from "@/components/antd/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/antd/dialog";
import { toast } from "@/components/antd/toast";
import { DeleteConfirmDialog } from "@/components/organisms/DeleteConfirmDialog";
import { ExamSessionFormModal } from "@/components/organisms/ExamSessionFormModal";
import { useCan } from "@/hooks/useCan";
import { sessionPhase } from "@/lib/exam-room/room-status";
import { useExamRoomDetailStore } from "@/stores/useExamRoomDetailStore";
import type { ExamSessionBasic } from "@/types/examRoom";
import { RoomSessionsSection } from "../room-sessions-section";

const PAGE_SIZE = 10;

export const sessionLink = (sessionId: string) => `${window.location.origin}/exam-session/${sessionId}`;

type SessionFormData = Parameters<ComponentProps<typeof ExamSessionFormModal>["onSubmit"]>[0];

/** The room's sessions (create, edit, share, delete, refresh the quiz) — the page before the redesign, as a tab. */
export function RoomSessionsTab({ roomId, now, onChanged }: { roomId: string; now: number; onChanged: () => void }) {
  const navigate = useNavigate();
  const { sessions, sessionsTotalPages, loadingSessions, mutationLoading, fetchSessions, createSession, updateSession, deleteSession, refreshSnapshot } = useExamRoomDetailStore();
  const canManage = useCan("exam_session:manage");
  const [page, setPage] = useState(1);
  const [form, setForm] = useState<{ mode: "create" | "edit"; session: ExamSessionBasic | null } | null>(null);
  const [sharing, setSharing] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [refreshingId, setRefreshingId] = useState<string | null>(null);

  useEffect(() => {
    void fetchSessions(roomId, page, PAGE_SIZE);
  }, [roomId, page, fetchSessions]);

  const counts = useMemo(() => {
    const c = { upcoming: 0, ongoing: 0, completed: 0 };
    for (const s of sessions) {
      const phase = sessionPhase(s, now);
      if (phase === "ended") c.completed += 1;
      else c[phase] += 1;
    }
    return c;
  }, [sessions, now]);

  const reloadAfterChange = () => {
    onChanged();
    void fetchSessions(roomId, page, PAGE_SIZE, { forceRefresh: true });
  };

  const submitForm = async (data: SessionFormData) => {
    const ok = form?.mode === "edit" && form.session ? await updateSession(form.session.id, data) : await createSession({ examRoomId: roomId, ...data });
    if (ok) onChanged();
    return ok;
  };

  const copy = async () => {
    if (!sharing) return;
    try {
      await navigator.clipboard.writeText(sessionLink(sharing));
      setCopied(true);
      toast.success("Đã sao chép link!");
    } catch {
      toast.error("Không sao chép được, hãy chọn và sao chép thủ công");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setForm({ mode: "create", session: null })}>
          <PlusIcon weight="bold" />
          Tạo phiên thi
        </Button>
      </div>

      <RoomSessionsSection
        sessions={sessions}
        loading={loadingSessions}
        counts={counts}
        page={page}
        totalPages={sessionsTotalPages}
        onPageChange={setPage}
        canManage={canManage}
        refreshingId={refreshingId}
        onRefreshSnapshot={async (sessionId) => {
          setRefreshingId(sessionId);
          const result = await refreshSnapshot(sessionId);
          setRefreshingId(null);
          if (result === "locked") reloadAfterChange();
        }}
        onCreate={() => setForm({ mode: "create", session: null })}
        onShare={(s) => { setSharing(s.id); setCopied(false); }}
        onStats={(s) => navigate(`/k/manage-exam-room/${roomId}/session/${s.id}`)}
        onEdit={(s) => setForm({ mode: "edit", session: s })}
        onDelete={(s) => setDeleting(s.id)}
      />

      <Dialog open={sharing !== null} onOpenChange={(open) => !open && setSharing(null)}>
        <DialogContent className="border-hairline bg-canvas sm:max-w-md">
          <DialogHeader><DialogTitle className="text-ink">Chia sẻ phiên thi</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <input type="text" readOnly value={sharing ? sessionLink(sharing) : ""} aria-label="Link phiên thi" className="flex-1 rounded-lg border border-hairline bg-surface-soft px-3 py-2 text-sm text-ink" />
              <Button variant="outline" size="sm" className="border-hairline" onClick={copy} aria-label="Sao chép link">
                {copied ? <CheckCircleIcon className="h-4 w-4 text-success" /> : <CopyIcon className="h-4 w-4" />}
              </Button>
            </div>
            <p className="text-sm text-muted-foreground">Chia sẻ link này để mọi người có thể truy cập phiên thi.</p>
          </div>
        </DialogContent>
      </Dialog>

      <ExamSessionFormModal
        open={form !== null}
        onOpenChange={(open) => !open && setForm(null)}
        mode={form?.mode ?? "create"}
        examRoomId={roomId}
        session={form?.session ?? null}
        onSubmit={submitForm}
        isLoading={mutationLoading}
      />

      <DeleteConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title="Xóa phiên thi"
        description="Bạn có chắc chắn muốn xóa phiên thi này? Tất cả dữ liệu liên quan sẽ bị xóa vĩnh viễn."
        isLoading={mutationLoading}
        onConfirm={async () => {
          if (!deleting) return;
          if (await deleteSession(deleting, roomId)) {
            setDeleting(null);
            reloadAfterChange();
          }
        }}
      />
    </div>
  );
}
