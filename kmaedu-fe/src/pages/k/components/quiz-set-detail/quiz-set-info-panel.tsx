import type { ReactNode } from "react";
import { GlobeIcon, LockSimpleIcon, PencilSimpleIcon, ShareNetworkIcon } from "@phosphor-icons/react";
import type { LabelFilter } from "@/lib/manage-exam/quiz-set-detail";
import type { QuizSet } from "@/types/quizset";
import { QuizSetChapterManager } from "./quiz-set-chapter-manager";

interface Props {
  quizSet: QuizSet;
  questionCount: number;
  onEditInfo: () => void;
  onShare: () => void;
  /** A chapter was created, renamed or removed. */
  onChaptersChange: () => Promise<void> | void;
  /** Open the question tab filtered to a chapter. */
  onOpenChapter: (filter: LabelFilter) => void;
}

const formatDateTime = (iso: string) => new Date(iso).toLocaleString("vi-VN", { dateStyle: "short", timeStyle: "short" });

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="grid gap-1 py-3 sm:grid-cols-[180px_minmax(0,1fr)] sm:gap-4">
      <dt className="text-[14px] text-body">{label}</dt>
      <dd className="min-w-0 text-[15px] text-ink">{children}</dd>
    </div>
  );
}

/** "Thông tin đề thi": the set's details and its chapters (labels). */
export function QuizSetInfoPanel({ quizSet, questionCount, onEditInfo, onShare, onChaptersChange, onOpenChapter }: Props) {
  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-hairline-soft p-4 md:p-5">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-[16px] font-bold text-ink">Thông tin chung</h3>
          <button type="button" onClick={onEditInfo} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-hairline px-4 text-[13px] font-medium text-ink hover:bg-surface-soft">
            <PencilSimpleIcon className="size-4" aria-hidden />
            Chỉnh sửa
          </button>
        </div>
        <dl className="mt-2 divide-y divide-hairline-soft">
          <Field label="Tên đề thi">{quizSet.title}</Field>
          <Field label="Mô tả">{quizSet.description?.trim() || <span className="text-muted-foreground">Chưa có mô tả</span>}</Field>
          <Field label="Thẻ">
            {quizSet.tags.length > 0 ? (
              <span className="flex flex-wrap gap-2">
                {quizSet.tags.map((t) => <span key={t} className="rounded-lg bg-surface-card px-2.5 py-0.5 text-[13px] text-body">{t}</span>)}
              </span>
            ) : (
              <span className="text-muted-foreground">Chưa có thẻ</span>
            )}
          </Field>
          <Field label="Chế độ">
            <span className="inline-flex flex-wrap items-center gap-3">
              <span className="inline-flex items-center gap-1.5">
                {quizSet.isPublic ? <GlobeIcon className="size-4" aria-hidden /> : <LockSimpleIcon className="size-4" aria-hidden />}
                {quizSet.isPublic ? "Công khai" : "Riêng tư"}
              </span>
              <button type="button" onClick={onShare} className="inline-flex items-center gap-1 text-[14px] font-medium text-brand hover:underline">
                <ShareNetworkIcon className="size-4" aria-hidden />
                Cài đặt chia sẻ
              </button>
            </span>
          </Field>
          <Field label="Số câu hỏi">{questionCount} câu</Field>
          <Field label="Ngày tạo">{formatDateTime(quizSet.createdAt)}</Field>
          <Field label="Cập nhật lần cuối">{formatDateTime(quizSet.updatedAt)}</Field>
        </dl>
      </div>

      <QuizSetChapterManager quizSetId={quizSet.id} labels={quizSet.labels ?? []} questions={quizSet.questions ?? []} onChanged={onChaptersChange} onOpenChapter={onOpenChapter} />
    </div>
  );
}
