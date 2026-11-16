"use client";

import { useState, useCallback, useEffect } from "react";
import { ProfileForm } from "@/components/molecules/profile/ProfileForm";
import { ChangePasswordSection } from "@/components/molecules/profile/ChangePasswordSection";
import { DeviceList } from "@/components/molecules/profile/DeviceList";
import {
  User,
  Shield,
  Monitor,
  Loader2,
  CheckCircle2,
  CalendarDays,
  Mail,
} from "lucide-react";
import {
  getProfileApi,
  updateProfileApi,
  type UserProfile,
} from "@/apis/profileApi";
import { useToast } from "@/components/antd/toast";
import { useAuthStore } from "@/stores/useAuthStore";
import { cn } from "@/lib/utils";

export default function ProfilePage() {
  const { getUser } = useAuthStore();
  const { toast } = useToast();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<"profile" | "security" | "devices">("profile");

  // Fetch profile on mount
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const data = await getProfileApi();
        setProfile(data);
      } catch (error) {
        console.error("Không thể tải hồ sơ:", error);
        toast.error("Không thể tải hồ sơ.");
      } finally {
        setIsLoading(false);
      }
    };
    fetchProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refreshUserData = useCallback(async () => {
    try {
      const data = await getProfileApi();
      setProfile(data);
      await getUser();
    } catch (error) {
      console.error("Không thể làm mới dữ liệu người dùng:", error);
    }
  }, [getUser]);

  const handleProfileUpdate = useCallback(async (data: Parameters<typeof updateProfileApi>[0]) => {
    try {
      setIsSubmitting(true);
      await updateProfileApi(data);
      await refreshUserData();
      toast.success("Cập nhật hồ sơ thành công!");
    } catch (error) {
      console.error("Không thể cập nhật hồ sơ:", error);
      toast.error("Không thể cập nhật hồ sơ. Vui lòng thử lại.");
    } finally {
      setIsSubmitting(false);
    }
  }, [refreshUserData, toast]);

  if (isLoading || !profile) {
    return (
      <div className="flex min-h-[400px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-coral" />
      </div>
    );
  }

  const initials = (profile.name || profile.username || "U").slice(0, 2).toUpperCase();

  const joinDate = profile.createdAt
    ? new Date(profile.createdAt).toLocaleDateString("vi-VN", {
      day: "numeric",
      month: "long",
      year: "numeric",
    })
    : null;

  // Compute profile completeness score (1/3 for each filled/verified attribute)
  const getCompleteness = () => {
    const done = [profile.name, profile.bio, profile.isVerified].filter(Boolean).length;
    return Math.round((done / 3) * 100);
  };
  const completeness = getCompleteness();

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="pb-2">
        <h1
          className="font-display text-3xl sm:text-4xl font-medium tracking-tight text-ink"
          style={{ fontFamily: "var(--font-display)", letterSpacing: "-0.02em" }}
        >
          Hồ sơ cá nhân
        </h1>
        <p className="mt-1 text-sm text-muted-text">Quản lý thông tin tài khoản, bảo mật và thiết bị đã đăng nhập của bạn.</p>
      </div>

      <div className="grid grid-cols-12 gap-6 lg:gap-8 items-start">
        {/* Left Sticky Summary Card */}
        <div className="col-span-12 lg:col-span-4 lg:sticky lg:top-24">
          <div className="rounded-xl border border-hairline bg-surface-card overflow-hidden shadow-sm transition-all duration-300 hover:shadow-md">
            {/* Header gradient */}
            <div className="h-32 w-full bg-gradient-to-br from-coral/20 via-canvas to-accent-teal/20" />

            {/* Avatar & Info Content */}
            <div className="px-6 pb-6 relative">
              {/* Floating Avatar Container */}
              <div className="absolute -top-12 left-6">
                <div className="rounded-full border-4 border-surface-card shadow-md overflow-hidden h-20 w-20 sm:h-24 sm:w-24 bg-surface-soft flex items-center justify-center">
                  <span className="text-xl font-semibold text-coral sm:text-2xl uppercase select-none font-display">
                    {initials}
                  </span>
                </div>
              </div>

              {/* Profile details */}
              <div className="pt-12 sm:pt-16 space-y-4">
                <div className="space-y-2">
                  <h2 className="font-display text-2xl font-medium text-ink tracking-tight leading-none">
                    {profile.name || profile.username}
                  </h2>
                  <div className="flex flex-wrap items-center gap-2 text-sm text-muted-text">
                    <span>@{profile.username}</span>
                    <span className="text-muted-soft select-none">·</span>
                    {profile.isVerified ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-success/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-success border border-success/20">
                        <CheckCircle2 className="h-3 w-3" />
                        Đã xác minh
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-warning/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-warning border border-warning/20">
                        Chưa xác minh
                      </span>
                    )}
                  </div>
                </div>

                {/* Bio text block */}
                {profile.bio && (
                  <p className="text-sm text-body leading-relaxed border-l-2 border-coral/40 pl-3 italic text-muted-text">
                    "{profile.bio}"
                  </p>
                )}

                {/* Profile Completeness Tracker */}
                <div className="space-y-2 rounded-xl bg-canvas/70 p-4 border border-hairline">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-muted-text">Độ hoàn thiện hồ sơ</span>
                    <span className="font-bold text-coral">{completeness}%</span>
                  </div>
                  <div className="h-2 w-full bg-surface-soft rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-coral to-accent-amber rounded-full transition-all duration-500 ease-out"
                      style={{ width: `${completeness}%` }}
                    />
                  </div>
                  <p className="text-xxs text-muted-soft">
                    {completeness === 100
                      ? "Hồ sơ của bạn đã hoàn thành đầy đủ! 🎉"
                      : "Viết giới thiệu & xác thực email để đạt 100%."}
                  </p>
                </div>

                {/* Email and Join Date Footer details */}
                <div className="space-y-3 pt-4 border-t border-hairline/60 text-xs text-muted-text">
                  <div className="flex items-center gap-2.5">
                    <Mail className="h-4 w-4 text-muted-soft shrink-0" />
                    <span className="truncate">{profile.email}</span>
                  </div>
                  {joinDate && (
                    <div className="flex items-center gap-2.5">
                      <CalendarDays className="h-4 w-4 text-muted-soft shrink-0" />
                      <span>Tham gia ngày {joinDate}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Settings Columns */}
        <div className="col-span-12 lg:col-span-8 space-y-6">
          {/* Custom Pure Tailwind Tabs list */}
          <div className="inline-flex gap-1 rounded-xl border border-hairline bg-surface-soft p-1 w-full sm:w-auto overflow-x-auto">
            <button
              onClick={() => setActiveTab("profile")}
              className={cn(
                "inline-flex items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium transition-all duration-200 cursor-pointer whitespace-nowrap flex-1 sm:flex-initial",
                activeTab === "profile"
                  ? "bg-brand-soft text-brand-strong shadow-sm font-semibold animate-none"
                  : "text-muted-text hover:bg-surface-card hover:text-ink"
              )}
            >
              <User className="h-4 w-4" />
              Hồ sơ
            </button>
            <button
              onClick={() => setActiveTab("security")}
              className={cn(
                "inline-flex items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium transition-all duration-200 cursor-pointer whitespace-nowrap flex-1 sm:flex-initial",
                activeTab === "security"
                  ? "bg-brand-soft text-brand-strong shadow-sm font-semibold animate-none"
                  : "text-muted-text hover:bg-surface-card hover:text-ink"
              )}
            >
              <Shield className="h-4 w-4" />
              Bảo mật
            </button>
            <button
              onClick={() => setActiveTab("devices")}
              className={cn(
                "inline-flex items-center justify-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium transition-all duration-200 cursor-pointer whitespace-nowrap flex-1 sm:flex-initial",
                activeTab === "devices"
                  ? "bg-brand-soft text-brand-strong shadow-sm font-semibold animate-none"
                  : "text-muted-text hover:bg-surface-card hover:text-ink"
              )}
            >
              <Monitor className="h-4 w-4" />
              Thiết bị
            </button>
          </div>

          {/* Render Active Tab Content */}
          <div className="transition-all duration-300">
            {activeTab === "profile" && (
              <ProfileForm
                profile={profile}
                onSubmit={handleProfileUpdate}
                isSubmitting={isSubmitting}
              />
            )}
            {activeTab === "security" && <ChangePasswordSection />}
            {activeTab === "devices" && <DeviceList />}
          </div>
        </div>
      </div>
    </div>
  );
}
