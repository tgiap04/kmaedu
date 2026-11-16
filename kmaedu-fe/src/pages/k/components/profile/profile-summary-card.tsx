import { CalendarDays, CheckCircle2, Mail } from "lucide-react";
import type { UserProfile } from "@/apis/profileApi";

/** Left column of /k/profile: who the user is and how complete the profile is. */
export function ProfileSummaryCard({ profile }: { profile: UserProfile }) {
  const initials = (profile.name || profile.username || "U").slice(0, 2).toUpperCase();
  const joinDate = profile.createdAt
    ? new Date(profile.createdAt).toLocaleDateString("vi-VN", { day: "numeric", month: "long", year: "numeric" })
    : null;
  // 1/3 for each filled/verified attribute
  const completeness = Math.round(([profile.name, profile.bio, profile.isVerified].filter(Boolean).length / 3) * 100);

  return (
    <div className="overflow-hidden rounded-[20px] border border-hairline bg-canvas shadow-[0_4px_20px_rgba(15,23,42,0.04)]">
      <div className="h-24 w-full bg-gradient-to-br from-[#fde4e2] via-[#fff6f5] to-[#fef3f2]" />
      <div className="relative px-5 pb-5">
        <div className="absolute -top-10 left-5 grid size-20 place-items-center rounded-full border-4 border-canvas bg-brand-soft shadow-md">
          <span className="select-none text-xl font-bold uppercase text-brand">{initials}</span>
        </div>

        <div className="space-y-4 pt-12">
          <div className="space-y-2">
            <h2 className="break-words text-xl font-bold leading-tight text-ink">{profile.name || profile.username}</h2>
            <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
              <span>@{profile.username}</span>
              <span className="select-none">·</span>
              {profile.isVerified ? (
                <span className="inline-flex items-center gap-1 rounded-full border border-success/20 bg-success/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-success">
                  <CheckCircle2 className="h-3 w-3" />
                  Đã xác minh
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full border border-warning/20 bg-warning/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-warning">
                  Chưa xác minh
                </span>
              )}
            </div>
          </div>

          {profile.bio && (
            <p className="border-l-2 border-brand-border pl-3 text-sm italic leading-relaxed text-body">&quot;{profile.bio}&quot;</p>
          )}

          <div className="space-y-2 rounded-xl border border-hairline bg-surface-soft p-4">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-body">Độ hoàn thiện hồ sơ</span>
              <span className="font-bold text-brand">{completeness}%</span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-canvas">
              <div className="h-full rounded-full bg-brand transition-all duration-500 ease-out" style={{ width: `${completeness}%` }} />
            </div>
            <p className="text-xs text-muted-foreground">
              {completeness === 100 ? "Hồ sơ của bạn đã hoàn thành đầy đủ!" : "Viết giới thiệu & xác thực email để đạt 100%."}
            </p>
          </div>

          <div className="space-y-3 border-t border-hairline-soft pt-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-2.5">
              <Mail className="h-4 w-4 shrink-0" />
              <span className="truncate">{profile.email}</span>
            </div>
            {joinDate && (
              <div className="flex items-center gap-2.5">
                <CalendarDays className="h-4 w-4 shrink-0" />
                <span>Tham gia ngày {joinDate}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
