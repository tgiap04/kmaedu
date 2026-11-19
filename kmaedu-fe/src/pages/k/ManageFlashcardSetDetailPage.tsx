import { useCallback, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Skeleton } from "@/components/antd/skeleton";
import { DeleteConfirmDialog } from "@/components/organisms/DeleteConfirmDialog";
import { FlashcardSetModal } from "@/components/organisms/FlashcardSetModal";
import { ShareFlashcardModal } from "@/components/organisms/ShareFlashcardModal";
import { ALL_CARDS, UNLABELED, completionRate, filterCards } from "@/lib/flashcard-detail/flashcard-detail";
import { useFlashcardSetStore } from "@/stores/useFlashcardSetStore";
import { useStatsStore } from "@/stores/useStatsStore";
import type { Flashcard } from "@/types/flashcardSet";
import { FlashcardDetailHeader } from "./components/flashcard-detail/flashcard-detail-header";
import { FlashcardDetailStats } from "./components/flashcard-detail/flashcard-detail-stats";
import { FlashcardLabelManager } from "./components/flashcard-detail/flashcard-label-manager";
import { FlashcardList } from "./components/flashcard-detail/flashcard-list";
import { FlashcardStatsPanel } from "./components/flashcard-detail/flashcard-stats-panel";
import { type DetailTab, FlashcardTabsBar, tabId, tabPanelId } from "./components/flashcard-detail/flashcard-tabs-bar";
import { useCardLabeling } from "./components/flashcard-detail/use-card-labeling";
import { useCopyFlashcardSet } from "./components/flashcard-detail/use-copy-flashcard-set";
import { useFlashcardCards } from "./components/flashcard-detail/use-flashcard-cards";
import { useFlashcardProgress } from "./components/flashcard-detail/use-flashcard-progress";
import { useFlashcardSetDetail } from "./components/flashcard-detail/use-flashcard-set-detail";

/** One mount per set: opening another set (e.g. right after "Sao chép") starts from a clean page. */
export default function ManageFlashcardSetDetailPage() {
  const { id = "" } = useParams();
  return <FlashcardSetDetail key={id} id={id} />;
}

function FlashcardSetDetail({ id }: { id: string }) {
  const navigate = useNavigate();
  const { updateFlashcardSet, deleteFlashcardSet } = useFlashcardSetStore();
  const invalidateFlashcardStats = useStatsStore((s) => s.invalidateFlashcardStats);
  const detail = useFlashcardSetDetail(id);
  const { set, labels } = detail;
  const cardStore = useFlashcardCards(id);
  const { cards } = cardStore;
  const studiedIds = useFlashcardProgress(id);
  const copier = useCopyFlashcardSet(set, cards);

  const [tab, setTab] = useState<DetailTab>("cards");
  const [search, setSearch] = useState("");
  const [chosenLabel, setLabel] = useState(ALL_CARDS);
  const [editOpen, setEditOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [deleteSetOpen, setDeleteSetOpen] = useState(false);
  const [pendingDelete, setPendingDelete] = useState<Flashcard | null>(null);
  const [busy, setBusy] = useState(false);

  // A label deleted while it is the filter falls back to "all" instead of an empty, unnamed filter.
  const label = chosenLabel === ALL_CARDS || chosenLabel === UNLABELED || labels.some((l) => l.id === chosenLabel) ? chosenLabel : ALL_CARDS;
  const all = useMemo(() => cards ?? [], [cards]);
  const visible = useMemo(() => filterCards(all, label, search), [all, label, search]);
  const numbers = useMemo(() => new Map(all.map((c, i) => [c.id, i + 1])), [all]);
  const completion = studiedIds && cards ? completionRate(studiedIds, all.map((c) => c.id)) : null;
  // Stable while the set is unchanged, so the edit form does not reset on every render.
  const editInitial = useMemo(
    () => (set ? { title: set.title, description: set.description ?? "", isPublic: set.isPublic, isPinned: set.isPinned, tags: set.tags ?? [] } : undefined),
    [set],
  );
  const labeling = useCardLabeling(id, cardStore, detail);
  const openLabel = useCallback((filter: string) => {
    setLabel(filter);
    setSearch("");
    setTab("cards");
  }, []);

  if (!set) {
    if (detail.failed) {
      return (
        <div className="py-24 text-center text-body">
          <p>Không tải được bộ thẻ, hoặc bộ thẻ không còn tồn tại.</p>
          <button type="button" onClick={() => void detail.reloadSet()} className="mt-3 font-semibold text-brand hover:underline">Thử lại</button>
        </div>
      );
    }
    return (
      <div className="space-y-5 pt-2">
        <Skeleton className="h-16 w-full max-w-xl rounded-lg" />
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{Array.from({ length: 4 }, (_, i) => <Skeleton key={i} className="h-24 rounded-lg" />)}</div>
        <Skeleton className="h-80 rounded-lg" />
      </div>
    );
  }

  const deleteSet = async () => {
    setBusy(true);
    try {
      await deleteFlashcardSet(id);
      invalidateFlashcardStats();
      navigate("/k/flash-card");
    } catch (error) {
      console.error("Delete flashcard set error:", error); // the store already told the user
      setBusy(false);
    }
  };

  const deleteCard = async () => {
    if (!pendingDelete) return;
    setBusy(true);
    const ok = await cardStore.deleteCard(pendingDelete);
    setBusy(false);
    if (ok) setPendingDelete(null);
  };

  // Until the cards are in, every tab shows a skeleton (or the retry link), never "0 thẻ".
  const pendingCards = cardStore.failed ? (
    <p className="py-12 text-center text-[14px] text-body">Không tải được danh sách thẻ. <button type="button" onClick={() => void cardStore.reload()} className="font-semibold text-brand hover:underline">Thử lại</button></p>
  ) : (
    <Skeleton className="h-64 w-full rounded-lg" />
  );

  return (
    <div className="flex min-w-0 flex-col gap-5 pt-2 pb-6">
      <FlashcardDetailHeader set={set} copying={copier.copying} copyDisabled={cards === null} onEditInfo={() => setEditOpen(true)} onShare={() => setShareOpen(true)} onCopy={() => void copier.copy()} onDelete={() => setDeleteSetOpen(true)} />

      <FlashcardDetailStats cardCount={cards === null ? null : all.length} viewCount={set.viewCount ?? 0} completion={completion} />

      <section className="rounded-lg border border-hairline-soft bg-canvas px-4 pt-3 shadow-[0_4px_20px_rgba(15,23,42,0.05)] md:px-5">
        <FlashcardTabsBar tab={tab} onTabChange={setTab} cardCount={cards === null ? null : all.length} search={search} onSearchChange={setSearch} labels={labels} label={label} onLabelChange={setLabel} />
        <div role="tabpanel" id={tabPanelId(tab)} aria-labelledby={tabId(tab)} className="pt-4 pb-4">
          {cards === null && pendingCards}
          {cards !== null && cardStore.failed && (
            <p className="mb-3 rounded-lg bg-surface-soft px-3 py-2 text-[13px] text-body" role="status">
              Chưa làm mới được danh sách thẻ, đang hiện bản đã tải.{" "}
              <button type="button" onClick={() => void cardStore.reload()} className="font-semibold text-brand hover:underline">Thử lại</button>
            </p>
          )}
          {tab === "cards" && cards !== null && (
            <FlashcardList
              cards={visible}
              numberOf={(cid) => numbers.get(cid) ?? 0}
              resetKey={`${label}|${search}`}
              emptyText={all.length === 0 ? "Bộ thẻ chưa có thẻ nào. Bấm \"Thêm thẻ\" để bắt đầu." : "Không có thẻ nào khớp tìm kiếm hoặc bộ lọc."}
              onAdd={cardStore.addCard}
              onUpdate={cardStore.updateCard}
              onRequestDelete={setPendingDelete}
              labels={labeling.labels}
              labelsUnavailable={detail.labelsFailed}
              onAssignLabel={labeling.assign}
              onCreateLabel={labeling.create}
            />
          )}
          {tab === "stats" && cards !== null && <FlashcardStatsPanel set={set} cards={all} studiedIds={studiedIds} />}
          {tab === "labels" && cards !== null && <FlashcardLabelManager setId={id} labels={labels} cards={all} onChanged={labeling.onLabelsChanged} onOpenLabel={openLabel} />}
        </div>
      </section>

      <FlashcardSetModal
        open={editOpen}
        onOpenChange={setEditOpen}
        mode="edit"
        initialData={editInitial}
        isLoading={false}
        onSubmit={async (data) => {
          try {
            await updateFlashcardSet(id, { title: data.title, description: data.description || "", isPublic: data.isPublic, isPinned: data.isPinned, tags: data.tags });
            setEditOpen(false);
          } catch (error) {
            console.error("Update flashcard set error:", error); // the store already told the user
          }
        }}
      />
      <ShareFlashcardModal
        open={shareOpen}
        onOpenChange={(open) => {
          setShareOpen(open);
          if (!open) void detail.reloadSet();
        }}
        flashcardSetId={id}
        flashcardSetTitle={set.title}
      />
      <DeleteConfirmDialog
        open={pendingDelete !== null}
        onOpenChange={(open) => !open && setPendingDelete(null)}
        title="Xóa thẻ nhớ"
        description="Thẻ bị xóa sẽ không khôi phục được."
        isLoading={busy}
        onConfirm={() => void deleteCard()}
      />
      <DeleteConfirmDialog
        open={deleteSetOpen}
        onOpenChange={setDeleteSetOpen}
        title="Xóa bộ thẻ"
        description={`Xóa "${set.title}" cùng ${cards === null ? "toàn bộ" : all.length} thẻ? Hành động này không thể hoàn tác.`}
        isLoading={busy}
        onConfirm={() => void deleteSet()}
      />
    </div>
  );
}
