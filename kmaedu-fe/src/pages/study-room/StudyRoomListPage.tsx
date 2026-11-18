import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { SignInIcon, PlusCircleIcon, UsersThreeIcon } from "@phosphor-icons/react";
import { PageHeader } from "@/components/k-page/page-header";
import { SectionCard } from "@/components/k-page/section-card";
import { Button } from "@/components/antd/button";
import { useAuthStore } from "@/stores/useAuthStore";
import { useStudyRoomStore } from "@/stores/useStudyRoomStore";
import { StudyRoomListItem } from "@/types/studyRoom";
import { useCan } from "@/hooks/useCan";
import { CreateRoomModal } from "./components/create-room-modal";
import { JoinByCodeModal } from "./components/join-by-code-modal";
import { RoomCard } from "./components/room-card";
import { RoomAccessModal } from "./components/room-access-modal";

export default function StudyRoomListPage() {
  const navigate = useNavigate();
  const myRooms = useStudyRoomStore((s) => s.myRooms);
  const loading = useStudyRoomStore((s) => s.loadingMine);
  const fetchMyRooms = useStudyRoomStore((s) => s.fetchMyRooms);
  const myId = useAuthStore((s) => String(s.user?.id ?? ""));
  const canCreate = useCan("study_room:create");
  const [createOpen, setCreateOpen] = useState(false);
  const [joinOpen, setJoinOpen] = useState(false);
  const [configRoom, setConfigRoom] = useState<StudyRoomListItem | null>(null);

  useEffect(() => {
    fetchMyRooms();
  }, [fetchMyRooms]);

  const enter = (id: string) => navigate(`/k/study-room/${id}`);

  return (
    <div>
      <PageHeader
        icon={<UsersThreeIcon />}
        title="Phòng học nhóm"
        subtitle="Học cùng nhau với Pomodoro, nhạc nền và trò chuyện thời gian thực"
        actions={
          <>
            <Button variant="outline" className="rounded-lg" onClick={() => setJoinOpen(true)}>
              <SignInIcon className="mr-1.5 h-4 w-4" /> Nhập mã
            </Button>
            {canCreate && (
              <Button className="rounded-lg" onClick={() => setCreateOpen(true)}>
                <PlusCircleIcon className="mr-1.5 h-4 w-4" /> Tạo phòng
              </Button>
            )}
          </>
        }
      />

      <SectionCard
        icon={<UsersThreeIcon />}
        title="Phòng của tôi"
        countLabel={myRooms.length > 0 ? `${myRooms.length} phòng` : undefined}
        plain
      >
        {loading && myRooms.length === 0 ? (
          <div className="grid gap-4 p-4 sm:grid-cols-2 md:p-5 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-44 animate-pulse rounded-lg border border-hairline bg-surface-soft" />
            ))}
          </div>
        ) : myRooms.length === 0 ? (
          <div className="flex min-h-[104px] flex-col items-center justify-center gap-1 px-6 py-8 text-center">
            <p className="text-sm font-medium text-ink">Chưa có phòng học nào</p>
            <p className="text-sm text-muted-foreground">
              {canCreate
                ? "Tạo phòng đầu tiên hoặc nhập mã để tham gia phòng của bạn bè"
                : "Nhập mã để tham gia phòng của bạn bè"}
            </p>
          </div>
        ) : (
          <div className="grid gap-4 p-4 sm:grid-cols-2 md:p-5 lg:grid-cols-3">
            {myRooms.map((room) => (
              <RoomCard
                key={room.id}
                room={room}
                isHost={room.hostId === myId}
                onEnter={enter}
                onConfig={setConfigRoom}
              />
            ))}
          </div>
        )}
      </SectionCard>

      {canCreate && (
        <CreateRoomModal
          open={createOpen}
          onOpenChange={setCreateOpen}
          onCreated={enter}
        />
      )}
      <JoinByCodeModal
        open={joinOpen}
        onOpenChange={setJoinOpen}
        onJoined={enter}
      />
      <RoomAccessModal
        room={configRoom}
        open={!!configRoom}
        onOpenChange={(o) => !o && setConfigRoom(null)}
      />
    </div>
  );
}
