import { Checkbox } from "@/components/antd/checkbox";
import { formatSpan, type ExamRoomRow } from "@/lib/exam-room/room-status";
import { quizLine, RoomPrimaryAction, RoomRowMenu, type RoomRowHandlers } from "./room-row-parts";
import { RoomStatusPill } from "./room-status-pill";

interface Props extends RoomRowHandlers {
  rows: ExamRoomRow[];
  selected: ReadonlySet<string>;
  onToggle: (id: string) => void;
  onToggleAll: (checked: boolean) => void;
}

/** Wide table from ~900px of card width; narrower, each room stacks its details under the name. */
const COLUMNS =
  "grid-cols-[28px_minmax(0,1fr)] @4xl:grid-cols-[28px_minmax(0,2.3fr)_minmax(0,1fr)_minmax(0,1.55fr)_minmax(0,0.95fr)_minmax(0,1fr)_168px]";

function Row({ row, checked, onToggle, handlers }: { row: ExamRoomRow; checked: boolean; onToggle: () => void; handlers: RoomRowHandlers }) {
  const span = formatSpan(row.timeline);
  return (
    <div role="row" className={`grid min-h-[60px] items-center gap-x-4 px-4 py-2.5 transition-colors hover:bg-surface-soft/60 md:px-5 ${COLUMNS}`}>
      <div role="cell">
        <Checkbox checked={checked} onCheckedChange={onToggle} aria-label={`Chọn phòng ${row.title}`} />
      </div>
      <div role="cell" className="min-w-0">
        <button
          type="button"
          onClick={() => handlers.onOpen(row.id)}
          title={row.title}
          className="block max-w-full truncate text-left text-[15px] font-semibold text-ink hover:text-brand focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
        >
          {row.title}
        </button>
        <p className="mt-0.5 truncate text-[12.5px] text-muted-foreground">{quizLine(row)}</p>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[13px] text-body @4xl:hidden">
          <RoomStatusPill status={row.timeline.status} />
          <span className="tabular-nums">{span}</span>
          <span>{row.participants} người tham gia</span>
        </div>
        <div className="mt-2 flex items-center gap-1 @4xl:hidden">
          <RoomPrimaryAction row={row} handlers={handlers} />
          <RoomRowMenu row={row} handlers={handlers} />
        </div>
      </div>
      <span role="cell" className="hidden text-sm text-body @4xl:block">Đề trắc nghiệm</span>
      <span role="cell" className="hidden text-sm tabular-nums text-ink @4xl:block">{span}</span>
      <span role="cell" className="hidden text-center text-sm tabular-nums text-ink @4xl:block">{row.participants}</span>
      <div role="cell" className="hidden justify-center @4xl:flex">
        <RoomStatusPill status={row.timeline.status} />
      </div>
      <div role="cell" className="hidden items-center justify-end gap-1 @4xl:flex">
        <RoomPrimaryAction row={row} handlers={handlers} className="min-w-[116px]" />
        <RoomRowMenu row={row} handlers={handlers} />
      </div>
    </div>
  );
}

export function RoomTable({ rows, selected, onToggle, onToggleAll, ...handlers }: Props) {
  const picked = rows.filter((r) => selected.has(r.id)).length;
  return (
    <div role="table" aria-label="Danh sách phòng thi" className="@container divide-y divide-hairline-soft">
      <div role="row" className={`grid items-center gap-x-4 bg-surface-soft/70 px-4 py-3.5 text-sm font-semibold text-ink md:px-5 ${COLUMNS}`}>
        <span role="columnheader">
          <Checkbox
            checked={rows.length > 0 && picked === rows.length}
            indeterminate={picked > 0 && picked < rows.length}
            onCheckedChange={onToggleAll}
            aria-label="Chọn tất cả phòng trên trang"
          />
        </span>
        <span role="columnheader">Tên phòng thi</span>
        <span role="columnheader" className="hidden @4xl:block">Loại đề</span>
        <span role="columnheader" className="hidden @4xl:block">Thời gian diễn ra</span>
        <span role="columnheader" className="hidden text-center @4xl:block">Số người tham gia</span>
        <span role="columnheader" className="hidden text-center @4xl:block">Trạng thái</span>
        <span role="columnheader" className="hidden pr-9 text-center @4xl:block">Thao tác</span>
      </div>
      {rows.map((row) => (
        <Row key={row.id} row={row} checked={selected.has(row.id)} onToggle={() => onToggle(row.id)} handlers={handlers} />
      ))}
    </div>
  );
}
