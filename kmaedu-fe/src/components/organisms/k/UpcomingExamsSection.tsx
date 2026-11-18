import { Card } from "@/components/antd/card";
import { UpcomingExamItem } from "@/components/atoms/k/UpcomingExamItem";

export interface UpcomingExam {
  id: string;
  subject: string;
  date: string;
  daysLeft: number;
  color: "red" | "orange" | "blue";
}

interface UpcomingExamsSectionProps {
  exams: UpcomingExam[];
}

export function UpcomingExamsSection({ exams }: UpcomingExamsSectionProps) {
  return (
    <Card className="p-4">
      <h2 className="mb-3 text-lg font-semibold text-foreground">
        Kỳ thi sắp tới
      </h2>

      <div className="space-y-2">
        {exams.map((exam) => (
          <UpcomingExamItem
            key={exam.id}
            subject={exam.subject}
            date={exam.date}
            daysLeft={exam.daysLeft}
            color={exam.color}
          />
        ))}
      </div>

      {exams.length === 0 && (
        <div className="py-8 text-center">
          <p className="text-muted-foreground">Không có kỳ thi sắp tới</p>
        </div>
      )}
    </Card>
  );
}
