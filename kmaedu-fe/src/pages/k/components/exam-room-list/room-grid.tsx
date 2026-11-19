import { CalendarBlankIcon, MonitorIcon, UsersThreeIcon } from "@phosphor-icons/react";
import { Checkbox } from "@/components/antd/checkbox";
import { formatSpan, type ExamRoomRow } from "@/lib/exam-room/room-status";
import { quizLine, RoomPrimaryAction, RoomRowMenu, type RoomRowHandlers } from "./room-row-parts";
import { RoomStatusPill } from "./room-status-pill";

interface Props extends RoomRowHandlers {
  rows: ExamRoomRow[];
  selected: ReadonlySet<string>;
  onToggle: (id: string) => void;
}

function Card({ row, checked, onToggle, handlers }: { row: ExamRoomRow; checked: boolean; onToggle: () => void; handlers: RoomRowHandlers }) {
  return (
    <article className="flex h-full flex-col gap-3 rounded-lg border border-hairline bg-canvas p-4 transition-colors hover:border-brand-border">
      <div className="flex items-start gap-3">
        <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-brand-soft text-brand">
          <MonitorIcon weight="duotone" className="size-6" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <button
            type="button"
            onClick={() => handlers.onOpen(row.id)}
            className="line-clamp-2 text-left text-[15px] font-semibold leading-snug text-ink hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
          >
            {row.title}
          </button>
          <p className="mt-0.5 truncate text-[12.5px] text-muted-foreground">{quizLine(row)}</p>
        </div>
        <Checkbox checked={checked} onCheckedChange={onToggle} aria-label={`Chọn phòng ${row.title}`} />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <RoomStatusPill status={row.timeline.status} />
        <span className="text-[13px] text-body">Đề trắc nghiệm</span>
      </div>
      <dl className="space-y-1.5 text-[13px] text-body [&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-muted-foreground">
        <div className="flex items-center gap-2"><dt className="sr-only">Thời gian diễn ra</dt><CalendarBlankIcon aria-hidden /><dd className="tabular-nums">{formatSpan(row.timeline)}</dd></div>
        <div className="flex items-center gap-2"><dt className="sr-only">Số người tham gia</dt><UsersThreeIcon aria-hidden /><dd>{row.participants} người tham gia</dd></div>
      </dl>
      <div className="mt-auto flex items-center justify-end gap-1 border-t border-hairline-soft pt-3">
        <RoomPrimaryAction row={row} handlers={handlers} />
        <RoomRowMenu row={row} handlers={handlers} />
      </div>
    </article>
  );
}

/** Grid view: one card per room with the same details and actions as a table row. */
export function RoomGrid({ rows, selected, onToggle, ...handlers }: Props) {
  return (
    <div className="@container p-4">
      <div className="grid grid-cols-1 gap-3 @2xl:grid-cols-2 @5xl:grid-cols-3">
        {rows.map((row) => (
          <Card key={row.id} row={row} checked={selected.has(row.id)} onToggle={() => onToggle(row.id)} handlers={handlers} />
        ))}
      </div>
    </div>
  );
}
