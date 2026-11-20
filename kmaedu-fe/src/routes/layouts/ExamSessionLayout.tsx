import type { PropsWithChildren } from "react";
import { useEffect } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { ArrowLeftIcon } from "@phosphor-icons/react";
import Logo from "@/components/atoms/Logo";
import ProfileDropdown from "@/components/atoms/ProfileDropdown";
import { HeaderWaves, NotificationBell, dashboardHeaderClass } from "@/components/organisms/nav/header-parts";
import { HeaderSearch } from "@/components/organisms/nav/header-search";
import { cn } from "@/lib/utils";
import { useAuthStore } from "@/stores/useAuthStore";

/**
 * Layout for exam session pages: the /k dashboard header (logo, back, workspace search, notifications,
 * profile) without the sidebar, and the copyright footer.
 */
export function ExamSessionLayout({ children }: PropsWithChildren) {
  const { pathname, hash, key } = useLocation();
  const navigate = useNavigate();
  const { user } = useAuthStore();

  useEffect(() => {
    if (!hash) {
      window.scrollTo(0, 0);
    }
  }, [pathname, hash]);

  // Back to the previous in-app page. The first entry the router saw (opened from a link, a new tab or
  // another site) has key "default": going back from it would leave the app, so go to the exam list.
  const goBack = () => (key !== "default" ? navigate(-1) : navigate("/k/my-exams"));

  const profile = {
    name: user?.name || user?.username || "Người dùng",
    email: user?.email || "",
  };

  return (
    <div className="flex min-h-screen flex-col bg-page text-ink">
      <header className={cn("sticky top-0 z-40", dashboardHeaderClass)}>
        <HeaderWaves />
        <div className="relative flex h-[76px] w-full items-center gap-4 px-4 xl:px-6 2xl:px-8">
          <Link to="/k" className="flex shrink-0 items-center" aria-label="Về trang chủ">
            <Logo sizeLogo={40} sizeText={18} />
          </Link>
          <span aria-hidden className="hidden h-8 w-px bg-hairline sm:block" />
          <button
            type="button"
            onClick={goBack}
            className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-hairline bg-canvas text-body shadow-[0_1px_3px_rgba(15,23,42,0.06)] transition-colors hover:border-brand-border hover:text-brand-strong"
            aria-label="Quay lại"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </button>
          <HeaderSearch />
          <div className="ml-auto flex items-center gap-3">
            <NotificationBell />
            <span aria-hidden className="h-8 w-px bg-hairline" />
            <ProfileDropdown data={profile} variant="header" />
          </div>
        </div>
      </header>

      <main className="flex flex-1 flex-col">{children}</main>

      <footer className="mt-auto border-t border-hairline py-4 text-center text-xs text-muted-foreground">
        <p>
          © {new Date().getFullYear()} KMAEdu. All rights reserved. Made with love in Vietnam.
        </p>
      </footer>
    </div>
  );
}
