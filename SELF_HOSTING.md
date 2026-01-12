# 🛠 Hướng Dẫn Tự Host (Self-Hosting) SaoKeChiTieuBot

Bạn muốn tự chạy con bot này trên tài khoản Google của chính mình để hoàn toàn kiểm soát dữ liệu? Hãy làm theo các bước dưới đây. Hoan toàn miễn phí nhờ Google Apps Script!

---

## 📋 Yêu Cầu
1.  Tài khoản Google (Gmail).
2.  Tài khoản Telegram.
3.  Một chút kiên nhẫn (khoảng 10-15 phút).

---

## 🚀 Bước 1: Lấy Token từ BotFather

1.  Mở Telegram, chat với **[@BotFather](https://t.me/BotFather)**.
2.  Gõ `/newbot` để tạo bot mới.
3.  Đặt tên hiển thị (Name) và tên định danh (Username, phải kết thúc bằng `bot`).
4.  **BotFather** sẽ đưa cho bạn một **API Token** (dạng `123456:ABC-DEF...`).
    *   👉 **Lưu lại Token này, tuyệt đối không chia sẻ cho ai!**

---

## ⚙️ Bước 2: Thiết Lập Google Apps Script

1.  Truy cập [script.google.com](https://script.google.com).
2.  Bấm **"Dự án mới" (New Project)**.
3.  Copy toàn bộ nội dung file [`App.gs`](./App.gs) trong repository này và dán vào trình soạn thảo code (thay thế nội dung cũ).
4.  Lưu lại (Ctrl + S), đặt tên dự án là `SaoKeChiTieuBot`.

---

## 🔑 Bước 3: Cấu Hình Biến Môi Trường (Script Properties)

Thay vì điền cứng Token vào code (không an toàn), chúng ta sẽ dùng **Script Properties**:

1.  Trong giao diện Apps Script, nhìn sang thanh bên trái, chọn **Cài đặt dự án (Project Settings)** (biểu tượng bánh răng ⚙️).
2.  Kéo xuống phần **Thuộc tính tập lệnh (Script Properties)**.
3.  Bấm **Thêm thuộc tính (Add script property)** và thêm lần lượt các dòng sau:

| Thuộc tính (Property) | Giá trị (Value) | Mô tả |
| :--- | :--- | :--- |
| `BOT_TOKEN` | `123456:ABC-DEF...` | Token bạn vừa lấy từ BotFather |
| `MY_CHAT_ID` | `12345678` | ID Telegram của bạn (để làm Admin). Chat với `@userinfobot` để lấy ID. |
| `SHEET_ID` | `...` | (Tạm thời để trống hoặc tạo một Sheet mới rồi điền ID vào đây làm Database Master) |
| `LANG` | `vi` | (Tùy chọn) `vi` cho tiếng Việt, `en` cho tiếng Anh |
| `VCB_USER` | `09xxxxxxxxx` | (VCB) Số điện thoại đăng nhập VCB DigiBank |
| `VCB_PASS` | `password` | (VCB) Mật khẩu VCB DigiBank |
| `VCB_ACC` | `9999999999` | (VCB) Số tài khoản ngân hàng |

**Lưu ý về `SHEET_ID`**: Đây là Sheet chủ (Database Master) dùng để lưu danh sách người dùng (Users).
*   Hãy tạo một Google Sheet mới.
*   Copy ID trên URL (đoạn giữa `/d/` và `/edit`).
*   Điền vào thuộc tính `SHEET_ID`.

**🏦 Lưu ý về VCB Integration** (Tùy chọn):
*   Nếu bạn muốn sử dụng tính năng theo dõi biến động VCB, cần thêm 3 thuộc tính VCB ở trên.
*   Cập nhật `browserId` trong file `VCB.gs` (hàm `getBrowserId()`).
*   Lấy browserId từ: https://netrotion.github.io/VCB-BrowserID/ (mở trên trình duyệt đã đăng nhập VCB).
*   Xem thêm: [VCB-API Repository](https://github.com/netrotion/VCB-API)

---

## 🌐 Bước 4: Deploy Web App

Để Telegram có thể gửi tin nhắn đến bot, bạn cần public script này thành Web App.

1.  Bấm nút **Triển khai (Deploy)** (màu xanh góc phải trên) -> **Tùy chọn triển khai mới (New deployment)**.
2.  Chọn loại: **Ứng dụng web (Web app)**.
3.  Điền thông tin:
    *   **Mô tả**: Bot v1.
    *   **Thực thi dưới dạng (Execute as)**: **Tôi (Me)** (Quan trọng!).
    *   **Ai có quyền truy cập (Who has access)**: **Bất kỳ ai (Anyone)** (Bắt buộc để Telegram gọi được API).
4.  Bấm **Triển khai (Deploy)**.
5.  Google sẽ yêu cầu cấp quyền (Authorize access) -> Chọn tài khoản -> Advanced -> Go to ... (unsafe) -> Allow.
6.  Copy **Web App URL** (dạng `https://script.google.com/macros/s/.../exec`).

---

## 🔗 Bước 5: Kết Nối Webhook

Bước cuối cùng là bảo Telegram biết: "Khi có người nhắn tin, hãy gửi dữ liệu đến Web App URL kia".

1.  Mở trình duyệt web, dán đường link sau (thay thế các phần trong ngoặc):
    ```
    https://api.telegram.org/bot[BOT_TOKEN]/setWebhook?url=[WEB_APP_URL]
    ```
    *   Thay `[BOT_TOKEN]` bằng token của bạn.
    *   Thay `[WEB_APP_URL]` bằng URL bạn vừa copy ở Bước 4.
2.  Nhấn Enter. Nếu thấy hiện `{"ok":true, "result":true, "description":"Webhook was set"}` là THÀNH CÔNG! 🎉

---

## 📝 Bước 6: Cài Đặt Menu Lệnh (Tùy chọn)

Để bot hiện menu lệnh xịn xò:

1.  Quay lại Apps Script.
2.  Tìm hàm `setupCommands()` trong code.
3.  Chạy hàm này thủ công một lần bằng cách:
    *   Chọn `setupCommands` trên thanh công cụ (cạnh nút Debug/Run).
    *   Bấm **Chạy (Run)**.

---

## ✅ Hoàn Tất

Bây giờ bạn có thể chat với bot của riêng mình!
*   Gõ `/start` để bắt đầu.
*   Gõ `/connect [Sheet_ID_Của_Bạn]` để kết nối dữ liệu.

Chúc bạn thành công! 🚀
