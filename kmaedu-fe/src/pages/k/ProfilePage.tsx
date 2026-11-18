"use client";

import { useState, useCallback, useEffect } from "react";
import { ProfileForm } from "@/components/molecules/profile/ProfileForm";
import { ChangePasswordSection } from "@/components/molecules/profile/ChangePasswordSection";
import { DeviceList } from "@/components/molecules/profile/DeviceList";
import { CircleNotchIcon, UserCircleIcon } from "@phosphor-icons/react";
import {
  getProfileApi,
  updateProfileApi,
  type UserProfile,
} from "@/apis/profileApi";
import { useToast } from "@/components/antd/toast";
import { useAuthStore } from "@/stores/useAuthStore";
import { PageHeader } from "@/components/k-page/page-header";
import { ProfileSummaryCard } from "./components/profile/profile-summary-card";
import { ProfileTabs, type ProfileTab } from "./components/profile/profile-tabs";

export default function ProfilePage() {
  const { getUser } = useAuthStore();
  const { toast } = useToast();

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<ProfileTab>("profile");

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
        <CircleNotchIcon className="h-8 w-8 animate-spin text-brand" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        icon={<UserCircleIcon />}
        title="Hồ sơ cá nhân"
        subtitle="Quản lý thông tin tài khoản, bảo mật và thiết bị đã đăng nhập của bạn."
      />

      <div className="grid grid-cols-12 items-start gap-6 lg:gap-8">
        <div className="col-span-12 lg:sticky lg:top-24 lg:col-span-4">
          <ProfileSummaryCard profile={profile} />
        </div>

        <div className="col-span-12 flex min-w-0 flex-col gap-5 lg:col-span-8">
          <ProfileTabs active={activeTab} onChange={setActiveTab} />
          {activeTab === "profile" && (
            <ProfileForm profile={profile} onSubmit={handleProfileUpdate} isSubmitting={isSubmitting} />
          )}
          {activeTab === "security" && <ChangePasswordSection />}
          {activeTab === "devices" && <DeviceList />}
        </div>
      </div>
    </div>
  );
}
