import { MagnifyingGlassIcon, MonitorIcon, PlusIcon, TrashIcon } from "@phosphor-icons/react";
import { Button } from "@/components/antd/button";
import { FlashcardTablePagination } from "@/components/organisms/k/FlashcardTablePagination";
import type { RoomRowHandlers } from "./room-row-parts";
import { RoomGrid } from "./room-grid";
import { RoomTable } from "./room-table";
import { ROOMS_PER_PAGE, type useExamRoomList } from "./use-exam-room-list";

interface Props extends RoomRowHandlers {
  list: ReturnType<typeof useExamRoomList>;
  hasRooms: boolean;
  onCreate: () => void;
  onDeleteSelected: () => void;
}

function Empty({ filtered, onCreate, onReset }: { filtered: boolean; onCreate: () => void; onReset: () => void }) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
      <span className="grid size-12 place-items-center rounded-full bg-brand-soft text-brand">
        {filtered ? <MagnifyingGlassIcon weight="duotone" className="size-6" aria-hidden /> : <MonitorIcon weight="duotone" className="size-6" aria-hidden />}
      </span>
      <div>
        <p className="text-[15px] font-semibold text-ink">{filtered ? "Không có phòng thi phù hợp" : "Chưa có phòng thi nào"}</p>
        <p className="mt-1 text-sm text-muted-foreground">
          {filtered ? "Thử đổi từ khóa hoặc bộ lọc." : "Tạo phòng thi đầu tiên từ một bộ đề của bạn."}
        </p>
      </div>
      {filtered ? (
        <Button variant="outline" onClick={onReset}>Xóa bộ lọc</Button>
      ) : (
        <Button onClick={onCreate}><PlusIcon weight="bold" />Tạo phòng thi</Button>
      )}
    </div>
  );
}

/** The card under the toolbar: bulk-selection bar, table or grid, and the pager. */
export function RoomListPanel({ list, hasRooms, onCreate, onDeleteSelected, ...handlers }: Props) {
  const count = list.selected.size;
  return (
    <section className="overflow-hidden rounded-lg border border-hairline bg-canvas shadow-soft">
      {count > 0 && (
        <div className="flex flex-wrap items-center gap-3 border-b border-hairline-soft bg-brand-soft/50 px-4 py-2.5 md:px-5" role="status">
          <span className="text-sm font-medium text-ink">Đã chọn {count} phòng thi</span>
          <button type="button" onClick={list.clearSelection} className="text-sm text-body hover:text-ink">Bỏ chọn</button>
          <Button variant="destructive" size="sm" onClick={onDeleteSelected} className="ml-auto">
            <TrashIcon />
            Xóa {count} phòng
          </Button>
        </div>
      )}

      {list.filtered.length === 0 ? (
        <Empty filtered={hasRooms} onCreate={onCreate} onReset={() => list.changeFilters({ search: "", status: "all", created: "all" })} />
      ) : list.view === "table" ? (
        <RoomTable rows={list.pageRows} selected={list.selected} onToggle={list.toggle} onToggleAll={list.toggleAll} {...handlers} />
      ) : (
        <RoomGrid rows={list.pageRows} selected={list.selected} onToggle={list.toggle} {...handlers} />
      )}

      {list.filtered.length > 0 && (
        <FlashcardTablePagination
          currentPage={list.page}
          totalPages={list.totalPages}
          totalResults={list.filtered.length}
          perPage={ROOMS_PER_PAGE}
          onPageChange={list.setPage}
          noun="phòng thi"
        />
      )}
    </section>
  );
}
