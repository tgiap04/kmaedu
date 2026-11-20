import { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { ExamAttemptListItem } from "@/apis/examAttemptApi";
import { DeleteConfirmDialog } from "@/components/organisms/DeleteConfirmDialog";
import { RoomDetailActions } from "@/pages/k/components/exam-room-detail/room-detail-actions";
import { useExamRoomDetailStore } from "@/stores/useExamRoomDetailStore";
import { footerNote, fromHostSession, rosterCounts } from "@/lib/exam-session/waiting-room-view";
import type { ExamSession } from "@/types/examSession";
import { WaitingRoomLayout } from "./waiting-room-layout";
import { WaitingRoomRosterCard } from "./waiting-room-roster-card";
import { WaitingRoomFooter } from "./waiting-room-footer";

/** Open now: started and not yet closed. */
function isRunning(session: ExamSession, now: number): boolean {
  const start = Date.parse(session.startTime);
  const end = session.endTime ? Date.parse(session.endTime) : Number.POSITIVE_INFINITY;
  return start <= now && now < end;
}

interface Props {
  session: ExamSession;
  candidates: ExamAttemptListItem[];
  candidatesLoading: boolean;
  onEnded: () => void;
}

/** The waiting page as the room's host sees it: the same facts, plus the room actions and who has joined. */
export function HostWaitingRoom({ session, candidates, candidatesLoading, onEnded }: Props) {
  const navigate = useNavigate();
  const { endRoom, mutationLoading } = useExamRoomDetailStore();
  const [confirmEnd, setConfirmEnd] = useState(false);
  const view = fromHostSession(session);

  return (
    <>
      <WaitingRoomLayout
        view={view}
        crumb={{ label: "Quản lý phòng thi", to: `/k/manage-exam-room/${session.examRoomId}` }}
        actions={
          <RoomDetailActions
            linkSessionId={session.id}
            canEnd={isRunning(session, Date.now())}
            onShowResults={() => navigate(`/k/manage-exam-room/${session.examRoomId}/session/${session.id}`)}
            onEnd={() => setConfirmEnd(true)}
          />
        }
        aside={<WaitingRoomRosterCard counts={rosterCounts(candidates, session.whitelist)} candidates={candidates} loading={candidatesLoading} />}
        footer={<WaitingRoomFooter note={footerNote(view)} canStart={false} disabledReason="Chủ phòng không làm bài trong phòng của mình" onStart={() => {}} />}
      />
      <DeleteConfirmDialog
        open={confirmEnd}
        onOpenChange={(open) => !mutationLoading && setConfirmEnd(open)}
        title="Kết thúc phòng thi"
        description="Đóng ngay mọi phiên đang diễn ra của phòng: không ai bắt đầu hay vào lại bài làm được nữa. Bài đang làm được nộp hộ với các câu thí sinh đã lưu. Giờ kết thúc của các phiên này được thay bằng bây giờ và không khôi phục được; phiên sắp diễn ra giữ nguyên."
        confirmLabel="Kết thúc"
        isLoading={mutationLoading}
        onConfirm={async () => {
          if (await endRoom(session.examRoomId)) {
            setConfirmEnd(false);
            onEnded();
          }
        }}
      />
    </>
  );
}
