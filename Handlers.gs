/**
 * Handlers.gs
 * Main request handlers for SaoKeChiTieuBot
 */

// --- MAIN ENTRY POINT ---
function doPost(e) {
  try {
    if (!CONFIG.BOT_TOKEN) return;
    
    var data = JSON.parse(e.postData.contents);
    var senderId = data.callback_query ? data.callback_query.from.id : data.message.from.id;
    var senderName = data.callback_query ? data.callback_query.from.first_name : data.message.from.first_name;

    if (data.callback_query) { 
      handleCallbackQuery(data.callback_query); 
      return; 
    }
    if (data.message && data.message.text) { 
      handleMessage(data.message.text, senderId, senderName); 
    }
  } catch (err) { 
    Logger.log("doPost Error: " + err); 
  }
}

// --- MESSAGE HANDLER ---
function handleMessage(text, senderId, senderName) {
  // Public commands (no auth required)
  if (text === "/start" || text === "/help" || text === "/hdsd") { 
    sendText(senderId, t('help', senderId)); 
    return; 
  }
  if (text.startsWith("/lang")) { 
    sendLangButtons(senderId); 
    return; 
  }
  if (text.startsWith("/donate")) { 
    handleDonateCommand(senderId, senderId); 
    return; 
  }
  
  // Connect command
  if (text.startsWith("/connect ")) {
    var rawId = text.replace("/connect ", "").trim();
    var match = rawId.match(/\/d\/([a-zA-Z0-9-_]+)/);
    var inputId = match ? match[1] : rawId;
    
    if (registerUser(senderId, inputId, senderName)) {
      sendText(senderId, t('connect_success', senderId));
    } else {
      sendText(senderId, t('connect_fail', senderId));
    }
    return;
  }

  // Auth required commands
  var userSheetId = getUserSheetId(senderId);
  if (!userSheetId) { 
    sendText(senderId, t('unauth', senderId)); 
    return; 
  }

  // Dispatch commands
  if (text.startsWith("/report")) { 
    sendReport(senderId, userSheetId, text.replace("/report", "").trim(), senderId); 
    return; 
  }
  if (text.startsWith("/list")) { 
    var d = parseDateArg(text.replace("/list", "").trim());
    listExpenses(senderId, userSheetId, 1, null, null, d.month, d.year, senderId);
    return; 
  }
  if (text === "/undo") { 
    askUndoConfirmation(senderId, userSheetId, senderId); 
    return; 
  }
  if (text === "/filter") { 
    sendFilterButtonsCustom(senderId, userSheetId, senderId); 
    return; 
  }
  if (text.startsWith("/category")) { 
    handleCategoryCommand(senderId, userSheetId, text.replace("/category", "").trim(), senderId); 
    return; 
  }
  if (text.startsWith("/delete ")) { 
    deleteById(senderId, userSheetId, text.replace("/delete ", ""), senderId); 
    return; 
  }
  if (text.startsWith("/search ")) { 
    searchExpenses(senderId, userSheetId, text.replace("/search ", ""), senderId); 
    return; 
  }
  if (text.startsWith("/budget")) { 
    setBudget(senderId, userSheetId, text.replace("/budget", "").trim(), senderId); 
    return; 
  }
  if (text.startsWith("/in ")) { 
    handleIncomeCommand(senderId, userSheetId, text.replace("/in ", ""), senderId); 
    return; 
  }
  if (text.startsWith("/remind ")) { 
    setupReminder(senderId, text.replace("/remind ", ""), senderId); 
    return; 
  }
  if (text === "/stopremind") { 
    stopReminder(senderId, senderId); 
    return; 
  }
  if (text === "/export") { 
    sendExportOptions(senderId, senderId); 
    return; 
  }
  if (text.startsWith("/recurring")) { 
    handleRecurringCommand(senderId, userSheetId, text.replace("/recurring", "").trim(), senderId); 
    return; 
  }
  
  // Default: try to parse as expense
  handleExpenseMessage(senderId, userSheetId, text, senderId);
}

// --- CALLBACK QUERY HANDLER ---
function handleCallbackQuery(cb) {
  var senderId = cb.from.id;
  var data = cb.data;
  var msgId = cb.message.message_id;

  // Language selection
  if (data.startsWith("lang|")) {
    var lang = data.split("|")[1];
    setUserLang(senderId, lang);
    editMessage(senderId, msgId, lang === 'vi' ? TEXT.vi.lang_set : TEXT.en.lang_set);
    answerCallback(cb.id);
    return;
  }
  
  var userSheetId = getUserSheetId(senderId);
  if (!userSheetId) { 
    sendText(senderId, t('unauth', senderId)); 
    answerCallback(cb.id);
    return; 
  }

  if (data.startsWith("export|")) {
    exportData(senderId, userSheetId, data.split("|")[1], senderId);
  } else if (data.startsWith("page|")) {
    var p = data.split("|");
    listExpenses(senderId, userSheetId, parseInt(p[1]), msgId, p[2], p[3], p[4], senderId);
  } else if (data.startsWith("filter|")) {
    listExpenses(senderId, userSheetId, 1, msgId, data.split("|")[1], null, null, senderId); 
  } else if (data.startsWith("in_save|")) {
    handleSaveIncome(senderId, userSheetId, cb, senderId);
  } else if (data === "confirm_undo") {
    executeDelete(senderId, userSheetId, senderId);
  } else if (data === "cancel_undo") {
    editMessage(senderId, msgId, t('cancel_undo', senderId));
  } else if (data === "back_to_filter") {
    var userSheetId2 = getUserSheetId(senderId);
    sendFilterButtonsCustom(senderId, userSheetId2, senderId);
  } else {
    handleSaveExpense(senderId, userSheetId, cb, senderId);
  }
  
  answerCallback(cb.id);
}

// --- REMINDER FUNCTIONS ---
function setupReminder(cid, timeStr, telegramId) {
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
  
  // Save reminder to user settings
  try {
    if (CONFIG.MASTER_SHEET_ID) {
      var ss = SpreadsheetApp.openById(CONFIG.MASTER_SHEET_ID);
      var sheet = ss.getSheetByName('Users');
      if (sheet) {
        var data = sheet.getDataRange().getValues();
        for (var i = 1; i < data.length; i++) {
          if (String(data[i][0]) === String(cid)) {
            sheet.getRange(i + 1, 6).setValue(timeStr); // Column F = ReminderTime
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

// Hourly trigger to check all user reminders
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
      var reminder = data[i][5]; // Column F
      if (reminder) {
        var parts = String(reminder).split(":");
        if (parts.length === 2) {
          var rH = parseInt(parts[0]), rM = parseInt(parts[1]);
          // Check if within 5-minute window
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

// --- SETUP FUNCTIONS ---
function setupWebhook() { 
  var url = ScriptApp.getService().getUrl(); 
  UrlFetchApp.fetch("https://api.telegram.org/bot" + CONFIG.BOT_TOKEN + "/setWebhook?url=" + url); 
  Logger.log("Webhook set to: " + url);
}

function setupCommands() {
  var cmds = [
    {command: "connect", description: "🔗 Kết nối Sheet"},
    {command: "in", description: "💰 Thu nhập"},
    {command: "report", description: "📊 Báo cáo"},
    {command: "list", description: "📜 Danh sách"},
    {command: "budget", description: "🎯 Ngân sách"},
    {command: "remind", description: "⏰ Nhắc nhở"},
    {command: "stopremind", description: "🔕 Tắt nhắc"},
    {command: "export", description: "📂 Xuất file"},
    {command: "recurring", description: "🔄 Chi định kỳ"},
    {command: "filter", description: "🔍 Lọc"},
    {command: "category", description: "📂 Hạng mục"},
    {command: "search", description: "🔎 Tìm"},
    {command: "delete", description: "🗑 Xóa"},
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

function setupHourlyReminderTrigger() {
  // Delete existing triggers
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'checkAllReminders') {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }
  
  // Create hourly trigger
  ScriptApp.newTrigger('checkAllReminders')
    .timeBased()
    .everyHours(1)
    .create();
  
  Logger.log("Hourly reminder trigger created");
}
