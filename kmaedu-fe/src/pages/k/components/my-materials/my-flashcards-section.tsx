import { useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { CopyIcon, EyeIcon, LinkSimpleIcon, PushPinIcon, PushPinSlashIcon, PlayIcon } from "@phosphor-icons/react";
import { togglePinFlashcardApi, type RecentFlashcardSet } from "@/apis/studentMaterialsApi";
import { useToast } from "@/components/antd/toast";
import { formatCompactCount, formatTimeAgo } from "@/lib/history/history-format";
import { useStudentMaterialsStore } from "@/stores/useStudentMaterialsStore";
import { ItemRow } from "@/components/k-page/item-row";
import { SectionMessage, RowsSkeleton, SectionCard, SectionPager } from "@/components/k-page/section-card";
import { usePagedList } from "./use-paged-list";
import { apiErrorMessage } from "@/lib/api-error-message";

const PAGE_SIZE = 5;

const pinnedFirst = (items: RecentFlashcardSet[]) => [...items.filter((m) => m.isPinned), ...items.filter((m) => !m.isPinned)];

/** "Flashcard của tôi": recently studied sets (pinned first) with study, pin and share actions. */
export function MyFlashcardsSection() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { fetchFlashcards, updateFlashcardPin } = useStudentMaterialsStore();
  const fetchPage = useCallback((page: number) => fetchFlashcards(page, PAGE_SIZE), [fetchFlashcards]);
  const { page, setPage, data, setData, failed, reload } = usePagedList(fetchPage);

  const setPinned = (id: string, pinned: boolean) => {
    setData((prev) => prev && { ...prev, flashcardSets: prev.flashcardSets.map((m) => (m.id === id ? { ...m, isPinned: pinned } : m)) });
    updateFlashcardPin(id, pinned);
  };

  const togglePin = async (set: RecentFlashcardSet) => {
    const pinned = !set.isPinned;
    setPinned(set.id, pinned);
    try {
      await togglePinFlashcardApi(set.id);
    } catch (error) {
      setPinned(set.id, !pinned);
      toast.error(apiErrorMessage(error, "Không thể ghim tài liệu"));
    }
  };

  // Built on the client: no API call (sharing settings are the owner's, managed elsewhere).
  const copyLink = async (id: string) => {
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/study-flashcard/${id}`);
      toast.success("Đã sao chép liên kết");
    } catch {
      toast.error("Không thể sao chép liên kết");
    }
  };

  const sets = data ? pinnedFirst(data.flashcardSets) : [];

  return (
    <SectionCard
      icon={<CopyIcon />}
      title="Flashcard của tôi"
      countLabel={data ? `${data.total} bộ thẻ` : undefined}
      illustration="/illustrations/materials-flashcards.svg"
    >
      {failed ? (
        <SectionMessage title="Không thể tải flashcard" onRetry={reload} />
      ) : data === null ? (
        <RowsSkeleton />
      ) : sets.length === 0 ? (
        <SectionMessage title="Chưa có bộ flashcard nào" hint="Bắt đầu khám phá và học các bộ flashcard" />
      ) : (
        <>
          {sets.map((set) => (
            <ItemRow
              key={set.id}
              icon={<CopyIcon />}
              tone="indigo"
              title={set.title}
              titleAddon={set.isPinned ? <PushPinIcon className="size-3.5 shrink-0 text-brand" aria-hidden={false} role="img" aria-label="Đã ghim" /> : undefined}
              meta={[`${set.flashcardCount} thẻ`, `Xem ${formatTimeAgo(set.lastViewedAt)}`]}
              metric={
                <>
                  <EyeIcon aria-hidden />
                  {formatCompactCount(set.viewCount)} lượt xem
                </>
              }
              action={{ label: "Học ngay", icon: PlayIcon, onClick: () => navigate(`/study-flashcard/${set.id}`) }}
              menu={[
                { label: set.isPinned ? "Bỏ ghim" : "Ghim", icon: set.isPinned ? PushPinSlashIcon : PushPinIcon, onClick: () => void togglePin(set) },
                { label: "Sao chép liên kết", icon: LinkSimpleIcon, onClick: () => void copyLink(set.id) },
              ]}
            />
          ))}
          <SectionPager page={page} totalPages={data.totalPages} onChange={setPage} />
        </>
      )}
    </SectionCard>
  );
}
