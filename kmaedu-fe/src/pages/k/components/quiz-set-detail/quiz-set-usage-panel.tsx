import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CaretCircleRightIcon, DoorOpenIcon, CircleNotchIcon, PlusCircleIcon } from "@phosphor-icons/react";
import { getAllExamRoomsApi } from "@/apis/examRoomApi";
import type { ExamRoom } from "@/types/examRoom";

interface Props {
  quizSetId: string;
}

/** "Lịch sử sử dụng": the viewer's exam rooms that run this set. */
export function QuizSetUsagePanel({ quizSetId }: Props) {
  const [rooms, setRooms] = useState<ExamRoom[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setFailed(false);
    getAllExamRoomsApi()
      .then(({ examRooms }) => !cancelled && setRooms(examRooms.filter((r) => r.quizSetId === quizSetId)))
      .catch(() => !cancelled && setFailed(true))
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [quizSetId, attempt]);

  const createLink = (
    <Link to={`/k/manage-exam-room?quizSetId=${encodeURIComponent(quizSetId)}`} className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-brand-border px-4 text-[14px] font-semibold text-brand hover:bg-brand-soft">
      <PlusCircleIcon className="size-4" aria-hidden />
      Tạo phòng thi với đề này
    </Link>
  );

  if (loading) {
    return <p className="flex items-center justify-center gap-2 py-12 text-[14px] text-body"><CircleNotchIcon className="size-4 animate-spin" aria-hidden />Đang tải phòng thi...</p>;
  }
  if (failed) {
    return (
      <p className="py-12 text-center text-[14px] text-body">
        Không tải được danh sách phòng thi.{" "}
        <button type="button" onClick={() => setAttempt((n) => n + 1)} className="font-semibold text-brand hover:underline">Thử lại</button>
      </p>
    );
  }
  if (rooms.length === 0) {
    return (
      <div className="py-12 text-center text-[14px] text-body">
        <p className="mb-3">Đề thi này chưa được dùng trong phòng thi nào.</p>
        {createLink}
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 pb-2">
        <p className="text-[14px] text-body">Đang dùng trong <b className="text-ink">{rooms.length}</b> phòng thi</p>
        {createLink}
      </div>
      <ul className="divide-y divide-hairline-soft">
      {rooms.map((r) => (
        <li key={r.id}>
          <Link to={`/k/manage-exam-room/${r.id}`} className="flex items-center gap-4 px-1 py-4 transition-colors hover:bg-surface-soft/60">
            <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-brand-soft text-brand"><DoorOpenIcon className="size-5" aria-hidden /></span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[15px] font-semibold text-ink">{r.title}</span>
              <span className="mt-0.5 block text-[13px] text-body">
                Tạo ngày {new Date(r.createdAt).toLocaleDateString("vi-VN")}
                {r._count?.examSessions !== undefined && <> • {r._count.examSessions} phiên thi</>}
              </span>
            </span>
            <CaretCircleRightIcon className="size-5 text-body" aria-hidden />
          </Link>
        </li>
      ))}
      </ul>
    </div>
  );
}
