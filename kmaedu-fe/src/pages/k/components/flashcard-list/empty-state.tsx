import { CardsIcon, PlusIcon } from "@phosphor-icons/react";
import { Button } from "@/components/antd/button";
import { DecorativeIcons } from "@/components/icons/icon-defaults";

/** Nothing matched the search / filter, or the account has no sets yet. */
export function FlashcardEmptyState({ filtered, onCreate }: { filtered: boolean; onCreate: () => void }) {
  return (
    <div className="flex min-h-[200px] flex-col items-center justify-center gap-2 px-6 py-8 text-center">
      <span className="grid size-12 place-items-center rounded-lg bg-brand-soft text-brand [&_svg]:size-6">
        <DecorativeIcons>
          <CardsIcon />
        </DecorativeIcons>
      </span>
      <p className="text-sm font-medium text-ink">{filtered ? "Không có bộ thẻ nào khớp" : "Bạn chưa có bộ thẻ nào"}</p>
      <p className="text-sm text-muted-foreground">{filtered ? "Thử đổi từ khóa hoặc bộ lọc." : "Tạo bộ flashcard đầu tiên để bắt đầu học."}</p>
      {!filtered && (
        <Button variant="solid" className="mt-2" onClick={onCreate}>
          <PlusIcon weight="bold" aria-hidden />
          Tạo Flashcard
        </Button>
      )}
    </div>
  );
}
