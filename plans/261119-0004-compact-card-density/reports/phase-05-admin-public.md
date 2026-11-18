# Phase 5 — Admin và trang công khai: báo cáo

Chỉ đổi class (không đổi logic, props, tên). Không file nào trong tập sở hữu dùng `components/antd/card`, nên không có chỗ nào cần sửa đệm Card.

## Admin (`kmaedu-fe/src/`)
- `components/admin/KpiCard.tsx`: p-6 → p-4, số liệu 36px → 28px, skeleton h-9 → h-8, mb-2 → mb-1.
- `components/admin/MiniChartCard.tsx`: p-6 → p-4, chiều cao biểu đồ 200 → 160 (cả skeleton).
- `components/admin/StatChart.tsx`, `SourceBreakdownChart.tsx`: p-6 → p-4, height mặc định 320 → 260, tiêu đề mb-4 → mb-3.
- `pages/admin/AdminOverviewPage.tsx`: ErrorBlock p-8 → p-5; `SourceBreakdownChart` height 260 → 220; h1 text-3xl → text-2xl.
- `pages/admin/Admin{Audit,Logs,PageConfig,Roles,Stats,Users,WordFamily}Page.tsx`: h1 text-3xl → text-2xl (khối tiêu đề trang).

## Landing (`components/organisms/landing/`)
- `FeatureShowcase.tsx`: hàng feature py-12/20 → py-8/10, gap 8/16 → 4/8, tiêu đề 3xl/4xl → 2xl/3xl, hình w-48 h-40 → w-40 h-32.
- `ProductShowcase.tsx`: bước py-8 → py-6, tiêu đề bước 2xl/3xl → xl/2xl, số bước 3xl → 2xl; cửa sổ code p-8 → p-5, header/footer px-6 py-4 → px-5 py-3, min-h 280 → 220.
- `StatsSection.tsx`: số liệu 4xl/5xl → 3xl/4xl, gap-8 → gap-4, bảng địa điểm px-6 py-4/5 → px-5 py-3/3.5.
- `MetricsSection.tsx`: thẻ số p-8 lg:p-12 → p-5 lg:p-6, số 6xl/8xl → 5xl/6xl, mt-4 → mt-2.
- `SecuritySection.tsx`: thẻ p-6 → p-4, gap-6 → gap-4.
- `WaysToStudy.tsx`: code block p-8 → p-5, min-h 220 → 180, tab px-6 py-4 → px-5 py-3, gap-6 → gap-4.
- `TestimonialsSection.tsx`: thẻ số liệu p-8 → p-5, số 3xl/4xl → 2xl/3xl, avatar 64 → 48px (chữ 2xl → xl).
- `IntegrationsMarquee.tsx`: thẻ px-8 py-6 → px-5 py-4, gap-6 → gap-4 (cả hai dải đối xứng nên marquee không lệch).
- `CoralCallout.tsx`: đệm khối px-8 lg:px-16 py-16 lg:py-24 → px-6 lg:px-10 py-10 lg:py-14 (tiêu đề giữ nguyên).

## Trang công khai và auth
- `AboutSection.tsx`: thẻ mission/vision p-8/10 → p-5, tiêu đề 28/32px → 24/26px; thẻ values p-8 → p-5, tiêu đề 22 → 18px; ô số liệu icon 48 → 40px, số 36 → 30px; gap giữa thẻ → gap-4; khối CTA đệm giảm, nút h-12 → h-10.
- `ContactSection.tsx`: thẻ form p-8/10 → p-5/6, tiêu đề 28 → 24px, gap cột 8/12 → 4/6; thẻ đối tác p-6 → p-4 (tiêu đề 22 → 18px); `ContactCard` p-5 → p-4; space-y-5 giữa thẻ → space-y-4.
- `components/organisms/auth/signin-form.tsx`, `signup-form.tsx`, `pages/auth/ForgotPasswordPage.tsx`, `ResetPasswordPage.tsx`: thẻ form p-8 → p-5, mb-8 → mb-6, tiêu đề 28 → 24px; Reset: biểu tượng thành công 64 → 48px (svg 32 → 24px), py-8 → py-4.

## Bỏ qua (có lý do)
- `HeroBand.tsx`, `HeroSection.tsx`: hero, giữ nguyên (dải số liệu trong HeroBand là marquee của hero).
- `FeaturesSectionHome.tsx`, `FeedbackSection.tsx`, `HeroSection.tsx`, `StackSection.tsx`, `landing/FeatureGrid.tsx`, `landing/TrustStrip.tsx`: không được import ở đâu (mã chết, `git grep` xác nhận), không hiển thị nên không đổi.
- `FooterSection.tsx`: không có thẻ (chỉ ô email nhỏ), giữ nguyên.
- `pages/errors/ForbiddenPage.tsx`, `components/common/NotFound.tsx`: không phải thẻ (chữ trần giữa trang), giữ nguyên.
- Bảng admin, `UserDetailDrawer`, `roles/*`, `LogViewer`, `AuditTable`: không có thẻ cần đổi; giữ cỡ chữ hàng bảng theo yêu cầu.
- `pages/landing/*` (Home, Legal pages): chỉ là vỏ ghép component, không có class thẻ.

## Kiểm tra
- `yarn tsc --noEmit -p tsconfig.json`: exit 0.
- `yarn eslint <27 file đã đổi>`: exit 0, 0 lỗi, 3 cảnh báo có sẵn (MetricsSection 14:27 và 48:38, TestimonialsSection 12:13), không liên quan đến sửa đổi.
