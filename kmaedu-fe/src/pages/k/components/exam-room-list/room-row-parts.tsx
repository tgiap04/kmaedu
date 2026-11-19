import { DotsThreeVerticalIcon, EyeIcon, PencilSimpleIcon, TrashIcon } from "@phosphor-icons/react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/antd/dropdown-menu";
import type { ExamRoomRow } from "@/lib/exam-room/room-status";
import { cn } from "@/lib/utils";

export interface RoomRowHandlers {
  onOpen: (id: string) => void;
  onResults: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

/** "Đề: Bộ đề test 3 • 18 câu" under the room name. */
export function quizLine(row: ExamRoomRow): string {
  return row.quizSetTitle ? `Đề: ${row.quizSetTitle} • ${row.questionCount} câu` : "Chưa có bộ đề";
}

/** "Xem kết quả" once every session is over, "Vào phòng" otherwise. */
export function RoomPrimaryAction({ row, handlers, className }: { row: ExamRoomRow; handlers: RoomRowHandlers; className?: string }) {
  const ended = row.timeline.status === "ended";
  return (
    <button
      type="button"
      onClick={() => (ended ? handlers.onResults(row.id) : handlers.onOpen(row.id))}
      className={cn(
        "inline-flex h-8 items-center justify-center whitespace-nowrap rounded-full px-4 text-[13px] font-semibold text-brand transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40",
        ended ? "bg-brand-soft hover:bg-brand-soft-hover" : "border border-brand/40 bg-canvas hover:bg-brand-soft",
        className,
      )}
    >
      {ended ? "Xem kết quả" : "Vào phòng"}
    </button>
  );
}

export function RoomRowMenu({ row, handlers }: { row: ExamRoomRow; handlers: RoomRowHandlers }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          aria-label={`Tùy chọn phòng ${row.title}`}
          className="grid size-8 shrink-0 place-items-center rounded-full text-body transition-colors hover:bg-surface-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
        >
          <DotsThreeVerticalIcon weight="bold" className="size-[18px]" aria-hidden />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handlers.onOpen(row.id)}><EyeIcon className="mr-2 size-4" />Xem chi tiết</DropdownMenuItem>
        <DropdownMenuItem onClick={() => handlers.onEdit(row.id)}><PencilSimpleIcon className="mr-2 size-4" />Chỉnh sửa</DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => handlers.onDelete(row.id)} className="text-red-600 focus:text-red-600"><TrashIcon className="mr-2 size-4" />Xóa</DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
