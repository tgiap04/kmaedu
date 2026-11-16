import { memo } from "react";
import { Button } from "@/components/antd/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface ExamTablePaginationProps {
  currentPage: number;
  totalPages: number;
  totalResults: number;
  onPageChange: (page: number) => void;
}

const ExamTablePaginationComponent = ({
  currentPage,
  totalPages,
  totalResults,
  onPageChange,
}: ExamTablePaginationProps) => {
  const startResult = (currentPage - 1) * 10 + 1;
  const endResult = Math.min(currentPage * 10, totalResults);

  const renderPageNumbers = () => {
    const pages = [];
    const maxVisible = 3;

    if (totalPages <= maxVisible + 2) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 2) {
        pages.push(1, 2, 3);
      } else if (currentPage >= totalPages - 1) {
        pages.push(totalPages - 2, totalPages - 1, totalPages);
      } else {
        pages.push(currentPage - 1, currentPage, currentPage + 1);
      }
    }

    return pages;
  };

  return (
    <div className="flex flex-col items-center justify-between gap-3 rounded-[20px] border border-hairline bg-canvas px-4 py-3 shadow-[0_4px_20px_rgba(15,23,42,0.04)] sm:flex-row md:px-5">
      <div className="text-sm text-muted-foreground">
        Hiển thị {startResult} - {endResult} trong tổng số {totalResults} kết quả
      </div>
      <div className="flex flex-wrap items-center justify-center gap-1">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className="h-8 rounded-full border-hairline focus-visible:ring-2 focus-visible:ring-brand/40">
          <ChevronLeft className="h-4 w-4 mr-1" />
          Trước
        </Button>
        {renderPageNumbers().map((page) => (
          <Button
            key={page}
            variant={currentPage === page ? "default" : "outline"}
            size="sm"
            onClick={() => onPageChange(page)}
            className={`h-8 w-8 rounded-full p-0 focus-visible:ring-2 focus-visible:ring-brand/40 ${
              currentPage === page
                ? ""
                : "border-hairline"
            }`}>
            {page}
          </Button>
        ))}
        <Button
          variant="outline"
          size="sm"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className="h-8 rounded-full border-hairline focus-visible:ring-2 focus-visible:ring-brand/40">
          Sau
          <ChevronRight className="h-4 w-4 ml-1" />
        </Button>
      </div>
    </div>
  );
};

ExamTablePaginationComponent.displayName = "ExamTablePagination";

export const ExamTablePagination = memo(ExamTablePaginationComponent);
