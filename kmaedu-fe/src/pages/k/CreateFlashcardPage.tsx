import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { FileTextIcon, ListChecksIcon, PencilSimpleLineIcon, StackIcon } from "@phosphor-icons/react";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/antd/breadcrumb";
import { PageHeader } from "@/components/k-page/page-header";
import { useCan } from "@/hooks/useCan";
import { useFlashcardGeneratorStore } from "@/stores/useAIGeneratorStore";
import { panelClass } from "./components/create-flashcard/create-flashcard-ui";
import { DocumentSourcePanel } from "./components/create-flashcard/document-source-panel";
import { sourceDescription, titleFromFilename, titleFromQuiz, validateTitle } from "./components/create-flashcard/flashcard-create-logic";
import { ManualSourcePanel } from "./components/create-flashcard/manual-source-panel";
import { QuizSourcePanel } from "./components/create-flashcard/quiz-source-panel";
import { SettingsPanel } from "./components/create-flashcard/settings-panel";
import { type SourceTab, SourceTabs } from "./components/create-flashcard/source-tabs";
import { TipsBanner } from "./components/create-flashcard/tips-banner";
import { type SetDraft, useCreateFlashcardSubmit } from "./components/create-flashcard/use-create-flashcard-submit";
import { useDocumentGeneration } from "./components/create-flashcard/use-document-generation";
import { useQuizSetCards, useQuizSetOptions } from "./components/create-flashcard/use-quiz-sources";

type TabKey = "document" | "quiz" | "manual";

const BLOCKED_NOTE = "Đang có tác vụ AI khác chạy. Đợi xong hoặc dừng nó ở Công cụ AI rồi quay lại.";

const ALL_TABS: SourceTab<TabKey>[] = [
  { key: "document", label: "Từ tài liệu của bạn", icon: FileTextIcon },
  { key: "quiz", label: "Từ Quiz đã tạo", icon: ListChecksIcon },
  { key: "manual", label: "Nhập thủ công", icon: PencilSimpleLineIcon },
];

export default function CreateFlashcardPage() {
  const canGenerate = useCan("ai:generate");
  const canUseQuiz = useCan("quizset:manage");
  const tabs = useMemo(() => ALL_TABS.filter((t) => (t.key === "document" ? canGenerate : t.key === "quiz" ? canUseQuiz : true)), [canGenerate, canUseQuiz]);
  const [chosen, setChosen] = useState<TabKey | null>(null);
  const tab = tabs.find((t) => t.key === chosen)?.key ?? tabs[0].key;

  // Shared by every tab.
  const [titleOverride, setTitleOverride] = useState<string | null>(null);
  const [isPublic, setIsPublic] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  // Manual tab.
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  // Quiz tab.
  const quizSets = useQuizSetOptions(tab === "quiz");
  const [quizSetId, setQuizSetId] = useState<string | null>(null);
  const quizSet = quizSets.sets.find((s) => s.id === quizSetId) ?? null;
  const quizCards = useQuizSetCards(quizSetId);
  // Document tab: the file name is the default title; the AI job and its result live in `doc`.
  const docName = useFlashcardGeneratorStore((s) => s.file?.name ?? s.fileInfo?.name ?? "");

  const defaultTitle = tab === "document" ? titleFromFilename(docName) : tab === "quiz" ? titleFromQuiz(quizSet?.title ?? "") : "";
  const title = titleOverride ?? defaultTitle;
  const titleError = showErrors ? validateTitle(title) : undefined;
  const draft = (): SetDraft => ({
    title,
    isPublic,
    description: tab === "manual" ? description : sourceDescription(tab === "quiz" ? "quiz" : "document", tab === "quiz" ? (quizSet?.title ?? "") : docName),
    tags: tab === "manual" ? tags : [],
  });

  const { submitting, submitManual, submitCards, submitHistory } = useCreateFlashcardSubmit();
  const doc = useDocumentGeneration((historyId) => submitHistory(draft(), historyId));
  const { gen, resultCount } = doc;

  const handleSubmit = async () => {
    setShowErrors(true);
    if (validateTitle(title)) {
      document.getElementById("flashcard-title")?.focus();
      return;
    }
    if (tab === "manual") void submitManual(draft());
    else if (tab === "quiz") void submitCards(draft(), quizCards.cards, quizCards.skipped);
    else if (resultCount > 0) await doc.saveResult();
    else await doc.start();
  };

  const busy = submitting || (tab === "document" && gen.isGenerating);
  const actionDisabled = tab === "document" ? (!doc.hasFile && resultCount === 0) || doc.blocked : tab === "quiz" ? !quizSetId || quizCards.loading || quizCards.cards.length === 0 : false;
  const actionLabel = gen.isGenerating && tab === "document" ? "Đang tạo thẻ…" : submitting ? "Đang lưu…" : tab === "document" && resultCount > 0 ? "Lưu thành bộ thẻ" : "Tạo Flashcard";

  return (
    <div className="flex min-w-0 flex-col gap-5 pt-2 pb-6">
      <PageHeader
        icon={<StackIcon />}
        title="Tạo Flashcard"
        subtitle="Tạo bộ thẻ học tập từ tài liệu, quiz hoặc nhập thủ công"
        eyebrow={(
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem><BreadcrumbLink asChild><Link to="/k/flash-card">Quản lý Flashcard</Link></BreadcrumbLink></BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem><BreadcrumbPage>Tạo Flashcard</BreadcrumbPage></BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>
        )}
      />

      <div className="@container">
        <div className="grid items-start gap-5 @3xl:grid-cols-[minmax(0,1.3fr)_minmax(320px,1fr)]">
          <section className={`${panelClass} overflow-hidden`}>
            <SourceTabs tabs={tabs} active={tab} onChange={setChosen} disabled={submitting || doc.startedHere} />
            <div role="tabpanel" id={`flashcard-panel-${tab}`} aria-labelledby={`flashcard-tab-${tab}`} className="p-4 md:p-5">
              {tab === "document" && (
                <DocumentSourcePanel
                  fileName={docName || undefined}
                  fileSize={gen.file?.size ?? gen.fileInfo?.size}
                  generating={gen.isGenerating}
                  resultCount={resultCount}
                  canCancel={doc.hasJob}
                  checking={doc.checking}
                  saving={submitting}
                  onPick={doc.pickFile}
                  onRemove={doc.removeFile}
                  onCancel={doc.cancel}
                />
              )}
              {tab === "quiz" && (
                <QuizSourcePanel
                  sets={quizSets.sets}
                  loading={quizSets.loading || (!quizSets.loaded && !quizSets.failed)}
                  error={quizSets.error}
                  onRetry={quizSets.retry}
                  selectedId={quizSetId}
                  onSelect={setQuizSetId}
                  disabled={submitting}
                  cards={{ loading: quizCards.loading, error: quizCards.error, ready: quizCards.cards.length, skipped: quizCards.skipped, total: quizCards.total, retry: quizCards.retry }}
                />
              )}
              {tab === "manual" && <ManualSourcePanel description={description} onDescriptionChange={setDescription} tags={tags} onTagsChange={setTags} disabled={submitting} />}
            </div>
          </section>

          <SettingsPanel
            title={title}
            titleError={titleError}
            onTitleChange={setTitleOverride}
            isPublic={isPublic}
            onPublicChange={setIsPublic}
            ai={tab === "document" ? { count: gen.cardCount, onCountChange: gen.setCardCount, narrow: gen.isNarrow, onNarrowChange: gen.setIsNarrow, keyword: gen.keyword, onKeywordChange: gen.setKeyword, locked: resultCount > 0 } : undefined}
            note={tab !== "document" ? undefined : doc.blocked ? BLOCKED_NOTE : resultCount > 0 ? "Số thẻ và từ khóa đã dùng khi AI tạo; chọn lại file nếu muốn tạo lại." : undefined}
            disabled={busy}
            busy={busy}
            actionLabel={actionLabel}
            actionDisabled={actionDisabled}
            onSubmit={() => void handleSubmit()}
          />
        </div>
      </div>

      <TipsBanner text="Bạn có thể tạo flashcard từ tài liệu PDF, hoặc dùng bộ quiz đã tạo để chuyển thành flashcard nhanh chóng." />
    </div>
  );
}
