/**
 * ============================================================================
 * Utils.gs - HÀM TIỆN ÍCH
 * ============================================================================
 * File này chứa các hàm tiện ích dùng chung trong toàn bộ ứng dụng:
 * - Telegram API helpers (gửi tin nhắn, ảnh, keyboard)
 * - Input parsing & validation (parse số tiền, ngày tháng)
 * - Sheet helpers (tạo sheet, lấy sheet ID của user)
 * - Error handling wrapper
 */

// =============================================================================
// TELEGRAM API HELPERS
// =============================================================================
// Các hàm giao tiếp với Telegram Bot API
// Tất cả đều dùng UrlFetchApp để gọi REST API

/**
 * Gửi tin nhắn text đến user
 * @param {string|number} cid - Chat ID (Telegram ID của user)
 * @param {string} txt - Nội dung tin nhắn (hỗ trợ Markdown)
 */
function sendText(cid, txt) {
  try {
    UrlFetchApp.fetch("https://api.telegram.org/bot" + CONFIG.BOT_TOKEN + "/sendMessage", { 
      method: "post", 
      payload: { 
        chat_id: String(cid), 
        text: txt, 
        parse_mode: "Markdown"  // Hỗ trợ **bold**, _italic_, `code`
      } 
    });
  } catch (e) {
    Logger.log("sendText Error: " + e);
  }
}

/**
 * Gửi ảnh đến user (dùng cho biểu đồ, QR code)
 * @param {string|number} cid - Chat ID
 * @param {string} url - URL của ảnh
 * @param {string} caption - Chú thích bên dưới ảnh (Markdown)
 */
function sendPhoto(cid, url, caption) {
  try {
    UrlFetchApp.fetch("https://api.telegram.org/bot" + CONFIG.BOT_TOKEN + "/sendPhoto", { 
      method: "post", 
      payload: { 
        chat_id: String(cid), 
        photo: url, 
        caption: caption, 
        parse_mode: "Markdown" 
      } 
    });
  } catch (e) {
    Logger.log("sendPhoto Error: " + e);
  }
}

/**
 * Gửi tin nhắn với Inline Keyboard (các nút bấm)
 * @param {string|number} cid - Chat ID
 * @param {string} txt - Nội dung tin nhắn
 * @param {Object} kb - Keyboard object {inline_keyboard: [[{text, callback_data}]]}
 */
function sendMessageKb(cid, txt, kb) {
  try {
    UrlFetchApp.fetch("https://api.telegram.org/bot" + CONFIG.BOT_TOKEN + "/sendMessage", { 
      method: "post", 
      payload: { 
        chat_id: String(cid), 
        text: txt, 
        reply_markup: JSON.stringify(kb),  // Phải stringify keyboard object
        parse_mode: "Markdown"
      } 
    });
  } catch (e) {
    Logger.log("sendMessageKb Error: " + e);
  }
}

/**
 * Chỉnh sửa tin nhắn đã gửi (dùng cho pagination, undo)
 * @param {string|number} cid - Chat ID
 * @param {number} mid - Message ID của tin nhắn cần sửa
 * @param {string} txt - Nội dung mới
 */
function editMessage(cid, mid, txt) {
  try {
    UrlFetchApp.fetch("https://api.telegram.org/bot" + CONFIG.BOT_TOKEN + "/editMessageText", { 
      method: "post", 
      payload: { 
        chat_id: String(cid), 
        message_id: mid, 
        text: txt, 
        parse_mode: "Markdown" 
      } 
    });
  } catch (e) {
    Logger.log("editMessage Error: " + e);
  }
}

/**
 * Trả lời callback query (xóa loading indicator khi user bấm nút)
 * Phải gọi sau mỗi callback để Telegram không show "loading..."
 * @param {string} id - Callback Query ID
 */
function answerCallback(id) {
  try {
    UrlFetchApp.fetch("https://api.telegram.org/bot" + CONFIG.BOT_TOKEN + "/answerCallbackQuery", { 
      method: "post", 
      payload: { 
        callback_query_id: id 
      } 
    });
  } catch (e) {
    Logger.log("answerCallback Error: " + e);
  }
}

// =============================================================================
// INPUT PARSING & VALIDATION
// =============================================================================
// Các hàm xử lý và validate input từ user

/**
 * Parse số tiền từ input của user
 * Hỗ trợ các format: 50, 50k, 50K, 2m, 2M, 2.5m, 50,000
 * 
 * @param {string} input - Input từ user (VD: "50k", "2m", "100000")
 * @returns {number|null} Số tiền đã parse, hoặc null nếu không hợp lệ
 * 
 * @example
 * parseAmount("50k")     // 50000
 * parseAmount("2m")      // 2000000
 * parseAmount("2.5m")    // 2500000
 * parseAmount("abc")     // null
 */
function parseAmount(input) {
  if (!input) return null;
  
  // Chuyển về lowercase và trim
  var txt = String(input).toLowerCase().trim();
  
  // Regex: số (có thể có . hoặc ,) + suffix tùy chọn (k hoặc m)
  var match = txt.match(/^([0-9.,]+)\s*(k|m)?/);
  
  if (!match) return null;
  
  // Parse số, loại bỏ dấu phẩy
  var num = parseFloat(match[1].replace(/,/g, ''));
  if (isNaN(num) || num <= 0) return null;
  
  // Áp dụng multiplier
  var multiplier = 1;
  if (match[2] === 'k') multiplier = 1000;      // k = nghìn
  if (match[2] === 'm') multiplier = 1000000;   // m = triệu
  
  return num * multiplier;
}

/**
 * Format số tiền theo định dạng Việt Nam
 * @param {number} amount - Số tiền cần format
 * @returns {string} Chuỗi đã format (VD: "1.234.567")
 * 
 * @example
 * formatMoney(1234567) // "1.234.567"
 */
function formatMoney(amount) {
  if (amount === null || amount === undefined) return '0';
  return Number(amount).toLocaleString('vi-VN');
}

/**
 * Parse argument tháng/năm từ lệnh
 * Hỗ trợ: "", "12", "12/2025"
 * 
 * @param {string} arg - Argument (VD: "12/2025", "12", "")
 * @returns {Object} {month: number, year: number}
 * 
 * @example
 * parseDateArg("")        // {month: currentMonth, year: currentYear}
 * parseDateArg("12")      // {month: 12, year: currentYear}
 * parseDateArg("12/2025") // {month: 12, year: 2025}
 */
function parseDateArg(arg) {
  var now = new Date();
  var month = now.getMonth() + 1;  // getMonth() trả về 0-11
  var year = now.getFullYear();
  
  if (arg) {
    var parts = arg.split("/");
    if (parts.length === 2) {
      // Format: MM/YYYY
      month = parseInt(parts[0]) || month;
      year = parseInt(parts[1]) || year;
    } else if (parts.length === 1) {
      // Format: MM (year = năm hiện tại)
      month = parseInt(parts[0]) || month;
    }
  }
  return { month: month, year: year };
}

/**
 * Làm sạch input để tránh injection
 * Loại bỏ các ký tự nguy hiểm và giới hạn độ dài
 * 
 * @param {string} input - Input cần sanitize
 * @returns {string} Input đã được làm sạch
 */
function sanitizeInput(input) {
  if (!input) return '';
  // Loại bỏ <, >, ', " và giới hạn 500 ký tự
  return String(input).replace(/[<>'"]/g, '').trim().substring(0, 500);
}

// =============================================================================
// SHEET HELPERS
// =============================================================================
// Các hàm làm việc với Google Sheets

/**
 * Lấy hoặc tạo sheet cho user
 * Nếu sheet chưa tồn tại, sẽ tạo mới với header phù hợp
 * 
 * @param {string} targetSheetId - ID của Google Spreadsheet
 * @param {string} name - Tên sheet cần lấy/tạo
 * @returns {GoogleAppsScript.Spreadsheet.Sheet} Sheet object
 */
function getOrCreateSheetForUser(targetSheetId, name) {
  var ss = SpreadsheetApp.openById(targetSheetId);
  var sheet = ss.getSheetByName(name);
  
  // Nếu chưa có, tạo mới với header
  if (!sheet) {
    sheet = ss.insertSheet(name);
    
    // Thêm header tùy theo loại sheet
    if (name === 'Income') {
      sheet.appendRow(["STT", "Thời gian", "Số tiền", "Hạng mục", "Ghi chú"]);
    } else if (name === 'Expense') {
      sheet.appendRow(["STT", "Ngày", "Số tiền", "Hạng mục", "Ghi chú"]);
    } else if (name === 'Budget') {
      sheet.appendRow(["STT", "Category", "Limit"]);
    } else if (name === 'Categories') {
      sheet.appendRow(["STT", "Name", "Type", "Active"]);
    } else if (name === 'Recurring') {
      sheet.appendRow(["STT", "Số tiền", "Hạng mục", "Ghi chú", "Tần suất", "Ngày", "Active", "LastRun"]);
    }
  }
  return sheet;
}

/**
 * Lấy Sheet ID của user từ Master Sheet
 * Có sử dụng cache để tăng tốc
 * 
 * @param {string|number} telegramId - Telegram ID của user
 * @returns {string|null} Sheet ID hoặc null nếu chưa đăng ký
 */
function getUserSheetId(telegramId) {
  var cache = CacheService.getScriptCache();
  
  // Thử lấy từ cache trước
  var cachedId = cache.get("user_" + telegramId);
  if (cachedId) return cachedId;

  // Nếu không có Master Sheet, return null
  if (!CONFIG.MASTER_SHEET_ID) return null;
  
  try {
    var ss = SpreadsheetApp.openById(CONFIG.MASTER_SHEET_ID);
    var sheet = ss.getSheetByName('Users');
    
    // Nếu chưa có sheet Users, tạo mới
    if (!sheet) { 
      ss.insertSheet('Users').appendRow(['TelegramID', 'SheetID', 'Name', 'JoinedDate', 'Language', 'ReminderTime']); 
      return null; 
    }
    
    // Tìm user trong danh sách
    var data = sheet.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][0]) === String(telegramId)) {
        // Lưu vào cache để lần sau nhanh hơn
        cache.put("user_" + telegramId, data[i][1], CONFIG.CACHE_DURATION);
        return data[i][1];  // Column B = SheetID
      }
    }
  } catch (e) {
    Logger.log("getUserSheetId Error: " + e);
  }
  return null;
}

/**
 * Đăng ký user mới (khi user gọi /connect)
 * - Kiểm tra quyền truy cập Sheet
 * - Tạo các sheet cần thiết (Expense, Income)
 * - Lưu thông tin vào Master Sheet
 * 
 * @param {string|number} telegramId - Telegram ID
 * @param {string} sheetId - ID của Google Sheet user muốn kết nối
 * @param {string} name - Tên user (từ Telegram)
 * @returns {boolean} true nếu thành công, false nếu thất bại
 */
function registerUser(telegramId, sheetId, name) {
  try {
    Logger.log("Registering user: " + telegramId + " with Sheet: " + sheetId);
    
    // Bước 1: Kiểm tra quyền truy cập Sheet của user
    var ss;
    try {
      ss = SpreadsheetApp.openById(sheetId);
      Logger.log("User Sheet opened: " + ss.getName());
    } catch (e) {
      // Không có quyền hoặc ID sai
      Logger.log("Cannot open user Sheet: " + e);
      return false;
    }
    
    // Bước 2: Tạo tất cả sheets cần thiết
    getOrCreateSheetForUser(sheetId, 'Expense');
    getOrCreateSheetForUser(sheetId, 'Income');
    getOrCreateSheetForUser(sheetId, 'Budget');
    getOrCreateSheetForUser(sheetId, 'Categories');
    
    // Tạo default categories nếu Categories mới được tạo
    try {
      var catSheet = ss.getSheetByName('Categories');
      if (catSheet && catSheet.getLastRow() <= 1) {
        // Add default expense categories
        for (var i = 0; i < CONFIG.EXPENSE_CATEGORIES.length; i++) {
          catSheet.appendRow([catSheet.getLastRow(), CONFIG.EXPENSE_CATEGORIES[i], 'expense', true]);
        }
        // Add default income categories
        for (var i = 0; i < CONFIG.INCOME_CATEGORIES.length; i++) {
          catSheet.appendRow([catSheet.getLastRow(), CONFIG.INCOME_CATEGORIES[i], 'income', true]);
        }
      }
    } catch(e) {
      Logger.log("Init categories error: " + e);
    }
    
    // Bước 3: Lưu vào Master Database (nếu có cấu hình)
    if (CONFIG.MASTER_SHEET_ID) {
      try {
        var master = SpreadsheetApp.openById(CONFIG.MASTER_SHEET_ID);
        var usersSheet = master.getSheetByName('Users');
        
        // Tạo sheet Users nếu chưa có
        if (!usersSheet) {
          usersSheet = master.insertSheet('Users');
          usersSheet.appendRow(['TelegramID', 'SheetID', 'Name', 'JoinedDate', 'Language', 'ReminderTime']);
        }
        
        // Kiểm tra user đã tồn tại chưa
        var data = usersSheet.getDataRange().getValues();
        var exists = false;
        for (var i = 1; i < data.length; i++) {
          if (String(data[i][0]) === String(telegramId)) {
            // User đã tồn tại, cập nhật Sheet ID
            usersSheet.getRange(i + 1, 2).setValue(sheetId);
            exists = true; 
            break;
          }
        }
        
        // Nếu là user mới, thêm dòng mới
        if (!exists) {
          usersSheet.appendRow([
            String(telegramId), 
            sheetId, 
            name, 
            new Date(), 
            CONFIG.DEFAULT_LANG, 
            null  // ReminderTime
          ]);
        }
      } catch (e) {
        Logger.log("Master Sheet error: " + e);
        // Không critical, vẫn cho phép sử dụng
      }
    }
    
    // Bước 4: Cập nhật cache
    CacheService.getScriptCache().put("user_" + telegramId, sheetId, CONFIG.CACHE_DURATION);
    
    return true;
  } catch (e) {
    Logger.log("Register Error: " + e);
    return false;
  }
}

// =============================================================================
// ERROR HANDLING
// =============================================================================

/**
 * Wrapper để thực thi hàm an toàn
 * Bắt tất cả exception và thông báo lỗi cho user
 * 
 * @param {Function} fn - Hàm cần thực thi
 * @param {string|number} cid - Chat ID để gửi thông báo lỗi
 * @returns {*} Kết quả của fn() hoặc null nếu có lỗi
 */
function safeExecute(fn, cid) {
  try {
    return fn();
  } catch (e) {
    Logger.log("Error: " + e.stack);
    sendText(cid, "❌ Đã xảy ra lỗi. Vui lòng thử lại sau.");
    return null;
  }
}

/**
 * Gửi báo cáo lỗi chi tiết về cho Admin
 * @param {Error} e - Exception object
 * @param {string} context - Ngữ cảnh xảy ra lỗi (VD: "doPost", "saveExpense")
 */
function logErrorToAdmin(e, context) {
  var adminId = CONFIG.ADMIN_CHAT_ID;
  if (!adminId) return;
  
  var msg = "🚨 **SYSTEM ERROR** 🚨\n" +
            "📍 Context: `" + context + "`\n" +
            "❌ Message: `" + e.message + "`\n" +
            "📜 Stack: ```\n" + e.stack + "\n```";
            
  try {
    UrlFetchApp.fetch("https://api.telegram.org/bot" + CONFIG.BOT_TOKEN + "/sendMessage", { 
      method: "post", 
      payload: { chat_id: String(adminId), text: msg, parse_mode: "Markdown" } 
    });
  } catch (err) {
    Logger.log("Failed to send error log to admin: " + err);
  }
}
