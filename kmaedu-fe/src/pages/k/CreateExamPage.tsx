import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowCircleLeftIcon, ArrowCircleRightIcon, CheckCircleIcon, ExamIcon, CircleNotchIcon, ArrowCounterClockwiseIcon } from "@phosphor-icons/react";
import { validateExamDraft } from "@/lib/manage-exam/create-exam-draft";
import { groupForExam } from "@/lib/manage-exam/exam-chapters";
import { cn } from "@/lib/utils";
import { createCardClass } from "./components/create-exam/create-exam-ui";
import { ExamCustomizeCard } from "./components/create-exam/exam-customize-card";
import { ExamHeroIllustration } from "./components/create-exam/exam-hero-illustration";
import { ExamStructureCard } from "./components/create-exam/exam-structure-card";
import { FileChapterBar } from "./components/create-exam/file-chapter-bar";
import { PdfQuizFilePicker } from "./components/create-exam/pdf-quiz-file-picker";
import { SourceQuestionList } from "./components/create-exam/source-question-list";
import { useCreateExamSubmit } from "./components/create-exam/use-create-exam-submit";
import { useExamChapters } from "./components/create-exam/use-exam-chapters";
import { useFileQuizzes, usePdfQuizFiles } from "./components/create-exam/use-pdf-quiz-sources";

export default function CreateExamPage() {
  const files = usePdfQuizFiles();
  const [fileId, setFileId] = useState<string | null>(null);
  const openFile = files.files.find((f) => f.id === fileId) ?? null;
  const source = useFileQuizzes(openFile);

  const book = useExamChapters();
  const { picked, chapters, ensureFile } = book;
  const [title, setTitle] = useState("");
  const [shuffle, setShuffle] = useState(false);
  const [showErrors, setShowErrors] = useState(false);
  const { submit, submitting } = useCreateExamSubmit();

  // Open the newest file once the list arrives.
  useEffect(() => {
    if (!fileId && files.files[0]) setFileId(files.files[0].id);
  }, [files.files, fileId]);

  // The open file needs at least one chapter to tick into (again after "Đặt lại").
  useEffect(() => {
    if (openFile) ensureFile(openFile.id, openFile.filename);
  }, [openFile, chapters, ensureFile]);

  const pickedByFile = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of picked.values()) counts.set(p.fileId, (counts.get(p.fileId) ?? 0) + 1);
    return counts;
  }, [picked]);
  const chapterCount = useMemo(() => groupForExam([...picked.values()], chapters).length, [picked, chapters]);
  const fileChapters = openFile ? chapters.filter((c) => c.fileId === openFile.id) : [];
  const activeChapter = openFile ? book.activeOf(openFile.id) : null;
  const filenameOf = (id: string) => files.files.find((f) => f.id === id)?.filename ?? [...picked.values()].find((p) => p.fileId === id)?.source ?? "";
  const errors = validateExamDraft({ title, description: "" });

  const reset = () => {
    book.reset();
    setTitle("");
    setShuffle(false);
    setShowErrors(false);
  };

  const handleSubmit = () => {
    setShowErrors(true);
    if (errors.title) {
      document.getElementById("exam-title")?.focus();
      return;
    }
    const list = [...picked.values()];
    const sources = [...new Set(list.map((p) => p.source))];
    void submit(title, `Gồm ${list.length} câu từ: ${sources.join(", ")}`.slice(0, 1000), groupForExam(list, chapters, shuffle ? Math.random : undefined));
  };

  return (
    <div className="flex min-w-0 flex-col gap-5 pt-2 pb-6">
      <div className="flex items-center justify-between gap-6">
        <div className="min-w-0">
          <Link to="/k/manage-exam" className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-hairline bg-canvas px-4 text-[14px] font-medium text-body transition-colors hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40">
            <ArrowCircleLeftIcon className="size-4" aria-hidden />
            Quay lại
          </Link>
          <div className="mt-5 flex items-center gap-5">
            <span className="grid size-20 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-[#fde4e2] to-[#fef3f2] shadow-[0_8px_20px_rgba(238,47,43,0.12)]">
              <span className="grid size-11 place-items-center rounded-lg bg-brand text-white"><ExamIcon className="size-6" aria-hidden /></span>
            </span>
            <div className="min-w-0">
              <h1 className="text-3xl font-bold tracking-tight text-ink lg:text-[34px]">Tạo đề thi</h1>
              <p className="mt-2 text-base text-body">Chọn câu hỏi từ Quiz AI đã tạo cho các file PDF của bạn</p>
            </div>
          </div>
        </div>
        <ExamHeroIllustration picked={picked.size} />
      </div>

      <PdfQuizFilePicker
        files={files.files}
        loading={files.loading}
        failed={files.failed}
        hasMore={files.hasMore}
        onLoadMore={files.loadMore}
        onRetry={files.retry}
        selectedId={fileId}
        onSelect={setFileId}
        pickedByFile={pickedByFile}
      />

      {openFile && (
        <SourceQuestionList
          filename={openFile.filename}
          questions={source.questions}
          loading={source.loading}
          failed={source.failed}
          onRetry={source.retry}
          chapterOf={(id) => picked.get(id)?.chapterId}
          onPick={(questions, on) => book.pick(openFile.id, questions, on)}
          chapters={fileChapters}
          onMove={(id, chapterId) => book.move([id], chapterId)}
          chapterBar={(
            <FileChapterBar
              chapters={fileChapters}
              activeId={activeChapter?.id ?? null}
              countOf={(id) => [...picked.values()].filter((p) => p.chapterId === id).length}
              onSelect={(id) => book.select(openFile.id, id)}
              onAdd={() => book.add(openFile.id)}
              onRename={book.rename}
              onRecolor={book.recolor}
              onRemove={book.remove}
            />
          )}
        />
      )}

      <ExamStructureCard
        chapters={chapters}
        picked={picked}
        filenameOf={filenameOf}
        onOpen={(id, chapterId) => {
          setFileId(id);
          book.select(id, chapterId);
        }}
      />

      <ExamCustomizeCard
        title={title}
        titleError={showErrors ? errors.title : undefined}
        onTitleChange={setTitle}
        shuffle={shuffle}
        onShuffleChange={setShuffle}
      />

      <div className={cn(createCardClass, "flex flex-wrap items-center justify-between gap-3 p-3 md:px-4")}>
        <button
          type="button"
          onClick={reset}
          disabled={submitting}
          className="inline-flex h-12 items-center gap-2 rounded-lg border border-hairline bg-canvas px-6 text-[15px] font-semibold text-ink transition-colors hover:bg-surface-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 disabled:opacity-50"
        >
          <ArrowCounterClockwiseIcon className="size-[18px]" aria-hidden />
          Đặt lại
        </button>
        <div className="flex flex-wrap items-center gap-4">
          <span className="text-[14px] text-body">
            Đã chọn <b className="text-ink">{picked.size}</b> câu từ {pickedByFile.size} file
            {chapterCount > 0 && <> • {chapterCount} chương</>}
          </span>
          <button
            type="button"
            onClick={handleSubmit}
            disabled={submitting || picked.size === 0}
            className="inline-flex h-12 items-center gap-2.5 rounded-lg bg-brand px-7 text-[15px] font-semibold text-white shadow-[0_8px_20px_rgba(238,47,43,0.25)] transition-colors hover:bg-brand-strong focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 focus-visible:ring-offset-2 disabled:opacity-60"
          >
            {submitting ? <CircleNotchIcon className="size-5 animate-spin" aria-hidden /> : <CheckCircleIcon className="size-5" aria-hidden />}
            Tạo đề thi
            <ArrowCircleRightIcon className="size-5" aria-hidden />
          </button>
        </div>
      </div>
    </div>
  );
}
