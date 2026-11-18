import { CalendarDotsIcon, ClockCounterClockwiseIcon, ListNumbersIcon, StackIcon } from "@phosphor-icons/react";
import { ExamOverviewStatCard } from "@/components/organisms/k/exam-overview-stat-card";

const day = (iso: string) => new Date(iso).toLocaleDateString("vi-VN");
const time = (iso: string) => new Date(iso).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });

interface Props {
  questionCount: number;
  chapterCount: number;
  createdAt: string;
  updatedAt: string;
}

/** The four overview tiles of a quiz set: questions, chapters, last update and creation date. */
export function QuizSetStats({ questionCount, chapterCount, createdAt, updatedAt }: Props) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <ExamOverviewStatCard icon={ListNumbersIcon} tone="red" title="Tổng số câu hỏi" value={questionCount} />
      <ExamOverviewStatCard icon={StackIcon} tone="green" title="Số chương" value={chapterCount} />
      <ExamOverviewStatCard icon={ClockCounterClockwiseIcon} tone="violet" title="Cập nhật lần cuối" value={day(updatedAt)} hint={time(updatedAt)} />
      <ExamOverviewStatCard icon={CalendarDotsIcon} tone="amber" title="Ngày tạo" value={day(createdAt)} hint={time(createdAt)} />
    </div>
  );
}
