# 🛠 Hướng Dẫn Tự Host (Self-Hosting) SaoKeChiTieuBot

Bạn muốn tự chạy bot trên tài khoản Google của mình? Miễn phí 100% với Google Apps Script!

---

## 📋 Yêu Cầu
1. Tài khoản Google (Gmail)
2. Tài khoản Telegram
3. ~15 phút thiết lập

---

## 🚀 Bước 1: Tạo Bot Telegram

1. Chat với **[@BotFather](https://t.me/BotFather)**
2. Gõ `/newbot` → Đặt tên → Nhận **API Token**
3. 👉 **Lưu Token này!**

---

## ⚙️ Bước 2: Thiết Lập Google Apps Script

1. Truy cập [script.google.com](https://script.google.com) → **New Project**
2. Copy **TẤT CẢ** các file sau vào project:

| File | Mô tả |
|------|-------|
| `Config.gs` | Cấu hình, localization |
| `Utils.gs` | Telegram API, helpers |
| `Features.gs` | Report, Budget, Categories |
| `Handlers.gs` | Message/callback handlers |
| `App.gs` | VCB automation |
| `VCB.gs` | VCB API integration |
| `Lib.gs` | Crypto utilities |

3. Lưu (Ctrl+S), đặt tên `SaoKeChiTieuBot`

---

## 🔑 Bước 3: Cấu Hình Script Properties

1. Vào **Project Settings** (⚙️) → **Script Properties**
2. Thêm các thuộc tính:

| Property | Value | Mô tả |
|----------|-------|-------|
| `BOT_TOKEN` | `123456:ABC...` | Token từ BotFather |
| `MY_CHAT_ID` | `12345678` | ID admin (chat @userinfobot) |
| `SHEET_ID` | `xxx` | Master Sheet ID |
| `BOT_EMAIL` | `email@gmail.com` | Email nhận share từ users |

### 🏦 VCB Integration (Tùy chọn)
| Property | Value |
|----------|-------|
| `VCB_USER` | Số điện thoại VCB |
| `VCB_PASS` | Mật khẩu VCB |
| `VCB_ACC` | Số tài khoản |

> Cần lấy `browserId` từ: https://netrotion.github.io/VCB-BrowserID/

---

## 🌐 Bước 4: Deploy Web App

1. **Deploy** → **New deployment**
2. Loại: **Web app**
3. Cấu hình:
   - Execute as: **Me**
   - Who has access: **Anyone**
4. Deploy → Copy **Web App URL**

---

## 🔗 Bước 5: Kết Nối Webhook

Mở trình duyệt, dán:
```
https://api.telegram.org/bot[BOT_TOKEN]/setWebhook?url=[WEB_APP_URL]
```

Thành công khi thấy: `{"ok":true}`

---

## 📝 Bước 6: Chạy Setup Functions

Trong Apps Script, chạy **từng hàm** một lần:

```javascript
setupWebhook()              // Kết nối webhook
setupCommands()             // Tạo menu lệnh Telegram
setupHourlyReminderTrigger() // Trigger nhắc nhở
setupDailyRecurringTrigger() // Trigger chi tiêu định kỳ
setupVCBTrigger()           // (VCB) Check balance mỗi 10 phút
```

**Cách chạy:**
1. Chọn tên hàm trên dropdown
2. Bấm **Run**
3. Cấp quyền nếu được yêu cầu

---

## 📊 Cấu Trúc Master Sheet

Tạo Google Sheet mới làm Master DB với các sheet:

| Sheet | Cột |
|-------|-----|
| `Users` | TelegramID, SheetID, Name, JoinedDate, Language, ReminderTime |

> Bot sẽ tự tạo sheet này khi có user đầu tiên kết nối.

---

## ✅ Hoàn Tất!

1. Chat với bot → `/start`
2. Tạo Google Sheet riêng
3. Share **Editor** cho `BOT_EMAIL`
4. Gõ `/connect [Sheet_ID]`

---

## 🔧 Troubleshooting

### Bot không phản hồi
- Kiểm tra `BOT_TOKEN` đúng chưa
- Webhook đã set chưa? Chạy `setupWebhook()`
- Deploy mới nhất chưa? Re-deploy nếu thay đổi code

### Lỗi "Cannot access Sheet"
- User đã share **Editor** chưa?
- `SHEET_ID` (master) đúng chưa?

### VCB không hoạt động
- Đã cập nhật `browserId` chưa?
- Captcha API còn hoạt động không?
- Xem Log: **View** → **Logs**

---

## 📄 License

MIT License - Free to use and modify!
