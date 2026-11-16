import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Copy, Download, Layers, Play, WandSparkles } from "lucide-react";
import type { RecentUpload } from "@/apis/aiApi";
import { useToast } from "@/components/antd/toast";
import { downloadFile } from "@/lib/download-file";
import { formatFileSize, formatTimeAgo } from "@/lib/history/history-format";
import { useRecentUploadsStore } from "@/stores/useAIGeneratorStore";
import { MaterialRow, PdfBadgeIcon } from "./material-row";
import { MaterialMessage, MaterialRowsSkeleton, MaterialSectionCard, ViewAllLink } from "./material-section-card";

const PREVIEW = 2;

/** "12 câu hỏi · 20 thẻ" from what was generated off the file; null before anything was. */
function generatedSummary(upload: RecentUpload): string | null {
  const parts = [
    upload.quizHistory && `${upload.quizHistory.quizCount} câu hỏi`,
    upload.flashcardHistory && `${upload.flashcardHistory.flashcardCount} thẻ`,
  ].filter(Boolean);
  return parts.length ? parts.join(" · ") : null;
}

/** "Tài liệu của tôi": the latest uploaded PDFs; reopen one in the AI tool or download it. */
export function MyDocumentsSection() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { recentUploads, isLoading, fetchRecentUploads, loadFromUpload } = useRecentUploadsStore();

  useEffect(() => {
    void fetchRecentUploads();
  }, [fetchRecentUploads]);

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
    <MaterialSectionCard
      icon={<Copy />}
      title="Tài liệu của tôi"
      countLabel={recentUploads.length ? `${recentUploads.length} tài liệu` : undefined}
      action={<ViewAllLink to="/k/history/pdf" />}
      illustration="/illustrations/materials-pdf.svg"
    >
      {isLoading && recentUploads.length === 0 ? (
        <MaterialRowsSkeleton />
      ) : recentUploads.length === 0 ? (
        <MaterialMessage title="Chưa có tài liệu nào" hint="Tải PDF lên ở Công cụ AI để tài liệu xuất hiện ở đây" />
      ) : (
        recentUploads.slice(0, PREVIEW).map((upload) => {
          const summary = generatedSummary(upload);
          return (
            <MaterialRow
              key={upload.id}
              icon={<PdfBadgeIcon />}
              tone="red"
              title={upload.filename}
              meta={[formatFileSize(upload.size), `Tải lên ${formatTimeAgo(upload.createdAt)}`]}
              metric={
                <>
                  <Layers aria-hidden />
                  {summary ?? "Chưa tạo nội dung"}
                </>
              }
              action={
                summary
                  ? { label: "Xem lại", icon: Play, onClick: () => openInAiTool(upload) }
                  : { label: "Tải xuống", icon: Download, variant: "neutral", onClick: () => void download(upload) }
              }
              menu={[
                { label: "Mở trong Công cụ AI", icon: WandSparkles, onClick: () => openInAiTool(upload) },
                { label: "Tải xuống", icon: Download, onClick: () => void download(upload) },
              ]}
            />
          );
        })
      )}
    </MaterialSectionCard>
  );
}
