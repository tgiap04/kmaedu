import { format } from "date-fns";
import {
  AlarmIcon,
  ArrowsClockwiseIcon,
  CalendarCheckIcon,
  EyeIcon,
  FileTextIcon,
  InfoIcon,
  ListNumbersIcon,
  MonitorIcon,
  ShieldCheckIcon,
} from "@phosphor-icons/react";
import type { CreateRoomDraft } from "@/lib/exam-room/create-room-draft";
import { cn } from "@/lib/utils";
import { EditLink, reviewCard, RuleLine, StatTile, TimelinePoint } from "./review-parts";

interface Props {
  draft: CreateRoomDraft;
  quizSetTitle?: string;
  questionTotal?: number;
  /** Step index (0-2) to go back and edit. */
  onEdit: (step: number) => void;
}

/**
 * Step 4: the room as it will be created. A summary card (name, quiz set, the four exam figures), the session
 * rules as an on/off list, and beside them the first session's timeline, opening as soon as the room is created.
 */
export function ReviewStep({ draft, quizSetTitle, questionTotal, onEdit }: Props) {
  const description = draft.description.trim();
  const questions =
    draft.questionMode === "all"
      ? { value: questionTotal ? `${questionTotal} câu` : "Toàn bộ đề", hint: "Làm toàn bộ đề" }
      : { value: `${draft.questionCount ?? "?"} câu`, hint: `Ngẫu nhiên${questionTotal ? ` từ ${questionTotal} câu` : ""}` };
  const closesAt = draft.limitJoinWindow && draft.joinDeadline ? format(new Date(draft.joinDeadline), "HH:mm, dd/MM/yyyy") : null;

  return (
    <div id="room-review" className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <div className="space-y-4">
        <section aria-labelledby="review-room-title" className={cn(reviewCard, "p-5 sm:p-6")}>
          <div className="flex items-start gap-4">
            <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-[#fde4e2] to-[#fef3f2] text-brand" aria-hidden>
              <MonitorIcon weight="duotone" className="size-6" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Phòng thi sẽ tạo</p>
              <h2 id="review-room-title" className="mt-1 break-words text-xl font-bold text-ink">{draft.title.trim()}</h2>
              <p className={cn("mt-1 text-sm", description ? "text-body" : "italic text-muted-foreground")}>{description || "Không có mô tả"}</p>
              <p className="mt-3 inline-flex max-w-full items-center gap-2 rounded-lg border border-hairline-soft bg-surface-soft px-3 py-1.5 text-sm text-ink">
                <FileTextIcon className="size-4 shrink-0 text-brand" aria-hidden />
                <span className="truncate font-medium">{quizSetTitle ?? "Chưa chọn bộ đề"}</span>
                {questionTotal ? <span className="shrink-0 text-muted-foreground">· {questionTotal} câu</span> : null}
              </p>
            </div>
            <EditLink onClick={() => onEdit(0)} label="Sửa thông tin cơ bản" />
          </div>

          <div className="mt-6 flex items-center justify-between gap-3 border-t border-hairline-soft pt-5">
            <h3 className="text-sm font-semibold text-ink">Cấu hình bài thi</h3>
            <EditLink onClick={() => onEdit(1)} label="Sửa cấu hình bài thi" />
          </div>
          <div className="mt-3 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatTile icon={<AlarmIcon />} label="Thời gian làm bài" value={`${draft.durationMinutes} phút`} hint="mỗi lượt" />
            <StatTile icon={<ArrowsClockwiseIcon />} label="Số lần tham gia" value={`${draft.maxAttempts} lần`} />
            <StatTile icon={<ListNumbersIcon />} label="Số câu mỗi bài" value={questions.value} hint={questions.hint} />
            <StatTile icon={<EyeIcon />} label="Kết quả" value={draft.showAnswersAfterSubmit ? "Hiển thị" : "Ẩn"} hint={draft.showAnswersAfterSubmit ? "sau khi nộp bài" : undefined} />
          </div>
        </section>

        <section aria-labelledby="review-rules-title" className={cn(reviewCard, "p-5 sm:p-6")}>
          <div className="mb-4 flex items-center justify-between gap-3">
            <h3 id="review-rules-title" className="flex items-center gap-2 text-sm font-semibold text-ink">
              <ShieldCheckIcon weight="duotone" className="size-5 text-brand" aria-hidden />
              Quy định & Bảo mật
            </h3>
            <EditLink onClick={() => onEdit(2)} label="Sửa quy định và bảo mật" />
          </div>
          <ul className="divide-y divide-hairline-soft">
            <RuleLine
              on={draft.antiCheatEnabled}
              title="Chống gian lận"
              detail={draft.antiCheatEnabled ? "Giám sát và ghi lại việc chuyển tab trong lúc làm bài" : "Không theo dõi việc chuyển tab"}
            />
            <RuleLine
              on={draft.allowLeaveMidway}
              title="Cho phép thoát giữa chừng"
              detail={draft.allowLeaveMidway ? "Thí sinh rời trang rồi quay lại làm tiếp được" : "Rời trang làm bài sẽ tự động nộp bài"}
            />
            <RuleLine on title="Yêu cầu đăng nhập" detail="Luôn bắt buộc: chỉ tài khoản đã đăng nhập mới vào thi" />
          </ul>
        </section>
      </div>

      <aside className={cn(reviewCard, "h-fit p-5 sm:p-6 lg:sticky lg:top-[156px]")} aria-labelledby="review-session-title">
        <h3 id="review-session-title" className="flex items-center gap-2 text-sm font-semibold text-ink">
          <CalendarCheckIcon weight="duotone" className="size-5 text-brand" aria-hidden />
          Phiên thi đầu tiên
        </h3>
        <ol className="mt-4">
          <TimelinePoint title="Mở" time="Ngay khi tạo phòng" />
          <TimelinePoint title="Đóng" time={closesAt ?? "Khi bạn kết thúc phòng"} muted={!closesAt} last />
        </ol>
        {closesAt && <p className="mt-3 text-xs text-body">Bài đang làm dở cũng kết thúc lúc phiên đóng.</p>}
        <p className="mt-5 flex gap-2 rounded-lg bg-brand-soft/60 p-3 text-xs leading-5 text-ink">
          <InfoIcon className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden />
          Sau khi tạo, bạn có thể thêm phiên khác hoặc đổi thiết lập trong tab Phiên thi của phòng.
        </p>
      </aside>
    </div>
  );
}
