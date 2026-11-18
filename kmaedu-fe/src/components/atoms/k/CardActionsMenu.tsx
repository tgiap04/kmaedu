import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/antd/dropdown-menu";
import { Button } from "@/components/antd/button";
import { DotsThreeCircleVerticalIcon, EyeIcon, PencilSimpleLineIcon, PushPinIcon, TrashIcon } from "@phosphor-icons/react";

interface CardActionsMenuProps {
  isPinned?: boolean;
  onView?: () => void;
  onEdit?: () => void;
  onPin?: () => void;
  onDelete?: () => void;
  viewLabel?: string;
  className?: string;
}

export function CardActionsMenu({
  isPinned = false,
  onView,
  onEdit,
  onPin,
  onDelete,
  viewLabel = "Xem chi tiết",
  className,
}: CardActionsMenuProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={className || "h-8 w-8 hover:bg-primary/10"}
        >
          <DotsThreeCircleVerticalIcon className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {onView && (
          <DropdownMenuItem onClick={onView}>
            <EyeIcon className="mr-2 h-4 w-4" />
            {viewLabel}
          </DropdownMenuItem>
        )}
        {onEdit && (
          <DropdownMenuItem onClick={onEdit}>
            <PencilSimpleLineIcon className="mr-2 h-4 w-4" />
            Chỉnh sửa
          </DropdownMenuItem>
        )}
        {onPin && (
          <DropdownMenuItem onClick={onPin}>
            <PushPinIcon className="mr-2 h-4 w-4" />
            {isPinned ? "Bỏ ghim" : "Ghim"}
          </DropdownMenuItem>
        )}
        {onDelete && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={onDelete}
            >
              <TrashIcon className="mr-2 h-4 w-4" />
              Xóa
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
