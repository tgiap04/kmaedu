import { useState } from "react";
import { CircleNotchIcon, DownloadSimpleIcon, MagnifyingGlassIcon, UsersThreeIcon } from "@phosphor-icons/react";
import { getRoomCandidatesApi } from "@/apis/examAttemptApi";
import { Input } from "@/components/antd/input";
import { toast } from "@/components/antd/toast";
import { FlashcardTablePagination } from "@/components/organisms/k/FlashcardTablePagination";
import { saveBlob } from "@/lib/download-file";
import { candidatesCsv, readAllCandidates } from "@/lib/exam-room/candidates";
import { fold } from "@/lib/manage-exam/exam-question-picker";
import { ToolbarSelect } from "@/pages/k/components/flashcard-list/toolbar-select";
import { CandidatesTable, type CandidateActions } from "./candidates-table";
import { candidatesQuery, CANDIDATES_PER_PAGE, type CandidateFilters, type useRoomCandidates } from "./use-room-candidates";

const STATUS: { value: CandidateFilters["status"]; label: string }[] = [
  { value: "all", label: "Tất cả trạng thái" },
  { value: "submitted", label: "Đã nộp" },
  { value: "in_progress", label: "Đang làm" },
  { value: "not_started", label: "Chưa bắt đầu" },
];

const RESULT: { value: CandidateFilters["result"]; label: string }[] = [
  { value: "all", label: "Tất cả kết quả" },
  { value: "passed", label: "Đạt" },
  { value: "failed", label: "Chưa đạt" },
];

const select = "h-11 min-w-[10.5rem] justify-between gap-3 px-4 text-sm font-normal";

/** "thi-sinh-thi-cuoi-ky.csv" from the room's title. */
const fileName = (title: string) => `thi-sinh-${fold(title).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "phong-thi"}.csv`;

interface Props extends CandidateActions {
  roomId: string;
  roomTitle: string;
  list: ReturnType<typeof useRoomCandidates>;
}

export function CandidatesTab({ roomId, roomTitle, list, ...actions }: Props) {
  const [exporting, setExporting] = useState(false);
  const filtered = list.filters.search.trim() !== "" || list.filters.status !== "all" || list.filters.result !== "all";

  const exportCsv = async () => {
    setExporting(true);
    try {
      const rows = await readAllCandidates((page, limit) => getRoomCandidatesApi(roomId, candidatesQuery(list.applied, page, limit)));
      saveBlob(new Blob([candidatesCsv(rows)], { type: "text/csv;charset=utf-8" }), fileName(roomTitle));
    } catch (error) {
      console.error("Export candidates failed:", error);
      // The two refusals readAllCandidates words for the user; anything else is a failed request.
      toast.error(error instanceof Error && /quá nhiều|vừa thay đổi/.test(error.message) ? error.message : "Không xuất được báo cáo");
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Input
          type="text"
          allowClear
          value={list.filters.search}
          onChange={(e) => list.changeFilters({ search: e.target.value })}
          placeholder="Tìm kiếm thí sinh..."
          aria-label="Tìm kiếm thí sinh"
          prefix={<MagnifyingGlassIcon className="mr-1 size-[18px] text-muted-foreground" aria-hidden />}
          className="!h-11 min-w-56 flex-1 basis-72 !py-0 !text-sm"
        />
        <ToolbarSelect icon={null} label="Lọc trạng thái" options={STATUS} value={list.filters.status} onChange={(v) => list.changeFilters({ status: v as CandidateFilters["status"] })} className={select} />
        <ToolbarSelect icon={null} label="Lọc kết quả" options={RESULT} value={list.filters.result} onChange={(v) => list.changeFilters({ result: v as CandidateFilters["result"] })} className={select} />
        <button
          type="button"
          onClick={exportCsv}
          disabled={exporting || list.total === 0}
          className="inline-flex h-11 items-center gap-2 rounded-lg border border-hairline bg-canvas px-4 text-sm font-semibold text-ink transition-colors hover:bg-surface-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 disabled:pointer-events-none disabled:opacity-50"
        >
          {exporting ? <CircleNotchIcon className="size-[18px] animate-spin" aria-hidden /> : <DownloadSimpleIcon className="size-[18px]" aria-hidden />}
          Xuất báo cáo
        </button>
      </div>

      {list.failed && (
        <p role="alert" className="rounded-lg border border-error/30 bg-error/5 px-4 py-2.5 text-sm text-error">
          Không tải được danh sách thí sinh.{" "}
          <button type="button" onClick={list.reload} className="font-semibold underline">Thử lại</button>
        </p>
      )}

      {list.rows.length === 0 ? (
        list.loading ? (
          <div className="h-48 animate-pulse rounded-lg bg-surface-soft" aria-busy="true" />
        ) : (
          !list.failed && (
            <div className="flex flex-col items-center gap-2 rounded-lg border border-dashed border-hairline px-6 py-12 text-center">
              <UsersThreeIcon weight="duotone" className="size-8 text-muted-foreground" aria-hidden />
              <p className="text-sm font-semibold text-ink">{filtered ? "Không có thí sinh phù hợp" : "Chưa có thí sinh nào"}</p>
              <p className="text-sm text-muted-foreground">{filtered ? "Thử đổi từ khóa hoặc bộ lọc." : "Thí sinh sẽ hiện ở đây khi bắt đầu làm bài."}</p>
            </div>
          )
        )
      ) : (
        <div className={list.loading ? "opacity-60 transition-opacity" : "transition-opacity"} aria-busy={list.loading}>
          <CandidatesTable rows={list.rows} offset={(list.page - 1) * CANDIDATES_PER_PAGE} actions={actions} />
          <div className="-mx-4 md:-mx-5 [&>div]:border-t-0">
            <FlashcardTablePagination
              currentPage={list.page}
              totalPages={list.totalPages}
              totalResults={list.total}
              perPage={CANDIDATES_PER_PAGE}
              onPageChange={list.setPage}
              noun="thí sinh"
            />
          </div>
        </div>
      )}
    </div>
  );
}
