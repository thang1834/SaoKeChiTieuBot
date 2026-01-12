# 💰 Sao Kê Chi Tiêu Bot (Personal Finance Telegram Bot)

![Status](https://img.shields.io/badge/Status-Active-success)
![Platform](https://img.shields.io/badge/Platform-Google_Apps_Script-blue)
![License](https://img.shields.io/badge/License-MIT-green)

**SaoKeChiTieuBot** (`@SaoKeChiTieu_Bot`) là một trợ lý tài chính cá nhân mạnh mẽ chạy hoàn toàn trên nền tảng Serverless (Google Apps Script), giúp bạn ghi chép chi tiêu, theo dõi thu nhập và quản lý ngân sách ngay trên Telegram.

---

## ✨ Tính Năng Nổi Bật (Key Features)

### 🚀 Core Features
-   **⚡ Multi-User (Đa người dùng)**: Bot hỗ trợ nhiều người dùng cùng lúc. Dữ liệu của mỗi người được lưu trữ riêng biệt trên Google Sheet của chính họ (Privacy First).
-   **📝 Ghi chép nhanh**:
    -   Chi tiêu: `50k cafe`, `200k tiền điện`.
    -   Thu nhập: `/in 10m lương tháng 12`.
-   **📊 Báo cáo trực quan**: Tự động tạo biểu đồ tròn (Pie Chart) và biểu đồ cột (Bar Chart) để phân tích dòng tiền.

### 🛠 Advanced Tools
-   **🎯 Quản lý Ngân sách (Budget)**:
    -   Đặt hạn mức tổng hoặc từng hạng mục (Ví dụ: `2m ăn uống`).
    -   **Real-time Alert**: Cảnh báo ngay lập tức khi bạn tiêu lố ngân sách.
-   **⏰ Nhắc nhở (Reminder)**: Hẹn giờ bot nhắc nhở nhập liệu hàng ngày (`/remind 21:00`).
-   **📂 Xuất dữ liệu (Export)**: Tải file CSV chuẩn UTF-8 (dùng cho Excel) để lưu trữ offline.
-   **🌍 Đa ngôn ngữ**: Hỗ trợ Tiếng Việt & English.

---

## 🗺 Roadmap & To-Do List

Dự án đang được phát triển tích cực. Dưới đây là các tính năng dự kiến trong tương lai:

- [ ] **🤖 AI Integration (Gemini Flash)**:
    -   Tích hợp Google Gemini API để xử lý ngôn ngữ tự nhiên.
    -   *Ví dụ*: "Sáng nay đổ xăng 50k với ăn sáng 35k" -> Bot tự tách thành 2 giao dịch.
- [ ] **🌐 Web Dashboard**:
    -   Xây dựng giao diện Web App (HTML/JS) để xem báo cáo chi tiết và lọc dữ liệu (Custom Date Range).
- [ ] **🔄 Recurring Transactions**:
    -   Tự động ghi lại các khoản chi cố định (Tiền nhà, Netflix, Spotify...).

---

## 🛠 Cài Đặt (Installation)

Bạn không cần biết code để sử dụng! Chỉ cần làm theo hướng dẫn:

👉 **[Xem Hướng Dẫn Chi Tiết (GUIDE.md)](./GUIDE.md)**

1.  Chat với Bot trên Telegram.
2.  Tạo một Google Sheet cá nhân.
3.  Kết nối bằng lệnh `/connect`.

---

## 🛠 Tự Host (Self-Hosting)

Nếu bạn muốn tự chạy Bot trên tài khoản Google của chính mình để hoàn toàn kiểm soát dữ liệu (và miễn phí 100%):

👉 **[Xem Hướng Dẫn Tự Host (SELF_HOSTING.md)](./SELF_HOSTING.md)**

---

## 🤝 Đóng Góp (Contributors)

Dự án được phát triển và duy trì bởi:

*   **Thang Nguyen** - [Create & Maintain]
    *   Github: [thang1834](https://github.com/thang1834)
    *   PayPal: [wonwolf1834](https://paypal.me/wonwolf1834)

Mọi đóng góp (Pull Request, Issue) đều được hoan nghênh!

---

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.
