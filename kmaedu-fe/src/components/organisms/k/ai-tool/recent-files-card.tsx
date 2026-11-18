import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { CaretCircleRightIcon, FileTextIcon, CircleNotchIcon, XIcon } from "@phosphor-icons/react";
import type { RecentUpload } from "@/apis/aiApi";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/antd/alert-dialog";
import { useRecentUploadsStore } from "@/stores/useAIGeneratorStore";
import { formatFileSize } from "@/lib/history/history-format";
import { cn } from "@/lib/utils";
import { aiPanelClass, IconTile } from "./ai-tool-ui";

/** Recently uploaded PDFs as chips: click to reuse a file, × to delete it and its generation history. */
export function RecentFilesCard({ disabled }: { disabled: boolean }) {
  const { recentUploads, isLoading, isDeleting, selectedUpload, fetchRecentUploads, loadFromUpload, deleteUpload } = useRecentUploadsStore();
  const [uploadToDelete, setUploadToDelete] = useState<RecentUpload | null>(null);

  useEffect(() => {
    void fetchRecentUploads();
  }, [fetchRecentUploads]);

  const confirmDelete = async () => {
    if (!uploadToDelete) return;
    await deleteUpload(uploadToDelete.id);
    setUploadToDelete(null);
  };

  return (
    <section data-tour="ai-tool-recents" className={cn(aiPanelClass, "p-4")}>
      <div className="flex items-center gap-3.5">
        <IconTile>
          <FileTextIcon />
        </IconTile>
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-semibold text-ink">File gần đây</h3>
          <p className="text-[13px] text-body">Tiếp tục với tài liệu đã tải lên</p>
        </div>
        <Link
          to="/k/history/pdf"
          className="inline-flex h-10 shrink-0 items-center gap-1 rounded-lg px-3 text-[13px] font-semibold text-brand transition-colors hover:bg-brand-soft"
        >
          Xem tất cả
          <CaretCircleRightIcon className="h-4 w-4" />
        </Link>
      </div>

      <div className="scrollbar-hairline -mr-2 mt-3 flex max-h-[160px] flex-col gap-2 overflow-y-auto pr-2">
        {isLoading ? (
          <span className="inline-flex items-center gap-2 py-2 text-sm text-body">
            <CircleNotchIcon className="h-4 w-4 animate-spin" />
            Đang tải file gần đây...
          </span>
        ) : recentUploads.length === 0 ? (
          <span className="rounded-lg border border-dashed border-hairline px-4 py-4 text-center text-sm text-muted-foreground">
            Chưa có file nào. Tải PDF lên để danh sách xuất hiện ở đây.
          </span>
        ) : (
          recentUploads.map((upload) => (
            <div
              key={upload.id}
              className={cn(
                "flex min-h-[44px] items-center gap-1 rounded-lg border pl-3 pr-1.5 text-sm transition-colors",
                selectedUpload?.id === upload.id ? "border-brand-border bg-brand-soft" : "border-hairline bg-canvas hover:border-brand-border",
              )}
            >
              <button
                type="button"
                onClick={() => loadFromUpload(upload)}
                disabled={disabled}
                className="flex min-w-0 flex-1 items-center gap-2.5 py-2 text-left disabled:cursor-not-allowed disabled:opacity-50"
              >
                <FileTextIcon className="h-[18px] w-[18px] shrink-0 text-brand" />
                <span className="min-w-0 flex-1 truncate font-semibold text-ink">{upload.filename}</span>
                <span className="shrink-0 text-xs text-muted-foreground">{formatFileSize(upload.size)}</span>
              </button>
              <button
                type="button"
                aria-label={`Xóa ${upload.filename}`}
                onClick={() => setUploadToDelete(upload)}
                disabled={disabled}
                className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-body transition-colors hover:bg-error/10 hover:text-error disabled:cursor-not-allowed disabled:opacity-50"
              >
                <XIcon className="h-4 w-4" />
              </button>
            </div>
          ))
        )}
      </div>

      <AlertDialog open={!!uploadToDelete} onOpenChange={(open) => !open && setUploadToDelete(null)}>
        <AlertDialogContent className="border-border bg-background">
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa file gần đây?</AlertDialogTitle>
            <AlertDialogDescription>
              Bạn có chắc muốn xóa file &quot;{uploadToDelete?.filename}&quot;? Hành động này sẽ xóa cả lịch sử đề kiểm tra và flashcard đã tạo từ file này.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Hủy</AlertDialogCancel>
            <AlertDialogAction disabled={isDeleting} onClick={confirmDelete} className="bg-error px-4 text-destructive-foreground hover:bg-error/90">
              {isDeleting && <CircleNotchIcon className="mr-2 h-4 w-4 animate-spin" />}
              Xóa file
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
