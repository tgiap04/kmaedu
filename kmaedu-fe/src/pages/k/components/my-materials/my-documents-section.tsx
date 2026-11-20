import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { CopyIcon, CloudArrowDownIcon, StackIcon, PlayIcon, MagicWandIcon } from "@phosphor-icons/react";
import type { RecentUpload } from "@/apis/aiApi";
import { useToast } from "@/components/antd/toast";
import { downloadFile } from "@/lib/download-file";
import { formatFileSize, formatTimeAgo } from "@/lib/history/history-format";
import { useRecentUploadsStore } from "@/stores/useAIGeneratorStore";
import { ItemRow, PdfBadgeIcon } from "@/components/k-page/item-row";
import { SectionMessage, RowsSkeleton, SectionCard, SectionPager } from "@/components/k-page/section-card";
import { usePagedList } from "./use-paged-list";

const PAGE_SIZE = 5;

/** "12 câu hỏi · 20 thẻ" from what was generated off the file; null before anything was. */
function generatedSummary(upload: RecentUpload): string | null {
  const parts = [
    upload.quizHistory && `${upload.quizHistory.quizCount} câu hỏi`,
    upload.flashcardHistory && `${upload.flashcardHistory.flashcardCount} thẻ`,
  ].filter(Boolean);
  return parts.length ? parts.join(" · ") : null;
}

/** "Tài liệu của tôi": uploaded PDFs, 5 a page; reopen one in the AI tool or download it. */
export function MyDocumentsSection() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { fetchUploadsPage, loadFromUpload } = useRecentUploadsStore();
  const fetchPage = useCallback((page: number) => fetchUploadsPage(page, PAGE_SIZE), [fetchUploadsPage]);
  const { page, setPage, data, failed, reload } = usePagedList(fetchPage);

  const openInAiTool = (upload: RecentUpload) => {
    loadFromUpload(upload);
    navigate("/k/ai-tool");
  };

  const download = async (upload: RecentUpload) => {
    try {
      toast.info("Đang tải file...");
      await downloadFile(upload.url, upload.filename);
    } catch {
      toast.error("Không thể tải file. Vui lòng thử lại.");
    }
  };

  return (
    <SectionCard
      icon={<CopyIcon />}
      title="Tài liệu của tôi"
      illustration="/illustrations/materials-pdf.svg"
    >
      {failed ? (
        <SectionMessage title="Không thể tải tài liệu" onRetry={reload} />
      ) : data === null ? (
        <RowsSkeleton />
      ) : data.uploads.length === 0 && page === 1 ? (
        <SectionMessage title="Chưa có tài liệu nào" hint="Tải PDF lên ở Công cụ AI để tài liệu xuất hiện ở đây" />
      ) : (
        <>
          {data.uploads.map((upload) => {
            const summary = generatedSummary(upload);
            return (
              <ItemRow
                key={upload.id}
                icon={<PdfBadgeIcon />}
                tone="red"
                title={upload.filename}
                meta={[formatFileSize(upload.size), `Tải lên ${formatTimeAgo(upload.createdAt)}`]}
                metric={
                  <>
                    <StackIcon aria-hidden />
                    {summary ?? "Chưa tạo nội dung"}
                  </>
                }
                action={
                  summary
                    ? { label: "Xem lại", icon: PlayIcon, onClick: () => openInAiTool(upload) }
                    : { label: "Tải xuống", icon: CloudArrowDownIcon, variant: "neutral", onClick: () => void download(upload) }
                }
                menu={[
                  { label: "Mở trong Công cụ AI", icon: MagicWandIcon, onClick: () => openInAiTool(upload) },
                  { label: "Tải xuống", icon: CloudArrowDownIcon, onClick: () => void download(upload) },
                ]}
              />
            );
          })}
          <SectionPager page={page} hasNext={data.hasNext} onChange={setPage} />
        </>
      )}
    </SectionCard>
  );
}
