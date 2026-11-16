import { useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { useWordFamilyStore } from "@/stores/useWordFamilyStore";
import { Button, Spin } from "antd";
import { PageHeader } from "@/components/k-page/page-header";
import { RowsSkeleton, SectionCard, SectionMessage } from "@/components/k-page/section-card";
import { WordFamilyBreadcrumb } from "@/components/k/word-family/word-family-breadcrumb";
import { useCan } from "@/hooks/useCan";
import { WORD_FAMILY_ACTION_PERMISSIONS } from "@/lib/rbac/nav-items";
import { ArrowUpRight, Languages, ListTree } from "lucide-react";

export default function WordFamilyCategoryPage() {
  const { slug } = useParams<{ slug: string }>();
  const canGenerate = useCan(WORD_FAMILY_ACTION_PERMISSIONS.generate);
  const {
    currentCategory,
    loadingRootWords,
    generatingSlug,
    error,
    fetchRootWords,
    generateWordFamily,
    checkGenerationStatus,
    abandonGeneration,
  } = useWordFamilyStore();

  // Slug-scoped: only "generating" when the running job belongs to this category.
  const generating = generatingSlug === slug;

  useEffect(() => {
    if (!slug) return;
    void fetchRootWords(slug);
    // Detect a generation job already in progress (e.g. after a page reload)
    // and resume the generating UI immediately.
    void checkGenerationStatus(slug);
  }, [slug, fetchRootWords, checkGenerationStatus]);

  // While a job is in progress, poll its status; when it clears, refresh roots.
  // Self-rescheduling timeout (not setInterval) so a slow response can never
  // overlap the next tick and produce out-of-order writes.
  useEffect(() => {
    if (!slug || !generating) return;
    let cancelled = false;
    let timeoutId: ReturnType<typeof setTimeout>;
    let elapsedMs = 0;
    const POLL_INTERVAL_MS = 5000;
    const MAX_WAIT_MS = 11 * 60 * 1000; // AI generation times out server-side at 10 min

    const tick = async () => {
      const stillGenerating = await checkGenerationStatus(slug);
      if (cancelled) return;
      if (!stillGenerating) {
        void fetchRootWords(slug, true);
        return;
      }
      elapsedMs += POLL_INTERVAL_MS;
      if (elapsedMs >= MAX_WAIT_MS) {
        // Lock likely orphaned by a server restart mid-generation — stop waiting.
        abandonGeneration(slug);
        return;
      }
      timeoutId = setTimeout(tick, POLL_INTERVAL_MS);
    };

    timeoutId = setTimeout(tick, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      clearTimeout(timeoutId);
    };
  }, [slug, generating, checkGenerationStatus, fetchRootWords, abandonGeneration]);

  const handleGenerate = async () => {
    if (!slug) return;
    const ok = await generateWordFamily({ categorySlug: slug });
    if (ok && slug) void fetchRootWords(slug, true);
  };

  const rootWords = currentCategory?.rootWords ?? [];
  const showEmpty =
    !loadingRootWords && !generating && rootWords.length === 0;
  const categoryName = currentCategory?.category?.name ?? slug ?? "";

  return (
    <div className="relative text-ink">
      <section className="relative">
        <PageHeader
          eyebrow={
            <WordFamilyBreadcrumb
              crumbs={[
                { label: "Trang chủ", to: "/k" },
                { label: "Từ vựng", to: "/k/word-family" },
                { label: categoryName },
              ]}
            />
          }
          icon={<Languages />}
          title={categoryName}
          subtitle={currentCategory?.category?.description}
          actions={
            canGenerate && (
              <Button type="primary" size="large" loading={generating} onClick={handleGenerate}>
                Tạo thêm từ gốc
              </Button>
            )
          }
        />

        <div className="space-y-4">
          {error && (
            <div className="overflow-hidden rounded-[20px] border border-hairline bg-canvas">
              <SectionMessage title={error} />
            </div>
          )}

          {generating && (
            <div className="flex items-center gap-3 rounded-[20px] border border-brand-border bg-brand-soft px-5 py-3.5 text-sm text-ink">
              <Spin size="small" />
              <span>Đang sinh word family, vui lòng đợi trong giây lát...</span>
            </div>
          )}

          <SectionCard
            icon={<ListTree />}
            title="Từ gốc"
            countLabel={`${currentCategory?.total ?? 0} từ gốc`}
            plain
          >
            {loadingRootWords && <RowsSkeleton rows={6} />}

            {showEmpty && (
              <SectionMessage
                title="Chưa có từ gốc nào"
                hint={
                  canGenerate
                    ? "Nhấn \"Tạo thêm từ gốc\" để AI sinh nhóm từ vựng đầu tiên cho danh mục này."
                    : "Giáo viên sẽ bổ sung từ vựng cho danh mục này."
                }
              />
            )}

            {!loadingRootWords && rootWords.length > 0 && (
              <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 md:p-5 lg:grid-cols-3 xl:grid-cols-4">
                {rootWords.map((rw) => (
                  <Link
                    key={rw.id}
                    to={`/k/word-family/${slug}/${rw.rootWord}`}
                    className="group flex items-center gap-3 rounded-2xl border border-hairline bg-canvas px-3.5 py-3 transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-border hover:shadow-[0_6px_18px_rgba(15,23,42,0.06)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
                  >
                    <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-brand-soft text-sm font-bold text-brand">
                      {rw.rootWord.charAt(0).toUpperCase()}
                    </span>
                    <span className="min-w-0 flex-1 truncate text-[14px] font-semibold text-ink">
                      {rw.rootWord}
                    </span>
                    <ArrowUpRight className="size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-brand" aria-hidden />
                  </Link>
                ))}
              </div>
            )}
          </SectionCard>
        </div>
      </section>
    </div>
  );
}
