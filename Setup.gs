/**
 * ============================================================================
 * SETUP SCRIPT PROPERTIES (CHẠY 1 LẦN)
 * ============================================================================
 * Hàm này giúp bạn cài đặt nhanh các biến môi trường thay vì nhập tay.
 * 
 * HƯỚNG DẪN:
 * 1. Điền các giá trị của bạn vào các biến bên dưới.
 * 2. Chọn hàm 'setupEnvironment' trên thanh công cụ và bấm 'Run'.
 * 3. Sau khi chạy xong, xóa hoặc comment lại các giá trị nhạy cảm.
 */

function setupEnvironment() {
  // --- CẤU HÌNH CỦA BẠN (ĐIỀN VÀO ĐÂY) ---
  var ENV = {
    // 1. Telegram Bot Token (Lấy từ @BotFather)
    'BOT_TOKEN': '123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11',

    // 2. ID Telegram của bạn (Lấy từ @userinfobot -> ID)
    'MY_CHAT_ID': '123456789',

    // 3. ID Google Sheet Master (Tạo sheet mới rồi copy ID trên URL)
    'SHEET_ID': '1A2B3C4D5E6F7G8H9I0J1K2L3M4N5O6P7Q8R9S0T',
    
    // 4. Email của Bot (để user share quyền Editor)
    'BOT_EMAIL': 'your_bot_email@gmail.com',

    // 5. Gemini API Key (Tùy chọn - Cho AI/Voice)
    // Lấy tại: https://aistudio.google.com/app/apikey
    'GEMINI_API_KEY': '',
    
    // 6. Vietcombank (Tùy chọn - Nếu dùng tính năng tự động VCB)
    'VCB_USER': '', // Số điện thoại
    'VCB_PASS': '', // Mật khẩu
    'VCB_ACC':  '',  // Số tài khoản
    'VCB_BROWSER_ID': '', // Browser ID (Optional - For persistent login)
    'LAST_VCB_TXN_ID': '', // Track last transaction to avoid dupes

    // 7. Khác
    'LANG': 'vi' // Ngôn ngữ mặc định (vi/en)
  };

  // --- KHÔNG SỬA CODE BÊN DƯỚI ---
  var scriptProperties = PropertiesService.getScriptProperties();
  
  // Xóa các key rỗng để tránh lỗi
  for (var key in ENV) {
    if (ENV[key] === '' || ENV[key] === '...' || ENV[key].includes('123456:ABC')) {
      delete ENV[key];
    }
  }
  
  scriptProperties.setProperties(ENV);
  Logger.log("✅ Đã lưu cấu hình thành công!");
  Logger.log("Danh sách key đã lưu: " + Object.keys(ENV).join(", "));
}
