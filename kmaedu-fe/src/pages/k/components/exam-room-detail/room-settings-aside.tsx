import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { ArrowRightIcon, TrashIcon, WarningIcon } from "@phosphor-icons/react";
import { Button } from "@/components/antd/button";
import { displayUserName } from "@/lib/user/display-user-name";
import type { ExamRoom } from "@/types/examRoom";

const stamp = (value: string) => format(new Date(value), "dd/MM/yyyy • HH:mm");

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <dt className="shrink-0 text-sm text-muted-foreground">{label}</dt>
      <dd className="min-w-0 text-right text-sm font-medium text-ink">{children}</dd>
    </div>
  );
}

const linkClass = "inline-flex items-center gap-1 text-[13px] font-semibold text-brand hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40";

/** Read-only facts about the room, beside its settings form. */
export function RoomOverviewPanel({ room, sessions, onOpenSessions }: { room: ExamRoom; sessions: number; onOpenSessions: () => void }) {
  const questions = room.quizSet?._count?.detailsQuizQuestions || room.quizSet?.questionCount;
  return (
    <section className="rounded-lg border border-hairline-soft bg-surface-soft/40 p-5">
      <h3 className="text-base font-semibold text-ink">Tổng quan</h3>
      <dl className="mt-1 divide-y divide-hairline-soft">
        <Fact label="Bộ đề">
          {room.sourceDeleted ? (
            <span className="text-error">Bộ đề gốc đã bị xóa</span>
          ) : (
            <span className="flex flex-col items-end gap-0.5">
              <span className="break-words">{room.quizSet?.title || "Chưa có bộ đề"}{questions ? ` · ${questions} câu` : ""}</span>
              {room.quizSetId && (
                <Link to={`/k/manage-quiz-set/${room.quizSetId}`} className={linkClass}>
                  Mở bộ đề <ArrowRightIcon className="size-3.5" aria-hidden />
                </Link>
              )}
            </span>
          )}
        </Fact>
        <Fact label="Phiên thi">
          <span className="flex flex-col items-end gap-0.5">
            {sessions} phiên
            <button type="button" onClick={onOpenSessions} className={linkClass}>
              Quản lý phiên <ArrowRightIcon className="size-3.5" aria-hidden />
            </button>
          </span>
        </Fact>
        <Fact label="Người tổ chức">{displayUserName(room.host)}</Fact>
        <Fact label="Ngày tạo"><span className="tabular-nums">{stamp(room.createdAt)}</span></Fact>
        <Fact label="Cập nhật lần cuối"><span className="tabular-nums">{stamp(room.updatedAt)}</span></Fact>
      </dl>
    </section>
  );
}

/** Deleting the room, set apart in red. */
export function RoomDangerPanel({ onDelete }: { onDelete: () => void }) {
  return (
    <section className="rounded-lg border border-error/30 bg-error/5 p-5">
      <h3 className="flex items-center gap-2 text-base font-semibold text-error">
        <WarningIcon weight="duotone" className="size-5" aria-hidden />
        Xóa phòng thi
      </h3>
      <p className="mt-1.5 text-sm text-body">Mọi phiên thi và bài làm trong phòng sẽ bị xóa vĩnh viễn. Không thể hoàn tác.</p>
      <Button variant="destructive" onClick={onDelete} className="mt-4 w-full">
        <TrashIcon />
        Xóa phòng thi
      </Button>
    </section>
  );
}
