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
  // Wrap entire processing in lock to prevent race conditions (commands vs background jobs)
  withLock(function() {
      try {
        // Kiểm tra token đã cấu hình chưa
        if (!CONFIG.BOT_TOKEN) return;
        
        // Parse JSON từ Telegram
        var data = JSON.parse(e.postData.contents);
        
        // Lấy thông tin sender
        var senderId = data.callback_query ? data.callback_query.from.id : data.message.from.id;
        var senderName = data.callback_query ? data.callback_query.from.first_name : data.message.from.first_name;
    
        // Capture User Info (Auto-save to DB)
        captureUser(senderId, senderName);
    
        // Phân loại request
        if (data.callback_query) { 
          // User bấm inline button
          handleCallbackQuery(data.callback_query); 
          return; 
        }
        if (data.message) { 
          if (data.message.text) {
            handleMessage(data.message.text, senderId, senderName); 
          } else if (data.message.voice) {
            var userSheetId = getUserSheetId(senderId);
            if (userSheetId) {
               handleVoiceMessage(senderId, userSheetId, data.message.voice.file_id, senderId);
            } else {
               sendText(senderId, t('unauth', senderId));
            }
          }
        }
      } catch (err) { 
        Logger.log("doPost Error: " + err); 
        logErrorToAdmin(err, "doPost");
      }
  }); // End withLock
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
  // Check if waiting for user input (Goal Deposit)
  var cache = CacheService.getScriptCache();
  var pendingGoalId = cache.get("await_goal_" + senderId);
  
  if (pendingGoalId) {
     var amt = parseAmount(text);
     if (amt) {
        var userSheetId = getUserSheetId(senderId);
        depositGoal(senderId, userSheetId, pendingGoalId, amt, senderId);
        cache.remove("await_goal_" + senderId); // Clear payload
        return;
     } else {
        // If user typed something that is not money (like /cancel), clear cache
        if (text === "/cancel") {
           cache.remove("await_goal_" + senderId);
           sendText(senderId, "❌ Đã hủy nạp tiền.");
           return;
        }
        // Else, simple warning or let it pass through? 
        // Better let it pass if it's a command, but if it looks like amount, consume it.
        // Let's consume it and warn to keep flow sticky.
        sendText(senderId, "❌ Số tiền không hợp lệ. Vui lòng nhập lại (VD: 500k) hoặc gõ `/cancel` để hủy.");
        return; 
     }
  }
  
  // =========================================================================
  // LỆNH CÔNG KHAI (không cần đăng nhập)
  // =========================================================================
  
  // /start, /help, /hdsd - Xem hướng dẫn
  // /start, /help, /hdsd - Xem hướng dẫn
  if (text === "/start" || text === "/help" || text === "/hdsd") { 
    sendHelpMenu(senderId, senderId); 
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
  
  // /settings - Menu cài đặt
  if (text === "/settings") {
    sendSettingsMenu(senderId, senderId);
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
  
  // /list [type] [date] - Xem danh sách
  // Hỗ trợ: /list, /list in, /listin, /list 12/2025
  if (text.startsWith("/list")) { 
    var raw = text;
    // Normalize /listin -> /list in
    if (text.startsWith("/listin")) raw = text.replace("/listin", "/list in");
    
    var args = raw.replace("/list", "").trim();
    var isIncome = false;
    var dateStr = args;
    
    // Detect keywords: in, income, thu | out, chi, expense
    var match = args.match(/^(in|income|thu|out|chi|expense)(\s+|$)/i);
    if (match) {
       var type = match[1].toLowerCase();
       if (type === 'in' || type === 'income' || type === 'thu') isIncome = true;
       dateStr = args.substring(match[0].length).trim();
    }
    
    var d = parseDateArg(dateStr);
    
    if (isIncome) {
       listIncome(senderId, userSheetId, 1, null, d.month, d.year, senderId);
    } else {
       listExpenses(senderId, userSheetId, 1, null, null, d.month, d.year, senderId);
    }
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
  
  // /start - Bắt đầu (Welcome)
  if (text === "/start") { 
    sendText(senderId, "👋 **Xin chào " + senderName + "!**\n\n" +
      "Chào mừng bạn đến với **Sao Kê Chi Tiêu Bot** 🤖\n" +
      "Trợ lý tài chính cá nhân miễn phí, an toàn & dễ sử dụng!\n\n" +
      "👇 **Bắt đầu ngay bằng cách chọn menu bên dưới:**");
    sendHelpMenu(senderId, senderId);
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
  
  // /split [amount] [count] [note] - Chia tiền
  if (text.startsWith("/split ")) { 
    splitBill(senderId, text.replace("/split ", "").trim(), senderId); 
    return; 
  }
  
  // /goal [action] ... - Mục tiêu tiết kiệm
  if (text.startsWith("/goal")) { 
    handleGoalCommand(senderId, userSheetId, text.replace("/goal", "").trim(), senderId); 
    return; 
  }
  
  // /debt [borrow|lend|list|repay] ... - Sổ nợ
  if (text.startsWith("/debt")) { 
    handleDebtCommand(senderId, userSheetId, text.replace("/debt", "").trim(), senderId); 
    return; 
  }
  
  // /backup - Sao lưu dữ liệu
  if (text.startsWith("/backup")) {
     handleBackupCommand(senderId, userSheetId, senderId);
     return;
  }
  
  // /export - Xuất dữ liệu (CSV or PDF)
  if (text.startsWith("/export")) {
     if (text.includes("pdf")) {
       exportPdf(senderId, userSheetId, senderId);
     } else {
       handleExportCommand(senderId, userSheetId, senderId);
     }
     return;
  }
  
  // =========================================================================
  // MẶC ĐỊNH: PARSE EXPENSE HOẶC BÁO LỖI
  // =========================================================================
  
  // Nếu là lệnh (bắt đầu bằng /) mà không match ở trên -> Lệnh sai
  if (text.startsWith("/")) {
     // Gợi ý lệnh đúng
     var suggestion = "❌ **Lệnh không hợp lệ!**\n\n";
     
     if (text.startsWith("/go")) suggestion += "Bạn muốn dùng `/goal` (Mục tiêu) hay `/google`?\n👉 Thử: `/goal list`";
     else if (text.startsWith("/re")) suggestion += "Bạn muốn dùng `/report` (Báo cáo) hay `/recurring` (Định kỳ)?\n👉 Thử: `/report`";
     else suggestion += "Có thể bạn muốn dùng:\n" +
                       "- `/help`: Xem hướng dẫn chi tiết\n" +
                       "- `/list`: Xem danh sách chi tiêu\n" +
                       "- `/report`: Xem báo cáo\n\n" +
                       "Quét lại menu bằng cách gõ `/`";
     
     sendText(senderId, suggestion);
     return;
  }
  
  // Nếu không phải lệnh, thử parse như chi tiêu
  // VD: "50k cafe", "200k tiền điện"
  
  // Try standard parsing first
  var parsed = parseAmount(text.split(" ")[0]); 
  if (parsed) {
     handleExpenseMessage(senderId, userSheetId, text, senderId);
  } else {
     // If not matching standard format "50k item", try AI
     handleSmartMessage(senderId, userSheetId, text, senderId);
  }
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
    sendFilterButtonsCustom(senderId, userSheetId2, senderId, msgId); // Pass msgId for editing
  } 
  // pagein|pageNum|month|year - Phân trang thu nhập
  else if (data.startsWith("pagein|")) {
    var pin = data.split("|");
    listIncome(senderId, userSheetId, parseInt(pin[1]), msgId, pin[2], pin[3], senderId);
  }
  // help|topic - Hiển thị nội dung hướng dẫn
  else if (data.startsWith("help|")) {
    handleHelpCallback(senderId, msgId, data.split("|")[1], senderId);
  }
  // rec_del|ID - Xóa định kỳ
  else if (data.startsWith("rec_del|")) {
    handleRecurringCallback(senderId, data, userSheetId, senderId, msgId);
  }
  // debt_repay|ID - Trả nợ
  else if (data.startsWith("debt_repay|")) {
    handleDebtCallback(senderId, data, userSheetId, senderId, msgId);
  }
  // goal_dep|ID - Nạp tiền mục tiêu
  else if (data.startsWith("goal_dep|")) {
    handleGoalCallback(senderId, data, userSheetId, senderId, msgId);
  }
  // set_lang, set_remind|...
  else if (data.startsWith("set_")) {
    handleSettingsCallback(senderId, userSheetId, data, senderId, msgId);
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
  // Validate input
  if (!timeStr) {
    sendText(cid, t('invalid_time', telegramId) + "\nVD: `/remind 21:00`");
    return;
  }
  
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
// SETTINGS MENU
// =============================================================================

function sendSettingsMenu(cid, telegramId) {
  var lang = getUserLang(telegramId);
  var langFlag = lang === 'vi' ? "🇻🇳 Tiếng Việt" : "🇬🇧 English";
  
  var msg = "⚙️ **CÀI ĐẶT / SETTINGS**\n\n";
  msg += "🌐 Ngôn ngữ: " + langFlag + "\n";
  msg += "⏰ Nhắc nhở: `/remind 21:00`\n";
  
  var kb = [
     [{text: "🌐 Đổi ngôn ngữ / Switch Language", callback_data: "set_lang"}],
     [{text: "⏰ Bật nhắc nhở (21:00)", callback_data: "set_remind|on"}],
     [{text: "🔕 Tắt nhắc nhở", callback_data: "set_remind|off"}]
  ];
  
  sendMessageKb(cid, msg, {inline_keyboard: kb});
}

function handleSettingsCallback(cid, sheetId, data, telegramId, msgId) {
  // data: set_lang, set_remind|on, set_remind|off
  
  if (data === "set_lang") {
     var cur = getUserLang(telegramId);
     var next = cur === 'vi' ? 'en' : 'vi';
     setUserLang(telegramId, next);
     // Update menu in-place (don't delete) to show new language
     sendSettingsMenu(cid, telegramId); 
     // Wait, sendSettingsMenu sends NEW message. We should delete OLD one or edit it.
     // Better: Delete old, send new (easier since text changes)
     deleteMessage(cid, msgId);
     return;
  }
  
  if (data.startsWith("set_remind|")) {
     deleteMessage(cid, msgId); // Hide menu
     var action = data.split("|")[1];
     if (action === "on") {
        setupReminder(cid, "21:00", telegramId);
     } else {
        stopReminder(cid, telegramId);
     }
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
    {command: "start", description: "🚀 Bắt đầu"},
    {command: "help", description: "💡 Hướng dẫn"},
    {command: "donate", description: "☕ Ủng hộ Bot"},
    {command: "connect", description: "🔗 Kết nối Sheet"},
    {command: "report", description: "📊 Báo cáo"},
    {command: "list", description: "📜 Xem chi tiêu"},
    {command: "budget", description: "🎯 Ngân sách"},
    {command: "goal", description: "🏆 Mục tiêu"},
    {command: "recurring", description: "🔄 Định kỳ"},
    {command: "debt", description: "📒 Sổ nợ"},
    {command: "category", description: "📂 Hạng mục"},
    {command: "split", description: "🍰 Chia tiền"},
    {command: "in", description: "💰 Thêm thu nhập"},
    {command: "remind", description: "⏰ Đặt nhắc nhở"},
    {command: "lang", description: "🌐 Đổi ngôn ngữ"},
    {command: "backup", description: "💾 Sao lưu data"},
    {command: "export", description: "📤 Xuất dữ liệu"},
    {command: "settings", description: "⚙️ Cài đặt"}
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

/**
 * Tạo trigger gửi báo cáo tự động vào 9h sáng ngày 1 hàng tháng
 */
function setupMonthlyReportTrigger() {
  // Clear old
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'sendMonthlyReportAuto') {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }
  
  // Create new (Monthly on day 1 at 9am)
  ScriptApp.newTrigger('sendMonthlyReportAuto')
    .timeBased()
    .onMonthDay(1)
    .atHour(9)
    .create();
    
  Logger.log("Monthly report trigger created");
}
// --- HELP MENU HANDLERS ---
function sendHelpMenu(cid, telegramId) {
  var kb = [
    [{text: "📌 Kết Nối", callback_data: "help|connect"}, {text: "💸 Chi Tiêu", callback_data: "help|expense"}],
    [{text: "💰 Thu Nhập", callback_data: "help|income"}, {text: "🎯 Ngân Sách", callback_data: "help|budget"}],
    [{text: "👥 Shared", callback_data: "help|shared"}, {text: "⚙️ Tính Năng Khác", callback_data: "help|advanced"}],
    [{text: "📂 Hạng Mục", callback_data: "help|category"}, {text: "🎙 Voice/AI", callback_data: "help|ai"}]
  ];
  sendMessageKb(cid, "🌟 **HƯỚNG DẪN SỬ DỤNG** 🌟\nChọn chủ đề bạn muốn xem:", {inline_keyboard: kb});
}

function handleHelpCallback(cid, msgId, topic, telegramId) {
   var txt = "";
   var backKb = {inline_keyboard: [[{text: "🔙 Quay lại Menu", callback_data: "help|main"}]]};
   
   switch(topic) {
     case "main":
       var kb = [
         [{text: "📌 Kết Nối", callback_data: "help|connect"}, {text: "💸 Chi Tiêu", callback_data: "help|expense"}],
         [{text: "💰 Thu Nhập", callback_data: "help|income"}, {text: "🎯 Ngân Sách", callback_data: "help|budget"}],
         [{text: "👥 Shared", callback_data: "help|shared"}, {text: "⚙️ Tính Năng Khác", callback_data: "help|advanced"}],
         [{text: "📂 Hạng Mục", callback_data: "help|category"}, {text: "🎙 Voice/AI", callback_data: "help|ai"}]
       ];
       editMessageKb(cid, msgId, "🌟 **HƯỚNG DẪN SỬ DỤNG** 🌟\nChọn chủ đề bạn muốn xem:", {inline_keyboard: kb});
       return;
       
     case "connect":
       txt = t('help_connect', telegramId);
       break;
     case "expense":
       txt = t('help_expense', telegramId);
       break;
     case "income":
        txt = t('help_income', telegramId);
        break;
     case "budget":
        txt = t('help_budget', telegramId);
        break;
     case "shared":
        txt = t('help_shared', telegramId);
        break;
     case "advanced":
        txt = t('help_advanced', telegramId);
        break;
     case "category":
        txt = t('help_category', telegramId);
        break;
     case "ai":
        txt = t('help_ai', telegramId);
        break;
     default:
        txt = "❌ Chủ đề không tồn tại.";
   }
   
   editMessageKb(cid, msgId, txt, backKb);
}
