/**
 * ============================================================================
 * Handlers.gs - XỬ LÝ REQUEST
 * ============================================================================
 * File này chứa các hàm xử lý request từ Telegram:
 * - doPost: Entry point nhận webhook từ Telegram
 * - handleMessage: Xử lý tin nhắn text (commands)
 * - handleCallbackQuery: Xử lý khi user bấm inline button
 * - Reminder functions: Đặt/tắt/kiểm tra nhắc nhở
 * - Setup functions: Thiết lập webhook, commands, triggers
 */

// =============================================================================
// MAIN ENTRY POINT
// =============================================================================

/**
 * Hàm chính nhận webhook từ Telegram
 * Được gọi mỗi khi có tin nhắn mới hoặc user bấm button
 * 
 * @param {Object} e - Event object từ Google Apps Script
 *   e.postData.contents chứa JSON từ Telegram
 */
function doPost(e) {
  try {
    // Kiểm tra token đã cấu hình chưa
    if (!CONFIG.BOT_TOKEN) return;
    
    // Parse JSON từ Telegram
    var data = JSON.parse(e.postData.contents);
    
    // Lấy thông tin sender
    var senderId = data.callback_query ? data.callback_query.from.id : data.message.from.id;
    var senderName = data.callback_query ? data.callback_query.from.first_name : data.message.from.first_name;

    // Phân loại request
    if (data.callback_query) { 
      // User bấm inline button
      handleCallbackQuery(data.callback_query); 
      return; 
    }
    if (data.message && data.message.text) { 
      // User gửi tin nhắn text
      handleMessage(data.message.text, senderId, senderName); 
    }
  } catch (err) { 
    Logger.log("doPost Error: " + err); 
  }
}

// =============================================================================
// MESSAGE HANDLER
// =============================================================================

/**
 * Xử lý tin nhắn text từ user
 * Dispatch đến handler phù hợp dựa trên nội dung tin nhắn
 * 
 * @param {string} text - Nội dung tin nhắn
 * @param {string|number} senderId - Telegram ID của user
 * @param {string} senderName - Tên user trên Telegram
 */
function handleMessage(text, senderId, senderName) {
  
  // =========================================================================
  // LỆNH CÔNG KHAI (không cần đăng nhập)
  // =========================================================================
  
  // /start, /help, /hdsd - Xem hướng dẫn
  if (text === "/start" || text === "/help" || text === "/hdsd") { 
    sendText(senderId, t('help', senderId)); 
    return; 
  }
  
  // /lang - Đổi ngôn ngữ
  if (text.startsWith("/lang")) { 
    sendLangButtons(senderId); 
    return; 
  }
  
  // /donate - Hiển thị QR donate
  if (text.startsWith("/donate")) { 
    handleDonateCommand(senderId, senderId); 
    return; 
  }
  
  // /connect [SheetID] - Kết nối Google Sheet
  if (text.startsWith("/connect ")) {
    var rawId = text.replace("/connect ", "").trim();
    
    // Hỗ trợ cả dán link lẫn ID
    // Link: https://docs.google.com/spreadsheets/d/ABC123/edit
    var match = rawId.match(/\/d\/([a-zA-Z0-9-_]+)/);
    var inputId = match ? match[1] : rawId;
    
    if (registerUser(senderId, inputId, senderName)) {
      sendText(senderId, t('connect_success', senderId));
    } else {
      sendText(senderId, t('connect_fail', senderId));
    }
    return;
  }

  // =========================================================================
  // KIỂM TRA ĐĂNG NHẬP
  // =========================================================================
  
  // Các lệnh bên dưới yêu cầu user đã kết nối Sheet
  var userSheetId = getUserSheetId(senderId);
  if (!userSheetId) { 
    sendText(senderId, t('unauth', senderId)); 
    return; 
  }

  // =========================================================================
  // LỆNH CHI TIÊU (EXPENSE)
  // =========================================================================
  
  // /report [MM/YYYY] - Báo cáo chi tiêu (có biểu đồ)
  if (text.startsWith("/report")) { 
    sendReport(senderId, userSheetId, text.replace("/report", "").trim(), senderId); 
    return; 
  }
  
  // /list [MM/YYYY] - Danh sách chi tiêu
  if (text.startsWith("/list")) { 
    var d = parseDateArg(text.replace("/list", "").trim());
    listExpenses(senderId, userSheetId, 1, null, null, d.month, d.year, senderId);
    return; 
  }
  
  // /undo - Xóa chi tiêu cuối cùng
  if (text === "/undo") { 
    askUndoConfirmation(senderId, userSheetId, senderId); 
    return; 
  }
  
  // /filter - Lọc theo hạng mục
  if (text === "/filter") { 
    sendFilterButtonsCustom(senderId, userSheetId, senderId); 
    return; 
  }
  
  // /category [add|del] [name] - Quản lý hạng mục tùy chỉnh
  if (text.startsWith("/category")) { 
    handleCategoryCommand(senderId, userSheetId, text.replace("/category", "").trim(), senderId); 
    return; 
  }
  
  // /delete [ID] - Xóa chi tiêu theo ID
  if (text.startsWith("/delete ")) { 
    deleteById(senderId, userSheetId, text.replace("/delete ", ""), senderId); 
    return; 
  }
  
  // /search [keyword] - Tìm kiếm chi tiêu
  if (text.startsWith("/search ")) { 
    searchExpenses(senderId, userSheetId, text.replace("/search ", ""), senderId); 
    return; 
  }
  
  // /budget [amount] [category] - Xem/đặt ngân sách
  if (text.startsWith("/budget")) { 
    setBudget(senderId, userSheetId, text.replace("/budget", "").trim(), senderId); 
    return; 
  }
  
  // =========================================================================
  // LỆNH THU NHẬP (INCOME)
  // =========================================================================
  
  // /in [amount] [note] - Nhập thu nhập
  if (text.startsWith("/in ")) { 
    handleIncomeCommand(senderId, userSheetId, text.replace("/in ", ""), senderId); 
    return; 
  }
  
  // /listin [MM/YYYY] - Danh sách thu nhập
  if (text.startsWith("/listin")) { 
    var d = parseDateArg(text.replace("/listin", "").trim());
    listIncome(senderId, userSheetId, 1, null, d.month, d.year, senderId);
    return; 
  }
  
  // /undoin - Xóa thu nhập cuối (không áp dụng cho Donate)
  if (text === "/undoin") { 
    askUndoIncomeConfirmation(senderId, userSheetId, senderId); 
    return; 
  }
  
  // /deletein [ID] - Xóa thu nhập theo ID (không áp dụng cho Donate)
  if (text.startsWith("/deletein ")) { 
    deleteIncomeById(senderId, userSheetId, text.replace("/deletein ", ""), senderId); 
    return; 
  }
  
  // /searchin [keyword] - Tìm kiếm thu nhập
  if (text.startsWith("/searchin ")) { 
    searchIncome(senderId, userSheetId, text.replace("/searchin ", ""), senderId); 
    return; 
  }
  
  // =========================================================================
  // LỆNH TIỆN ÍCH KHÁC
  // =========================================================================
  
  // /remind HH:MM - Đặt nhắc nhở hàng ngày
  if (text.startsWith("/remind ")) { 
    setupReminder(senderId, text.replace("/remind ", ""), senderId); 
    return; 
  }
  
  // /stopremind - Tắt nhắc nhở
  if (text === "/stopremind") { 
    stopReminder(senderId, senderId); 
    return; 
  }
  
  // /export - Xuất file CSV
  if (text === "/export") { 
    sendExportOptions(senderId, senderId); 
    return; 
  }
  
  // /recurring [add|del] - Quản lý chi tiêu định kỳ
  if (text.startsWith("/recurring")) { 
    handleRecurringCommand(senderId, userSheetId, text.replace("/recurring", "").trim(), senderId); 
    return; 
  }
  
  // =========================================================================
  // MẶC ĐỊNH: PARSE EXPENSE
  // =========================================================================
  
  // Nếu không match lệnh nào, thử parse như chi tiêu
  // VD: "50k cafe", "200k tiền điện"
  handleExpenseMessage(senderId, userSheetId, text, senderId);
}

// =============================================================================
// CALLBACK QUERY HANDLER
// =============================================================================

/**
 * Xử lý khi user bấm inline button
 * Callback data format: "action|param1|param2|..."
 * 
 * @param {Object} cb - Callback query object từ Telegram
 */
function handleCallbackQuery(cb) {
  var senderId = cb.from.id;
  var data = cb.data;           // Dữ liệu được gửi kèm button
  var msgId = cb.message.message_id;  // ID tin nhắn chứa button

  // =========================================================================
  // LANGUAGE SELECTION
  // =========================================================================
  
  // lang|vi hoặc lang|en
  if (data.startsWith("lang|")) {
    var lang = data.split("|")[1];
    setUserLang(senderId, lang);
    editMessage(senderId, msgId, lang === 'vi' ? TEXT.vi.lang_set : TEXT.en.lang_set);
    answerCallback(cb.id);
    return;
  }
  
  // =========================================================================
  // KIỂM TRA ĐĂNG NHẬP
  // =========================================================================
  
  var userSheetId = getUserSheetId(senderId);
  if (!userSheetId) { 
    sendText(senderId, t('unauth', senderId)); 
    answerCallback(cb.id);
    return; 
  }

  // =========================================================================
  // DISPATCH CALLBACKS
  // =========================================================================
  
  // export|expense hoặc export|income hoặc export|all
  if (data.startsWith("export|")) {
    exportData(senderId, userSheetId, data.split("|")[1], senderId);
  } 
  // page|pageNum|category|month|year - Phân trang chi tiêu
  else if (data.startsWith("page|")) {
    var p = data.split("|");
    listExpenses(senderId, userSheetId, parseInt(p[1]), msgId, p[2], p[3], p[4], senderId);
  } 
  // filter|categoryName - Lọc chi tiêu theo hạng mục
  else if (data.startsWith("filter|")) {
    listExpenses(senderId, userSheetId, 1, msgId, data.split("|")[1], null, null, senderId); 
  } 
  // in_save|category|amount|note - Lưu thu nhập
  else if (data.startsWith("in_save|")) {
    handleSaveIncome(senderId, userSheetId, cb, senderId);
  } 
  // confirm_undo - Xác nhận xóa chi tiêu
  else if (data === "confirm_undo") {
    executeDelete(senderId, userSheetId, senderId);
  } 
  // confirm_undo_income - Xác nhận xóa thu nhập
  else if (data === "confirm_undo_income") {
    executeDeleteIncome(senderId, userSheetId, senderId);
  } 
  // cancel_undo - Hủy xóa
  else if (data === "cancel_undo") {
    editMessage(senderId, msgId, t('cancel_undo', senderId));
  } 
  // back_to_filter - Quay lại menu filter
  else if (data === "back_to_filter") {
    var userSheetId2 = getUserSheetId(senderId);
    sendFilterButtonsCustom(senderId, userSheetId2, senderId);
  } 
  // pagein|pageNum|month|year - Phân trang thu nhập
  else if (data.startsWith("pagein|")) {
    var pin = data.split("|");
    listIncome(senderId, userSheetId, parseInt(pin[1]), msgId, pin[2], pin[3], senderId);
  } 
  // Mặc định: category|amount|note - Lưu chi tiêu
  else {
    handleSaveExpense(senderId, userSheetId, cb, senderId);
  }
  
  // Dù callback gì cũng phải answer để xóa loading indicator
  answerCallback(cb.id);
}

// =============================================================================
// REMINDER FUNCTIONS
// =============================================================================

/**
 * Đặt nhắc nhở hàng ngày cho user
 * Lưu thời gian vào Users sheet, trigger chung sẽ check mỗi giờ
 * 
 * @param {string|number} cid - Chat ID
 * @param {string} timeStr - Thời gian format "HH:MM"
 * @param {string|number} telegramId - Telegram ID
 */
function setupReminder(cid, timeStr, telegramId) {
  // Validate format HH:MM
  var parts = timeStr.split(":");
  if (parts.length !== 2) { 
    sendText(cid, t('invalid_time', telegramId)); 
    return; 
  }
  
  var h = parseInt(parts[0]), m = parseInt(parts[1]);
  if (isNaN(h) || isNaN(m) || h < 0 || h > 23 || m < 0 || m > 59) {
    sendText(cid, t('invalid_time', telegramId));
    return;
  }
  
  // Lưu vào Users sheet (Column F = ReminderTime)
  try {
    if (CONFIG.MASTER_SHEET_ID) {
      var ss = SpreadsheetApp.openById(CONFIG.MASTER_SHEET_ID);
      var sheet = ss.getSheetByName('Users');
      if (sheet) {
        var data = sheet.getDataRange().getValues();
        for (var i = 1; i < data.length; i++) {
          if (String(data[i][0]) === String(cid)) {
            sheet.getRange(i + 1, 6).setValue(timeStr);
            break;
          }
        }
      }
    }
  } catch (e) {
    Logger.log("Save reminder error: " + e);
  }
  
  sendText(cid, t('reminder_set', telegramId) + " " + timeStr);
}

/**
 * Tắt nhắc nhở cho user
 * Xóa giá trị trong Users sheet
 * 
 * @param {string|number} cid - Chat ID
 * @param {string|number} telegramId - Telegram ID
 */
function stopReminder(cid, telegramId) {
  try {
    if (CONFIG.MASTER_SHEET_ID) {
      var ss = SpreadsheetApp.openById(CONFIG.MASTER_SHEET_ID);
      var sheet = ss.getSheetByName('Users');
      if (sheet) {
        var data = sheet.getDataRange().getValues();
        for (var i = 1; i < data.length; i++) {
          if (String(data[i][0]) === String(cid)) {
            sheet.getRange(i + 1, 6).setValue(""); // Clear reminder
            break;
          }
        }
      }
    }
  } catch (e) {
    Logger.log("Stop reminder error: " + e);
  }
  
  sendText(cid, t('reminder_off', telegramId));
}

/**
 * Kiểm tra và gửi nhắc nhở cho tất cả users
 * Chạy mỗi giờ bởi trigger
 * So sánh giờ hiện tại với giờ đã đặt của từng user
 */
function checkAllReminders() {
  if (!CONFIG.MASTER_SHEET_ID) return;
  
  try {
    var ss = SpreadsheetApp.openById(CONFIG.MASTER_SHEET_ID);
    var sheet = ss.getSheetByName('Users');
    if (!sheet) return;
    
    var now = new Date();
    var currentHour = now.getHours();
    var currentMinute = now.getMinutes();
    
    var data = sheet.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      var reminder = data[i][5]; // Column F = ReminderTime
      if (reminder) {
        var parts = String(reminder).split(":");
        if (parts.length === 2) {
          var rH = parseInt(parts[0]), rM = parseInt(parts[1]);
          // Gửi nếu trong khoảng ±5 phút
          if (rH === currentHour && Math.abs(rM - currentMinute) <= 5) {
            var telegramId = data[i][0];
            sendText(telegramId, "🔔 Đừng quên nhập chi tiêu hôm nay nhé! 💸");
          }
        }
      }
    }
  } catch (e) {
    Logger.log("Check reminders error: " + e);
  }
}

// =============================================================================
// SETUP FUNCTIONS
// =============================================================================
// Các hàm này chỉ cần chạy 1 lần sau khi deploy

/**
 * Thiết lập webhook để Telegram gửi update đến script
 * Chạy 1 lần sau khi deploy
 */
function setupWebhook() { 
  var url = ScriptApp.getService().getUrl(); 
  UrlFetchApp.fetch("https://api.telegram.org/bot" + CONFIG.BOT_TOKEN + "/setWebhook?url=" + url); 
  Logger.log("Webhook set to: " + url);
}

/**
 * Thiết lập menu lệnh trong Telegram
 * Hiển thị danh sách lệnh khi user gõ /
 */
function setupCommands() {
  var cmds = [
    {command: "connect", description: "🔗 Kết nối Sheet"},
    {command: "in", description: "💰 Thu nhập"},
    {command: "listin", description: "📋 DS thu nhập"},
    {command: "report", description: "📊 Báo cáo"},
    {command: "list", description: "📜 DS chi tiêu"},
    {command: "budget", description: "🎯 Ngân sách"},
    {command: "category", description: "📂 Hạng mục"},
    {command: "recurring", description: "🔄 Chi định kỳ"},
    {command: "filter", description: "🔍 Lọc"},
    {command: "export", description: "📤 Xuất file"},
    {command: "remind", description: "⏰ Nhắc nhở"},
    {command: "stopremind", description: "🔕 Tắt nhắc"},
    {command: "undo", description: "↩️ Xóa mục cuối"},
    {command: "search", description: "🔎 Tìm"},
    {command: "lang", description: "🌐 Ngôn ngữ"},
    {command: "donate", description: "💖 Ủng hộ"},
    {command: "help", description: "💡 Hướng dẫn"}
  ];
  UrlFetchApp.fetch("https://api.telegram.org/bot" + CONFIG.BOT_TOKEN + "/setMyCommands", { 
    method: "post", 
    payload: { commands: JSON.stringify(cmds) } 
  });
  Logger.log("Commands setup done");
}

/**
 * Tạo trigger chạy checkAllReminders mỗi giờ
 * Chạy 1 lần sau khi deploy
 */
function setupHourlyReminderTrigger() {
  // Xóa trigger cũ (nếu có)
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'checkAllReminders') {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }
  
  // Tạo trigger mới
  ScriptApp.newTrigger('checkAllReminders')
    .timeBased()
    .everyHours(1)
    .create();
  
  Logger.log("Hourly reminder trigger created");
}
