# 💰 Sao Kê Chi Tiêu Bot

![Status](https://img.shields.io/badge/Status-Active-success)
![Platform](https://img.shields.io/badge/Platform-Google_Apps_Script-blue)
![License](https://img.shields.io/badge/License-MIT-green)

**SaoKeChiTieuBot** (`@SaoKeChiTieu_Bot`) - Trợ lý tài chính cá nhân chạy trên Telegram + Google Apps Script. Miễn phí, đa người dùng, bảo mật.

---

## ✨ Tính Năng

### 💸 Chi Tiêu & Thu Nhập
- **Nhập nhanh**: `50k cafe`, `200k tiền điện`, `/in 10m lương`
- **Hạng mục tùy chỉnh**: Tự định nghĩa categories
- **Chi tiêu định kỳ**: Auto-add tiền nhà, Netflix...

### 📊 Báo Cáo
- **Biểu đồ Doughnut**: Phân tích chi tiêu theo %
- **Danh sách phân trang**: Dễ dàng duyệt lịch sử
- **Xuất CSV**: Backup dữ liệu

### 🎯 Quản Lý Ngân Sách
- Đặt hạn mức tổng/theo hạng mục
- **Cảnh báo real-time** khi vượt 90% hoặc 100%
- **Báo cáo tự động**: Gửi tổng kết vào sáng mùng 1 hàng tháng.

### 🛡 Hệ Thống
- **Admin Alerts**: Báo cáo lỗi hệ thống tức thì cho Admin.
- **Auto-Retry**: Cơ chế tự động thử lại khi VCB lỗi.

### 🏦 VCB Integration
- Tự động theo dõi biến động số dư
- Thông báo donate qua Telegram (kèm lời cảm ơn tự động)
- Mã hóa AES-256 + RSA

### 🍰 Chia Tiền & Mục Tiêu
- **Split Bill**: Tính tiền nhóm nhanh chóng
- **Savings Goals**: Theo dõi mục tiêu tiết kiệm

---

## 🚀 Tất Cả Lệnh

### 📌 Kết Nối
| Lệnh | Mô tả |
|------|-------|
| `/connect [SheetID]` | Kết nối Google Sheet của bạn |
| `/help` | Xem hướng dẫn sử dụng |

### 💸 Chi Tiêu
| Lệnh | Mô tả |
|------|-------|
| `50k cafe` | Nhập chi tiêu (Bot hỏi chọn hạng mục) |
| `/undo` | Xóa giao dịch cuối cùng |
| `/delete [ID]` | Xóa giao dịch theo ID |
| `/search [từ khóa]` | Tìm kiếm giao dịch |

### 💰 Thu Nhập
| Lệnh | Mô tả |
|------|-------|
| `/in [số] [ghi chú]` | Nhập thu nhập (VD: `/in 10m lương`) |
| `/listin` | Danh sách thu nhập (phân trang) |
| `/undoin` | Xóa thu nhập cuối |
| `/deletein [ID]` | Xóa thu nhập theo ID |
| `/searchin [từ khóa]` | Tìm kiếm thu nhập |

> 🔒 **Donate** không thể xóa bằng bất kỳ cách nào

### 📊 Báo Cáo
| Lệnh | Mô tả |
|------|-------|
| `/report` | Báo cáo tháng này (có biểu đồ) |
| `/report 12/2025` | Báo cáo tháng cụ thể |
| `/list` | Danh sách giao dịch (phân trang) |
| `/list 12/2025` | Danh sách tháng cụ thể |
| `/filter` | Lọc theo hạng mục |
| `/export` | Xuất file CSV (Chi/Thu/Cả hai) |

### 🎯 Ngân Sách
| Lệnh | Mô tả |
|------|-------|
| `/budget` | Xem ngân sách hiện tại |
| `/budget 5m` | Đặt tổng ngân sách tháng |
| `/budget 2m ăn uống` | Đặt ngân sách riêng cho hạng mục |

### 📂 Hạng Mục Tùy Chỉnh
| Lệnh | Mô tả |
|------|-------|
| `/category` | Xem danh sách |
| `/category add [tên]` | Thêm hạng mục (nếu đã xóa sẽ kích hoạt lại) |
| `/category del [tên]` | Ẩn (deactive) hạng mục |
| `/category in add [tên]` | Thêm hạng mục thu nhập |
| `/category in del [tên]` | Ẩn hạng mục thu nhập |

### 🔄 Chi Tiêu Định Kỳ
| Lệnh | Mô tả |
|------|-------|
| `/recurring` | Xem danh sách chi định kỳ |
| `/recurring add 2m tiền nhà monthly 1` | Thêm (monthly/weekly, ngày) |
| `/recurring del [ID]` | Xóa chi tiêu định kỳ |

### 🍰 Chia Tiền
| Lệnh | Mô tả |
|------|-------|
| `/split 500k 4 ăn tối` | Chia đều 500k cho 4 người |

### 🏆 Mục Tiêu Tiết Kiệm
| Lệnh | Mô tả |
|------|-------|
| `/goal list` | Xem danh sách mục tiêu |
| `/goal add 50m Xe 12/2025` | Tạo mục tiêu mới |
| `/goal deposit [ID] [số] | Nạp tiền vào mục tiêu |

### 📒 Sổ Nợ (Debt Tracking)
| Lệnh | Mô tả |
|------|-------|
| `/debt borrow [số] [ai] [ghi chú]` | Ghi nhận mình đi vay |
| `/debt lend [số] [ai] [ghi chú]` | Ghi nhận mình cho vay |
| `/debt list` | Xem danh sách nợ đang Active |
| `/debt repay [ID] [số]` | Trả nợ / Gạch nợ (đã nhận) |

### 📤 Export & Backup
| Lệnh | Mô tả |
|------|-------|
| `/backup` | Tạo bản sao Google Sheet lưu vào Drive |
| `/export pdf` | Xuất báo cáo dạng PDF |
| `/export` | Xuất dữ liệu dạng CSV (mặc định) |

### ⏰ Nhắc Nhở
| Lệnh | Mô tả |
|------|-------|
| `/remind 21:00` | Đặt nhắc nhở hàng ngày |
| `/stopremind` | Tắt nhắc nhở |

### ⚙️ Cài Đặt
| Lệnh | Mô tả |
|------|-------|
| `/lang` | Đổi ngôn ngữ (VI/EN) |
| `/lang` | Đổi ngôn ngữ (VI/EN) |
| `/donate` | Ủng hộ tác giả (QR VietQR) |

### 🤖 AI Integration (Mới)
- Bot tự động hiểu ngôn ngữ tự nhiên nếu bạn không nhập đúng cú pháp chuẩn.
- VD: "Vừa ăn phở 50k với uống cafe 30k" -> AI tự tách thành 2 giao dịch.
- Cấu hình: Cần có `GEMINI_API_KEY` trong Script Properties.

---

## 📁 Cấu Trúc Files

```
├── Config.gs      # Cấu hình, constants, localization
├── Utils.gs       # Telegram API helpers, validation
├── Features.gs    # Report, Budget, Categories, Recurring
├── Handlers.gs    # Message/callback handlers, reminders
├── VCB.gs         # VCB API integration
├── Lib.gs         # Crypto utilities
└── App.gs         # VCB scheduler
```

---

## 🛠 Cài Đặt

### Cho Người Dùng
1. Mở Telegram → Chat với `@SaoKeChiTieu_Bot`
2. Tạo Google Sheet → Share **Editor** cho `ducthang01052002@gmail.com`
3. Gõ `/connect [Sheet_ID]`

👉 **[Hướng dẫn chi tiết: GUIDE.md](./GUIDE.md)**

### Tự Host
👉 **[Hướng dẫn tự host: SELF_HOSTING.md](./SELF_HOSTING.md)**

---

## 🗺 Roadmap

- [ ] **AI Integration** (Google Gemini/OpenAI): Smarter parsing.
- [ ] **Voice Input**: Speech-to-text for transactions.

---

## 🤝 Đóng Góp

**Thang Nguyen** - [thang1834](https://github.com/thang1834)

Mọi PR/Issue đều được hoan nghênh!

## 📄 License

MIT License
