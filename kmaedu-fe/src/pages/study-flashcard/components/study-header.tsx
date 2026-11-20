import { EyeIcon, HouseIcon, ShuffleIcon, SpeakerHighIcon, SpeakerSlashIcon } from "@phosphor-icons/react";
import ProfileDropdown from "@/components/atoms/ProfileDropdown";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/useAuthStore";

interface Props {
  title: string;
  cardCount: number;
  creatorName: string | null;
  viewCount: number;
  soundOn: boolean;
  onHome: () => void;
  onShuffle: () => void;
  onToggleSound: () => void;
}

const pill = "flex h-11 items-center gap-2 rounded-full border border-hairline bg-canvas px-4 text-sm font-semibold text-ink shadow-soft";

/** Top bar: home, the set's name and size, who made it, views, shuffle, sound and the account menu. */
export function StudyHeader({ title, cardCount, creatorName, viewCount, soundOn, onHome, onShuffle, onToggleSound }: Props) {
  const user = useAuthStore((s) => s.user);
  const profile = { name: user?.name || user?.username || "Người dùng", email: user?.email || "" };
  return (
    <header className="sticky top-0 z-20 border-b border-hairline bg-canvas/90 backdrop-blur">
      <div className="mx-auto flex h-[78px] w-full max-w-[1440px] items-center gap-3 px-4 sm:gap-4 xl:px-6">
        <button
          type="button"
          onClick={onHome}
          aria-label="Về trang chủ"
          className="grid size-11 shrink-0 place-items-center rounded-xl border border-brand-border/70 bg-brand-soft/60 text-brand transition-colors hover:bg-brand-soft"
        >
          <HouseIcon weight="bold" className="size-5" />
        </button>
        <h1 className="min-w-0 truncate text-xl font-extrabold tracking-tight text-ink sm:text-2xl">{title}</h1>
        <span className="hidden shrink-0 rounded-full bg-hairline-soft px-3 py-1 text-sm font-semibold tabular-nums text-body sm:inline">{cardCount} thẻ</span>

        <div className="ml-auto flex shrink-0 items-center gap-2 sm:gap-3">
          {creatorName && (
            <span className={cn(pill, "hidden pl-1.5 lg:flex")}>
              <span className="grid size-8 place-items-center rounded-full bg-brand-soft text-sm font-bold text-brand" aria-hidden>
                {creatorName.charAt(0).toUpperCase()}
              </span>
              <span className="max-w-40 truncate">{creatorName}</span>
            </span>
          )}
          <span className={cn(pill, "hidden md:flex")}>
            <EyeIcon weight="bold" className="size-[18px] text-body" aria-hidden />
            <span className="tabular-nums">{viewCount.toLocaleString("vi-VN")} lượt xem</span>
          </span>
          <span aria-hidden className="hidden h-8 w-px bg-hairline md:block" />
          <button
            type="button"
            onClick={onShuffle}
            className="flex h-11 items-center gap-2 rounded-full border border-brand-border bg-brand-soft/60 px-3 text-sm font-semibold text-brand transition-colors hover:bg-brand-soft sm:px-4"
          >
            <ShuffleIcon weight="bold" className="size-[18px]" aria-hidden />
            <span className="hidden sm:inline">Xáo trộn</span>
          </button>
          <button
            type="button"
            onClick={onToggleSound}
            aria-pressed={soundOn}
            aria-label={soundOn ? "Tắt âm thanh" : "Bật âm thanh"}
            className={cn(
              "grid size-11 place-items-center rounded-full border transition-colors",
              soundOn ? "border-brand-border bg-brand-soft/60 text-brand" : "border-hairline bg-canvas text-body hover:text-ink",
            )}
          >
            {soundOn ? <SpeakerHighIcon weight="bold" className="size-[18px]" /> : <SpeakerSlashIcon weight="bold" className="size-[18px]" />}
          </button>
          <span aria-hidden className="hidden h-8 w-px bg-hairline sm:block" />
          <ProfileDropdown data={profile} variant="header" />
        </div>
      </div>
    </header>
  );
}
