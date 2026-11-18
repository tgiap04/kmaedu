import { useEffect, useState, useCallback } from "react";
import { Link, useParams } from "react-router-dom";
import { useFlashcardSetStore } from "@/stores/useFlashcardSetStore";
import { Button } from "@/components/antd/button";
import { Badge } from "@/components/antd/badge";
import { Skeleton } from "@/components/antd/skeleton";
import { CalendarDotsIcon, CreditCardIcon, EyeIcon, PlusCircleIcon, CardsIcon } from "@phosphor-icons/react";
import { PageHeader } from "@/components/k-page/page-header";
import { SectionCard, SectionMessage } from "@/components/k-page/section-card";
import { HistoryStatCard } from "@/components/molecules/HistoryStatCard";
import type { Flashcard as FlashCard } from "@/types/flashcardSet";
import { DeleteConfirmDialog } from "@/components/organisms/DeleteConfirmDialog";
import { FlashcardEditorDialog } from "@/components/organisms/FlashcardEditorDialog";
import type { FlashcardFormData } from "@/components/organisms/FlashcardEditorDialog";
import { FlashcardLabelManager } from "@/components/organisms/FlashcardLabelManager";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/antd/breadcrumb";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/antd/select";
import {
  getFlashcardSetFlashcardsApi,
  getFlashcardSetLabelsApi,
  updateFlashcardInFlashcardSet,
  type PaginationInfo,
  type FlashcardSetLabel,
} from "@/apis/flashcardSetApi";
import { storeCache } from "@/lib/storeCache";
import { FlashcardGridCard } from "./components/flashcard-grid-card";
import { NumberedPagination } from "./components/numbered-pagination";

export default function ManageFlashcardSetDetailPage() {
  const { id = "" } = useParams();
  const {
    currentFlashcardSet,
    loading,
    fetchFlashcardSetById,
    addFlashcard,
    updateFlashcard,
    deleteFlashcard,
  } = useFlashcardSetStore();

  const [selectedCard, setSelectedCard] = useState<FlashCard | null>(null);
  const [showCardForm, setShowCardForm] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [cardToDelete, setCardToDelete] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [paginatedFlashcards, setPaginatedFlashcards] = useState<FlashCard[]>([]);
  const [pagination, setPagination] = useState<PaginationInfo | null>(null);
  const [flashcardsLoading, setFlashcardsLoading] = useState(false);
  const itemsPerPage = 9;
  const [selectedLabelId, setSelectedLabelId] = useState<string | null>(null);
  const [availableLabels, setAvailableLabels] = useState<FlashcardSetLabel[]>([]);
  const [_labelsLoading, setLabelsLoading] = useState(false);
  useEffect(() => {
    if (id) {
      fetchFlashcardSetById(id);
    }
  }, [id, fetchFlashcardSetById]);

  const fetchFlashcards = useCallback(async () => {
    if (!id) return;

    setFlashcardsLoading(true);
    try {
      const response = await getFlashcardSetFlashcardsApi(id, currentPage, itemsPerPage, selectedLabelId);
      setPaginatedFlashcards(response.flashCards);
      setPagination(response.pagination);
    } catch (error) {
      console.error("Failed to fetch flashcards:", error);
    } finally {
      setFlashcardsLoading(false);
    }
  }, [id, currentPage, selectedLabelId]);

  const fetchLabels = useCallback(async () => {
    if (!id) return;

    setLabelsLoading(true);
    try {
      const response = await getFlashcardSetLabelsApi(id);
      setAvailableLabels(response.labels);
    } catch (error) {
      console.error("Failed to fetch labels:", error);
    } finally {
      setLabelsLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchFlashcards();
  }, [fetchFlashcards]);

  useEffect(() => {
    fetchLabels();
  }, [fetchLabels]);

  const totalFlashcards = pagination?.total || 0;
  const totalPages = pagination?.totalPages || 0;

  // Cache key generator for flashcards by label
  const getLabelFlashcardsCacheKey = (labelId: string) =>
    storeCache.createKey("flashcards-by-label", { flashcardSetId: id, labelId });

  // Invalidate label flashcards cache when card CUD or label CUD
  const invalidateLabelFlashcardsCache = (labelId: string) => {
    const cacheKey = getLabelFlashcardsCacheKey(labelId);
    storeCache.invalidate(cacheKey);
  };

  // Handle label change from FlashcardLabelManager
  const handleLabelChange = useCallback(
    (_action: "create" | "update" | "delete", labelId?: string) => {
      if (labelId) {
        invalidateLabelFlashcardsCache(labelId);
      }
      // Refresh labels list
      fetchLabels();
    },
    [fetchLabels],
  );

  const handleAddCard = useCallback(() => {
    setSelectedCard(null);
    setShowCardForm(true);
  }, []);

  const handleEditCard = useCallback((card: FlashCard) => {
    setSelectedCard(card);
    setShowCardForm(true);
  }, []);

  const handleDeleteCard = useCallback((cardId: string) => {
    setCardToDelete(cardId);
    setIsDeleteDialogOpen(true);
  }, []);

  const handleConfirmDelete = useCallback(async () => {
    if (cardToDelete && id) {
      // Find the card to get its labelId before deletion
      const cardToDeleteObj = paginatedFlashcards.find((c) => c.id === cardToDelete);
      const cardLabelId = cardToDeleteObj?.label?.id;

      await deleteFlashcard(id, cardToDelete);
      setIsDeleteDialogOpen(false);
      setCardToDelete(null);

      // Invalidate label cache if card had label
      if (cardLabelId) {
        invalidateLabelFlashcardsCache(cardLabelId);
      }

      if (paginatedFlashcards.length === 1 && currentPage > 1) {
        setCurrentPage((prev) => prev - 1);
        await fetchFlashcards();
      } else {
        await fetchFlashcards();
      }
    }
  }, [cardToDelete, id, deleteFlashcard, paginatedFlashcards, currentPage, fetchFlashcards]);

  const handleSaveCard = useCallback(
    async (cardData: FlashcardFormData) => {
      if (!id) return;

      if (selectedCard) {
        // Call API directly and update local state with returned data
        const response = await updateFlashcardInFlashcardSet(id, selectedCard.id, cardData);
        setPaginatedFlashcards((prev) =>
          prev.map((card) => (card.id === selectedCard.id ? response.flashcard : card))
        );
        // Invalidate label cache if card has label
        if (selectedCard.label?.id) {
          invalidateLabelFlashcardsCache(selectedCard.label.id);
        }
      } else {
        await addFlashcard(id, cardData);
        await fetchFlashcards();
      }

      setShowCardForm(false);
      setSelectedCard(null);
    },
    [selectedCard, id, addFlashcard, updateFlashcard, fetchFlashcards],
  );

  if (loading || !currentFlashcardSet) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-16 w-72 rounded-lg" />
        <div className="grid gap-4 md:grid-cols-3">
          <Skeleton className="h-28 rounded-lg" />
          <Skeleton className="h-28 rounded-lg" />
          <Skeleton className="h-28 rounded-lg" />
        </div>
        <Skeleton className="h-96 rounded-lg" />
      </div>
    );
  }

  const labelFilter = (
    <div className="flex items-center gap-2">
      <span className="text-sm font-medium text-body">Lọc theo nhãn:</span>
      <Select
        value={selectedLabelId || "all"}
        onValueChange={(value) => {
          setSelectedLabelId(value === "all" ? null : value);
          setCurrentPage(1);
        }}
      >
        <SelectTrigger className="w-40 rounded-lg sm:w-48">
          <SelectValue placeholder="Chọn nhãn" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">Tất cả thẻ</SelectItem>
          <SelectItem value="unlabeled">Chưa gán nhãn</SelectItem>
          {availableLabels.map((label) => (
            <SelectItem key={label.id} value={label.id}>
              <div className="flex items-center gap-2">
                {label.color && <div className="h-3 w-3 rounded-full" style={{ backgroundColor: label.color }} />}
                {label.name}
              </div>
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );

  return (
    <div>
      <div>
        <PageHeader
          icon={<CardsIcon />}
          title={currentFlashcardSet.title}
          subtitle={
            <>
              {currentFlashcardSet.description || "Quản lý thẻ nhớ và nhãn của bộ flashcard"}
              {currentFlashcardSet.tags && currentFlashcardSet.tags.length > 0 && (
                <span className="mt-2 flex flex-wrap gap-2">
                  {currentFlashcardSet.tags.map((tag: string) => (
                    <Badge key={tag} variant="outline">
                      {tag}
                    </Badge>
                  ))}
                </span>
              )}
            </>
          }
          eyebrow={
            <Breadcrumb>
              <BreadcrumbList>
                <BreadcrumbItem>
                  <BreadcrumbLink asChild>
                    <Link to="/k/flash-card">Quản lý Flashcard</Link>
                  </BreadcrumbLink>
                </BreadcrumbItem>
                <BreadcrumbSeparator />
                <BreadcrumbItem>
                  <BreadcrumbPage>{currentFlashcardSet.title}</BreadcrumbPage>
                </BreadcrumbItem>
              </BreadcrumbList>
            </Breadcrumb>
          }
        />

        <div className="mb-6 grid gap-4 md:grid-cols-3">
          <HistoryStatCard icon={CreditCardIcon} title="Tổng số thẻ" value={totalFlashcards} tone="red" />
          <HistoryStatCard icon={EyeIcon} title="Lượt xem" value={currentFlashcardSet.viewCount} tone="green" />
          <HistoryStatCard icon={CalendarDotsIcon} title="Ngày tạo" value={new Date(currentFlashcardSet.createdAt).toLocaleDateString("vi-VN")} tone="blue" />
        </div>

        <FlashcardLabelManager
          flashcardSetId={id}
          onLabelChange={handleLabelChange}
        />

        <FlashcardEditorDialog
          open={showCardForm}
          onOpenChange={setShowCardForm}
          flashcard={selectedCard}
          onSave={handleSaveCard}
        />

        <SectionCard
          icon={<CardsIcon />}
          title="Danh sách flashcard"
          countLabel={totalFlashcards > 0 ? `${totalFlashcards} thẻ` : undefined}
          action={
            <div className="flex flex-wrap items-center gap-2">
              {labelFilter}
              <Button onClick={handleAddCard} disabled={showCardForm}>
                <PlusCircleIcon className="mr-2 h-4 w-4" />
                Thêm thẻ
              </Button>
            </div>
          }
          plain
        >
          {flashcardsLoading ? (
            <div className="grid gap-4 border-t border-hairline-soft p-4 md:grid-cols-2 md:p-5 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-40 w-full rounded-lg" />
              ))}
            </div>
          ) : paginatedFlashcards.length > 0 ? (
            <>
              <div className="grid gap-4 border-t border-hairline-soft p-4 md:grid-cols-2 md:p-5 lg:grid-cols-3">
                {paginatedFlashcards.map((card, index) => (
                  <FlashcardGridCard
                    key={card.id}
                    card={card}
                    number={(currentPage - 1) * itemsPerPage + index + 1}
                    disabled={showCardForm}
                    onEdit={() => handleEditCard(card)}
                    onDelete={() => handleDeleteCard(card.id)}
                  />
                ))}
              </div>

              {totalPages > 1 && (
                <div className="border-t border-hairline-soft">
                  <NumberedPagination
                    page={currentPage}
                    totalPages={totalPages}
                    perPage={itemsPerPage}
                    total={totalFlashcards}
                    unit="thẻ"
                    onChange={setCurrentPage}
                    onSelect={setCurrentPage}
                  />
                </div>
              )}
            </>
          ) : (
            <div className="border-t border-hairline-soft">
              <SectionMessage title="Chưa có thẻ nhớ nào" hint={'Nhấn "Thêm thẻ" để bắt đầu tạo bộ flashcard'} />
            </div>
          )}
        </SectionCard>
      </div>

      <DeleteConfirmDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
        title="Xóa thẻ nhớ"
        description="Bạn có chắc chắn muốn xóa thẻ nhớ này? Hành động này không thể hoàn tác."
        onConfirm={handleConfirmDelete}
      />
    </div>
  );
}
