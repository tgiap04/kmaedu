import { ChartBarIcon, CopyIcon, StopCircleIcon } from "@phosphor-icons/react";
import { toast } from "@/components/antd/toast";
import { cn } from "@/lib/utils";
import { sessionLink } from "./room-sessions-tab";

const btn =
  "inline-flex h-11 items-center gap-2 rounded-lg border px-4 text-sm font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 disabled:pointer-events-none disabled:opacity-50 [&>svg]:size-[18px]";

interface Props {
  /** The session whose link "Sao chép link" copies: the running one, else the next; null without either. */
  linkSessionId: string | null;
  canEnd: boolean;
  onShowResults: () => void;
  onEnd: () => void;
}

export function RoomDetailActions({ linkSessionId, canEnd, onShowResults, onEnd }: Props) {
  const copy = async () => {
    if (!linkSessionId) return;
    try {
      await navigator.clipboard.writeText(sessionLink(linkSessionId));
      toast.success("Đã sao chép link phiên thi");
    } catch {
      toast.error("Không sao chép được link");
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={copy}
        disabled={!linkSessionId}
        title={linkSessionId ? undefined : "Phòng chưa có phiên đang diễn ra hoặc sắp diễn ra"}
        className={cn(btn, "border-hairline bg-canvas text-ink hover:bg-surface-soft")}
      >
        <CopyIcon aria-hidden />
        Sao chép link
      </button>
      <button type="button" onClick={onShowResults} className={cn(btn, "border-hairline bg-canvas text-ink hover:bg-surface-soft")}>
        <ChartBarIcon aria-hidden />
        Xem kết quả
      </button>
      {canEnd && (
        <button type="button" onClick={onEnd} className={cn(btn, "border-brand/50 bg-brand-soft/60 text-brand hover:bg-brand-soft")}>
          <StopCircleIcon aria-hidden />
          Kết thúc phòng
        </button>
      )}
    </>
  );
}
