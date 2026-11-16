import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  TreeView,
  ListView,
  CreateFlashcardModal,
} from "@/components/k/word-family";
import { useWordFamilyStore } from "@/stores/useWordFamilyStore";
import { toast } from "@/components/antd/toast";
import { useCan } from "@/hooks/useCan";
import { WORD_FAMILY_ACTION_PERMISSIONS } from "@/lib/rbac/nav-items";
import { Button, Spin } from "antd";
import { BookText, ListTree, Zap } from "lucide-react";
import { PageHeader } from "@/components/k-page/page-header";
import { RowsSkeleton, SectionCard, SectionMessage } from "@/components/k-page/section-card";
import { WordFamilyBreadcrumb } from "@/components/k/word-family/word-family-breadcrumb";
import { WordFamilyToolbar } from "@/components/k/word-family/word-family-toolbar";

export default function WordFamilyDetailPage() {
  const { slug, rootWord } = useParams<{
    slug: string;
    rootWord: string;
  }>();
  const {
    currentWordFamily,
    loadingDetail,
    error,
    savedIds,
    regeneratingKey,
    fetchWordFamily,
    fetchSaved,
    saveWordFamily,
    generateWordFamilyForRoot,
    checkRootGenerationStatus,
    abandonRootGeneration,
  } = useWordFamilyStore();

  // Root-scoped: only this exact root's regenerate job drives the UI.
  const generating =
    !!slug && !!rootWord && regeneratingKey === `${slug}:${rootWord}`;

  const [viewMode, setViewMode] = useState<"tree" | "list">("tree");
  const [expandedWords, setExpandedWords] = useState<Set<number>>(() => new Set());
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(
    () => new Set(),
  );
  const [showFlashcardModal, setShowFlashcardModal] = useState(false);
  const canGenerate = useCan(WORD_FAMILY_ACTION_PERMISSIONS.generate);
  const canSave = useCan(WORD_FAMILY_ACTION_PERMISSIONS.save);
  const canToFlashcard = useCan(WORD_FAMILY_ACTION_PERMISSIONS.toFlashcard);

  useEffect(() => {
    if (slug && rootWord) {
      void fetchWordFamily(slug, rootWord);
      if (canSave) void fetchSaved();
      // Resume the generating UI if a job for THIS root is already running
      // (e.g. after a page reload).
      void checkRootGenerationStatus(slug, rootWord);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Zustand selectors return stable refs
  }, [slug, rootWord]);

  // While a generation job runs, poll its status; when it clears, refetch the
  // detail so the freshly generated words appear. Self-rescheduling timeout
  // (not setInterval) so a slow response can never overlap the next tick.
  useEffect(() => {
    if (!slug || !rootWord || !generating) return;
    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout>;
    let elapsedMs = 0;
    const POLL_INTERVAL_MS = 5000;
    const MAX_WAIT_MS = 11 * 60 * 1000; // AI times out server-side at ~10 min

    const tick = async () => {
      const stillGenerating = await checkRootGenerationStatus(slug, rootWord);
      if (cancelled) return;
      if (!stillGenerating) {
        await fetchWordFamily(slug, rootWord, true);
        if (!cancelled) toast.success(`Đã sinh từ con cho "${rootWord}"!`);
        return;
      }
      elapsedMs += POLL_INTERVAL_MS;
      if (elapsedMs >= MAX_WAIT_MS) {
        abandonRootGeneration(slug, rootWord);
        return;
      }
      timeoutId = setTimeout(tick, POLL_INTERVAL_MS);
    };

    timeoutId = setTimeout(tick, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- Zustand selectors return stable refs
  }, [slug, rootWord, generating]);

  const toggleExpand = (idx: number) => {
    setExpandedWords((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const toggleSelect = (idx: number) => {
    setSelectedIndices((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (!currentWordFamily) return;
    if (selectedIndices.size === currentWordFamily.words.length) {
      setSelectedIndices(new Set());
    } else {
      setSelectedIndices(
        new Set(currentWordFamily.words.map((_, i) => i)),
      );
    }
  };

  const handleSave = async () => {
    if (!currentWordFamily) return;
    const ok = await saveWordFamily(currentWordFamily.id);
    if (ok) toast.success("Đã lưu vào bộ sưu tập!");
    else toast.error("Lưu thất bại");
  };

  const handleGenerate = async () => {
    if (!slug || !rootWord || generating) return;
    const ok = await generateWordFamilyForRoot(slug, rootWord);
    if (!ok) toast.error("Không thể bắt đầu sinh từ con. Vui lòng thử lại.");
    // On success, the polling effect refetches + toasts when the job completes.
  };

  const words = currentWordFamily?.words ?? [];
  const isSaved = currentWordFamily
    ? savedIds.has(currentWordFamily.id)
    : false;

  return (
    <div className="relative text-ink">
      <section className="relative">
        <PageHeader
          eyebrow={
            <WordFamilyBreadcrumb
              crumbs={[
                { label: "Trang chủ", to: "/k" },
                { label: "Từ vựng", to: "/k/word-family" },
                { label: slug ?? "", to: `/k/word-family/${slug}` },
                { label: rootWord ?? "" },
              ]}
            />
          }
          icon={<BookText />}
          title={rootWord ?? ""}
          subtitle={<>{words.length} từ vựng &middot; {slug}</>}
          actions={
            <WordFamilyToolbar
              viewMode={viewMode}
              onViewModeChange={setViewMode}
              canGenerate={canGenerate}
              canSave={canSave}
              canToFlashcard={canToFlashcard}
              generating={generating}
              isSaved={isSaved}
              selectedCount={selectedIndices.size}
              onGenerate={handleGenerate}
              onSave={handleSave}
              onCreateFlashcard={() => setShowFlashcardModal(true)}
            />
          }
        />

        <div className="space-y-4">
          {error && !generating && (
            <div className="overflow-hidden rounded-[20px] border border-hairline bg-canvas">
              <SectionMessage title={error} />
            </div>
          )}

          {generating && (
            <div className="flex items-center gap-3 rounded-[20px] border border-brand-border bg-brand-soft px-5 py-3.5 text-sm text-ink">
              <Spin size="small" />
              <span>
                Đang sinh từ con cho &ldquo;{rootWord}&rdquo;, vui lòng đợi trong
                giây lát...
              </span>
            </div>
          )}

          {loadingDetail && (
            <SectionCard icon={<ListTree />} title="Từ vựng" plain>
              <div className="divide-y divide-hairline-soft">
                <RowsSkeleton rows={5} />
              </div>
            </SectionCard>
          )}

          {!loadingDetail && !generating && words.length === 0 && !error && (
            <SectionCard icon={<ListTree />} title="Từ vựng" plain>
              <SectionMessage title={`Chưa có từ con cho từ gốc "${rootWord}".`} />
              {canGenerate && (
                <div className="flex justify-center pb-6">
                  <Button
                    type="primary"
                    size="large"
                    icon={<Zap className="size-4" />}
                    onClick={handleGenerate}
                    loading={generating}
                  >
                    {generating ? "Đang sinh..." : `Sinh từ con cho "${rootWord}"`}
                  </Button>
                </div>
              )}
            </SectionCard>
          )}

          {!loadingDetail && words.length > 0 && viewMode === "tree" && (
            <SectionCard icon={<ListTree />} title="Sơ đồ từ vựng" countLabel={`${words.length} từ`} plain>
              <div className="overflow-x-auto p-3 md:p-4">
                <TreeView rootWord={rootWord!} words={words} />
              </div>
            </SectionCard>
          )}

          {!loadingDetail && words.length > 0 && viewMode === "list" && (
            <SectionCard icon={<ListTree />} title="Danh sách từ vựng" countLabel={`${words.length} từ`} plain>
              <ListView
                words={words}
                selectedIndices={selectedIndices}
                expandedWords={expandedWords}
                onToggleSelect={toggleSelect}
                onToggleExpand={toggleExpand}
                onSelectAll={toggleSelectAll}
                allSelected={selectedIndices.size === words.length}
              />
            </SectionCard>
          )}
        </div>

        <CreateFlashcardModal
          open={showFlashcardModal}
          wordFamilyId={currentWordFamily?.id ?? ""}
          rootWord={rootWord ?? ""}
          selectedCount={selectedIndices.size}
          selectedIndices={[...selectedIndices]}
          onClose={() => setShowFlashcardModal(false)}
        />
      </section>
    </div>
  );
}
