/**
 * Config.gs
 * Configuration and constants for SaoKeChiTieuBot
 */

// --- CONFIGURATION ---
var CONFIG = {
  // VCB Integration
  VCB_USER: PropertiesService.getScriptProperties().getProperty('VCB_USER') || '',
  VCB_PASS: PropertiesService.getScriptProperties().getProperty('VCB_PASS') || '',
  VCB_ACC: PropertiesService.getScriptProperties().getProperty('VCB_ACC') || '',
  HF_API: 'https://thangnd163063-captcha.hf.space/predict',
  
  // Telegram
  BOT_TOKEN: PropertiesService.getScriptProperties().getProperty('BOT_TOKEN'),
  ADMIN_CHAT_ID: PropertiesService.getScriptProperties().getProperty('MY_CHAT_ID'),
  
  // Google Sheets
  MASTER_SHEET_ID: PropertiesService.getScriptProperties().getProperty('SHEET_ID'),
  BOT_EMAIL: PropertiesService.getScriptProperties().getProperty('BOT_EMAIL') || 'your_email@gmail.com',
  
  // App Settings
  DEFAULT_LANG: 'vi',
  CACHE_DURATION: 21600, // 6 hours
  PAGE_SIZE: 10,
  
  // Categories
  EXPENSE_CATEGORIES: ["Ăn uống", "Học tập", "Nhà cửa", "Y tế", "Giải trí", "Khác"],
  INCOME_CATEGORIES: ["Lương", "Thưởng", "Đầu tư", "Donate", "Khác"],
  
  // Chart colors
  CHART_COLORS: [
    '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', 
    '#FF9F40', '#7CFC00', '#FF69B4', '#00CED1', '#FFD700'
  ]
};

// --- LOCALIZATION ---
var TEXT = {
  vi: {
    unauth: "⛔ Bạn chưa kết nối Sheet!\n1. Tạo Google Sheet mới.\n2. Share quyền **Editor** cho email: `" + CONFIG.BOT_EMAIL + "`\n3. Copy Sheet ID.\n4. Gõ: `/connect [Sheet_ID]`",
    connect_success: "✅ **Kết nối thành công!**\nBot đã tạo sẵn các sheet cần thiết. Hãy bắt đầu nhập chi tiêu!",
    connect_fail: "⛔ **Lỗi kết nối!**\nKhông thể truy cập Sheet ID này. Hãy Share quyền **Editor** cho `" + CONFIG.BOT_EMAIL + "`.",
    saved: "✅ **Đã lưu chi:**",
    saved_in: "💰 **Đã lưu thu:**",
    report_header: "📊 **BÁO CÁO THÁNG**",
    total_in: "💰 THU:",
    total_out: "💸 CHI:",
    balance: "💎 **DƯ:**",
    budget_alert: "⚠️ **BÁO ĐỘNG**: Vượt ngân sách!",
    budget_warning: "⚠️ **Sắp hết tiền**: Đã dùng",
    no_data: "📭 Không có dữ liệu.",
    list_header: "📅 GD Tháng",
    reminder_set: "⏰ Đã đặt nhắc nhở hàng ngày lúc",
    reminder_off: "🔕 Đã tắt nhắc nhở.",
    export_msg: "📂 **Dữ liệu của bạn đây:**\n",
    invalid_num: "❌ Số không hợp lệ.",
    invalid_time: "❌ Giờ không hợp lệ (VD: 21:30).",
    undo_confirm: "🗑 Xác nhận xóa mục cuối?",
    deleted: "🗑 Đã xóa.",
    cancel_undo: "☕ Đã hủy lệnh xóa.",
    search_result: "Kết quả tìm kiếm:",
    not_found: "Không tìm thấy",
    choose_cat: "Lưu vào hạng mục nào?",
    choose_lang: "🌐 Chọn ngôn ngữ / Choose language:",
    lang_set: "🇻🇳 Đã chuyển sang Tiếng Việt.",
    donate_msg: "🙏 **Cảm ơn bạn đã ủng hộ!**\nQuét mã QR bên dưới để chuyển khoản:",
    help: "🌟 **HƯỚNG DẪN SỬ DỤNG** 🌟\n\n" +
          "📌 **KẾT NỐI**\n`/connect [SheetID]` - Kết nối Sheet\n\n" +
          "💸 **CHI TIÊU**\n`50k cafe` - Nhập chi tiêu\n`/undo` - Xóa mục cuối\n`/delete [ID]` - Xóa theo ID\n`/search [từ khóa]` - Tìm kiếm\n\n" +
          "💰 **THU NHẬP**\n`/in 10m lương` - Nhập thu nhập\n\n" +
          "📊 **BÁO CÁO**\n`/report` `/list` `/filter` `/export`\n\n" +
          "🎯 **NGÂN SÁCH**\n`/budget` - Xem/đặt ngân sách\n\n" +
          "📂 **HẠNG MỤC**\n`/category` - Xem danh sách\n`/category add [tên]` - Thêm\n`/category del [tên]` - Xóa\n\n" +
          "🔄 **ĐỊNH KỲ**\n`/recurring` - Xem danh sách\n`/recurring add 2m nhà monthly 1` - Thêm\n`/recurring del [ID]` - Xóa\n\n" +
          "⏰ **NHẮC NHỞ**\n`/remind 21:00` `/stopremind`\n\n" +
          "⚙️ **CÀI ĐẶT**\n`/lang` `/donate`"
  },
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
          "📌 **CONNECTION**\n`/connect [SheetID]` - Connect Sheet\n\n" +
          "💸 **EXPENSES**\n`50k coffee` - Log expense\n`/undo` - Delete last\n`/delete [ID]` - Delete by ID\n`/search [keyword]` - Search\n\n" +
          "💰 **INCOME**\n`/in 10m salary` - Log income\n\n" +
          "📊 **REPORTS**\n`/report` `/list` `/filter` `/export`\n\n" +
          "🎯 **BUDGET**\n`/budget` - View/set budget\n\n" +
          "📂 **CATEGORIES**\n`/category` - List all\n`/category add [name]` - Add\n`/category del [name]` - Delete\n\n" +
          "🔄 **RECURRING**\n`/recurring` - View list\n`/recurring add 2m rent monthly 1` - Add\n`/recurring del [ID]` - Delete\n\n" +
          "⏰ **REMINDERS**\n`/remind 21:00` `/stopremind`\n\n" +
          "⚙️ **SETTINGS**\n`/lang` `/donate`"
  }
};

// --- HELPER FUNCTIONS ---
function getConfig(key) {
  return CONFIG[key];
}

function getUserLang(telegramId) {
  var cache = CacheService.getScriptCache();
  var lang = cache.get("lang_" + telegramId);
  if (lang) return lang;
  
  // Try to get from Users sheet
  try {
    var ss = SpreadsheetApp.openById(CONFIG.MASTER_SHEET_ID);
    var sheet = ss.getSheetByName('Users');
    if (sheet) {
      var data = sheet.getDataRange().getValues();
      for (var i = 1; i < data.length; i++) {
        if (String(data[i][0]) === String(telegramId) && data[i][4]) {
          cache.put("lang_" + telegramId, data[i][4], CONFIG.CACHE_DURATION);
          return data[i][4];
        }
      }
    }
  } catch (e) {}
  
  return CONFIG.DEFAULT_LANG;
}

function setUserLang(telegramId, lang) {
  CacheService.getScriptCache().put("lang_" + telegramId, lang, CONFIG.CACHE_DURATION);
  
  // Also save to Users sheet if exists
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
  } catch (e) {}
}

function t(key, telegramId) {
  var lang = telegramId ? getUserLang(telegramId) : CONFIG.DEFAULT_LANG;
  return (TEXT[lang] && TEXT[lang][key]) ? TEXT[lang][key] : (TEXT['vi'][key] || key);
}
