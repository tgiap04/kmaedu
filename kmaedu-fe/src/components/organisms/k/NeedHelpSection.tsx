import { Card } from "@/components/antd/card";
import { Button } from "@/components/antd/button";
import { QuestionIcon, BookOpenIcon, WrenchIcon } from "@phosphor-icons/react";

interface NeedHelpSectionProps {
  onContactProctor?: () => void;
  onViewGuidelines?: () => void;
  onTechnicalSupport?: () => void;
}

export function NeedHelpSection({
  onContactProctor,
  onViewGuidelines,
  onTechnicalSupport,
}: NeedHelpSectionProps) {
  return (
    <Card className="p-4">
      <div className="mb-3 flex items-center gap-2">
        <QuestionIcon className="h-5 w-5 text-primary" />
        <h3 className="font-semibold text-foreground">Cần hỗ trợ?</h3>
      </div>
      <div className="space-y-2">
        <Button
          variant="ghost"
          className="w-full justify-start gap-2 text-sm"
          onClick={onContactProctor}>
          <QuestionIcon className="h-4 w-4" />
          Liên hệ giám thị
        </Button>
        <Button
          variant="ghost"
          className="w-full justify-start gap-2 text-sm"
          onClick={onViewGuidelines}>
          <BookOpenIcon className="h-4 w-4" />
          Hướng dẫn thi
        </Button>
        <Button
          variant="ghost"
          className="w-full justify-start gap-2 text-sm"
          onClick={onTechnicalSupport}>
          <WrenchIcon className="h-4 w-4" />
          Hỗ trợ kỹ thuật
        </Button>
      </div>
    </Card>
  );
}
