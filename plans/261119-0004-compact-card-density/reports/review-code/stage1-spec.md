# Stage 1 — Spec compliance

Phạm vi: diff chưa commit trong `kmaedu-fe` (HEAD d3c6ab9), ~126 file.
Nguồn yêu cầu: ảnh thiết kế `/k/my-exams` và các yêu cầu tiếp theo của người dùng; `plans/261119-0004-compact-card-density/plan.md`.

| # | Yêu cầu | Trạng thái | Bằng chứng |
|---|---|---|---|
| 1 | /k/my-exams giống ảnh: đầu trang 3 ô đếm, "Tiếp tục học", lưới 2 cột "Các bài thi khác" (Lịch sử, ···, số liệu), "Xem tất cả" | PASS | MyExamsPage.tsx, continue-exam-card.tsx, session-card.tsx, my-exams-sections.tsx |
| 2 | Thu nhỏ thẻ ở /k/my-exams | PASS | các file trên |
| 3 | Bỏ đệm hai lớp của Card dùng chung | PASS | components/antd/card.tsx |
| 4 | Áp thang thu nhỏ cho mọi trang | PASS | reports/phase-02..05 (file bỏ qua có lý do) |
| 5 | Chỉ đổi class | PASS | ngoài class: số chiều cao biểu đồ, viewBox ProgressCircle, bỏ size="lg" |
| 6 | Không đụng vùng loại trừ | PASS | lọc git status: không có SideBar/nav/ui/kokonutui/magicui/antd (trừ card)/routes |
| 7 | Tiêu đề trang admin 30 → 24px | EXTRA | không có trong thang; đã báo người dùng |
| 8 | Lề tiêu đề CategoriesSidebar/ConversationList/PostsList → px-4 | EXTRA | sửa theo review Stage 5 của implement; lệch có từ trước |

Kết luận: PASS (WARN: 2 mục thêm, đã báo người dùng). Chuyển Stage 2.
