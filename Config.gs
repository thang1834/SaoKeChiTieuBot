/**
 * ============================================================================
 * Config.gs - CẤU HÌNH VÀ HẰNG SỐ
 * ============================================================================
 * File này chứa tất cả cấu hình, hằng số và văn bản đa ngôn ngữ cho bot.
 * Không chứa logic xử lý, chỉ chứa dữ liệu cấu hình.
 * 
 * CẤU TRÚC:
 * - CONFIG: Object chứa tất cả cấu hình (lấy từ Script Properties)
 * - TEXT: Object chứa văn bản đa ngôn ngữ (vi/en)
 * - Helper functions: getUserLang, setUserLang, t (translate)
 */

// =============================================================================
// CẤU HÌNH CHÍNH
// =============================================================================
// Tất cả giá trị nhạy cảm được lưu trong Script Properties để bảo mật
// Vào Project Settings > Script Properties để cấu hình

var CONFIG = {
  // --- VCB INTEGRATION ---
  // Thông tin đăng nhập Vietcombank Mobile Banking
  VCB_USER: PropertiesService.getScriptProperties().getProperty('VCB_USER') || '',
  VCB_PASS: PropertiesService.getScriptProperties().getProperty('VCB_PASS') || '',
  VCB_ACC: PropertiesService.getScriptProperties().getProperty('VCB_ACC') || '',
  
  // HuggingFace API để giải captcha VCB tự động
  HF_API: 'https://thangnd163063-captcha.hf.space/predict',
  
  // --- TELEGRAM ---
  // Token lấy từ @BotFather
  BOT_TOKEN: PropertiesService.getScriptProperties().getProperty('BOT_TOKEN'),
  
  // Chat ID của admin (nhận thông báo donate, lỗi hệ thống)
  ADMIN_CHAT_ID: PropertiesService.getScriptProperties().getProperty('MY_CHAT_ID'),
  
  // --- GOOGLE SHEETS ---
  // ID của Master Sheet (chứa danh sách Users)
  MASTER_SHEET_ID: PropertiesService.getScriptProperties().getProperty('SHEET_ID'),
  
  // Email của bot (users share Sheet cho email này)
  BOT_EMAIL: PropertiesService.getScriptProperties().getProperty('BOT_EMAIL') || 'your_email@gmail.com',
  
  // --- CÀI ĐẶT ỨNG DỤNG ---
  DEFAULT_LANG: 'vi',           // Ngôn ngữ mặc định
  CACHE_DURATION: 21600,        // Thời gian cache (6 giờ = 21600 giây)
  PAGE_SIZE: 10,                // Số item mỗi trang khi phân trang
  
  // --- HẠNG MỤC MẶC ĐỊNH ---
  // Sử dụng khi user chưa tạo custom categories
  EXPENSE_CATEGORIES: ["Ăn uống", "Học tập", "Nhà cửa", "Y tế", "Giải trí", "Khác"],
  INCOME_CATEGORIES: ["Lương", "Thưởng", "Đầu tư", "Donate", "Khác"],
  
  // --- MÀU BIỂU ĐỒ ---
  // Dùng cho QuickChart API
  CHART_COLORS: [
    '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', 
    '#FF9F40', '#7CFC00', '#FF69B4', '#00CED1', '#FFD700'
  ]
};

// =============================================================================
// VĂN BẢN ĐA NGÔN NGỮ (LOCALIZATION)
// =============================================================================
// Hỗ trợ: Tiếng Việt (vi) và English (en)
// Mỗi user có thể chọn ngôn ngữ riêng

var TEXT = {
  // --- TIẾNG VIỆT ---
  vi: {
    // Thông báo kết nối
    unauth: "⛔ Bạn chưa kết nối Sheet!\n1. Tạo Google Sheet mới.\n2. Share quyền **Editor** cho email: `" + CONFIG.BOT_EMAIL + "`\n3. Copy Sheet ID.\n4. Gõ: `/connect [Sheet_ID]`",
    connect_success: "✅ **Kết nối thành công!**\nBot đã tạo sẵn các sheet cần thiết. Hãy bắt đầu nhập chi tiêu!",
    connect_fail: "⛔ **Lỗi kết nối!**\nKhông thể truy cập Sheet ID này. Hãy Share quyền **Editor** cho `" + CONFIG.BOT_EMAIL + "`.",
    
    // Thông báo lưu
    saved: "✅ **Đã lưu chi:**",
    saved_in: "💰 **Đã lưu thu:**",
    
    // Báo cáo
    report_header: "📊 **BÁO CÁO THÁNG**",
    total_in: "💰 THU:",
    total_out: "💸 CHI:",
    balance: "💎 **DƯ:**",
    
    // Ngân sách
    budget_alert: "⚠️ **BÁO ĐỘNG**: Vượt ngân sách!",
    budget_warning: "⚠️ **Sắp hết tiền**: Đã dùng",
    
    // Danh sách
    no_data: "📭 Không có dữ liệu.",
    list_header: "📅 GD Tháng",
    
    // Nhắc nhở
    reminder_set: "⏰ Đã đặt nhắc nhở hàng ngày lúc",
    reminder_off: "🔕 Đã tắt nhắc nhở.",
    
    // Export
    export_msg: "📂 **Dữ liệu của bạn đây:**\n",
    
    // Lỗi
    invalid_num: "❌ Số không hợp lệ.",
    invalid_time: "❌ Giờ không hợp lệ (VD: 21:30).",
    
    // Xóa/Undo
    undo_confirm: "🗑 Xác nhận xóa mục cuối?",
    deleted: "🗑 Đã xóa.",
    cancel_undo: "☕ Đã hủy lệnh xóa.",
    
    // Tìm kiếm
    search_result: "Kết quả tìm kiếm:",
    not_found: "Không tìm thấy",
    
    // UI
    choose_cat: "Lưu vào hạng mục nào?",
    choose_lang: "🌐 Chọn ngôn ngữ / Choose language:",
    lang_set: "🇻🇳 Đã chuyển sang Tiếng Việt.",
    donate_msg: "🙏 **Cảm ơn bạn đã ủng hộ!**\nQuét mã QR bên dưới để chuyển khoản:",
    
    // Hướng dẫn sử dụng
    help: "🌟 **HƯỚNG DẪN SỬ DỤNG CHI TIẾT** 🌟\n\n" +
          "**1️⃣ KẾT NỐI DATABASE**\n" +
          "- B1: Tạo Google Sheet mới.\n" +
          "- B2: Share quyền *Editor* cho `ducthang01052002@gmail.com`\n" +
          "- B3: Copy Sheet ID (dãy ký tự giữa `/d/` và `/edit` trên URL).\n" +
          "- B4: Gõ `/connect [SheetID]`\n\n" +
          
          "**2️⃣ GHI CHÉP CHI TIÊU** (Hàng ngày)\n" +
          "- Gõ nhanh: `50k cafe`, `200k tiền điện`\n" +
          "- Xóa nếu sai: `/undo` (mục cuối) hoặc `/delete [ID]`\n" +
          "- Xem lại: `/list` (tháng này) hoặc `/search cafe`\n\n" +
          
          "**3️⃣ GHI THU NHẬP**\n" +
          "- Gõ: `/in 10m lương tháng 1`\n" +
          "- Xem: `/listin`\n\n" +
          
          "**4️⃣ QUẢN LÝ HẠNG MỤC**\n" +
          "- Thêm hạng mục chi: `/category add [Tên]`\n" +
          "- Xóa hạng mục chi: `/category del [Tên]`\n" +
          "- Thêm hạng mục thu: `/category in add [Tên]`\n\n" +
          
          "**5️⃣ NGÂN SÁCH (Budget)**\n" +
          "- Đặt tổng: `/budget 5m`\n" +
          "- Đặt riêng hạng mục: `/budget 2m Ăn uống`\n" +
          "⚠️ Bot sẽ cảnh báo khi bạn chi tiêu vượt mức!\n\n" +
          
          "**6️⃣ TÍNH NĂNG KHÁC**\n" +
          "- 🍰 **Chia tiền**: `/split 500k 4 ăn tối` (chia 500k cho 4 người)\n" +
          "- 🏆 **Mục tiêu**: `/goal add 50m Mua xe 12/2025`\n" +
          "- 🔄 **Định kỳ**: `/recurring add 2m Tiền nhà monthly 1`\n" +
          "- 📒 **Sổ nợ**: `/debt borrow 500k Name` | `/debt lend 1m Name` | `/debt list` | `/debt repay ID`\n" +
          "- ⏰ **Nhắc nhở**: `/remind 21:00`\n" +
          "- 📊 **Báo cáo**: `/report` (Auto)\n" +
          "- 📤 **Backup/Export**: `/backup` | `/export pdf` | `/export csv`\n\n" +
          "🌐 `/lang` (Đổi ngôn ngữ) | ❤️ `/donate`"
  },
  
  // --- ENGLISH ---
  en: {
    unauth: "⛔ Sheet not connected!\n1. Create a new Google Sheet.\n2. Share **Editor** access to: `" + CONFIG.BOT_EMAIL + "`\n3. Copy Sheet ID.\n4. Type: `/connect [Sheet_ID]`",
    connect_success: "✅ **Connected successfully!**\nDatabase initialized. Start tracking now!",
    connect_fail: "⛔ **Connection failed!**\nCannot access this Sheet. Please share **Editor** access with `" + CONFIG.BOT_EMAIL + "`.",
    saved: "✅ **Saved Expense:**",
    saved_in: "💰 **Saved Income:**",
    report_header: "📊 **MONTHLY REPORT**",
    total_in: "💰 IN:",
    total_out: "💸 OUT:",
    balance: "💎 **BAL:**",
    budget_alert: "⚠️ **ALERT**: Over budget!",
    budget_warning: "⚠️ **Warning**: Used",
    no_data: "📭 No data available.",
    list_header: "📅 Trans Month",
    reminder_set: "⏰ Daily reminder set at",
    reminder_off: "🔕 Reminder turned off.",
    export_msg: "📂 **Here is your data:**\n",
    invalid_num: "❌ Invalid number.",
    invalid_time: "❌ Invalid time (Ex: 21:30).",
    undo_confirm: "🗑 Confirm delete last item?",
    deleted: "🗑 Deleted.",
    cancel_undo: "☕ Delete cancelled.",
    search_result: "Search results:",
    not_found: "Not found",
    choose_cat: "Choose category?",
    choose_lang: "🌐 Choose language / Chọn ngôn ngữ:",
    lang_set: "🇬🇧 Language switched to English.",
    donate_msg: "🙏 **Thank you for your support!**\nScan the QR code below to donate:",
    help: "🌟 **USER GUIDE** 🌟\n\n" +
          "📌 **CONNECTION**\n`/connect [SheetID]`\n\n" +
          "💸 **EXPENSES**\n`50k coffee` - Log\n`/list` `/undo` `/delete [ID]` `/search`\n\n" +
          "💰 **INCOME**\n`/in 10m salary` - Log\n`/listin` `/undoin` `/deletein` `/searchin`\n\n" +
          "📊 **REPORTS**\n`/report` `/filter` `/export`\n\n" +
          "🎯 **BUDGET**\n`/budget [amount] [category]`\n\n" +
          "📂 **CATEGORIES**\n`/category` - View\n`/category add/del [name]` - Expense\n`/category in add/del [name]` - Income\n\n" +
          "🔄 **RECURRING**\n`/recurring` - View\n`/recurring add 2m rent monthly 1`\n\n" +
          "🍰 **SPLIT BILL**\n`/split 500k 4 dinner`\n\n" +
          "🏆 **GOALS**\n`/goal list`\n`/goal add 100m Car 12/2025`\n`/goal deposit ID 2m`\n\n" +
          "📒 **DEBT**\n`/debt borrow/lend [amount] [name]`\n`/debt list` `/debt repay [ID]`\n\n" +
          "⏰ `/remind 21:00` `/stopremind`\n🌐 `/lang` | ❤️ `/donate`"
  }
};

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Lấy giá trị cấu hình theo key
 * @param {string} key - Tên config cần lấy
 * @returns {*} Giá trị config
 */
function getConfig(key) {
  return CONFIG[key];
}

/**
 * Lấy ngôn ngữ của user (có cache)
 * Thứ tự ưu tiên: Cache > Users Sheet > Default
 * 
 * @param {string|number} telegramId - Telegram ID của user
 * @returns {string} Mã ngôn ngữ ('vi' hoặc 'en')
 */
function getUserLang(telegramId) {
  var cache = CacheService.getScriptCache();
  var lang = cache.get("lang_" + telegramId);
  
  // Nếu có trong cache, trả về luôn
  if (lang) return lang;
  
  // Tìm trong Users sheet
  try {
    var ss = SpreadsheetApp.openById(CONFIG.MASTER_SHEET_ID);
    var sheet = ss.getSheetByName('Users');
    if (sheet) {
      var data = sheet.getDataRange().getValues();
      for (var i = 1; i < data.length; i++) {
        // Column E (index 4) = Language
        if (String(data[i][0]) === String(telegramId) && data[i][4]) {
          // Lưu vào cache để lần sau nhanh hơn
          cache.put("lang_" + telegramId, data[i][4], CONFIG.CACHE_DURATION);
          return data[i][4];
        }
      }
    }
  } catch (e) {
    // Lỗi thì dùng default
  }
  
  return CONFIG.DEFAULT_LANG;
}

/**
 * Đặt ngôn ngữ cho user
 * Lưu vào cả Cache và Users Sheet
 * 
 * @param {string|number} telegramId - Telegram ID của user
 * @param {string} lang - Mã ngôn ngữ ('vi' hoặc 'en')
 */
function setUserLang(telegramId, lang) {
  // Lưu vào cache (nhanh cho các request tiếp theo)
  CacheService.getScriptCache().put("lang_" + telegramId, lang, CONFIG.CACHE_DURATION);
  
  // Lưu vào Users sheet (persistent)
  try {
    var ss = SpreadsheetApp.openById(CONFIG.MASTER_SHEET_ID);
    var sheet = ss.getSheetByName('Users');
    if (sheet) {
      var data = sheet.getDataRange().getValues();
      for (var i = 1; i < data.length; i++) {
        if (String(data[i][0]) === String(telegramId)) {
          sheet.getRange(i + 1, 5).setValue(lang); // Column E = Language
          return;
        }
      }
    }
  } catch (e) {
    // Lỗi không quan trọng, cache vẫn hoạt động
  }
}

/**
 * Dịch text theo ngôn ngữ của user
 * Shorthand function để lấy text đã localize
 * 
 * @param {string} key - Key của text trong TEXT object
 * @param {string|number} telegramId - Telegram ID để xác định ngôn ngữ
 * @returns {string} Text đã được dịch
 * 
 * @example
 * t('saved', 123456) // "✅ **Đã lưu chi:**" nếu user dùng tiếng Việt
 */
function t(key, telegramId) {
  var lang = telegramId ? getUserLang(telegramId) : CONFIG.DEFAULT_LANG;
  return (TEXT[lang] && TEXT[lang][key]) ? TEXT[lang][key] : (TEXT['vi'][key] || key);
}
