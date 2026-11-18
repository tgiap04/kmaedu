import { WarningCircleIcon, CheckCircleIcon, CloudArrowDownIcon, FileTextIcon, CircleNotchIcon, DotsThreeCircleVerticalIcon, TrashIcon } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/antd/dropdown-menu";

export interface PDFHistoryListItemData {
  id: string;
  fileName: string;
  description: string;
  status: "completed" | "processing" | "failed";
  createdAt: string;
}

interface PDFHistoryListItemProps {
  item: PDFHistoryListItemData;
  onDownload?: (id: string) => void;
  /** The "Xóa" menu entry only shows when a handler is given. */
  onDelete?: (id: string) => void;
}

const statusConfig = {
  completed: {
    label: "Hoàn thành",
    icon: CheckCircleIcon,
    className: "bg-brand-soft text-coral",
  },
  processing: {
    label: "Đang xử lý",
    icon: CircleNotchIcon,
    className: "bg-amber-50 text-amber-700",
  },
  failed: {
    label: "Thất bại",
    icon: WarningCircleIcon,
    className: "bg-surface-card text-body",
  },
};

export function PDFHistoryListItem({ item, onDownload, onDelete }: PDFHistoryListItemProps) {
  const config = statusConfig[item.status];
  const StatusIcon = config.icon;
  const meta = [item.description, item.createdAt].filter(Boolean);

  return (
    <div className="flex items-center gap-3 py-3.5">
      <span className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-brand-soft">
        <span className="flex size-7 items-center justify-center rounded-lg bg-brand text-white shadow-soft">
          <FileTextIcon className="size-4" aria-hidden />
        </span>
      </span>

      <div className="min-w-0 flex-1">
        <p className="truncate text-[15px] font-semibold text-ink" title={item.fileName}>
          {item.fileName}
        </p>
        <p className="mt-0.5 truncate text-xs text-muted-foreground">{meta.join("  ·  ")}</p>
      </div>

      <span
        className={cn(
          "inline-flex shrink-0 items-center gap-1 rounded-lg px-2.5 py-1 text-xs font-medium",
          config.className,
        )}
      >
        <StatusIcon className={cn("size-3", item.status === "processing" && "animate-spin")} aria-hidden />
        {config.label}
      </span>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button
            type="button"
            aria-label={`Tùy chọn cho ${item.fileName}`}
            className="flex size-8 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-surface-card hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
          >
            <DotsThreeCircleVerticalIcon className="size-4" aria-hidden />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem onClick={() => onDownload?.(item.id)} className="cursor-pointer">
            <CloudArrowDownIcon className="mr-2 size-4" />
            Tải xuống
          </DropdownMenuItem>
          {onDelete && (
            <DropdownMenuItem onClick={() => onDelete(item.id)} className="cursor-pointer text-red-600">
              <TrashIcon className="mr-2 size-4" />
              Xóa
            </DropdownMenuItem>
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
