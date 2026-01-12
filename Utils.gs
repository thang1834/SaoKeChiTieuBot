/**
 * Utils.gs
 * Utility functions for SaoKeChiTieuBot
 */

// --- TELEGRAM API HELPERS ---
function sendText(cid, txt, telegramId) {
  try {
    UrlFetchApp.fetch("https://api.telegram.org/bot" + CONFIG.BOT_TOKEN + "/sendMessage", { 
      method: "post", 
      payload: { 
        chat_id: String(cid), 
        text: txt, 
        parse_mode: "Markdown" 
      } 
    });
  } catch (e) {
    Logger.log("sendText Error: " + e);
  }
}

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

function sendMessageKb(cid, txt, kb) {
  try {
    UrlFetchApp.fetch("https://api.telegram.org/bot" + CONFIG.BOT_TOKEN + "/sendMessage", { 
      method: "post", 
      payload: { 
        chat_id: String(cid), 
        text: txt, 
        reply_markup: JSON.stringify(kb),
        parse_mode: "Markdown"
      } 
    });
  } catch (e) {
    Logger.log("sendMessageKb Error: " + e);
  }
}

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

// --- INPUT PARSING & VALIDATION ---
function parseAmount(input) {
  if (!input) return null;
  
  var txt = String(input).toLowerCase().trim();
  var match = txt.match(/^([0-9.,]+)\s*(k|m)?/);
  
  if (!match) return null;
  
  var num = parseFloat(match[1].replace(/,/g, ''));
  if (isNaN(num) || num <= 0) return null;
  
  var multiplier = 1;
  if (match[2] === 'k') multiplier = 1000;
  if (match[2] === 'm') multiplier = 1000000;
  
  return num * multiplier;
}

function formatMoney(amount) {
  if (amount === null || amount === undefined) return '0';
  return Number(amount).toLocaleString('vi-VN');
}

function parseDateArg(arg) {
  var now = new Date();
  var month = now.getMonth() + 1;
  var year = now.getFullYear();
  
  if (arg) {
    var parts = arg.split("/");
    if (parts.length === 2) {
      month = parseInt(parts[0]) || month;
      year = parseInt(parts[1]) || year;
    } else if (parts.length === 1) {
      month = parseInt(parts[0]) || month;
    }
  }
  return { month: month, year: year };
}

function sanitizeInput(input) {
  if (!input) return '';
  return String(input).replace(/[<>'"]/g, '').trim().substring(0, 500);
}

// --- SHEET HELPERS ---
function getOrCreateSheetForUser(targetSheetId, name) {
  var ss = SpreadsheetApp.openById(targetSheetId);
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    if (name === 'Income') {
      sheet.appendRow(["STT", "Thời gian", "Số tiền", "Hạng mục", "Ghi chú"]);
    } else if (name === 'Expense') {
      sheet.appendRow(["STT", "Ngày", "Số tiền", "Hạng mục", "Ghi chú"]);
    } else if (name === 'Budget') {
      sheet.appendRow(["Category", "Limit"]);
    } else if (name === 'Recurring') {
      sheet.appendRow(["ID", "Số tiền", "Hạng mục", "Ghi chú", "Tần suất", "Ngày", "Active"]);
    }
  }
  return sheet;
}

function getUserSheetId(telegramId) {
  var cache = CacheService.getScriptCache();
  var cachedId = cache.get("user_" + telegramId);
  if (cachedId) return cachedId;

  if (!CONFIG.MASTER_SHEET_ID) return null;
  
  try {
    var ss = SpreadsheetApp.openById(CONFIG.MASTER_SHEET_ID);
    var sheet = ss.getSheetByName('Users');
    if (!sheet) { 
      ss.insertSheet('Users').appendRow(['TelegramID', 'SheetID', 'Name', 'JoinedDate', 'Language', 'ReminderTime']); 
      return null; 
    }
    
    var data = sheet.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][0]) === String(telegramId)) {
        cache.put("user_" + telegramId, data[i][1], CONFIG.CACHE_DURATION);
        return data[i][1];
      }
    }
  } catch (e) {
    Logger.log("getUserSheetId Error: " + e);
  }
  return null;
}

function registerUser(telegramId, sheetId, name) {
  try {
    Logger.log("Registering user: " + telegramId + " with Sheet: " + sheetId);
    
    // Validate access to user's Sheet
    var ss;
    try {
      ss = SpreadsheetApp.openById(sheetId);
      Logger.log("User Sheet opened: " + ss.getName());
    } catch (e) {
      Logger.log("Cannot open user Sheet: " + e);
      return false;
    }
    
    // Init sheets
    getOrCreateSheetForUser(sheetId, 'Expense');
    getOrCreateSheetForUser(sheetId, 'Income');
    
    // Save to Master DB if configured
    if (CONFIG.MASTER_SHEET_ID) {
      try {
        var master = SpreadsheetApp.openById(CONFIG.MASTER_SHEET_ID);
        var usersSheet = master.getSheetByName('Users');
        if (!usersSheet) {
          usersSheet = master.insertSheet('Users');
          usersSheet.appendRow(['TelegramID', 'SheetID', 'Name', 'JoinedDate', 'Language', 'ReminderTime']);
        }
        
        var data = usersSheet.getDataRange().getValues();
        var exists = false;
        for (var i = 1; i < data.length; i++) {
          if (String(data[i][0]) === String(telegramId)) {
            usersSheet.getRange(i + 1, 2).setValue(sheetId);
            exists = true; 
            break;
          }
        }
        if (!exists) {
          usersSheet.appendRow([String(telegramId), sheetId, name, new Date(), CONFIG.DEFAULT_LANG, null]);
        }
      } catch (e) {
        Logger.log("Master Sheet error: " + e);
      }
    }
    
    // Update cache
    CacheService.getScriptCache().put("user_" + telegramId, sheetId, CONFIG.CACHE_DURATION);
    return true;
  } catch (e) {
    Logger.log("Register Error: " + e);
    return false;
  }
}

// --- ERROR WRAPPER ---
function safeExecute(fn, cid, telegramId) {
  try {
    return fn();
  } catch (e) {
    Logger.log("Error: " + e.stack);
    sendText(cid, "❌ Đã xảy ra lỗi. Vui lòng thử lại sau.");
    return null;
  }
}
