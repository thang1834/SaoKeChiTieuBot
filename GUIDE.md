# 📖 Hướng Dẫn Sử Dụng SaoKeChiTieuBot

Chào mừng bạn đến với **SaoKeChiTieuBot**! Để bắt đầu quản lý tài chính, bạn cần kết nối Bot với Google Sheet của riêng bạn. Dữ liệu của bạn được bảo mật và chỉ bạn mới có quyền truy cập.

---

## 🚀 Bước 1: Tạo Nơi Lưu Trữ (Google Sheet)

1.  Truy cập [Google Sheets](https://sheets.google.com) và tạo một file mới.
2.  Đặt tên tùy ý (ví dụ: `ChiTieu2024`).
3.  **Quan trọng**: Nhấn nút **Chia sẻ (Share)** ở góc phải:
    *   Nhập email bot: `ducthang01052002@gmail.com`
    *   Chọn quyền: **Người chỉnh sửa (Editor)**.
    *   Nhấn **Gửi (Send)**.
    *   *(Hoặc: Chọn "Bất kỳ ai có đường liên kết" -> Quyền Editor, nhưng cách Share Email bảo mật hơn).*
4.  Copy **Sheet ID** trên thanh địa chỉ trình duyệt.
    *   Link dạng: `docs.google.com/spreadsheets/d/`**`1A2B3C...`**`/edit`
    *   ID là đoạn chữ loằng ngoằng ở giữa (ví dụ: `1A2B3C...`).

---

## 🔗 Bước 2: Kết Nối Với Bot

1.  Mở Telegram và chat với Bot: `@SaoKeChiTieu_Bot`.
2.  Gõ lệnh:
    ```
    /connect Dán_Sheet_ID_Của_Bạn_Vào_Đây
    ```
    *(Ví dụ: `/connect 1Y1xgmWBF_BixgryMBlOII64EHGdNgPm9En7Qqll9hPQ`)*

3.  Nếu thành công, Bot sẽ báo **"✅ Kết nối thành công!"**.
    *   Lúc này Bot sẽ tự động tạo các sheet `Expense` và `Income` trong file của bạn.

---

## 💡 Hướng Dẫn Các Lệnh

Sau khi kết nối, bạn dùng bot như bình thường:

*   **💸 Nhập chi tiêu**: Nhắn `50k cafe`, `200k tiền điện`.
*   **💰 Nhập thu nhập**: Nhắn `/in 10m lương`.
*   **📊 Xem báo cáo**: `/report`.
*   **📜 Xem danh sách**: `/list`.
*   **📂 Xuất dữ liệu**: `/export` (Menu chọn: Chi/Thu/Cả hai).
*   **🎯 Thiết lập Ngân sách**:
    *   Đặt tổng: `/budget 10m`
    *   Đặt từng mục: `/budget 2m ăn uống` (Cảnh báo khi tiêu mục này quá 2 triệu).
*   **⏰ Nhắc nhở**: `/remind 21:00`.
*   **💖 Ủng hộ Admin**: `/donate` (Momo/Bank/PayPal).

Chúc bạn quản lý tài chính hiệu quả!
