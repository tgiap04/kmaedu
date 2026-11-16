import { useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowUpRight, BookOpenText, Languages } from "lucide-react";
import { useWordFamilyStore } from "@/stores/useWordFamilyStore";
import { PageHeader } from "@/components/k-page/page-header";
import { SectionMessage } from "@/components/k-page/section-card";
import { Skeleton } from "@/components/antd/skeleton";

const cardClass =
  "group flex flex-col overflow-hidden rounded-[20px] border border-hairline bg-canvas shadow-[0_4px_20px_rgba(15,23,42,0.04)] transition-all duration-200 hover:-translate-y-0.5 hover:border-brand-border hover:shadow-[0_10px_28px_rgba(15,23,42,0.08)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40";

export default function WordFamilyPage() {
  const { categories, loadingCategories, error, fetchCategories } =
    useWordFamilyStore();

  useEffect(() => {
    void fetchCategories();
  }, [fetchCategories]);

  return (
    <div className="relative text-ink">
      <section className="relative">
        <PageHeader
          icon={<Languages />}
          title="Từ vựng tiếng Anh"
          subtitle="Học từ vựng theo phương pháp word family - nhóm từ cùng gốc. Mỗi nhóm sẽ có một từ gốc (root word) và các từ liên quan được sinh ra từ từ gốc đó."
        />

        {error && (
          <div className="mb-4 overflow-hidden rounded-[20px] border border-hairline bg-canvas">
            <SectionMessage title={error} />
          </div>
        )}

        {loadingCategories && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="space-y-3 rounded-[20px] border border-hairline bg-canvas p-5">
                <Skeleton className="size-9 rounded-lg" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-3 w-3/4" />
              </div>
            ))}
          </div>
        )}

        {!loadingCategories && categories.length === 0 && (
          <div className="overflow-hidden rounded-[20px] border border-hairline bg-canvas">
            <SectionMessage title="Chưa có danh mục nào." />
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {categories
            .filter((c) => c.isActive)
            .map((cat) => (
              <Link key={cat.id} to={`/k/word-family/${cat.slug}`} className={cardClass}>
                {cat.imageUrl && (
                  <div className="aspect-[16/9] w-full overflow-hidden bg-surface-soft">
                    <img
                      src={cat.imageUrl}
                      alt={cat.name}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                  </div>
                )}
                <div className="flex flex-1 items-start gap-3 p-4">
                  <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-brand-soft text-brand [&_svg]:size-[18px] [&_svg]:stroke-[1.9]">
                    <BookOpenText />
                  </span>
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate text-[15px] font-bold text-ink">{cat.name}</h3>
                    {cat.description && (
                      <p className="mt-0.5 line-clamp-2 text-[13px] text-muted-foreground">
                        {cat.description}
                      </p>
                    )}
                  </div>
                  <ArrowUpRight className="size-4 shrink-0 text-muted-foreground transition-colors group-hover:text-brand" aria-hidden />
                </div>
              </Link>
            ))}
        </div>
      </section>
    </div>
  );
}
