# 📖 Hướng Dẫn Sử Dụng SaoKeChiTieuBot

Chào mừng bạn đến với **SaoKeChiTieuBot**! Bot miễn phí giúp quản lý tài chính cá nhân trên Telegram.

---

## 🚀 Bước 1: Tạo Google Sheet

1. Truy cập [Google Sheets](https://sheets.google.com) → Tạo file mới
2. Nhấn **Share** → Nhập `ducthang01052002@gmail.com` → Chọn **Editor** → Send
3. Copy **Sheet ID** từ URL: `docs.google.com/spreadsheets/d/`**`1A2B3C...`**`/edit`

---

## 🔗 Bước 2: Kết Nối Bot

1. Mở Telegram → Chat với `@SaoKeChiTieu_Bot`
2. Gõ: `/connect Dán_Sheet_ID_Vào_Đây`
3. Thành công → Bot tự tạo sheets `Expense`, `Income`

---

## 💡 Các Lệnh

### 💸 Chi Tiêu
```
50k cafe                  → Nhập chi tiêu
/undo                     → Xóa mục cuối
/delete 5                 → Xóa theo ID
/search cafe              → Tìm kiếm
```

### 💰 Thu Nhập
```
/in 10m lương             → Nhập thu nhập
/listin                   → Danh sách thu nhập
/undoin                   → Xóa thu nhập cuối
/deletein 5               → Xóa thu nhập ID #5
/searchin lương           → Tìm kiếm thu nhập
```
> 🔒 **Donate** không thể xóa

### 📊 Báo Cáo
```
/report                   → Báo cáo tháng (có biểu đồ)
/report 12/2025           → Báo cáo tháng cụ thể
/list                     → Danh sách giao dịch
/filter                   → Lọc theo hạng mục
/export                   → Xuất file CSV
```

### 🎯 Ngân Sách
```
/budget                   → Xem ngân sách hiện tại
/budget 5m                → Đặt tổng ngân sách
/budget 2m ăn uống        → Đặt riêng cho hạng mục "Ăn uống"
```

### 📂 Hạng Mục Tùy Chỉnh
```
/category                 → Xem danh sách

# Chi tiêu (mặc định)
/category add Cà phê      → Thêm (hoặc kích hoạt lại nếu đã xóa)
/category del Cà phê      → Ẩn (tạm thời ngưng sử dụng)

# Thu nhập
/category in add Thưởng   → Thêm
/category in del Thưởng   → Ẩn
```

### 🔄 Chi Tiêu Định Kỳ
```
/recurring                → Xem danh sách
/recurring add 2m tiền nhà monthly 1
                          → Thêm (monthly/weekly, ngày)
/recurring del 1          → Xóa theo ID
```

### 🍰 Chia Tiền
```
/split 500k 4 ăn lẩu      → Chia 500k cho 4 người
                          → Bot tính hộ: 125k/người
                          → Tạo tin nhắn mẫu để copy
```

### 🏆 Mục Tiêu Tiết Kiệm
```
# Tạo mục tiêu
/goal add 50m Xe 12/2026  → Mục tiêu 50 triệu mua xe

# Xem danh sách
/goal list                → Xem tiến độ %

# Nạp tiền
/goal deposit [ID] 2m     → Nạp 2 triệu vào mục tiêu [ID]
```

### ⏰ Nhắc Nhở
```
/remind 21:00             → Đặt nhắc nhở hàng ngày
/stopremind               → Tắt nhắc nhở
```

### ⚙️ Cài Đặt
```
/lang                     → Đổi ngôn ngữ (VI/EN)
/donate                   → Ủng hộ tác giả
/help                     → Xem hướng dẫn
```

---

## 📝 Ví Dụ Cụ Thể

### Quản lý chi tiêu hàng ngày
```
50k cafe sáng             → Bot hỏi chọn hạng mục
200k điện tháng 12        → Chọn "Nhà cửa"
/undo                     → Nhỡ nhập sai, xóa liền
```

### Đặt ngân sách
```
/budget 10m               → Tổng 10 triệu/tháng
/budget 3m nhà cửa        → Riêng nhà cửa 3 triệu
                          → Bot sẽ cảnh báo khi vượt
```

### Chi tiêu định kỳ (tiền nhà, Netflix...)
```
/recurring add 5m tiền nhà monthly 1
                          → Mỗi ngày 1 hàng tháng tự động thêm
```

### Tiết kiệm mua xe
```
/goal add 100m Camry 2026
/goal deposit <ID> 5m     → Mỗi tháng nạp 5m vào quỹ
/goal list                → Ngắm thanh tiến độ chạy dần lên 100% 🤩
```

---

Chúc bạn quản lý tài chính hiệu quả! 💰
