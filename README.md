# 💰 Sao Kê Chi Tiêu Bot

![Status](https://img.shields.io/badge/Status-Active-success)
![Platform](https://img.shields.io/badge/Platform-Google_Apps_Script-blue)
![License](https://img.shields.io/badge/License-MIT-green)

**SaoKeChiTieuBot** (`@SaoKeChiTieu_Bot`) - Trợ lý tài chính cá nhân chạy trên Telegram + Google Apps Script. Miễn phí, đa người dùng, bảo mật.

---

## ✨ Tính Năng

### 💸 Chi Tiêu & Thu Nhập
- **Nhập nhanh**: `50k cafe`, `200k tiền điện`, `/in 10m lương`
- **Hạng mục tùy chỉnh**: `/category add [tên]`
- **Chi tiêu định kỳ**: `/recurring add 2m tiền nhà monthly 1`

### 📊 Báo Cáo
- **Biểu đồ Doughnut**: `/report` - Phân tích chi tiêu theo %
- **Danh sách phân trang**: `/list`, `/filter`
- **Xuất CSV**: `/export`

### 🎯 Quản Lý Ngân Sách
- Đặt ngân sách tổng/theo hạng mục: `/budget 5m`, `/budget 2m ăn uống`
- **Cảnh báo real-time** khi vượt ngân sách

### ⚙️ Tiện Ích
- 🌐 Đa ngôn ngữ (VI/EN)
- ⏰ Nhắc nhở hàng ngày
- 🔍 Tìm kiếm, xóa, undo

### 🏦 VCB Integration
- Tự động theo dõi biến động số dư Vietcombank
- Thông báo donate qua Telegram
- Mã hóa AES-256 + RSA

---

## 📁 Cấu Trúc Files

```
├── Config.gs      # Cấu hình, constants, localization
├── Utils.gs       # Telegram API helpers, validation
├── Features.gs    # Report, Budget, Categories, Recurring
├── Handlers.gs    # Message/callback handlers, reminders
├── VCB.gs         # VCB API integration
├── Lib.gs         # Crypto utilities
└── App.gs         # Legacy (giữ cho VCB scheduler)
```

---

## 🚀 Lệnh Có Sẵn

| Lệnh | Mô tả |
|------|-------|
| `/connect [ID]` | Kết nối Google Sheet |
| `/report` | Báo cáo chi tiêu (có biểu đồ) |
| `/list` | Danh sách giao dịch |
| `/filter` | Lọc theo hạng mục |
| `/in [số] [ghi chú]` | Nhập thu nhập |
| `/budget` | Xem/đặt ngân sách |
| `/category` | Quản lý hạng mục tùy chỉnh |
| `/recurring` | Quản lý chi tiêu định kỳ |
| `/export` | Xuất file CSV |
| `/remind` | Đặt nhắc nhở |
| `/lang` | Đổi ngôn ngữ |
| `/donate` | Ủng hộ tác giả |

---

## 🛠 Cài Đặt

### Cho Người Dùng
1. Mở Telegram, chat với `@SaoKeChiTieu_Bot`
2. Tạo Google Sheet, share **Editor** cho `ducthang01052002@gmail.com`
3. Gõ `/connect [Sheet_ID]`

👉 **[Chi tiết: GUIDE.md](./GUIDE.md)**

### Tự Host
👉 **[Chi tiết: SELF_HOSTING.md](./SELF_HOSTING.md)**

---

## 🗺 Roadmap

- [ ] AI Integration (Gemini)
- [ ] Web Dashboard

---

## 🤝 Đóng Góp

**Thang Nguyen** - [thang1834](https://github.com/thang1834)

Mọi PR/Issue đều được hoan nghênh!

## 📄 License

MIT License
