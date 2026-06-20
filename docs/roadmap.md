# Tài liệu Lộ trình Phát triển Công nghệ
## Hệ thống Quản lý Vận chuyển Hàng hoá Liên tỉnh — Delilog

---

## Tổng quan dự án

| Hạng mục | Nội dung |
|---|---|
| **Tên hệ thống** | Delilog — Nền tảng gửi hàng liên tỉnh qua xe khách |
| **Kiến trúc** | Monorepo (Turborepo) — Backend API + Mobile App + Admin Panel |
| **Môi trường** | Node.js 20, PostgreSQL 16, Redis 7, Docker |
| **Nền tảng mobile** | iOS & Android (Expo / React Native) |

---

## Giai đoạn 1 — Nghiên cứu & Phân tích

### Mục tiêu
Xác định bài toán, đối tượng sử dụng, yêu cầu nghiệp vụ và lựa chọn công nghệ phù hợp.

### Công việc thực hiện

**Phân tích nghiệp vụ**
- Khảo sát quy trình gửi hàng thực tế qua xe khách liên tỉnh
- Xác định 3 vai trò: Khách hàng, Tài xế/Nhà xe, Quản trị viên
- Lập danh sách tính năng cốt lõi: đặt đơn, theo dõi hành trình, khiếu nại, đánh giá, chatbot hỗ trợ

**Đánh giá và lựa chọn công nghệ**
- Backend: NestJS (TypeScript) — module hoá cao, phù hợp hệ thống phức tạp
- Mobile: Expo SDK 54 / React Native — đa nền tảng iOS & Android
- ORM: Prisma — type-safe, migration tự động
- AI phân tích khiếu nại: OpenRouter (vision model) + Groq (chatbot)
- Realtime: Socket.IO qua NestJS Gateway

**Thiết kế cơ sở dữ liệu sơ bộ**
- Xác định các entity chính: User, Driver, Order, Trip, Route, Complaint, Review, Voucher, KnowledgeBase

### Kết quả đầu ra
- Tài liệu yêu cầu nghiệp vụ (BRD)
- Sơ đồ luồng nghiệp vụ (business flow)
- Quyết định công nghệ (tech stack decision)

---

## Giai đoạn 2 — Thiết kế Hệ thống

### Mục tiêu
Thiết kế kiến trúc tổng thể, cơ sở dữ liệu, API và giao diện người dùng trước khi lập trình.

### Công việc thực hiện

**Kiến trúc hệ thống**
- Thiết kế monorepo 3 app: `apps/api`, `apps/mobile`, `apps/admin`
- Phân tách module API: `auth`, `users`, `drivers`, `orders`, `trips`, `routes`, `vouchers`, `payments`, `complaints`, `reviews`, `chat`, `notifications`, `tracking`
- Thiết kế luồng xác thực: JWT Access Token (15 phút) + Refresh Token (7 ngày)
- Thiết kế realtime: Socket.IO gateway cho cập nhật trạng thái đơn hàng

**Thiết kế CSDL**
- Schema Prisma với 15+ bảng, quan hệ đầy đủ (1-N, N-N)
- Bảng trọng tâm: `Order` (9 trạng thái), `Trip` (vòng đời chuyến xe), `Complaint` (tích hợp AI verdict)
- Migration strategy: Prisma Migrate với version control

**Thiết kế API**
- RESTful API versioning (`/v1/...`)
- Phân quyền theo role: `CUSTOMER`, `DRIVER`, `ADMIN`
- Thiết kế luồng đặt hàng, xác nhận, theo dõi, khiếu nại

**Thiết kế UI/UX**
- Mobile: Expo Router v6, Tab navigation theo role
- Admin Panel: React + Vite + TailwindCSS + Radix UI

### Kết quả đầu ra
- Sơ đồ kiến trúc hệ thống
- Schema CSDL đầy đủ (ERD)
- Tài liệu đặc tả API (endpoint, payload, response)
- Wireframe giao diện mobile và admin

---

## Giai đoạn 3 — Phát triển & Thử nghiệm

### Mục tiêu
Lập trình toàn bộ hệ thống theo module, tích hợp AI, và kiểm thử chức năng.

### Công việc thực hiện

**Backend API (NestJS)**

| Module | Chức năng chính |
|---|---|
| Auth | Đăng ký/đăng nhập, JWT, refresh token |
| Orders | Tạo đơn, cập nhật trạng thái (9 bước), phân công tài xế |
| Trips | Quản lý chuyến xe, vòng đời chuyến, checkpoint |
| Complaints | Tiếp nhận, phân tích AI, lưu verdict |
| Chat | Chatbot Groq (llama-3.3-70b), knowledge base 39 mục |
| Vouchers | Tạo mã, validate điều kiện, áp dụng vào đơn |
| Notifications | Firebase push notification theo sự kiện |

**Mobile App (Expo / React Native)**

*Luồng khách hàng:*
- Đặt hàng: chọn tuyến → chọn chuyến → điền thông tin → thanh toán
- Theo dõi đơn theo thời gian thực
- Quản lý voucher, địa chỉ lưu, lịch sử đơn
- Đánh giá tài xế, gửi khiếu nại kèm ảnh

*Luồng tài xế:*
- Quản lý chuyến xe, duyệt/từ chối đơn
- Cập nhật checkpoint (nhận hàng → trên đường → giao xong)
- Xem doanh thu theo ngày, thống kê đơn hoàn thành
- Xử lý khiếu nại với gợi ý từ AI

**Tích hợp AI**

| Tính năng | Model sử dụng |
|---|---|
| Phân tích khiếu nại | OpenRouter vision (NVIDIA Nemotron VL, Gemini 2.5) |
| Chatbot hỗ trợ | Groq llama-3.3-70b + Knowledge Base (39 Q&A) |

**Admin Panel (React + Vite)**
- Dashboard tổng quan: đơn hàng, doanh thu, tài xế
- Quản lý: tuyến đường, chuyến xe, người dùng, voucher

**Kiểm thử**
- Unit test: logic nghiệp vụ tính giá, validate đơn hàng
- Integration test: luồng đặt hàng end-to-end
- Manual test: UI mobile trên thiết bị thật (iOS + Android)
- Performance test: API response time < 500ms

### Kết quả đầu ra
- Source code hoàn chỉnh (monorepo)
- Mobile app chạy được trên iOS & Android
- Admin panel quản trị đầy đủ
- AI complaint analysis hoạt động
- Chatbot phản hồi 39 chủ đề nghiệp vụ

---

## Giai đoạn 4 — Triển khai & Vận hành

### Mục tiêu
Đưa hệ thống lên môi trường production, đảm bảo ổn định và hỗ trợ vận hành.

### Công việc thực hiện

**Hạ tầng & Triển khai**

```
Docker Compose Production:
├── PostgreSQL 16      (port 5432, volume persistent)
├── Redis 7            (port 6379, cache + session)
├── API NestJS         (port 3000, auto-restart)
└── Admin React/Nginx  (port 80/443)
```

- Cấu hình biến môi trường production (`.env.production`)
- SSL/TLS qua nginx reverse proxy
- Database backup tự động hàng ngày
- Mobile app: build và publish qua Expo EAS Build lên App Store / Google Play

**Monitoring & Logging**
- Log tập trung: NestJS Logger với log levels phân tầng
- Monitor uptime API và thời gian phản hồi
- Alert khi AI service lỗi (fallback tự động sang model dự phòng)

**Bảo mật**
- JWT với thời hạn ngắn (15 phút) + refresh rotation
- Rate limiting: 100 req/phút/IP (NestJS Throttler)
- Validate toàn bộ input tại API boundary (class-validator)
- Không lưu credential trong source code (`.env` excluded từ git)

**Vận hành & Bảo trì**
- Quy trình cập nhật knowledge base chatbot không cần restart (`POST /v1/chat/reload-knowledge`)
- Migration CSDL qua Prisma Migrate (zero-downtime khi có thể)
- Seed dữ liệu mẫu: tuyến đường, chuyến xe, knowledge base

### Kết quả đầu ra
- Hệ thống chạy ổn định trên VPS/cloud
- Mobile app published trên App Store & Google Play
- Tài liệu vận hành (runbook)
- SLA: uptime ≥ 99%, API response < 500ms

---

## Tóm tắt Lộ trình

```
Giai đoạn 1          Giai đoạn 2          Giai đoạn 3          Giai đoạn 4
Nghiên cứu      →    Thiết kế        →    Phát triển      →    Triển khai
& Phân tích          Hệ thống             & Thử nghiệm         & Vận hành

2–3 tuần             2–3 tuần             8–12 tuần            Liên tục
```

| Giai đoạn | Milestone chính |
|---|---|
| 1 | Tech stack quyết định, BRD hoàn thiện |
| 2 | ERD + API spec + Wireframe duyệt xong |
| 3 | MVP chạy được: đặt hàng, theo dõi, AI khiếu nại, chatbot |
| 4 | App live trên store, hệ thống production ổn định |
