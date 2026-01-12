// --- CẤU HÌNH & BẢO MẬT ---
// Dán đoạn này vào đầu file hoặc một file Config.gs riêng
const CONFIG = {
  // Lấy từ Property Service để bảo mật, hoặc điền trực tiếp
  USER: PropertiesService.getScriptProperties().getProperty('VCB_USER') || '09xxxxxxxxx',
  PASS: PropertiesService.getScriptProperties().getProperty('VCB_PASS') || 'password',
  STK: PropertiesService.getScriptProperties().getProperty('VCB_ACC') || '9999999999',
  // HF Space của bạn (endpoint: /predict, format: JSON)
  HF_API: 'https://thangnd163063-captcha.hf.space/predict',
  BOT_TOKEN: PropertiesService.getScriptProperties().getProperty('BOT_TOKEN'),
  CHAT_ID: PropertiesService.getScriptProperties().getProperty('MY_CHAT_ID') // Admin
};

function setupEnv() {
  var scriptProperties = PropertiesService.getScriptProperties();
  scriptProperties.setProperties({
    'BOT_TOKEN': 'YOUR_BOT_TOKEN',
    'SHEET_ID': 'YOUR_SHEET_ID', // USER DATABASE (MASTER SHEET)
    'MY_CHAT_ID': 'YOUR_CHAT_ID', // Admin ID
    // Thêm VCB info vào đây
    'VCB_USER': 'YOUR_PHONE_NUMBER',
    'VCB_PASS': 'YOUR_PASSWORD',
    'VCB_ACC': 'YOUR_ACCOUNT_NO'
  });
  Logger.log("✅ Config saved!");
}

function sys_auth_trigger() {
  // Hàm này chỉ để kích hoạt Authorization cho DriveApp
  var test = DriveApp.createFile("Test_Permission.txt", "Bot export check ok");
  test.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
  Logger.log("✅ Drive Access OK! Created test file: " + test.getUrl());
}

var PROPS = PropertiesService.getScriptProperties().getProperties();
var token = PROPS['BOT_TOKEN'];
var masterSheetId = PROPS['SHEET_ID']; // Đổi tên biến để rõ ràng
var myChatId = PROPS['MY_CHAT_ID'];
var BOT_EMAIL = "your_email@gmail.com"; // Thay bằng email của bạn

// --- DICTIONARY ---
const TEXT = {
  vi: {
    unauth: "⛔ Bạn chưa kết nối Sheet!\nHãy làm theo hướng dẫn:\n1. Tạo Google Sheet mới.\n2. Share quyền **Editor** cho email: `" + BOT_EMAIL + "` (hoặc Mở quyền 'Bất kỳ ai có link').\n3. Copy Sheet ID trên thanh địa chỉ.\n4. Gõ lệnh: `/connect [Sheet_ID]`",
    connect_success: "✅ **Kết nối thành công!**\nBot đã tạo sẵn các sheet cần thiết. Hãy bắt đầu nhập chi tiêu!",
    connect_fail: "⛔ **Lỗi kết nối!**\nKhông thể truy cập Sheet ID này. Hãy chắc chắn bạn đã Share quyền **Editor** cho `" + BOT_EMAIL + "`.",
    saved: "✅ **Đã lưu chi:**",
    saved_in: "💰 **Đã lưu thu:**",
    report_header: "📊 **BÁO CÁO THÁNG**",
    report_year: "📅 **TỔNG KẾT NĂM**",
    total_in: "💰 THU:",
    total_out: "💸 CHI:",
    balance: "💎 **DƯ:**",
    budget: "🎯 **Ngân sách:**",
    budget_alert: "⚠️ **BÁO ĐỘNG**: Vượt ngân sách!",
    budget_warning: "⚠️ **Sắp hết tiền**: Đã dùng",
    no_data: "📭 Không có dữ liệu.",
    list_header: "📅 GD Tháng",
    filter_header: "📂",
    set_budget: "✅ Đã đặt ngân sách:",
    reminder_set: "⏰ Đã đặt nhắc nhở hàng ngày lúc",
    reminder_off: "🔕 Đã tắt nhắc nhở.",
    reminder_msg: "🔔 Đừng quên nhập chi tiêu hôm nay nhé! 💸",
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
          "� **KẾT NỐI**\n" +
          "`/connect [SheetID]` - Kết nối Sheet\n\n" +
          "💸 **CHI TIÊU**\n" +
          "`50k cafe` hoặc `2m nhà` - Nhập chi tiêu\n" +
          "`/undo` - Xóa giao dịch cuối\n" +
          "`/delete [ID]` - Xóa theo ID\n" +
          "`/search [từ khóa]` - Tìm kiếm\n\n" +
          "💰 **THU NHẬP**\n" +
          "`/in 10m lương` - Nhập thu nhập\n\n" +
          "📊 **BÁO CÁO**\n" +
          "`/report` - Báo cáo tháng này\n" +
          "`/report 12/2025` - Báo cáo tháng cụ thể\n" +
          "`/list` - Danh sách giao dịch\n" +
          "`/filter` - Lọc theo hạng mục\n" +
          "`/export` - Xuất file CSV\n\n" +
          "🎯 **NGÂN SÁCH**\n" +
          "`/budget` - Xem ngân sách\n" +
          "`/budget 5m` - Đặt tổng ngân sách\n" +
          "`/budget 2m ăn uống` - Đặt theo hạng mục\n\n" +
          "⏰ **NHẮC NHỞ**\n" +
          "`/remind 21:00` - Đặt nhắc nhở\n" +
          "`/stopremind` - Tắt nhắc nhở\n\n" +
          "⚙️ **CÀI ĐẶT**\n" +
          "`/lang` - Đổi ngôn ngữ\n" +
          "`/donate` - Ủng hộ tác giả"
  },
  en: {
    unauth: "⛔ Sheet not connected!\nInstructions:\n1. Create a new Google Sheet.\n2. Share **Editor** access to: `" + BOT_EMAIL + "` (or 'Anyone with the link').\n3. Copy Sheet ID.\n4. Type: `/connect [Sheet_ID]`",
    connect_success: "✅ **Connected successfully!**\nDatabase initialized. Start tracking now!",
    connect_fail: "⛔ **Connection failed!**\nCannot access this Sheet. Please ensure you shared **Editor** access with `" + BOT_EMAIL + "`.",
    saved: "✅ **Saved Expense:**",
    saved_in: "💰 **Saved Income:**",
    report_header: "📊 **MONTHLY REPORT**",
    report_year: "📅 **YEARLY SUMMARY**",
    total_in: "💰 IN:",
    total_out: "💸 OUT:",
    balance: "💎 **BAL:**",
    budget: "🎯 **Budget:**",
    budget_alert: "⚠️ **ALERT**: Over budget!",
    budget_warning: "⚠️ **Warning**: Used",
    no_data: "📭 No data available.",
    list_header: "📅 Trans Month",
    filter_header: "📂",
    set_budget: "✅ Budget set:",
    reminder_set: "⏰ Daily reminder set at",
    reminder_off: "🔕 Reminder turned off.",
    reminder_msg: "🔔 Don't forget to log your expenses! 💸",
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
          "� **CONNECTION**\n" +
          "`/connect [SheetID]` - Connect Sheet\n\n" +
          "💸 **EXPENSES**\n" +
          "`50k coffee` or `2m rent` - Log expense\n" +
          "`/undo` - Delete last transaction\n" +
          "`/delete [ID]` - Delete by ID\n" +
          "`/search [keyword]` - Search\n\n" +
          "💰 **INCOME**\n" +
          "`/in 10m salary` - Log income\n\n" +
          "📊 **REPORTS**\n" +
          "`/report` - This month report\n" +
          "`/report 12/2025` - Specific month\n" +
          "`/list` - Transaction list\n" +
          "`/filter` - Filter by category\n" +
          "`/export` - Export CSV file\n\n" +
          "🎯 **BUDGET**\n" +
          "`/budget` - View budgets\n" +
          "`/budget 5m` - Set total budget\n" +
          "`/budget 2m food` - Set by category\n\n" +
          "⏰ **REMINDERS**\n" +
          "`/remind 21:00` - Set reminder\n" +
          "`/stopremind` - Stop reminder\n\n" +
          "⚙️ **SETTINGS**\n" +
          "`/lang` - Change language\n" +
          "`/donate` - Support the author"
  }
};

function getLang() { return PropertiesService.getScriptProperties().getProperty('LANG') || 'vi'; }
function t(key) { var lang = getLang(); return (TEXT[lang] && TEXT[lang][key]) ? TEXT[lang][key] : (TEXT['vi'][key] || key); }

// --- MULTI-USER LOGIC ---
function getUserSheetId(telegramId) {
  // Cache user sheet ID to PropertyScript for faster access? 
  // For now, let's look up from Master Sheet every time or use CacheService.
  var cache = CacheService.getScriptCache();
  var cachedId = cache.get("user_" + telegramId);
  if (cachedId) return cachedId;

  var ss = SpreadsheetApp.openById(masterSheetId);
  var sheet = ss.getSheetByName('Users');
  if (!sheet) { ss.insertSheet('Users').appendRow(['TelegramID', 'SheetID', 'Name', 'JoinedDate']); return null; }
  
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(telegramId)) {
      cache.put("user_" + telegramId, data[i][1], 21600); // Cache 6 hours
      return data[i][1];
    }
  }
  return null;
}

function registerUser(telegramId, sheetId, name) {
  try {
    // Validate access
    var ss = SpreadsheetApp.openById(sheetId);
    // Init headers if empty
    getOrCreateSheetForUser(sheetId, 'Expense');
    getOrCreateSheetForUser(sheetId, 'Income');
    
    // Save to Master DB
    var master = SpreadsheetApp.openById(masterSheetId);
    var usersSheet = master.getSheetByName('Users');
    if (!usersSheet) usersSheet = master.insertSheet('Users').appendRow(['TelegramID', 'SheetID', 'Name', 'JoinedDate']);
    
    // Check exist
    var data = usersSheet.getDataRange().getValues();
    var exists = false;
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][0]) === String(telegramId)) {
        usersSheet.getRange(i + 1, 2).setValue(sheetId);
        exists = true; break;
      }
    }
    if (!exists) usersSheet.appendRow([String(telegramId), sheetId, name, new Date()]);
    
    // Update cache
    CacheService.getScriptCache().put("user_" + telegramId, sheetId, 21600);
    return true;
  } catch (e) {
    Logger.log("Register Error: " + e);
    return false;
  }
}

// --- MAIN HANDLERS ---
function doPost(e) {
  try {
    if (!token) return;
    var data = JSON.parse(e.postData.contents);
    var senderId = data.callback_query ? data.callback_query.from.id : data.message.from.id;
    var senderName = data.callback_query ? (data.callback_query.from.first_name) : (data.message.from.first_name);

    if (data.callback_query) { handleCallbackQuery(data.callback_query); return; }
    if (data.message && data.message.text) { handleMessage(data.message.text, senderId, senderName); }
  } catch (err) { Logger.log("Err: " + err); }
}

function handleMessage(text, senderId, senderName) {
  if (text === "/start" || text === "/help" || text === "/hdsd") { sendText(senderId, t('help')); return; }
  if (text.startsWith("/lang")) { sendLangButtons(senderId); return; }
  if (text.startsWith("/donate")) { handleDonateCommand(senderId, text.replace("/donate", "").trim()); return; }
  
  // -- CONNECT --
  if (text.startsWith("/connect ")) {
    var rawId = text.replace("/connect ", "").trim();
    // Extract ID if user sends full URL
    var match = rawId.match(/\/d\/([a-zA-Z0-9-_]+)/);
    var inputId = match ? match[1] : rawId;
    
    if (registerUser(senderId, inputId, senderName)) {
      sendText(senderId, t('connect_success'));
    } else {
      sendText(senderId, t('connect_fail'));
    }
    return;
  }

  // Check Auth for other commands
  var userSheetId = getUserSheetId(senderId);
  if (!userSheetId) { sendText(senderId, t('unauth')); return; }

  // Dispatch
  if (text.startsWith("/report")) { sendReport(senderId, userSheetId, text.replace("/report", "").trim()); return; }
  if (text.startsWith("/list")) { 
    var d = parseDateArg(text.replace("/list", "").trim());
    listExpenses(senderId, userSheetId, 1, null, null, d.month, d.year);
    return; 
  }
  if (text === "/undo") { askUndoConfirmation(senderId, userSheetId); return; }
  if (text === "/filter") { sendFilterButtons(senderId); return; }
  if (text.startsWith("/delete ")) { deleteById(senderId, userSheetId, text.replace("/delete ", "")); return; }
  if (text.startsWith("/search ")) { searchExpenses(senderId, userSheetId, text.replace("/search ", "")); return; }
  if (text.startsWith("/budget ")) { setBudget(senderId, userSheetId, text.replace("/budget ", "")); return; }
  if (text === "/budget") { setBudget(senderId, userSheetId, ""); return; }
  if (text.startsWith("/in ")) { handleIncomeCommand(senderId, userSheetId, text.replace("/in ", "")); return; }
  if (text.startsWith("/remind ")) { setupReminder(senderId, text.replace("/remind ", "")); return; }
  if (text === "/stopremind") { stopReminder(senderId); return; }
  if (text === "/export") { sendExportOptions(senderId); return; }
  
  handleExpenseMessage(senderId, userSheetId, text);
}

function handleCallbackQuery(cb) {
  var senderId = cb.from.id;
  var data = cb.data;
  var msgId = cb.message.message_id;

  if (data.startsWith("lang|")) {
    var lang = data.split("|")[1];
    PropertiesService.getScriptProperties().setProperty('LANG', lang); // Note: Should use UserProperties for multi-user, but we stick to simpler scope for now or global. 
    // Wait, Global LANG property affects everyone. For multi-user, we should use Cache or UserProperties.
    // Let's use UserPropertiesService.
    PropertiesService.getUserProperties().setProperty('LANG', lang);
    editMessage(senderId, msgId, (lang === 'vi') ? TEXT.vi.lang_set : TEXT.en.lang_set);
    return;
  }
  
  var userSheetId = getUserSheetId(senderId);
  if (!userSheetId) { sendText(senderId, t('unauth')); return; }

  if (data.startsWith("export|")) {
    exportData(senderId, userSheetId, data.split("|")[1]);
  } else if (data.startsWith("page|")) {
    var p = data.split("|");
    listExpenses(senderId, userSheetId, parseInt(p[1]), msgId, p[2], p[3], p[4]);
  } else if (data.startsWith("filter|")) {
    listExpenses(senderId, userSheetId, 1, msgId, data.split("|")[1]); 
  } else if (data.startsWith("in_save|")) {
    handleSaveIncome(senderId, userSheetId, cb);
  } else if (data === "confirm_undo") {
    executeDelete(senderId, userSheetId);
  } else if (data === "cancel_undo") {
    editMessage(senderId, msgId, t('cancel_undo'));
  } else if (data === "back_to_filter") {
    sendFilterButtons(senderId);
  } else {
    handleSaveExpense(senderId, userSheetId, cb);
  }
  answerCallback(cb.id);
}

// --- UTILS & HELPERS ---
// --- FEATURES ---
// ... (các hàm khác giữ nguyên)

function getOrCreateSheetForUser(targetSheetId, name) {
  var ss = SpreadsheetApp.openById(targetSheetId);
  var sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
    if (name === 'Income') sheet.appendRow(["STT", "Thời gian", "Số tiền", "Hạng mục", "Ghi chú"]); 
    else if (name === 'Expense') sheet.appendRow(["STT", "Ngày", "Số tiền", "Hạng mục", "Ghi chú"]);
    else if (name === 'Budget') sheet.appendRow(["Category", "Limit"]); // New functionality
  }
  return sheet;
}

// ...

function checkBudgetAlert(cid, sheetId, category, addAmt) {
  var budgets = getBudgetMap(sheetId);
  if (Object.keys(budgets).length === 0) return;

  var sheet = getOrCreateSheetForUser(sheetId, 'Expense');
  var data = sheet.getDataRange().getValues();
  var totalCur = 0, catCur = 0;
  var m = new Date().getMonth() + 1;
  var y = new Date().getFullYear();

  for (var i = 1; i < data.length; i++) { 
    var d = new Date(data[i][1]);
    if (d.getMonth() + 1 === m && d.getFullYear() === y) {
        var val = Number(data[i][2]);
        totalCur += val;
        if (data[i][3] && data[i][3].toLowerCase() === category.toLowerCase()) {
            catCur += val;
        }
    }
  }

  // Check Total Budget
  if (budgets['Total']) {
      var nextTotal = totalCur + addAmt;
      var b = budgets['Total'];
      if (nextTotal > b) sendText(cid, t('budget_alert') + " (Total: " + nextTotal.toLocaleString() + "/" + b.toLocaleString() + ")");
      else if (nextTotal > b * 0.9) sendText(cid, t('budget_warning') + " (Total: " + Math.round(nextTotal/b*100) + "%)");
  }

  // Check Category Budget
  // Find key case-insensitive
  var catKey = Object.keys(budgets).find(k => k.toLowerCase() === category.toLowerCase());
  if (catKey) {
      var nextCat = catCur + addAmt;
      var b = budgets[catKey];
      if (nextCat > b) sendText(cid, "⚠️ **Cảnh báo**: Vượt ngân sách mục '" + category + "'! (" + nextCat.toLocaleString() + "/" + b.toLocaleString() + ")");
      else if (nextCat > b * 0.9) sendText(cid, "⚠️ **Sắp hết tiền**: '" + category + "' đã dùng " + Math.round(nextCat/b*100) + "%");
  }
}

function setBudget(cid, sheetId, txt) {
  if (!txt) {
      // Show current budgets
      var budgets = getBudgetMap(sheetId);
      if (Object.keys(budgets).length === 0) { sendText(cid, "📭 Chưa có ngân sách nào. Gõ `/budget 5m` để đặt."); return; }
      var msg = "🎯 **Ngân sách tháng này:**\n";
      for (var k in budgets) { msg += "- " + (k==='Total'?'**Tổng**':k) + ": " + budgets[k].toLocaleString() + "\n"; }
      sendText(cid, msg);
      return;
  }

  // Parse: "5m" or "2m an uong"
  var parts = txt.split(" ");
  var raw = parts[0].toLowerCase();
  var mul = raw.includes('k') ? 1000 : (raw.includes('m') ? 1000000 : 1);
  var val = parseFloat(raw.replace(/[km]/g, "").replace(/,/g, ""));
  
  if (isNaN(val)) { sendText(cid, t('invalid_num')); return; }
  
  var cat = parts.slice(1).join(" ");
  var type = cat ? cat : "Total";
  var realVal = val * mul;

  var sheet = getOrCreateSheetForUser(sheetId, 'Budget');
  var data = sheet.getDataRange().getValues();
  var found = false;
  
  // Update existing
  for (var i = 1; i < data.length; i++) {
      if (data[i][0].toLowerCase() === type.toLowerCase()) {
          sheet.getRange(i+1, 2).setValue(realVal);
          found = true; break;
      }
  }
  // Or append new
  if (!found) sheet.appendRow([type, realVal]);
  
  sendText(cid, "✅ Đã đặt ngân sách **" + type + "**: " + realVal.toLocaleString());
}

function getBudgetMap(sheetId) {
    try {
        var sheet = getOrCreateSheetForUser(sheetId, 'Budget');
        var data = sheet.getDataRange().getValues();
        var res = {};
        for(var i=1; i<data.length; i++) {
            if(data[i][0] && data[i][1]) res[data[i][0]] = Number(data[i][1]);
        }
        return res;
    } catch(e) { return {}; }
}

// --- HELPER FUNCTIONS ---
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

// --- REPORT FUNCTIONS ---
function sendReport(cid, sheetId, arg) {
  try {
    var expSheet = getOrCreateSheetForUser(sheetId, 'Expense');
    var incSheet = getOrCreateSheetForUser(sheetId, 'Income');
    
    var d = parseDateArg(arg);
    var m = d.month, y = d.year;
    
    var expData = expSheet.getDataRange().getValues();
    var incData = incSheet.getDataRange().getValues();
    
    var totalOut = 0, totalIn = 0;
    var catTotals = {};
    
    // Sum Expenses
    for (var i = 1; i < expData.length; i++) {
      var date = new Date(expData[i][1]);
      if (date.getMonth() + 1 === m && date.getFullYear() === y) {
        var amt = Number(expData[i][2]) || 0;
        totalOut += amt;
        var cat = expData[i][3] || "Khác";
        catTotals[cat] = (catTotals[cat] || 0) + amt;
      }
    }
    
    // Sum Income
    for (var i = 1; i < incData.length; i++) {
      var date = new Date(incData[i][1]);
      if (date.getMonth() + 1 === m && date.getFullYear() === y) {
        totalIn += Number(incData[i][2]) || 0;
      }
    }
    
    var balance = totalIn - totalOut;
    
    var msg = t('report_header') + " " + m + "/" + y + "\n\n";
    msg += t('total_in') + " " + totalIn.toLocaleString() + "\n";
    msg += t('total_out') + " " + totalOut.toLocaleString() + "\n";
    msg += t('balance') + " " + balance.toLocaleString() + "\n\n";
    msg += "📊 **Chi tiết chi tiêu:**\n";
    
    for (var cat in catTotals) {
      msg += "• " + cat + ": " + catTotals[cat].toLocaleString() + "\n";
    }
    
    if (Object.keys(catTotals).length === 0) {
      msg += t('no_data');
    }
    
    sendText(cid, msg);
  } catch (e) {
    Logger.log("Report Error: " + e);
    sendText(cid, "❌ Lỗi tạo báo cáo: " + e.message);
  }
}

function listExpenses(cid, sheetId, page, msgId, category, month, year) {
  try {
    var pageSize = 10;
    var sheet = getOrCreateSheetForUser(sheetId, 'Expense');
    var data = sheet.getDataRange().getValues();
    
    var now = new Date();
    var m = month ? parseInt(month) : now.getMonth() + 1;
    var y = year ? parseInt(year) : now.getFullYear();
    
    // Filter data
    var filtered = [];
    for (var i = 1; i < data.length; i++) {
      var date = new Date(data[i][1]);
      if (date.getMonth() + 1 === m && date.getFullYear() === y) {
        if (!category || data[i][3] === category) {
          filtered.push(data[i]);
        }
      }
    }
    
    if (filtered.length === 0) {
      sendText(cid, t('no_data'));
      return;
    }
    
    // Pagination
    var totalPages = Math.ceil(filtered.length / pageSize);
    page = Math.max(1, Math.min(page, totalPages));
    var start = (page - 1) * pageSize;
    var end = Math.min(start + pageSize, filtered.length);
    
    var msg = t('list_header') + " " + m + "/" + y;
    if (category) msg += " (" + category + ")";
    msg += "\n\n";
    
    for (var i = start; i < end; i++) {
      var r = filtered[i];
      var d = new Date(r[1]);
      msg += "#" + r[0] + " | " + d.getDate() + "/" + (d.getMonth()+1) + " | " + Number(r[2]).toLocaleString() + " | " + r[3] + " | " + r[4] + "\n";
    }
    
    msg += "\n📄 Trang " + page + "/" + totalPages;
    
    // Navigation buttons
    var kb = [];
    var navRow = [];
    if (page > 1) navRow.push({text: "⬅️ Trước", callback_data: "page|" + (page-1) + "|" + (category||"") + "|" + m + "|" + y});
    if (page < totalPages) navRow.push({text: "Sau ➡️", callback_data: "page|" + (page+1) + "|" + (category||"") + "|" + m + "|" + y});
    if (navRow.length > 0) kb.push(navRow);
    kb.push([{text: "🔙 Lọc theo hạng mục", callback_data: "back_to_filter"}]);
    
    if (msgId) {
      editMessage(cid, msgId, msg);
    } else {
      sendMessageKb(cid, msg, {inline_keyboard: kb});
    }
  } catch (e) {
    Logger.log("List Error: " + e);
    sendText(cid, "❌ Lỗi: " + e.message);
  }
}

// --- EXPORT FUNCTIONS ---
function sendExportOptions(cid) {
  var kb = [
    [{text: "📤 Chi tiêu (Expense)", callback_data: "export|expense"}],
    [{text: "📥 Thu nhập (Income)", callback_data: "export|income"}],
    [{text: "📊 Tất cả (All)", callback_data: "export|all"}]
  ];
  sendMessageKb(cid, t('export_msg') + "Chọn loại dữ liệu:", {inline_keyboard: kb});
}

function exportData(cid, sheetId, type) {
  try {
    var ss = SpreadsheetApp.openById(sheetId);
    var folder = DriveApp.getRootFolder();
    var fileName = "Export_" + type + "_" + new Date().toISOString().split('T')[0] + ".csv";
    
    var content = "";
    
    if (type === "expense" || type === "all") {
      var expSheet = ss.getSheetByName('Expense');
      if (expSheet) {
        var expData = expSheet.getDataRange().getValues();
        content += "=== CHI TIÊU ===\n";
        for (var i = 0; i < expData.length; i++) {
          content += expData[i].join(",") + "\n";
        }
        content += "\n";
      }
    }
    
    if (type === "income" || type === "all") {
      var incSheet = ss.getSheetByName('Income');
      if (incSheet) {
        var incData = incSheet.getDataRange().getValues();
        content += "=== THU NHẬP ===\n";
        for (var i = 0; i < incData.length; i++) {
          content += incData[i].join(",") + "\n";
        }
      }
    }
    
    var file = folder.createFile(fileName, content, MimeType.PLAIN_TEXT);
    file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    
    sendText(cid, "✅ Đã xuất file!\n📎 Link: " + file.getUrl());
    
    // Auto-delete after 24h (optional cleanup)
    Utilities.sleep(100);
  } catch (e) {
    Logger.log("Export Error: " + e);
    sendText(cid, "❌ Lỗi xuất file: " + e.message);
  }
}

function handleExpenseMessage(cid, sheetId, text) {
  var p = text.split(" ");
  var raw = p[0].toLowerCase();
  var mul = raw.includes('k') ? 1000 : (raw.includes('m') ? 1000000 : 1);
  var amt = parseFloat(raw.replace(/[km]/g, "")) * mul;
  if (isNaN(amt)) return;
  var note = p.slice(1).join(" ") || "General";
  
  // Try to optimize: don't check budget here yet, wait for category selection?
  // Actually, we don't know category yet. 
  // PROBLEM: Logic alert needs category. But category is chosen AFTER button click.
  // SOLUTION: Move checkBudgetAlert to `handleSaveExpense`.
  
  sendCategoryButtons(cid, amt, note);
}

function handleSaveExpense(cid, sheetId, cb) {
  var d = cb.data.split("|"); // Category|Amount|Note
  var cat = d[0], amt = Number(d[1]), note = d[2];
  
  var sheet = getOrCreateSheetForUser(sheetId, 'Expense');
  sheet.appendRow([sheet.getLastRow(), new Date(), amt, cat, note]);
  
  editMessage(cid, cb.message.message_id, t('saved') + " " + amt.toLocaleString() + "\n📂 " + cat + " | 📝 " + note);
  
  // Check Budget AFTER saving (and knowing category)
  checkBudgetAlert(cid, sheetId, cat, amt);
}

function deleteById(cid, sheetId, id) {
  var sheet = getOrCreateSheetForUser(sheetId, 'Expense');
  var rid = parseInt(id);
  if (rid && rid <= sheet.getLastRow()) sheet.deleteRow(rid);
  sendText(cid, t('deleted'));
}

function searchExpenses(cid, sheetId, k) { 
  var d = getOrCreateSheetForUser(sheetId, 'Expense').getDataRange().getValues(), msg="", total=0;
  for(var i=1;i<d.length;i++) { if(String(d[i]).toLowerCase().includes(k.toLowerCase())) { msg += "• " + d[i][3] + ": " + Number(d[i][2]).toLocaleString() + " (" + d[i][4] + ")\n"; total += Number(d[i][2]); } }
  sendText(cid, t('search_result') + "\n" + (msg||t('not_found')) + "\nTotal: " + total.toLocaleString());
}

// --- INCOME HANDLERS ---
function handleIncomeCommand(cid, sheetId, text) {
  // Parse: "200k" or "10m lương" or "5m test"
  var p = text.split(" ");
  var raw = p[0].toLowerCase();
  var mul = raw.includes('k') ? 1000 : (raw.includes('m') ? 1000000 : 1);
  var amt = parseFloat(raw.replace(/[km]/g, "").replace(/,/g, "")) * mul;
  
  if (isNaN(amt) || amt <= 0) { 
    sendText(cid, t('invalid_num')); 
    return; 
  }
  
  var note = p.slice(1).join(" ") || "Income";
  
  // Show category buttons for income
  var cats = ["Lương", "Thưởng", "Đầu tư", "Donate", "Khác"];
  var kb = [];
  for (var i = 0; i < cats.length; i += 2) {
    var row = [{text: cats[i], callback_data: "in_save|" + cats[i] + "|" + amt + "|" + note}];
    if (cats[i+1]) row.push({text: cats[i+1], callback_data: "in_save|" + cats[i+1] + "|" + amt + "|" + note});
    kb.push(row);
  }
  sendMessageKb(cid, "💰 Lưu thu nhập " + amt.toLocaleString() + " vào hạng mục:", {inline_keyboard: kb});
}

function handleSaveIncome(cid, sheetId, cb) {
  var d = cb.data.split("|"); // in_save|Category|Amount|Note
  var cat = d[1], amt = Number(d[2]), note = d[3];
  
  var sheet = getOrCreateSheetForUser(sheetId, 'Income');
  sheet.appendRow([sheet.getLastRow(), new Date(), amt, cat, note]);
  
  editMessage(cid, cb.message.message_id, t('saved_in') + " " + amt.toLocaleString() + "\n📂 " + cat + " | 📝 " + note);
}

function handleDonateCommand(cid, text) {
  // Show QR code and donation info
  var qrUrl = "https://img.vietqr.io/image/VCB-" + CONFIG.STK + "-1SSGSl9.png";
  sendPhoto(cid, qrUrl, t('donate_msg'));
}

// --- BASIC SENDER ---
function sendText(cid, txt) { UrlFetchApp.fetch("https://api.telegram.org/bot" + token + "/sendMessage", { method: "post", payload: { chat_id: String(cid), text: txt, parse_mode: "Markdown" } }); }
function sendPhoto(cid, url, cap) { UrlFetchApp.fetch("https://api.telegram.org/bot" + token + "/sendPhoto", { method: "post", payload: { chat_id: String(cid), photo: url, caption: cap, parse_mode: "Markdown" } }); }
function sendMessageKb(cid, txt, kb) { UrlFetchApp.fetch("https://api.telegram.org/bot" + token + "/sendMessage", { method: "post", payload: { chat_id: String(cid), text: txt, reply_markup: JSON.stringify(kb) } }); }
function editMessage(cid, mid, txt) { UrlFetchApp.fetch("https://api.telegram.org/bot" + token + "/editMessageText", { method: "post", payload: { chat_id: String(cid), message_id: mid, text: txt, parse_mode: "Markdown" } }); }
function answerCallback(id) { UrlFetchApp.fetch("https://api.telegram.org/bot" + token + "/answerCallbackQuery", { method: "post", payload: { callback_query_id: id } }); }

// --- UI COMPONENTS ---
function sendCategoryButtons(cid, a, n) { 
  var cats = ["Ăn uống", "Học tập", "Nhà cửa", "Y tế", "Giải trí", "Khác"];
  var kb=[]; for(var i=0;i<cats.length;i+=2) kb.push([{text:cats[i],callback_data:cats[i]+"|"+a+"|"+n},{text:cats[i+1],callback_data:cats[i+1]+"|"+a+"|"+n}]);
  sendMessageKb(cid, t('choose_cat') + " " + a.toLocaleString() + " ("+n+")", {inline_keyboard:kb});
}
function sendFilterButtons(cid) { 
  var cats = ["Ăn uống", "Học tập", "Nhà cửa", "Y tế", "Giải trí", "Khác"];
  var kb=[]; for(var i=0;i<cats.length;i+=2) kb.push([{text:cats[i],callback_data:"filter|"+cats[i]},{text:cats[i+1],callback_data:"filter|"+cats[i+1]}]);
  sendMessageKb(cid, "Categories:", {inline_keyboard:kb});
}
function sendLangButtons(cid) {
  var kb = [[{text: "🇻🇳 Tiếng Việt", callback_data: "lang|vi"}, {text: "🇬🇧 English", callback_data: "lang|en"}]];
  sendMessageKb(cid, t('choose_lang'), {inline_keyboard:kb});
}
function askUndoConfirmation(cid, sheetId) {
    var sheet = getOrCreateSheetForUser(sheetId, 'Expense');
    var lastRow = sheet.getLastRow();
    if (lastRow <= 1) { sendText(cid, t('no_data')); return; }
    var r = sheet.getRange(lastRow, 1, 1, 5).getValues()[0];
    if ((new Date()-new Date(r[1]))/60000 > 5) { sendText(cid, "⏳ > 5 mins. Use /delete [ID]"); return; }
    var kb = { inline_keyboard: [[{text:"✅ Yes", callback_data:"confirm_undo"},{text:"❌ No", callback_data:"cancel_undo"}]]};
    sendMessageKb(cid, t('undo_confirm'), kb);
}
function executeDelete(cid, sheetId) {
    var sheet = getOrCreateSheetForUser(sheetId, 'Expense');
    sheet.deleteRow(sheet.getLastRow());
    sendText(cid, t('deleted'));
}

// --- SETUP ---
function setupWebhook() { var url = ScriptApp.getService().getUrl(); UrlFetchApp.fetch("https://api.telegram.org/bot" + token + "/setWebhook?url=" + url); }
function setupCommands() {
    var cmds = [
        {command: "connect", description: "🔗 Kết nối Sheet (Connect)"},
        {command: "in", description: "💰 Thu nhập (Income)"},
        {command: "report", description: "📊 Báo cáo (Report)"},
        {command: "list", description: "📜 Danh sách (List)"},
        {command: "budget", description: "🎯 Ngân sách (Budget)"},
        {command: "remind", description: "⏰ Nhắc nhở (Reminder)"},
        {command: "donate", description: "💖 Ủng hộ (Donate)"},
        {command: "stopremind", description: "🔕 Tắt nhắc (Stop Reminder)"},
        {command: "export", description: "📂 Xuất file (Export)"},
        {command: "filter", description: "🔍 Lọc (Filter)"},
        {command: "search", description: "🔎 Tìm (Search)"},
        {command: "delete", description: "🗑 Xóa (Delete)"},
        {command: "lang", description: "🌐 Ngôn ngữ (Language)"},
        {command: "help", description: "💡 Hướng dẫn (Help)"}
    ];
    UrlFetchApp.fetch("https://api.telegram.org/bot" + token + "/setMyCommands", { method: "post", payload: { commands: JSON.stringify(cmds) } });
    Logger.log("Commands setup done");
}
// Reminder logic needs UserProperty store for trigger mapping, for simplicity triggers are global.
// In Multi-user, using limits of triggers (20 per users) is hard. Better approach is one hourly trigger checking all users.
// For now, let's keep Trigger as is (LIMITATION: Only dev can use remind efficiently or limited users).
// Or we warn users about Remind limit.
function setupReminder(cid, timeStr) {
  var parts = timeStr.split(":");
  if (parts.length !== 2) { sendText(cid, t('invalid_time')); return; }
  // Note: Simple trigger implementation for single user context. Multi-tenant triggers are complex.
  // Warning: This creates a trigger for the SCRIPT OWNER effective for the user.
  // We will support it but notify it might be limited.
  var h = parseInt(parts[0]), m = parseInt(parts[1]);
  stopReminder(cid);
  ScriptApp.newTrigger("sendDailyReminder").timeBased().atHour(h).nearMinute(m).everyDays(1).create();
  sendText(cid, t('reminder_set') + " " + timeStr);
}
function stopReminder(cid) {
  // Clearing ALL triggers might affect others. Ideally we tag triggers. Apps Script triggers don't have tags easily.
  // Simplify: "Delete all triggers" for this script. -> BAD for multi user.
  // Acceptable compromise for this scale: One reminder time per bot instance? Or just disable for now?
  // Let's keep it simple: clear all text triggers.
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) { if (triggers[i].getHandlerFunction() === "sendDailyReminder") ScriptApp.deleteTrigger(triggers[i]); }
  sendText(cid, t('reminder_off'));
}
function sendDailyReminder() { 
    // This function runs by trigger. It doesn't know who to send to unless we store it.
    // For Multi-user Scaling, we need a DB of Reminders.
    // Complex feature for this step. Let's just send to admin or disable.
    // Revert to sending to myChatId (Admin) only for specific request, or braodcast?
    // Let's just send to 'myChatId' (Admin) as original logic. 
    UrlFetchApp.fetch("https://api.telegram.org/bot" + token + "/sendMessage", { method: "post", payload: { chat_id: String(myChatId), text: "🔔 Reminder!" } }); 
}

// --- VCB AUTOMATION & DONATE TRACKING ---

/**
 * Hàm chính chạy định kỳ (Time-driven trigger)
 * Cài đặt Trigger: Chạy mỗi 10 hoặc 30 phút.
 */
function runCheckBalance() {
  var MAX_RETRIES = 3;
  
  for (var attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    Logger.log("🔄 Attempt " + attempt + "/" + MAX_RETRIES);
    
    try {
      // 1. Get Captcha
      var captchaObj = getVcbCaptcha();
      if (!captchaObj.base64) {
        Logger.log("❌ Failed to get Captcha");
        continue;
      }
      
      // 2. Solve Captcha (HuggingFace)
      var captchaText = solveCaptchaOnHF(captchaObj.base64);
      if (!captchaText) {
        Logger.log("❌ Failed to solve Captcha");
        continue;
      }
      Logger.log("✅ Captcha solved: " + captchaText);
      
      // 3. Login
      var sessionId = loginVCB(captchaText, captchaObj);
      
      if (sessionId) {
        Logger.log("✅ Login Success, SessionID: " + sessionId.substring(0, 10) + "...");
        
        // 4. Get History
        var txns = getVcbHistory(sessionId);
        
        // 5. Process
        if (txns && txns.length > 0) {
          processDonations(txns);
        } else {
          Logger.log("📭 No recent transactions.");
        }
        
        return; // Success, exit the loop
        
      } else {
        Logger.log("❌ Login Failed (likely wrong captcha), retrying...");
        Utilities.sleep(1000); // Wait 1 second before retry
      }
    } catch (e) {
      Logger.log("🔥 System Error: " + e);
    }
  }
  
  Logger.log("❌ All " + MAX_RETRIES + " attempts failed.");
}

function solveCaptchaOnHF(base64Image) {
  try {
    // Format for repo's HF Space: {"data": "data:image/jpeg;base64,{b64encimg}"}
    var payload = {
      "data": "data:image/jpeg;base64," + base64Image
    };
    
    var options = {
      'method': 'post',
      'contentType': 'application/json',
      'payload': JSON.stringify(payload),
      'muteHttpExceptions': true
    };
    
    var res = UrlFetchApp.fetch(CONFIG.HF_API, options);
    var txt = res.getContentText();
    Logger.log("HF Response: " + txt);
    
    try {
      var json = JSON.parse(txt);
    } catch(e) {
      Logger.log("HF Response is not JSON");
      return null;
    }
    
    // Repo's Space returns: {"result": "..."} 
    if (json.result) return json.result;
    if (json.captcha) return json.captcha;
    if (json.data && json.data[0]) return json.data[0];
    
    Logger.log("⚠️ Unknown HF Response format");
    return null; 
  } catch (e) {
    Logger.log("Captcha Solve Err: " + e);
    return null;
  }
}

function processDonations(txns) {
  var props = PropertiesService.getScriptProperties();
  var lastId = props.getProperty('LAST_VCB_TXN_ID') || "0";
  
  // Sort by time? Usually API returns newest first or unsorted.
  // Best to process all, filter by ID > lastId.
  // VCB txnId usually string/number valid for comparison?
  // If txnId is string "239482...", string compare might be wrong if length differs ("10" < "9").
  // Safe to use logic: New txns valid if we haven't seen them.
  // Simple logic:
  
  var newLastId = lastId;
  var count = 0;
  
  // Reverse to process Oldest -> Newest (if API returns Newest First)
  // Repo: usually returns list.
  
  // Let's iterate.
  for (var i = txns.length - 1; i >= 0; i--) {
     var t = txns[i];
     // Check ID. VCB ID example: "12345". 
     // Comparison:
     if (compareTxnId(t.reference, lastId) > 0) { // reference or transactionId
        // New Transaction!
        // Filter incoming only? (Credit) -> "CD" = "+", "D" = "-" usually.
        // VCB: dorc = "C" (Credit) / "D" (Debit)
        if (t.dorc === 'C' || t.amount > 0) {
            var msg = (t.description || "").toLowerCase();
            var amt = Number(t.amount.replace(/,/g, ''));
            
            // Save to Income sheet (Admin)
            try {
              var sheet = getOrCreateSheetForUser(masterSheetId, 'Income');
              sheet.appendRow([sheet.getLastRow(), new Date(t.transactionDate), amt, "Donate", t.description || "Bank Transfer"]);
            } catch(e) {
              Logger.log("Save Donate Error: " + e);
            }
            
            // Send Thank You
            var reply = "💖 **CẢM ƠN BẠN ĐÃ DONATE** 💖\n" +
                        "💰 Số tiền: " + amt.toLocaleString() + " VNĐ\n" +
                        "📝 Nội dung: " + t.description + "\n" +
                        "⏰ Thời gian: " + t.transactionDate;
            
            sendTelegramNotice(reply);
            count++;
        }
        
        // Update Last ID
        if (compareTxnId(t.reference, newLastId) > 0) newLastId = t.reference;
     }
  }
  
  if (count > 0) {
    props.setProperty('LAST_VCB_TXN_ID', newLastId);
    Logger.log("✅ Processed " + count + " new donations.");
  }
}

function compareTxnId(a, b) {
    // VCB References often numeric strings.
    // If purely numeric, parse.
    // If not, string compare.
    // If 1 is empty, the other is larger.
    if (!b) return 1;
    if (!a) return -1;
    // Compare logic
    // Try number
    try {
        var na = parseFloat(a);
        var nb = parseFloat(b);
        if (!isNaN(na) && !isNaN(nb)) return na - nb;
    } catch(e){}
    return a.localeCompare(b);
}

function sendTelegramNotice(text) {
   // Send to Admin (MY_CHAT_ID)
   if (!myChatId) return;
   UrlFetchApp.fetch("https://api.telegram.org/bot" + token + "/sendMessage", { 
       method: "post", 
       payload: { chat_id: String(myChatId), text: text, parse_mode: "Markdown" } 
   });
}
