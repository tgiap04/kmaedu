# Brainstorm: tăng tốc dựng đồ thị GraphRAG

Ngày: 2026-11-16 · Góc nhìn: CTO · Trạng thái: đã chốt (A + B), chờ plan/implement

## Hiện trạng đo được (ai-worker local, Faye-AI, song song 16, tài liệu 40 đoạn)

| Bước | Thời gian | Bản chất |
|---|---|---|
| Trích thực thể/quan hệ | 248 s | 40 lời gọi LLM |
| Embedding để gộp | 124 s | 299 request Gemini, mỗi thực thể một request |
| Tóm mô tả | 126 s | 20 lời gọi LLM |
| Embedding lại | 3 s | |
| Louvain + gộp | < 1 s | thuật toán, không đáng kể |
| Báo cáo cộng đồng | 80 s | 39 lời gọi LLM |
| **Tổng** | **~9 phút 40 giây** | gần như toàn bộ là chờ mạng |

Phát hiện khi đo trực tiếp router (`ai.fayedark.com`, đứng sau Cloudflare):
- Gọi **không stream** (cách `model_manager._generate_with_ai2` đang làm): **HTTP 524 sau 125 s, 3/3 lần**. Cloudflare cắt khi chưa có byte đầu trong ~100 s; model suy luận ra byte đầu rất trễ.
- Gọi **stream**, cùng prompt: **200 OK sau 15–46 s, 3/3 lần**.
- `reasoning_effort: "low"`: số đo nhiễu (0,7–20 s, có lần trả rỗng), hàng đợi router chi phối. **Chưa kết luận được.**

## Các hướng

| Hướng | Làm gì | Ước tính tiết kiệm | Rủi ro / đánh đổi |
|---|---|---|---|
| **A1. Gọi AI2 bằng stream** | `_generate_with_ai2` dùng `stream: true`, gom các mẩu `content`, đọc `finish_reason`/usage ở mẩu cuối | Hết 524. Lời gọi chậm không còn chết ở 125 s rồi bị thử lại. Áp dụng cho cả sinh quiz/flashcard | Thấp. Giữ nguyên giao diện hàm, thêm test parse SSE |
| **A2. Embedding theo lô** | Gemini `embed_content` nhận danh sách văn bản (batch ~100) thay vì từng cái | 124 s → vài giây | Thấp. Giữ retry/backoff theo lô |
| **A3. Một đợt trích thực thể** | Song song ≥ số đoạn (ví dụ 48), router chịu tải tốt | Từ 3 đợt xuống 1 đợt, khoảng 248 s → 60–90 s | Có thể dính 429 nếu router đổi chính sách. Giữ trần cấu hình được |
| **B1. Bỏ LLM khi tóm mô tả** | Gộp mô tả bằng cách giữ 2–3 câu khác nhau dài nhất, chỉ gọi LLM khi vượt ngưỡng ký tự | 126 s → khoảng 0–20 s | Mô tả thực thể kém gọn hơn một chút. Embedding vẫn đủ để gộp |
| **B2. Báo cáo chỉ cho cộng đồng cấp 0** | Cấp 1 không viết báo cáo riêng; local search dùng báo cáo cấp 0 của cộng đồng cha | Bớt khoảng một nửa lời gọi báo cáo, 80 s → khoảng 30–40 s | Ngữ cảnh local search kém chi tiết hơn chút |
| **B3. Gộp đoạn ngắn** | Hai đoạn liền kề cùng ngắn (< 1500 ký tự) trích chung một lời gọi, có gán lại `chunkId` | Bớt 20–40% lời gọi với tài liệu có nhiều đoạn ngắn | Prompt phức tạp hơn, dễ gán nhầm đoạn. Nên để sau |
| C. `reasoning_effort: low` | Thêm tham số tùy chọn cho lời gọi trích | Có thể rất lớn nhưng chưa chứng minh | Phải đo lại sau A1; router có thể bỏ qua tham số |

Không đáng làm: tối ưu thuật toán đồ thị (đã dưới 1 giây), đổi thư viện Louvain, cache ngoài.

## Đề xuất

Làm **A1 + A2 + A3 + B1 + B2** trong một plan. Đo lại trên cùng tài liệu, rồi mới quyết định C và B3 dựa trên số liệu.

Ước tính sau khi làm: trích 60–90 s, embedding ~5 s, tóm mô tả 0–20 s, báo cáo 30–40 s, **tổng khoảng 2–3 phút** (từ ~9 phút 40 giây). Sàn không vượt qua được là độ trễ một lời gọi Faye-AI (15–45 s), vì mỗi đợt phải chờ lời gọi chậm nhất.

## Thước đo
- Thời gian dựng tài liệu 40–60 đoạn < 3 phút (đo log `[GRAPHRAG_TIMING]`).
- Không còn lời gọi AI2 lỗi 524; tỉ lệ đoạn trích lỗi < 5%.
- Chất lượng giữ nguyên: số thực thể/cộng đồng chênh không quá 15% so với trước, quiz vẫn đủ số câu.

## Quyết định (2026-11-16)
Người dùng chọn **A (A1 stream, A2 embedding theo lô, A3 một đợt trích) + B (B1 gộp mô tả không LLM trừ khi quá dài, B2 báo cáo chỉ cấp 0)**. Không làm C (`reasoning_effort`) và B3 (gộp đoạn ngắn) trong đợt này; xem lại sau khi đo.

## Kết quả đo sau khi làm A + B (2026-11-16, cùng tài liệu 40 đoạn)

| Bước | Trước | Lần đo cuối | Ghi chú |
|---|---|---|---|
| Trích thực thể | 248 s, có đoạn lỗi | 302 s, 40/40 đoạn ok (lần trước đó: 233 s) | router dùng chung nên dao động ±70 s giữa các lần |
| Embedding để gộp | 124 s | 14 s | theo lô 100 |
| Tóm mô tả | 126 s | 0 s | chỉ gọi LLM khi > 600 ký tự |
| Báo cáo cộng đồng | 80 s (39 lời gọi) | 143 s (18 lời gọi) | chưa hedge thì 397 s vì một lời gọi bị treo |
| **Tổng** | **~9 phút 40 giây** | **~7 phút 40 giây** | |

Thêm vào trong lúc đo: `reasoning_effort: low` (ở mức mặc định Faye-AI đốt 7–8k token rồi không trả JSON), `max_tokens` 16384, hạn tổng 240 s mỗi lời gọi (stream không bao giờ chạm read timeout 3600 s), pool AI2 tăng từ 20 lên 64 (hết `PoolTimeout`), hedge sau 90 s.
Chưa đạt mục tiêu < 3 phút. Thời gian còn lại gần như hoàn toàn là độ trễ của router (một lời gọi mất 30–140 s, mỗi đợt phải chờ lời gọi chậm nhất). Hướng tiếp theo: B3 (gộp đoạn ngắn), hoặc dùng một model không suy luận cho riêng bước trích.
