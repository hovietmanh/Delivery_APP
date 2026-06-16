# DeliveryApp — Ứng dụng giao hàng (like BE / GRAB)

Monorepo cho toàn bộ hệ thống DeliveryApp, bao gồm Backend API, Mobile App, và Admin Dashboard.

---

## Mục lục

- [Kiến trúc tổng quan](#kiến-trúc-tổng-quan)
- [Tech Stack](#tech-stack)
- [Cấu trúc thư mục](#cấu-trúc-thư-mục)
- [Yêu cầu môi trường](#yêu-cầu-môi-trường)
- [Cài đặt & Chạy dự án](#cài-đặt--chạy-dự-án)
- [Biến môi trường](#biến-môi-trường)
- [API Endpoints](#api-endpoints)
- [Database Schema](#database-schema)
- [Real-time (WebSocket)](#real-time-websocket)
- [Chức năng chính](#chức-năng-chính)
- [Roadmap](#roadmap)

---

## Kiến trúc tổng quan

```
┌──────────────────────────────────────────────────────────┐
│                      CLIENTS                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐  │
│  │ Mobile App  │  │ Mobile App  │  │  Admin Dashboard│  │
│  │ (Customer)  │  │  (Driver)   │  │    (React)      │  │
│  └──────┬──────┘  └──────┬──────┘  └────────┬────────┘  │
└─────────┼────────────────┼─────────────────┼────────────┘
          │  REST + WS     │                 │ REST
          ▼                ▼                 ▼
┌─────────────────────────────────────────────────────────┐
│                    NestJS API (Port 3000)                │
│  ┌──────┐ ┌───────┐ ┌───────┐ ┌────────┐ ┌──────────┐  │
│  │ Auth │ │Orders │ │Driver │ │Tracking│ │Payments  │  │
│  └──────┘ └───────┘ └───────┘ └────────┘ └──────────┘  │
│  ┌──────────────────┐  ┌──────────────────────────────┐  │
│  │  Socket.IO GW    │  │  Firebase (Push Notifications│  │
│  │  /tracking ns    │  │  Admin SDK)                  │  │
│  └──────────────────┘  └──────────────────────────────┘  │
└────────────────┬────────────────┬───────────────────────┘
                 │                │
        ┌────────┴────┐  ┌───────┴──────┐
        │ PostgreSQL  │  │    Redis     │
        │ (Main DB)   │  │ (Cache+Queue)│
        └─────────────┘  └─────────────┘
```

---

## Tech Stack

| Layer           | Công nghệ                                          |
|-----------------|----------------------------------------------------|
| **Monorepo**    | Turborepo + npm workspaces                         |
| **Backend**     | NestJS 10 + TypeScript                             |
| **ORM**         | Prisma 5 (PostgreSQL)                              |
| **Cache/Queue** | Redis (ioredis)                                    |
| **Real-time**   | Socket.IO (WebSocket Gateway)                      |
| **Auth**        | JWT (access + refresh token) + bcrypt              |
| **API Docs**    | Swagger / OpenAPI (tự động sinh từ decorator)      |
| **Mobile**      | React Native + Expo SDK 51 + Expo Router           |
| **State**       | Zustand + TanStack Query                           |
| **Forms**       | React Hook Form + Zod                              |
| **Maps**        | React Native Maps + Google Maps API                |
| **Admin UI**    | React 18 + Vite + TailwindCSS + Recharts           |
| **Push Notif**  | Firebase Cloud Messaging (FCM)                     |
| **Storage**     | AWS S3                                             |
| **Payment**     | VNPay / Momo                                       |
| **Container**   | Docker + Docker Compose                            |

---

## Cấu trúc thư mục

```
delivery-app/                         ← Root monorepo
├── apps/
│   ├── api/                          ← NestJS Backend API
│   │   ├── src/
│   │   │   ├── modules/
│   │   │   │   ├── auth/             ← Đăng ký / đăng nhập / JWT
│   │   │   │   │   ├── dto/
│   │   │   │   │   └── strategies/   ← JWT & Local Passport strategy
│   │   │   │   ├── users/            ← Quản lý khách hàng
│   │   │   │   ├── drivers/          ← Quản lý tài xế
│   │   │   │   ├── orders/           ← Tạo đơn / cập nhật trạng thái
│   │   │   │   │   └── dto/
│   │   │   │   ├── tracking/         ← WebSocket Gateway + geo query
│   │   │   │   ├── payments/         ← VNPay / Momo integration
│   │   │   │   ├── notifications/    ← FCM push notifications
│   │   │   │   └── reviews/          ← Đánh giá tài xế
│   │   │   ├── common/
│   │   │   │   ├── guards/           ← JWT, Local, Roles guard
│   │   │   │   ├── interceptors/
│   │   │   │   ├── decorators/
│   │   │   │   └── filters/          ← Global exception filter
│   │   │   └── config/
│   │   │       ├── prisma.module.ts
│   │   │       └── prisma.service.ts
│   │   ├── prisma/
│   │   │   └── schema.prisma         ← Toàn bộ DB schema
│   │   ├── nest-cli.json
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   ├── mobile/                       ← React Native (Expo)
│   │   ├── app/                      ← File-based routing (Expo Router)
│   │   │   ├── _layout.tsx           ← Root layout, providers
│   │   │   ├── (auth)/               ← Màn hình login / register
│   │   │   ├── (customer)/           ← Tab app cho khách hàng
│   │   │   └── (driver)/             ← Tab app cho tài xế
│   │   ├── components/ui/            ← Reusable UI components
│   │   ├── services/                 ← API calls (axios)
│   │   ├── store/                    ← Zustand stores
│   │   ├── hooks/                    ← Custom hooks
│   │   ├── utils/                    ← Helper functions
│   │   ├── constants/                ← App constants
│   │   ├── app.json                  ← Expo config
│   │   ├── tsconfig.json
│   │   └── package.json
│   │
│   └── admin/                        ← React Admin Dashboard
│       ├── src/
│       │   ├── components/
│       │   │   └── layout/           ← Sidebar, header
│       │   ├── pages/                ← Dashboard, Orders, Drivers, Users
│       │   ├── services/             ← API service layer
│       │   ├── store/                ← Auth store (Zustand)
│       │   └── hooks/
│       ├── index.html
│       ├── vite.config.ts
│       ├── tsconfig.json
│       └── package.json
│
├── packages/
│   └── shared/                       ← Shared types & utilities
│       └── src/
│           ├── types/                ← Order, Driver, User types
│           ├── utils/                ← formatVND, formatDistance...
│           └── index.ts
│
├── docker-compose.yml                ← PostgreSQL + Redis + services
├── turbo.json                        ← Turborepo pipeline config
├── package.json                      ← Root workspace config
├── .gitignore
├── .env.example
└── README.md
```

---

## Yêu cầu môi trường

| Tool           | Phiên bản tối thiểu |
|----------------|----------------------|
| Node.js        | >= 20.0.0            |
| npm            | >= 10.0.0            |
| Docker Desktop | >= 4.x               |
| Git            | bất kỳ               |

Tùy chọn (để chạy mobile):
- **Expo Go** app trên điện thoại, hoặc
- **Android Studio** (emulator Android), hoặc
- **Xcode** (chỉ macOS — iOS simulator)

---

## Cài đặt & Chạy dự án

### 1. Clone và cài dependencies

```bash
git clone <repo-url>
cd delivery-app
npm install
```

### 2. Setup biến môi trường

```bash
# Root
cp .env.example .env

# API
cp apps/api/.env.example apps/api/.env
# Chỉnh sửa apps/api/.env với thông tin database thực tế
```

### 3. Khởi động database (Docker)

```bash
# Chỉ start PostgreSQL và Redis
docker compose up postgres redis -d

# Kiểm tra trạng thái
docker compose ps
```

### 4. Chạy database migration

```bash
cd apps/api
npx prisma generate        # Sinh Prisma Client
npx prisma migrate dev     # Tạo bảng trong DB
npx prisma db seed         # (Optional) Seed dữ liệu mẫu
cd ../..
```

### 5. Chạy toàn bộ dự án (development)

```bash
# Chạy tất cả apps cùng lúc
npm run dev

# Hoặc chạy từng app riêng lẻ:
npm run dev:api      # API: http://localhost:3000
npm run dev:admin    # Admin: http://localhost:5173
npm run dev:mobile   # Mobile: Expo DevTools
```

### 6. Chạy Mobile App

```bash
cd apps/mobile
npx expo start

# Quét QR code bằng Expo Go app trên điện thoại
# Hoặc nhấn 'a' để mở Android emulator
```

### 7. Xem API Documentation (Swagger)

Mở trình duyệt: [http://localhost:3000/api/docs](http://localhost:3000/api/docs)

### 8. Xem database (Prisma Studio)

```bash
npm run db:studio
# Mở: http://localhost:5555
```

---

## Biến môi trường

### `apps/api/.env`

| Biến                   | Mô tả                                    | Ví dụ                                          |
|------------------------|------------------------------------------|------------------------------------------------|
| `DATABASE_URL`         | PostgreSQL connection string             | `postgresql://postgres:pass@localhost:5432/db` |
| `REDIS_URL`            | Redis connection string                  | `redis://localhost:6379`                       |
| `JWT_SECRET`           | Secret key cho access token              | random string dài 32+ ký tự                   |
| `JWT_EXPIRES_IN`       | Thời hạn access token                    | `15m`                                          |
| `JWT_REFRESH_SECRET`   | Secret key cho refresh token             | random string dài 32+ ký tự                   |
| `JWT_REFRESH_EXPIRES_IN` | Thời hạn refresh token                 | `7d`                                           |
| `GOOGLE_MAPS_API_KEY`  | Key từ Google Cloud Console              | —                                              |
| `FIREBASE_PROJECT_ID`  | Firebase project ID (push notifications) | —                                              |
| `VNPAY_TMN_CODE`       | Mã merchant VNPay                        | —                                              |
| `MOMO_PARTNER_CODE`    | Mã partner Momo                          | —                                              |

---

## API Endpoints

Đầy đủ tại Swagger: `http://localhost:3000/api/docs`

### Auth — `/v1/auth`
| Method | Path        | Mô tả                        |
|--------|-------------|------------------------------|
| POST   | `/register` | Đăng ký tài khoản            |
| POST   | `/login`    | Đăng nhập (trả về JWT)       |
| POST   | `/refresh`  | Làm mới access token         |
| POST   | `/logout`   | Đăng xuất                    |
| GET    | `/me`       | Lấy thông tin user hiện tại  |

### Orders — `/v1/orders` *(JWT required)*
| Method | Path           | Mô tả                             |
|--------|----------------|-----------------------------------|
| POST   | `/`            | Tạo đơn giao hàng mới            |
| GET    | `/`            | Danh sách đơn của tôi            |
| GET    | `/:id`         | Chi tiết đơn hàng                |
| PATCH  | `/:id/accept`  | Tài xế nhận đơn                  |
| PATCH  | `/:id/pickup`  | Tài xế đã lấy hàng               |
| PATCH  | `/:id/complete`| Giao hàng thành công             |
| PATCH  | `/:id/cancel`  | Hủy đơn hàng                     |

---

## Database Schema

### Các bảng chính

| Bảng            | Mô tả                                           |
|-----------------|-------------------------------------------------|
| `users`         | Tài khoản chung (customer / driver / admin)     |
| `customers`     | Thông tin khách hàng                            |
| `drivers`       | Thông tin tài xế, vị trí, trạng thái online    |
| `orders`        | Đơn hàng với đầy đủ lifecycle                  |
| `order_items`   | Danh sách hàng trong đơn                        |
| `payments`      | Lịch sử thanh toán                              |
| `order_tracking`| GPS track points của đơn hàng                  |
| `reviews`       | Đánh giá sau khi giao hàng xong                 |
| `notifications` | Lịch sử thông báo push                          |

### OrderStatus lifecycle

```
PENDING → ACCEPTED → PICKING_UP → IN_TRANSIT → DELIVERED
    └─────────────────────────────────────────→ CANCELLED
```

---

## Real-time (WebSocket)

Namespace: `ws://localhost:3000/tracking`

### Events từ Client → Server

| Event                      | Payload                                              | Mô tả                           |
|----------------------------|------------------------------------------------------|---------------------------------|
| `driver:update_location`   | `{ driverId, orderId, latitude, longitude }`         | Tài xế gửi vị trí GPS           |
| `customer:watch_order`     | `{ orderId }`                                        | Khách hàng theo dõi đơn        |
| `order:status_update`      | `{ orderId, status, customerId }`                    | Cập nhật trạng thái đơn        |

### Events từ Server → Client

| Event              | Mô tả                                         |
|--------------------|-----------------------------------------------|
| `driver:location`  | Vị trí tài xế realtime (broadcast cho khách)  |
| `new_order`        | Đơn mới cho tài xế online                     |
| `order:status`     | Cập nhật trạng thái đơn hàng                  |
| `subscribed`       | Xác nhận đăng ký theo dõi đơn                 |

---

## Chức năng chính

### Khách hàng (Customer)
- [x] Đăng ký / đăng nhập bằng số điện thoại
- [x] Tạo đơn giao hàng (địa chỉ lấy → địa chỉ giao)
- [x] Xem danh sách đơn hàng theo trạng thái
- [x] Theo dõi tài xế realtime trên bản đồ
- [x] Hủy đơn hàng (khi còn PENDING / ACCEPTED)
- [x] Thanh toán: tiền mặt, Momo, VNPay
- [x] Đánh giá tài xế sau khi giao hàng

### Tài xế (Driver)
- [x] Đăng ký tài khoản (cần admin duyệt)
- [x] Bật / tắt trạng thái online
- [x] Nhận thông báo đơn mới
- [x] Chấp nhận / bỏ qua đơn hàng
- [x] Cập nhật trạng thái: lấy hàng → đang giao → đã giao
- [x] Chia sẻ vị trí GPS realtime
- [x] Xem lịch sử chuyến và thu nhập

### Admin Dashboard
- [x] Xem tổng quan: đơn hôm nay, tài xế online, doanh thu
- [x] Quản lý và duyệt tài xế mới
- [x] Theo dõi tất cả đơn hàng
- [x] Quản lý người dùng
- [x] Biểu đồ doanh thu (Recharts)

---

## Roadmap

### Phase 1 — MVP (hiện tại)
- [x] Cấu trúc monorepo
- [x] Auth hệ thống (JWT + refresh token)
- [x] CRUD orders với đầy đủ lifecycle
- [x] Realtime tracking qua WebSocket
- [x] Tính phí giao hàng theo khoảng cách
- [x] Database schema đầy đủ (Prisma)

### Phase 2 — Core Features
- [ ] Tích hợp Google Maps (route, distance matrix)
- [ ] Thuật toán tự động ghép tài xế gần nhất
- [ ] Push notification (FCM) cho tài xế và khách hàng
- [ ] Tích hợp thanh toán Momo / VNPay
- [ ] Upload ảnh hàng hóa (AWS S3)
- [ ] OTP xác thực số điện thoại (Twilio / VNPT)
- [ ] Chat realtime giữa khách và tài xế

### Phase 3 — Production Ready
- [ ] Rate limiting & throttling nâng cao
- [ ] Logging tập trung (Winston + ELK Stack)
- [ ] CI/CD pipeline (GitHub Actions)
- [ ] Unit & E2E tests
- [ ] Kubernetes / ECS deployment config
- [ ] Monitoring (Prometheus + Grafana)
- [ ] Multi-language (i18n)

---

## Development Notes

### Tính phí giao hàng
Công thức hiện tại: `15,000đ (base) + 5,000đ/km`

Xem tại: [apps/api/src/modules/orders/orders.service.ts](apps/api/src/modules/orders/orders.service.ts)

### Tìm tài xế gần nhất
Dùng Haversine formula với PostgreSQL raw query.

Xem tại: [apps/api/src/modules/tracking/tracking.service.ts](apps/api/src/modules/tracking/tracking.service.ts)

### Token Strategy
- Access token: 15 phút (lưu trong memory)
- Refresh token: 7 ngày (lưu SecureStore trên mobile, httpOnly cookie trên web)

---

## Docker

```bash
# Start toàn bộ (bao gồm API + Admin + DB)
docker compose up -d

# Chỉ start infrastructure (DB + Redis)
docker compose up postgres redis -d

# Xem logs
docker compose logs -f api

# Stop tất cả
docker compose down

# Xóa volumes (reset database)
docker compose down -v
```

---

*Được setup với Claude Code — [https://claude.ai/code](https://claude.ai/code)*
