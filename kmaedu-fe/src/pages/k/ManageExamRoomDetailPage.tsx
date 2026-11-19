import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { ArrowCircleLeftIcon, MonitorIcon } from "@phosphor-icons/react";
import { ApiRequestError } from "@/apis/api";
import { Button } from "@/components/antd/button";
import { Skeleton } from "@/components/antd/skeleton";
import { PageHeader } from "@/components/k-page/page-header";
import { SectionCard, SectionMessage } from "@/components/k-page/section-card";
import { DeleteConfirmDialog } from "@/components/organisms/DeleteConfirmDialog";
import { useCan } from "@/hooks/useCan";
import { useNow } from "@/hooks/useNow";
import { linkSession, roomTimeline } from "@/lib/exam-room/room-status";
import { useExamRoomDetailStore } from "@/stores/useExamRoomDetailStore";
import { useExamRoomStore } from "@/stores/useExamRoomStore";
import { AttemptDetailSheet } from "./components/attempt-detail-sheet";
import { RoomBreadcrumb } from "./components/exam-room-list/room-breadcrumb";
import { RoomStatusPill } from "./components/exam-room-list/room-status-pill";
import { CandidatesTab } from "./components/exam-room-detail/candidates-tab";
import { RoomDetailActions } from "./components/exam-room-detail/room-detail-actions";
import { RoomDetailStats, RoomInfoCard } from "./components/exam-room-detail/room-detail-cards";
import { isRoomTab, RoomDetailTabs, type RoomTab } from "./components/exam-room-detail/room-detail-tabs";
import { RoomProgressCard } from "./components/exam-room-detail/room-progress-card";
import { RoomSessionsTab } from "./components/exam-room-detail/room-sessions-tab";
import { RoomSettingsTab } from "./components/exam-room-detail/room-settings-tab";
import { RoomStatsTab } from "./components/exam-room-detail/room-stats-tab";
import { useRoomCandidates } from "./components/exam-room-detail/use-room-candidates";
import { useRoomOverview } from "./components/exam-room-detail/use-room-overview";
import { useAttemptDetail } from "./components/use-attempt-detail";

/** Keyed by the room id, so opening another room starts every hook (numbers, candidates, page) afresh. */
export default function ManageExamRoomDetailPage() {
  const { id = "" } = useParams();
  return <RoomDetail key={id} id={id} />;
}

function RoomDetail({ id }: { id: string }) {
  const navigate = useNavigate();
  const [params, setParams] = useSearchParams();
  const requested = params.get("tab");
  const tab: RoomTab = isRoomTab(requested) ? requested : "candidates";
  const { currentExamRoom, fetchExamRoomById } = useExamRoomStore();
  const { endRoom, mutationLoading, reset } = useExamRoomDetailStore();
  /** "missing": the room is not there (404); "failed": it could not be read just now (network, 5xx). */
  const canEndSessions = useCan("exam_session:manage");
  const [loadError, setLoadError] = useState<"missing" | "failed" | null>(null);
  const [confirmEnd, setConfirmEnd] = useState(false);
  const tabsRef = useRef<HTMLElement>(null);
  const now = useNow(30_000);

  // The store may still hold the room opened before this one: only this id's room counts.
  const room = currentExamRoom?.id === id ? currentExamRoom : null;
  const sessions = useMemo(() => room?.examSessions ?? [], [room]);
  const timeline = useMemo(() => roomTimeline(sessions, now), [sessions, now]);
  const live = timeline.status === "ongoing";
  const overview = useRoomOverview(id, live);
  // Only the candidates tab shows the list: elsewhere a live refresh would load the roster for nobody.
  const candidates = useRoomCandidates(id, { live: live && tab === "candidates" });
  const attemptDetail = useAttemptDetail();

  const load = useCallback(() => {
    setLoadError(null);
    fetchExamRoomById(id).catch((error) => setLoadError(error instanceof ApiRequestError && error.status === 404 ? "missing" : "failed"));
  }, [id, fetchExamRoomById]);

  useEffect(() => {
    load();
    return () => reset();
  }, [load, reset]);

  const setTab = (next: RoomTab) =>
    setParams((p) => {
      p.set("tab", next);
      return p;
    }, { replace: true });

  /** After a session changed: the room's windows, the numbers and the candidates all move. */
  const refreshAll = () => {
    void fetchExamRoomById(id, { quiet: true }).catch(() => {});
    overview.reload();
    candidates.reload();
  };

  if (!room) {
    if (loadError === "failed") {
      return (
        <SectionCard icon={<MonitorIcon />} title="Phòng thi" plain>
          <SectionMessage title="Không tải được phòng thi" hint="Kết nối có thể đang gián đoạn." onRetry={load} />
        </SectionCard>
      );
    }
    if (loadError !== "missing") {
      return (
        <div className="space-y-4" aria-busy="true">
          <Skeleton className="h-16 w-96 max-w-full rounded-lg" />
          <Skeleton className="h-[104px] w-full rounded-lg" />
          <Skeleton className="h-[260px] w-full rounded-lg" />
        </div>
      );
    }
    return (
      <SectionCard icon={<MonitorIcon />} title="Phòng thi" plain>
        <SectionMessage title="Không tìm thấy phòng thi" hint="Phòng thi có thể đã bị xóa." />
        <div className="flex justify-center pb-6">
          <Button variant="outline" onClick={() => navigate("/k/manage-exam-room")}>
            <ArrowCircleLeftIcon className="mr-2 h-4 w-4" />
            Quay lại danh sách
          </Button>
        </div>
      </SectionCard>
    );
  }

  const data = overview.data;

  return (
    <div className="space-y-5">
      <PageHeader
        large
        icon={<MonitorIcon />}
        title={room.title}
        subtitle={<>Đề thi: {room.quizSet?.title || "Chưa có bộ đề"}<span className="mx-2.5" aria-hidden>•</span>Loại: Trắc nghiệm</>}
        eyebrow={<RoomBreadcrumb current="Chi tiết phòng thi" />}
        badge={<RoomStatusPill status={timeline.status} size="lg" />}
        actions={
          <RoomDetailActions
            linkSessionId={linkSession(sessions, now)}
            canEnd={canEndSessions && timeline.status === "ongoing"}
            onShowResults={() => {
              setTab("stats");
              tabsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
            }}
            onEnd={() => setConfirmEnd(true)}
          />
        }
      />

      <RoomDetailStats timeline={timeline} participants={data ? data.completed + data.inProgress + data.cancelled : null} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.55fr)]">
        <RoomInfoCard room={room} timeline={timeline} />
        <RoomProgressCard data={data} failed={overview.failed} range={overview.range} onRangeChange={overview.setRange} onRetry={overview.reload} />
      </div>

      <section ref={tabsRef} className="scroll-mt-4 rounded-lg border border-hairline bg-canvas px-4 pb-5 pt-3 shadow-soft md:px-5">
        <RoomDetailTabs active={tab} onChange={setTab} candidates={data?.candidates ?? null} sessions={sessions.length} />
        <div role="tabpanel" id={`room-panel-${tab}`} aria-labelledby={`room-tab-${tab}`} className="pt-5">
          {tab === "candidates" && (
            <CandidatesTab
              roomId={id}
              roomTitle={room.title}
              list={candidates}
              onDetail={(c) => c.sessionId && attemptDetail.show(c.sessionId, c.userId, c.attemptId ?? undefined)}
              onWatch={(c) => c.sessionId && navigate(`/k/manage-exam-room/${id}/session/${c.sessionId}`)}
            />
          )}
          {tab === "sessions" && <RoomSessionsTab roomId={id} now={now} onChanged={refreshAll} />}
          {tab === "stats" && <RoomStatsTab roomId={id} overview={data} sessions={sessions} now={now} />}
          {tab === "settings" && <RoomSettingsTab room={room} sessions={sessions.length} onOpenSessions={() => setTab("sessions")} />}
        </div>
      </section>

      <AttemptDetailSheet {...attemptDetail.sheet} passingScore={attemptDetail.sheet.selectedAttempt?.passingScore ?? 0} />

      <DeleteConfirmDialog
        open={confirmEnd}
        onOpenChange={(open) => !mutationLoading && setConfirmEnd(open)}
        title="Kết thúc phòng thi"
        description={`Đóng ngay ${timeline.ongoing} phiên đang diễn ra: không ai bắt đầu hay vào lại bài làm được nữa. Bài đang làm được nộp hộ ngay với các câu thí sinh đã lưu (câu trả lời trong khoảng 30 giây cuối có thể chưa kịp lưu). Giờ kết thúc đã hẹn của các phiên này được thay bằng bây giờ và không khôi phục được; phiên sắp diễn ra giữ nguyên.`}
        confirmLabel="Kết thúc"
        isLoading={mutationLoading}
        onConfirm={async () => {
          if (await endRoom(id)) {
            setConfirmEnd(false);
            refreshAll();
          }
        }}
      />
    </div>
  );
}
