/**
 * ============================================================================
 * Features.gs - TÍNH NĂNG CHÍNH
 * ============================================================================
 * File này chứa tất cả các tính năng chính của bot:
 * 
 * 📊 REPORT (dòng ~7-149)
 *    - sendReport(): Tạo báo cáo tháng với biểu đồ
 *    - generateExpenseChart(): Tạo URL biểu đồ QuickChart
 * 
 * 📜 LIST (dòng ~151-210)
 *    - listExpenses(): Danh sách chi tiêu phân trang
 * 
 * 🎯 BUDGET (dòng ~212-296)
 *    - checkBudgetAlert(): Kiểm tra cảnh báo ngân sách
 *    - setBudget(): Đặt ngân sách
 *    - getBudgetMap(): Lấy map ngân sách
 * 
 * 📤 EXPORT (dòng ~298-347)
 *    - sendExportOptions(): Gửi menu export
 *    - exportData(): Xuất CSV lên Drive
 * 
 * 💸 EXPENSE/INCOME HANDLERS (dòng ~349-426)
 *    - handleExpenseMessage(): Parse và show buttons
 *    - handleSaveExpense(): Lưu vào sheet
 *    - handleIncomeCommand(): Parse thu nhập
 *    - handleSaveIncome(): Lưu thu nhập
 *    - handleDonateCommand(): Hiển thị QR donate
 * 
 * 🔍 SEARCH/DELETE (dòng ~428-468)
 *    - searchExpenses(): Tìm kiếm chi tiêu
 *    - deleteById(): Xóa theo ID
 *    - askUndoConfirmation(): Xác nhận xóa
 *    - executeDelete(): Thực thi xóa
 * 
 * 💰 INCOME MANAGEMENT (dòng ~470-598)
 *    - searchIncome(), deleteIncomeById(), listIncome()
 *    - Bảo vệ Donate không cho xóa
 * 
 * 📂 CUSTOM CATEGORIES (dòng ~600-784)
 *    - getCategories(): Lấy danh sách hạng mục
 *    - addCategory(), removeCategory()
 *    - listCategories(), handleCategoryCommand()
 *    - sendCategoryButtonsCustom(): UI với custom categories
 * 
 * 🔄 RECURRING TRANSACTIONS (dòng ~786-1010)
 *    - addRecurring(), removeRecurring(), listRecurring()
 *    - processRecurringTransactions(): Xử lý tự động hàng ngày
 *    - setupDailyRecurringTrigger(): Tạo trigger
 */

// =============================================================================
// REPORT FEATURE - Báo cáo chi tiêu
// =============================================================================

/**
 * Gửi báo cáo chi tiêu tháng kèm biểu đồ
 * @param {string|number} cid - Chat ID
 * @param {string} sheetId - ID Google Sheet của user
 * @param {string} arg - Tháng/năm (VD: "12/2025" hoặc "")
 * @param {string|number} telegramId - Telegram ID
 */
function sendReport(cid, sheetId, arg, telegramId) {
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
    
    var msg = t('report_header', telegramId) + " " + m + "/" + y + "\n\n";
    msg += t('total_in', telegramId) + " " + formatMoney(totalIn) + "\n";
    msg += t('total_out', telegramId) + " " + formatMoney(totalOut) + "\n";
    msg += t('balance', telegramId) + " " + formatMoney(balance) + "\n\n";
    msg += "📊 **Chi tiết chi tiêu:**\n";
    
    for (var cat in catTotals) {
      var percent = totalOut > 0 ? Math.round(catTotals[cat] / totalOut * 100) : 0;
      msg += "• " + cat + ": " + formatMoney(catTotals[cat]) + " (" + percent + "%)\n";
    }

    // Breakdown by User (Shared Finance)
    var userTotals = {};
    var hasUserColumn = (expData.length > 0 && expData[0].length >= 6); // Check if column 6 exists
    
    if (hasUserColumn) {
       for (var i = 1; i < expData.length; i++) {
          var date = new Date(expData[i][1]);
          if (date.getMonth() + 1 === m && date.getFullYear() === y) {
             var amt = Number(expData[i][2]) || 0;
             var who = expData[i][5] || "Unknown"; // Column F (index 5)
             userTotals[who] = (userTotals[who] || 0) + amt;
          }
       }
       
       if (Object.keys(userTotals).length > 1) { // Only show if more than 1 user or explicitly tracked
          msg += "\n👥 **Chi tiêu theo thành viên:**\n";
          for (var u in userTotals) {
             msg += "• " + u + ": " + formatMoney(userTotals[u]) + "\n";
          }
       }
    }
    
    if (Object.keys(catTotals).length === 0) {
      msg += t('no_data', telegramId);
      sendText(cid, msg);
      return;
    }
    
    // Generate Chart
    var chartUrl = generateExpenseChart(catTotals, m, y);
    if (chartUrl) {
      sendPhoto(cid, chartUrl, msg);
    } else {
      sendText(cid, msg);
    }
    
  } catch (e) {
    Logger.log("Report Error: " + e);
    sendText(cid, "❌ Lỗi tạo báo cáo: " + e.message);
    logErrorToAdmin(e, "sendReport");
  }
}

function sendMonthlyReportAuto() {
  var masterId = CONFIG.MASTER_SHEET_ID;
  if (!masterId) return;
  
  try {
    var ss = SpreadsheetApp.openById(masterId);
    var sheet = ss.getSheetByName('Users');
    var data = sheet.getDataRange().getValues();
    
    // Calculate last month
    var now = new Date();
    var lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    var m = lastMonthDate.getMonth() + 1;
    var y = lastMonthDate.getFullYear();
    var dateStr = m + "/" + y;
    
    for (var i = 1; i < data.length; i++) {
       var telegramId = data[i][0];
       var sheetId = data[i][1];
       if (telegramId && sheetId) {
          try {
             sendReport(telegramId, sheetId, dateStr, telegramId);
             sendText(telegramId, "📅 **Báo cáo tự động đầu tháng** (" + dateStr + ")");
          } catch (err) {
             Logger.log("Auto Report Failed for " + telegramId + ": " + err);
          }
       }
    }
  } catch (e) {
    logErrorToAdmin(e, "sendMonthlyReportAuto");
  }
}

function generateExpenseChart(catTotals, month, year) {
  try {
    var labels = [];
    var data = [];
    
    var total = 0;
    for (var cat in catTotals) {
      total += catTotals[cat];
    }
    
    for (var cat in catTotals) {
      var percent = Math.round(catTotals[cat] / total * 100);
      labels.push(cat + ' (' + percent + '%)');
      data.push(percent);
    }
    
    var chartConfig = {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          data: data,
          backgroundColor: CONFIG.CHART_COLORS.slice(0, labels.length),
          borderWidth: 2,
          borderColor: '#fff',
          datalabels: {
            labels: {
              value: {
                color: '#fff',
                font: { weight: 'bold', size: 14 },
                formatter: 'value',
                display: 'auto'
              }
            }
          }
        }]
      },
      options: {
        plugins: {
          title: {
            display: true,
            text: 'Chi tiêu tháng ' + month + '/' + year,
            font: { size: 18, weight: 'bold' },
            color: '#333',
            padding: 15
          },
          legend: {
            display: true,
            position: 'right',
            align: 'center',
            labels: { 
              font: { size: 12 },
              padding: 10,
              usePointStyle: true,
              boxWidth: 12
            }
          },
          datalabels: {
            display: 'auto',
            color: '#fff',
            font: { weight: 'bold', size: 13 },
            anchor: 'center',
            align: 'center'
          }
        },
        layout: { 
          padding: 10
        }
      }
    };
    
    return "https://quickchart.io/chart?c=" + encodeURIComponent(JSON.stringify(chartConfig)) + "&w=700&h=380&bkg=white";
  } catch (e) {
    Logger.log("Chart Error: " + e);
    return null;
  }
}

// --- LIST FEATURE ---
function listExpenses(cid, sheetId, page, msgId, category, month, year, telegramId) {
  try {
    var pageSize = CONFIG.PAGE_SIZE;
    var sheet = getOrCreateSheetForUser(sheetId, 'Expense');
    var data = sheet.getDataRange().getValues();
    
    var now = new Date();
    var m = month ? parseInt(month) : now.getMonth() + 1;
    var y = year ? parseInt(year) : now.getFullYear();
    
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
      sendText(cid, t('no_data', telegramId));
      return;
    }
    
    var totalPages = Math.ceil(filtered.length / pageSize);
    page = Math.max(1, Math.min(page, totalPages));
    var start = (page - 1) * pageSize;
    var end = Math.min(start + pageSize, filtered.length);
    
    var msg = t('list_header', telegramId) + " " + m + "/" + y;
    if (category) msg += " (" + category + ")";
    msg += "\n\n";
    
    for (var i = start; i < end; i++) {
      var r = filtered[i];
      var d = new Date(r[1]);
      msg += "#" + r[0] + " | " + d.getDate() + "/" + (d.getMonth()+1) + " | " + formatMoney(r[2]) + " | " + r[3] + " | " + r[4] + "\n";
    }
    
    msg += "\n📄 Trang " + page + "/" + totalPages;
    
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

// --- BUDGET FEATURE ---
function checkBudgetAlert(cid, sheetId, category, addAmt, telegramId) {
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

  if (budgets['Total']) {
    var nextTotal = totalCur + addAmt;
    var b = budgets['Total'];
    if (nextTotal > b) sendText(cid, t('budget_alert', telegramId) + " (Total: " + formatMoney(nextTotal) + "/" + formatMoney(b) + ")");
    else if (nextTotal > b * 0.9) sendText(cid, t('budget_warning', telegramId) + " " + Math.round(nextTotal/b*100) + "%");
  }

  var catKey = Object.keys(budgets).find(function(k) { return k.toLowerCase() === category.toLowerCase(); });
  if (catKey) {
    var nextCat = catCur + addAmt;
    var b = budgets[catKey];
    if (nextCat > b) sendText(cid, "⚠️ Vượt ngân sách '" + category + "'! (" + formatMoney(nextCat) + "/" + formatMoney(b) + ")");
    else if (nextCat > b * 0.9) sendText(cid, "⚠️ '" + category + "' đã dùng " + Math.round(nextCat/b*100) + "%");
  }
}

function setBudget(cid, sheetId, txt, telegramId) {
  if (!txt) {
    var budgets = getBudgetMap(sheetId);
    if (Object.keys(budgets).length === 0) { 
      sendText(cid, "📭 Chưa có ngân sách nào. Gõ `/budget 5m [hạng mục]` để đặt."); 
      return; 
    }
    var msg = "🎯 **Ngân sách tháng này:**\n";
    for (var k in budgets) { 
      msg += "- " + (k==='Total'?'**Tổng**':k) + ": " + formatMoney(budgets[k]) + "\n"; 
    }
    sendText(cid, msg);
    return;
  }

  var amt = parseAmount(txt.split(" ")[0]);
  if (!amt) { sendText(cid, t('invalid_num', telegramId)); return; }
  
  var cat = txt.split(" ").slice(1).join(" ") || "Total";
  // Validate category if not 'Total'
  if (cat !== 'Total') {
     var cats = getCategories(sheetId, 'expense');
     // Fuzzy match or just allow it? Let's check if exists to prevent typos
     // But for flexibility, let's auto-capitalize first letter
  }

  var sheet = getOrCreateSheetForUser(sheetId, 'Budget');
  var data = sheet.getDataRange().getValues();
  var found = false;
  
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] && data[i][0].toLowerCase() === cat.toLowerCase()) {
      sheet.getRange(i+1, 2).setValue(amt);
      found = true; 
      break;
    }
  }
  if (!found) sheet.appendRow([cat, amt]);
  
  sendText(cid, "✅ Đã đặt ngân sách **" + cat + "**: " + formatMoney(amt));
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

// --- EXPORT FEATURE ---
function sendExportOptions(cid, telegramId) {
  var kb = [
    [{text: "📤 Chi tiêu (Expense)", callback_data: "export|expense"}],
    [{text: "📥 Thu nhập (Income)", callback_data: "export|income"}],
    [{text: "📊 Tất cả (All)", callback_data: "export|all"}]
  ];
  sendMessageKb(cid, t('export_msg', telegramId) + "Chọn loại dữ liệu:", {inline_keyboard: kb});
}

function exportData(cid, sheetId, type, telegramId) {
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
  } catch (e) {
    Logger.log("Export Error: " + e);
    sendText(cid, "❌ Lỗi xuất file: " + e.message);
  }
}

// --- EXPENSE/INCOME HANDLERS ---
function handleExpenseMessage(cid, sheetId, text, telegramId) {
  var amt = parseAmount(text.split(" ")[0]);
  if (!amt) return false;
  
  var note = sanitizeInput(text.split(" ").slice(1).join(" ")) || "General";
  sendCategoryButtonsCustom(cid, sheetId, amt, note, telegramId);
  return true;
}

function handleSaveExpense(cid, sheetId, cb, telegramId) {
  var d = cb.data.split("|");
  var cat = d[0], amt = Number(d[1]), note = d[2];
  
  var sheet = getOrCreateSheetForUser(sheetId, 'Expense');
  var sender = getSenderName(telegramId);
  sheet.appendRow([sheet.getLastRow(), new Date(), amt, cat, note, sender]);
  
  editMessage(cid, cb.message.message_id, t('saved', telegramId) + " " + formatMoney(amt) + "\n📂 " + cat + " | 📝 " + note);
  
  checkBudgetAlert(cid, sheetId, cat, amt, telegramId);
}

function handleIncomeCommand(cid, sheetId, text, telegramId) {
  var amt = parseAmount(text.split(" ")[0]);
  if (!amt) { 
    sendText(cid, t('invalid_num', telegramId)); 
    return; 
  }
  
  var note = sanitizeInput(text.split(" ").slice(1).join(" ")) || "Income";
  sendIncomeButtonsCustom(cid, sheetId, amt, note, telegramId);
}

function handleSaveIncome(cid, sheetId, cb, telegramId) {
  var d = cb.data.split("|");
  var cat = d[1], amt = Number(d[2]), note = d[3];
  
  var sheet = getOrCreateSheetForUser(sheetId, 'Income');
  var sender = getSenderName(telegramId);
  sheet.appendRow([sheet.getLastRow(), new Date(), amt, cat, note, sender]);
  
  editMessage(cid, cb.message.message_id, t('saved_in', telegramId) + " " + formatMoney(amt) + "\n📂 " + cat + " | 📝 " + note);
}

// --- UI COMPONENTS ---
function sendCategoryButtons(cid, amount, note, telegramId) { 
  var kb = [];
  for (var i = 0; i < CONFIG.EXPENSE_CATEGORIES.length; i += 2) {
    var row = [{text: CONFIG.EXPENSE_CATEGORIES[i], callback_data: CONFIG.EXPENSE_CATEGORIES[i] + "|" + amount + "|" + note}];
    if (CONFIG.EXPENSE_CATEGORIES[i+1]) {
      row.push({text: CONFIG.EXPENSE_CATEGORIES[i+1], callback_data: CONFIG.EXPENSE_CATEGORIES[i+1] + "|" + amount + "|" + note});
    }
    kb.push(row);
  }
  sendMessageKb(cid, t('choose_cat', telegramId) + " " + formatMoney(amount) + " (" + note + ")", {inline_keyboard: kb});
}

function sendFilterButtons(cid, telegramId) { 
  var kb = [];
  for (var i = 0; i < CONFIG.EXPENSE_CATEGORIES.length; i += 2) {
    var row = [{text: CONFIG.EXPENSE_CATEGORIES[i], callback_data: "filter|" + CONFIG.EXPENSE_CATEGORIES[i]}];
    if (CONFIG.EXPENSE_CATEGORIES[i+1]) {
      row.push({text: CONFIG.EXPENSE_CATEGORIES[i+1], callback_data: "filter|" + CONFIG.EXPENSE_CATEGORIES[i+1]});
    }
    kb.push(row);
  }
  sendMessageKb(cid, "📂 Chọn hạng mục:", {inline_keyboard: kb});
}

function sendLangButtons(cid) {
  var kb = [[{text: "🇻🇳 Tiếng Việt", callback_data: "lang|vi"}, {text: "🇬🇧 English", callback_data: "lang|en"}]];
  sendMessageKb(cid, TEXT.vi.choose_lang, {inline_keyboard: kb});
}

// --- OTHER FEATURES ---
function handleDonateCommand(cid, telegramId) {
  // Embed Telegram ID into the QR for tracking
  // VietQR format: https://img.vietqr.io/image/<BANK>-<ACC>-<TEMPLATE>.png?addInfo=<CONTENT>
  var qrContent = "Donate " + telegramId;
  var qrUrl = "https://img.vietqr.io/image/VCB-" + CONFIG.VCB_ACC + "-compact.png?addInfo=" + encodeURIComponent(qrContent);
  
  sendPhoto(cid, qrUrl, t('donate_msg', telegramId) + "\n\n" +
    "💡 **Lưu ý quan trọng:**\n" +
    "- **Quét QR**: Nội dung chuyển khoản đã tự động có ID của bạn.\n" +
    "- **Chuyển thủ công**: Vui lòng ghi nội dung: `Donate " + telegramId + "`\n" +
    "(Bot sẽ dựa vào ID này để gửi lời cảm ơn đến bạn! 💖)");
}

function searchExpenses(cid, sheetId, keyword, telegramId) { 
  var d = getOrCreateSheetForUser(sheetId, 'Expense').getDataRange().getValues();
  var msg = "", total = 0;
  var k = sanitizeInput(keyword).toLowerCase();
  
  for (var i = 1; i < d.length; i++) { 
    if (String(d[i]).toLowerCase().includes(k)) { 
      msg += "• " + d[i][3] + ": " + formatMoney(d[i][2]) + " (" + d[i][4] + ")\n"; 
      total += Number(d[i][2]); 
    } 
  }
  sendText(cid, t('search_result', telegramId) + "\n" + (msg || t('not_found', telegramId)) + "\nTotal: " + formatMoney(total));
}

function deleteById(cid, sheetId, id, telegramId) {
  var sheet = getOrCreateSheetForUser(sheetId, 'Expense');
  var rid = parseInt(id);
  if (rid && rid <= sheet.getLastRow()) sheet.deleteRow(rid);
  sendText(cid, t('deleted', telegramId));
}

function askUndoConfirmation(cid, sheetId, telegramId) {
  var sheet = getOrCreateSheetForUser(sheetId, 'Expense');
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) { sendText(cid, t('no_data', telegramId)); return; }
  
  var r = sheet.getRange(lastRow, 1, 1, 5).getValues()[0];
  if ((new Date() - new Date(r[1])) / 60000 > 5) { 
    sendText(cid, "⏳ > 5 phút. Dùng /delete [ID]"); 
    return; 
  }
  
  var kb = { inline_keyboard: [[{text: "✅ Yes", callback_data: "confirm_undo"}, {text: "❌ No", callback_data: "cancel_undo"}]]};
  sendMessageKb(cid, t('undo_confirm', telegramId), kb);
}

function executeDelete(cid, sheetId, telegramId) {
  var sheet = getOrCreateSheetForUser(sheetId, 'Expense');
  sheet.deleteRow(sheet.getLastRow());
  sendText(cid, t('deleted', telegramId));
}

// --- INCOME MANAGEMENT (similar to Expense, but protect Donate) ---
function searchIncome(cid, sheetId, keyword, telegramId) { 
  var d = getOrCreateSheetForUser(sheetId, 'Income').getDataRange().getValues();
  var msg = "", total = 0;
  var k = sanitizeInput(keyword).toLowerCase();
  
  for (var i = 1; i < d.length; i++) { 
    if (String(d[i]).toLowerCase().includes(k)) { 
      var isDonate = (d[i][3] || "").toLowerCase() === "donate";
      msg += (isDonate ? "🔒 " : "• ") + d[i][3] + ": " + formatMoney(d[i][2]) + " (" + d[i][4] + ")\n"; 
      total += Number(d[i][2]); 
    } 
  }
  sendText(cid, "🔍 **Tìm kiếm thu nhập:**\n" + (msg || t('not_found', telegramId)) + "\nTotal: " + formatMoney(total) + "\n\n🔒 = Donate (không thể xóa)");
}

function deleteIncomeById(cid, sheetId, id, telegramId) {
  var sheet = getOrCreateSheetForUser(sheetId, 'Income');
  var rid = parseInt(id);
  
  if (!rid || rid > sheet.getLastRow() || rid < 2) {
    sendText(cid, "❌ ID không hợp lệ.");
    return;
  }
  
  // Check if it's a Donate
  var row = sheet.getRange(rid, 1, 1, 5).getValues()[0];
  if ((row[3] || "").toLowerCase() === "donate") {
    sendText(cid, "🔒 Không thể xóa thu nhập loại **Donate**!");
    return;
  }
  
  sheet.deleteRow(rid);
  sendText(cid, t('deleted', telegramId));
}

function askUndoIncomeConfirmation(cid, sheetId, telegramId) {
  var sheet = getOrCreateSheetForUser(sheetId, 'Income');
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) { sendText(cid, t('no_data', telegramId)); return; }
  
  var r = sheet.getRange(lastRow, 1, 1, 5).getValues()[0];
  
  // Check if it's Donate
  if ((r[3] || "").toLowerCase() === "donate") {
    sendText(cid, "🔒 Thu nhập cuối là **Donate** - không thể xóa!\nDùng `/deletein [ID]` để xóa mục khác.");
    return;
  }
  
  if ((new Date() - new Date(r[1])) / 60000 > 5) { 
    sendText(cid, "⏳ > 5 phút. Dùng `/deletein [ID]`"); 
    return; 
  }
  
  var kb = { inline_keyboard: [[{text: "✅ Yes", callback_data: "confirm_undo_income"}, {text: "❌ No", callback_data: "cancel_undo"}]]};
  sendMessageKb(cid, "🗑 Xác nhận xóa thu nhập cuối?\n💰 " + formatMoney(r[2]) + " | " + r[3] + " | " + r[4], kb);
}

function executeDeleteIncome(cid, sheetId, telegramId) {
  var sheet = getOrCreateSheetForUser(sheetId, 'Income');
  var lastRow = sheet.getLastRow();
  
  // Double-check Donate protection
  var r = sheet.getRange(lastRow, 1, 1, 5).getValues()[0];
  if ((r[3] || "").toLowerCase() === "donate") {
    sendText(cid, "🔒 Không thể xóa **Donate**!");
    return;
  }
  
  sheet.deleteRow(lastRow);
  sendText(cid, t('deleted', telegramId));
}

function listIncome(cid, sheetId, page, msgId, month, year, telegramId) {
  try {
    var pageSize = CONFIG.PAGE_SIZE;
    var sheet = getOrCreateSheetForUser(sheetId, 'Income'); // Explicitly calling Income sheet
    var data = sheet.getDataRange().getValues();
    
    var now = new Date();
    var m = month ? parseInt(month) : now.getMonth() + 1;
    var y = year ? parseInt(year) : now.getFullYear();
    
    var filtered = [];
    for (var i = 1; i < data.length; i++) {
        // Validation: Verify if the row actually has valid date and amount
        if (!data[i][1] || !data[i][2]) continue;

      var date = new Date(data[i][1]);
      if (date.getMonth() + 1 === m && date.getFullYear() === y) {
        filtered.push(data[i]);
      }
    }
    
    if (filtered.length === 0) {
      sendText(cid, t('no_data', telegramId));
      return;
    }
    
    var totalPages = Math.ceil(filtered.length / pageSize);
    page = Math.max(1, Math.min(page, totalPages));
    var start = (page - 1) * pageSize;
    var end = Math.min(start + pageSize, filtered.length);
    
    var msg = "💰 **THU NHẬP THÁNG " + m + "/" + y + "**\n\n";
    
    for (var i = start; i < end; i++) {
      var r = filtered[i];
      var d = new Date(r[1]);
      var isDonate = (r[3] || "").toLowerCase() === "donate";
      msg += (isDonate ? "🔒" : "#" + r[0]) + " | " + d.getDate() + "/" + (d.getMonth()+1) + " | " + formatMoney(r[2]) + " | " + r[3] + " | " + r[4] + "\n";
    }
    
    msg += "\n📄 Trang " + page + "/" + totalPages;
    msg += "\n🔒 = Donate (không thể xóa)";
    
    var kb = [];
    var navRow = [];
    if (page > 1) navRow.push({text: "⬅️ Trước", callback_data: "pagein|" + (page-1) + "|" + m + "|" + y});
    if (page < totalPages) navRow.push({text: "Sau ➡️", callback_data: "pagein|" + (page+1) + "|" + m + "|" + y});
    if (navRow.length > 0) kb.push(navRow);
    
    if (msgId) {
      editMessage(cid, msgId, msg);
    } else {
      sendMessageKb(cid, msg, {inline_keyboard: kb});
    }
  } catch (e) {
    Logger.log("List Income Error: " + e);
    sendText(cid, "❌ Lỗi: " + e.message);
  }
}

// --- CUSTOM CATEGORIES ---
function getCategories(sheetId, type) {
  // type: 'expense' or 'income'
  try {
    var ss = SpreadsheetApp.openById(sheetId);
    var sheet = ss.getSheetByName('Categories');
    
    if (!sheet) {
      // Return default categories
      return type === 'income' ? CONFIG.INCOME_CATEGORIES : CONFIG.EXPENSE_CATEGORIES;
    }
    
    var data = sheet.getDataRange().getValues();
    var cats = [];
    for (var i = 1; i < data.length; i++) {
      if (data[i][1] === type && data[i][2] !== false) {
        cats.push(data[i][0]);
      }
    }
    
    return cats.length > 0 ? cats : (type === 'income' ? CONFIG.INCOME_CATEGORIES : CONFIG.EXPENSE_CATEGORIES);
  } catch (e) {
    return type === 'income' ? CONFIG.INCOME_CATEGORIES : CONFIG.EXPENSE_CATEGORIES;
  }
}

function addCategory(cid, sheetId, name, type, telegramId) {
  if (!name) {
    sendText(cid, "❌ Cú pháp: `/category add [tên]`\nVD: `/category add Cà phê`");
    return;
  }
  
  name = sanitizeInput(name);
  type = type || 'expense';
  
  try {
    var ss = SpreadsheetApp.openById(sheetId);
    var sheet = ss.getSheetByName('Categories');
    
    if (!sheet) {
      sheet = ss.insertSheet('Categories');
      sheet.appendRow(['Name', 'Type', 'Active']);
      // Add default categories
      var defaults = type === 'income' ? CONFIG.INCOME_CATEGORIES : CONFIG.EXPENSE_CATEGORIES;
      for (var i = 0; i < defaults.length; i++) {
        sheet.appendRow([defaults[i], type, true]);
      }
    }
    
    // Check if exists
    var data = sheet.getDataRange().getValues();
    for (var i = 1; i < data.length; i++) {
      if (data[i][0].toLowerCase() === name.toLowerCase() && data[i][1] === type) {
        // If inactive, reactivate it
        if (data[i][3] === false || data[i][3] === "FALSE") {
           sheet.getRange(i + 1, 4).setValue(true);
           sendText(cid, "✅ Đã kích hoạt lại hạng mục: **" + name + "**");
        } else {
           sendText(cid, "⚠️ Hạng mục **" + name + "** đã tồn tại!");
        }
        return;
      }
    }
    
    sheet.appendRow([name, type, true]);
    sendText(cid, "✅ Đã thêm hạng mục: **" + name + "**");
    
  } catch (e) {
    Logger.log("Add category error: " + e);
    sendText(cid, "❌ Lỗi: " + e.message);
  }
}

function removeCategory(cid, sheetId, name, type, telegramId) {
  if (!name) {
    sendText(cid, "❌ Cú pháp: `/category del [tên]`\nVD: `/category del Cà phê`");
    return;
  }
  
  name = sanitizeInput(name);
  type = type || 'expense';
  
  try {
    var ss = SpreadsheetApp.openById(sheetId);
    var sheet = ss.getSheetByName('Categories');
    
    if (!sheet) {
      sendText(cid, "📭 Chưa có hạng mục tùy chỉnh nào.");
      return;
    }
    
    var data = sheet.getDataRange().getValues();
    // Assuming Column D (index 3) is Active
    
    for (var i = 1; i < data.length; i++) {
      if (data[i][0].toLowerCase() === name.toLowerCase() && data[i][1] === type) {
        // Set Active = false (Column 4)
        sheet.getRange(i + 1, 4).setValue(false);
        sendText(cid, "🗑 Đã ẩn (deactive) hạng mục: **" + name + "**");
        return;
      }
    }
    
    sendText(cid, "❌ Không tìm thấy hạng mục: **" + name + "**");
    
  } catch (e) {
    Logger.log("Remove category error: " + e);
    sendText(cid, "❌ Lỗi: " + e.message);
  }
}

function listCategories(cid, sheetId, telegramId) {
  var expCats = getCategories(sheetId, 'expense');
  var incCats = getCategories(sheetId, 'income');
  
  var msg = "📂 **DANH SÁCH HẠNG MỤC**\n\n";
  msg += "💸 **Chi tiêu:**\n";
  for (var i = 0; i < expCats.length; i++) {
    msg += "• " + expCats[i] + "\n";
  }
  
  msg += "\n💰 **Thu nhập:**\n";
  for (var i = 0; i < incCats.length; i++) {
    msg += "• " + incCats[i] + "\n";
  }
  
  msg += "\n📝 `/category add [tên]` - Thêm hạng mục";
  msg += "\n🗑 `/category del [tên]` - Xóa hạng mục";
  
  sendText(cid, msg);
}

function handleCategoryCommand(cid, sheetId, args, telegramId) {
  var parts = args.split(" ");
  var action = parts[0] ? parts[0].toLowerCase() : '';
  
  // /category - show list
  if (!action) {
    listCategories(cid, sheetId, telegramId);
    return;
  }
  
  // /category add [name] - add expense category (default)
  // /category del [name] - delete expense category (default)
  // /category expense add [name] - explicit expense
  // /category in add [name] - add income category
  // /category in del [name] - delete income category
  
  if (action === "add") {
    var name = parts.slice(1).join(" ");
    addCategory(cid, sheetId, name, 'expense', telegramId);
  } else if (action === "del" || action === "delete" || action === "remove") {
    var name = parts.slice(1).join(" ");
    removeCategory(cid, sheetId, name, 'expense', telegramId);
  } else if (action === "expense") {
    // /category expense add [name]
    var subAction = parts[1] ? parts[1].toLowerCase() : '';
    var subName = parts.slice(2).join(" ");
    if (subAction === "add") {
      addCategory(cid, sheetId, subName, 'expense', telegramId);
    } else if (subAction === "del") {
      removeCategory(cid, sheetId, subName, 'expense', telegramId);
    } else {
      listCategories(cid, sheetId, telegramId);
    }
  } else if (action === "in" || action === "income") {
    // /category in add [name]
    var subAction = parts[1] ? parts[1].toLowerCase() : '';
    var subName = parts.slice(2).join(" ");
    if (subAction === "add") {
      addCategory(cid, sheetId, subName, 'income', telegramId);
    } else if (subAction === "del") {
      removeCategory(cid, sheetId, subName, 'income', telegramId);
    } else {
      listCategories(cid, sheetId, telegramId);
    }
  } else {
    // Unknown action, show help
    sendText(cid, "📂 **Quản lý hạng mục**\n\n" +
      "**Chi tiêu:**\n" +
      "`/category add [tên]` - Thêm\n" +
      "`/category del [tên]` - Xóa\n\n" +
      "**Thu nhập:**\n" +
      "`/category in add [tên]` - Thêm\n" +
      "`/category in del [tên]` - Xóa\n\n" +
      "`/category` - Xem danh sách");
  }
}

// Updated UI functions to use custom categories
function sendCategoryButtonsCustom(cid, sheetId, amount, note, telegramId) { 
  var cats = getCategories(sheetId, 'expense');
  var kb = [];
  for (var i = 0; i < cats.length; i += 2) {
    var row = [{text: cats[i], callback_data: cats[i] + "|" + amount + "|" + note}];
    if (cats[i+1]) {
      row.push({text: cats[i+1], callback_data: cats[i+1] + "|" + amount + "|" + note});
    }
    kb.push(row);
  }
  sendMessageKb(cid, t('choose_cat', telegramId) + " " + formatMoney(amount) + " (" + note + ")", {inline_keyboard: kb});
}

function sendFilterButtonsCustom(cid, sheetId, telegramId) { 
  var cats = getCategories(sheetId, 'expense');
  var kb = [];
  for (var i = 0; i < cats.length; i += 2) {
    var row = [{text: cats[i], callback_data: "filter|" + cats[i]}];
    if (cats[i+1]) {
      row.push({text: cats[i+1], callback_data: "filter|" + cats[i+1]});
    }
    kb.push(row);
  }
  sendMessageKb(cid, "📂 Chọn hạng mục:", {inline_keyboard: kb});
}

function sendIncomeButtonsCustom(cid, sheetId, amount, note, telegramId) {
  var cats = getCategories(sheetId, 'income');
  var kb = [];
  for (var i = 0; i < cats.length; i += 2) {
    var row = [{text: cats[i], callback_data: "in_save|" + cats[i] + "|" + amount + "|" + note}];
    if (cats[i+1]) {
      row.push({text: cats[i+1], callback_data: "in_save|" + cats[i+1] + "|" + amount + "|" + note});
    }
    kb.push(row);
  }
  sendMessageKb(cid, "💰 Lưu thu nhập " + formatMoney(amount) + " vào hạng mục:", {inline_keyboard: kb});
}

// --- RECURRING TRANSACTIONS ---
function addRecurring(cid, sheetId, args, telegramId) {
  // /recurring add 2m nhà cửa monthly 1
  // args: "2m nhà cửa monthly 1" or "2m nhà cửa" (default: monthly, day 1)
  var parts = args.split(" ");
  if (parts.length < 2) {
    sendText(cid, "❌ Cú pháp: `/recurring add [số tiền] [ghi chú] [monthly/weekly] [ngày]`\nVD: `/recurring add 2m tiền nhà monthly 1`");
    return;
  }
  
  var amt = parseAmount(parts[0]);
  if (!amt) {
    sendText(cid, t('invalid_num', telegramId));
    return;
  }
  
  // Parse remaining parts
  var note = "";
  var frequency = "monthly";
  var day = 1;
  
  for (var i = 1; i < parts.length; i++) {
    if (parts[i].toLowerCase() === "monthly" || parts[i].toLowerCase() === "weekly") {
      frequency = parts[i].toLowerCase();
    } else if (!isNaN(parseInt(parts[i])) && parseInt(parts[i]) >= 1 && parseInt(parts[i]) <= 31) {
      day = parseInt(parts[i]);
    } else {
      note += parts[i] + " ";
    }
  }
  note = sanitizeInput(note.trim()) || "Recurring";
  
  try {
    var ss = SpreadsheetApp.openById(sheetId);
    var sheet = ss.getSheetByName('Recurring');
    
    if (!sheet) {
      sheet = ss.insertSheet('Recurring');
      sheet.appendRow(['ID', 'Số tiền', 'Hạng mục', 'Ghi chú', 'Tần suất', 'Ngày', 'Active', 'LastRun']);
    }
    
    var id = sheet.getLastRow();
    sheet.appendRow([id, amt, "Chi tiêu định kỳ", note, frequency, day, true, null]);
    
    sendText(cid, "✅ Đã thêm chi tiêu định kỳ:\n💰 " + formatMoney(amt) + "\n📝 " + note + "\n🔄 " + frequency + " (ngày " + day + ")");
    
  } catch (e) {
    Logger.log("Add recurring error: " + e);
    sendText(cid, "❌ Lỗi: " + e.message);
  }
}

function removeRecurring(cid, sheetId, id, telegramId) {
  if (!id) {
    sendText(cid, "❌ Cú pháp: `/recurring del [ID]`");
    return;
  }
  
  try {
    var ss = SpreadsheetApp.openById(sheetId);
    var sheet = ss.getSheetByName('Recurring');
    
    if (!sheet) {
      sendText(cid, "📭 Chưa có chi tiêu định kỳ nào.");
      return;
    }
    
    var idNum = parseInt(id);
    var data = sheet.getDataRange().getValues();
    
    for (var i = 1; i < data.length; i++) {
      if (data[i][0] === idNum) {
        sheet.deleteRow(i + 1);
        sendText(cid, "🗑 Đã xóa chi tiêu định kỳ #" + idNum);
        return;
      }
    }
    
    sendText(cid, "❌ Không tìm thấy ID: " + id);
    
  } catch (e) {
    Logger.log("Remove recurring error: " + e);
    sendText(cid, "❌ Lỗi: " + e.message);
  }
}

function listRecurring(cid, sheetId, telegramId) {
  try {
    var ss = SpreadsheetApp.openById(sheetId);
    var sheet = ss.getSheetByName('Recurring');
    
    if (!sheet || sheet.getLastRow() <= 1) {
      sendText(cid, "📭 Chưa có chi tiêu định kỳ nào.\n\n📝 `/recurring add 2m tiền nhà monthly 1`");
      return;
    }
    
    var data = sheet.getDataRange().getValues();
    var msg = "🔄 **CHI TIÊU ĐỊNH KỲ**\n\n";
    
    for (var i = 1; i < data.length; i++) {
      if (data[i][6] !== false) { // Active
        msg += "#" + data[i][0] + " | " + formatMoney(data[i][1]) + " | " + data[i][3] + 
               " | " + data[i][4] + " (ngày " + data[i][5] + ")\n";
      }
    }
    
    msg += "\n📝 `/recurring add [số] [ghi chú]` - Thêm";
    msg += "\n🗑 `/recurring del [ID]` - Xóa";
    
    sendText(cid, msg);
    
  } catch (e) {
    Logger.log("List recurring error: " + e);
    sendText(cid, "❌ Lỗi: " + e.message);
  }
}

function handleRecurringCommand(cid, sheetId, args, telegramId) {
  var parts = args.split(" ");
  var action = parts[0] ? parts[0].toLowerCase() : '';
  var rest = parts.slice(1).join(" ");
  
  if (action === "add") {
    addRecurring(cid, sheetId, rest, telegramId);
  } else if (action === "del" || action === "delete" || action === "remove") {
    removeRecurring(cid, sheetId, rest, telegramId);
  } else {
    listRecurring(cid, sheetId, telegramId);
  }
}

// Daily trigger to process recurring transactions
function processRecurringTransactions() {
  if (!CONFIG.MASTER_SHEET_ID) return;
  
  try {
    var ss = SpreadsheetApp.openById(CONFIG.MASTER_SHEET_ID);
    var usersSheet = ss.getSheetByName('Users');
    if (!usersSheet) return;
    
    var usersData = usersSheet.getDataRange().getValues();
    var today = new Date();
    var dayOfMonth = today.getDate();
    var dayOfWeek = today.getDay(); // 0 = Sunday
    
    for (var u = 1; u < usersData.length; u++) {
      var telegramId = usersData[u][0];
      var userSheetId = usersData[u][1];
      
      if (!userSheetId) continue;
      
      try {
        var userSS = SpreadsheetApp.openById(userSheetId);
        var recurring = userSS.getSheetByName('Recurring');
        
        if (!recurring || recurring.getLastRow() <= 1) continue;
        
        var recData = recurring.getDataRange().getValues();
        var expenseSheet = getOrCreateSheetForUser(userSheetId, 'Expense');
        
        for (var r = 1; r < recData.length; r++) {
          if (recData[r][6] === false) continue; // Not active
          
          var frequency = recData[r][4];
          var targetDay = recData[r][5];
          var lastRun = recData[r][7];
          
          var shouldRun = false;
          
          if (frequency === "monthly" && dayOfMonth === targetDay) {
            // Check if already run this month
            if (!lastRun || new Date(lastRun).getMonth() !== today.getMonth()) {
              shouldRun = true;
            }
          } else if (frequency === "weekly" && dayOfWeek === targetDay) {
            // Check if already run this week
            if (!lastRun || (today - new Date(lastRun)) / (1000*60*60*24) >= 6) {
              shouldRun = true;
            }
          }
          
          if (shouldRun) {
            // Add expense
            expenseSheet.appendRow([
              expenseSheet.getLastRow(),
              new Date(),
              recData[r][1], // Amount
              recData[r][2], // Category
              recData[r][3] + " (Định kỳ)" // Note
            ]);
            
            // Update last run
            recurring.getRange(r + 1, 8).setValue(new Date());
            
            // Notify user
            sendText(telegramId, "🔄 **Chi tiêu định kỳ**\n💰 " + formatMoney(recData[r][1]) + "\n📝 " + recData[r][3]);
          }
        }
      } catch (e) {
        Logger.log("Process recurring for user " + telegramId + " error: " + e);
      }
    }
  } catch (e) {
    Logger.log("Process recurring error: " + e);
  }
}

function setupDailyRecurringTrigger() {
  // Delete existing triggers
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'processRecurringTransactions') {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }
  
  // Create daily trigger at 8 AM
  ScriptApp.newTrigger('processRecurringTransactions')
    .timeBased()
    .atHour(8)
    .everyDays(1)
    .create();
  
  Logger.log("Daily recurring trigger created");
}

// =============================================================================
// SPLIT BILL FEATURE
// =============================================================================

function splitBill(cid, args, telegramId) {
  // Syntax: /split <amount> <count> [note]
  var parts = args.split(" ");
  var amount = parseAmount(parts[0]);
  
  if (!amount) {
    sendText(cid, "❌ Cú pháp: `/split [tổng] [số người] [nội dung]`\nVD: `/split 500k 4 Ăn lẩu`");
    return;
  }
  
  var count = parseInt(parts[1]);
  if (!count || count < 1) {
    sendText(cid, "❌ Số người phải lớn hơn 0");
    return;
  }
  
  var note = parts.slice(2).join(" ") || "Chia tiền";
  var perPerson = Math.ceil(amount / count);
  
  var msg = "🍰 **CHIA TIỀN: " + note + "**\n";
  msg += "💰 Tổng cộng: " + formatMoney(amount) + "\n";
  msg += "👥 Số người: " + count + "\n";
  msg += "💵 Mỗi người: **" + formatMoney(perPerson) + "**\n\n";
  msg += "👇 *Copy tin nhắn dưới đây để gửi vào nhóm:*";
  
  sendText(cid, msg);
  sendText(cid, "```\n" + note + "\nMỗi người: " + formatMoney(perPerson) + "\nGlobal Bank\n```");
}

// =============================================================================
// SAVINGS GOALS FEATURE
// =============================================================================

function handleGoalCommand(cid, sheetId, args, telegramId) {
  var parts = args.split(" ");
  var action = parts[0] ? parts[0].toLowerCase() : '';
  
  // /goal - list
  if (!action || action === 'list') {
    listGoals(cid, sheetId, telegramId);
    return;
  }
  
  // /goal add <target> <name> [date]
  if (action === 'add') {
    var target = parseAmount(parts[1]);
    if (!target) {
      sendText(cid, "❌ Cú pháp: `/goal add [số tiền] [tên] [ngày]`\nVD: `/goal add 50m Mua xe 12/2025`");
      return;
    }
    
    // Parse name and date
    // Heuristic: Last part matches date format?
    var lastPart = parts[parts.length - 1];
    var deadline = "";
    var nameRange = parts.slice(2);
    
    if (lastPart.match(/\d{1,2}\/\d{4}/) || lastPart.match(/\d{1,2}\/\d{1,2}\/\d{4}/)) {
      deadline = lastPart;
      nameRange = parts.slice(2, parts.length - 1);
    }
    
    var name = nameRange.join(" ") || "Mục tiêu";
    addGoal(cid, sheetId, target, name, deadline, telegramId);
    return;
  }
  
  // /goal deposit <id> <amount>
  if (action === 'deposit' || action === 'nạp' || action === 'in') {
    var id = parts[1];
    var amount = parseAmount(parts[2]);
    
    if (!id || !amount) {
      sendText(cid, "❌ Cú pháp: `/goal deposit [ID] [số tiền]`");
      return;
    }
    
    depositGoal(cid, sheetId, id, amount, telegramId);
    return;
  }
  
  sendText(cid, "❌ Lệnh không hợp lệ.\nDùng `/goal list`, `/goal add`, hoặc `/goal deposit`.");
}

function getOrCreateGoalSheet(sheetId) {
  var ss = SpreadsheetApp.openById(sheetId);
  var sheet = ss.getSheetByName('Goals');
  if (!sheet) {
    sheet = ss.insertSheet('Goals');
    sheet.appendRow(['ID', 'Name', 'Target', 'Current', 'Deadline', 'Status', 'CreatedAt']);
  }
  return sheet;
}

function addGoal(cid, sheetId, target, name, deadline, telegramId) {
  try {
    var sheet = getOrCreateGoalSheet(sheetId);
    var newId = Math.floor(Math.random() * 100000); // Simple ID
    
    sheet.appendRow([newId, name, target, 0, deadline, 'Active', new Date()]); // Initial Current = 0
    
    sendText(cid, "✅ Đã tạo mục tiêu **" + name + "**\n🎯 Đích: " + formatMoney(target) + (deadline ? ("\n📅 Hạn: " + deadline) : "") + "\nID: `" + newId + "`");
  } catch (e) {
    sendText(cid, "❌ Lỗi: " + e.message);
  }
}

function listGoals(cid, sheetId, telegramId) {
  try {
    var sheet = getOrCreateGoalSheet(sheetId);
    var data = sheet.getDataRange().getValues();
    
    if (data.length <= 1) {
      sendText(cid, "📭 Chưa có mục tiêu nào.\nTạo mới: `/goal add 50m Mua xe`");
      return;
    }
    
    var msg = "🏆 **MỤC TIÊU TIẾT KIỆM**\n\n";
    
    for (var i = 1; i < data.length; i++) {
      var r = data[i]; // ID, Name, Target, Current, Deadline
      var id = r[0];
      var name = r[1];
      var target = Number(r[2]);
      var current = Number(r[3]);
      var deadline = r[4];
      var percent = target > 0 ? Math.round(current / target * 100) : 0;
      
      var bar = drawProgressBar(percent);
      
      msg += "📌 **" + name + "** (ID: `" + id + "`)\n";
      msg += bar + " " + percent + "%\n";
      msg += "💰 " + formatMoney(current) + " / " + formatMoney(target) + "\n";
      if (deadline) msg += "📅 Hạn: " + deadline + "\n";
      msg += "\n";
    }
    
    msg += "👉 Nạp tiền: `/goal deposit [ID] [số tiền]`";
    sendText(cid, msg);
  } catch (e) {
    sendText(cid, "❌ Lỗi: " + e.message);
  }
}

function depositGoal(cid, sheetId, id, amount, telegramId) {
  try {
    var sheet = getOrCreateGoalSheet(sheetId);
    var data = sheet.getDataRange().getValues();
    var found = false;
    
    for (var i = 1; i < data.length; i++) {
      if (String(data[i][0]) === String(id)) {
        var current = Number(data[i][3]);
        var target = Number(data[i][2]);
        var newCurrent = current + amount;
        
        sheet.getRange(i + 1, 4).setValue(newCurrent);
        
        var percent = target > 0 ? Math.round(newCurrent / target * 100) : 0;
        sendText(cid, "🎉 Đã nạp thêm " + formatMoney(amount) + " vào **" + data[i][1] + "**\n📈 Tiến độ: " + percent + "% (" + formatMoney(newCurrent) + "/" + formatMoney(target) + ")");
        
        if (newCurrent >= target && current < target) {
            sendText(cid, "🏆 **CHÚC MỪNG! BẠN ĐÃ ĐẠT MỤC TIÊU " + data[i][1].toUpperCase() + "!** 🎆");
        }
        
        found = true;
        break;
      }
    }
    
    if (!found) sendText(cid, "❌ Không tìm thấy Goal ID: " + id);
    
  } catch (e) {
    sendText(cid, "❌ Lỗi: " + e.message);
  }
}

function drawProgressBar(percent) {
  var total = 10;
  var filled = Math.round(percent / 10);
  if (filled > 10) filled = 10;
  var empty = total - filled;
  return "🟩".repeat(filled) + "⬜".repeat(empty);
}

// =============================================================================
// DEBT TRACKING FEATURE (Sổ Nợ)
// =============================================================================

function handleDebtCommand(cid, sheetId, text, telegramId) {
  // Commands:
  // /debt borrow <amount> <person> [note]
  // /debt lend <amount> <person> [note]
  // /debt list
  // /debt repay <ID> [amount]

  var args = text.split(" ");
  var action = args[0] ? args[0].toLowerCase() : '';
  
  if (action === "list" || !action) {
     listDebt(cid, sheetId, telegramId);
     return;
  }
  
  if (action === "repay") {
     var id = args[1];
     var amt = parseAmount(args[2] || "full"); // If no amount, default to full repay logic inside
     repayDebt(cid, sheetId, id, amt, telegramId);
     return;
  }
  
  if (action === "borrow" || action === "lend" || action === "vay" || action === "cho") {
     var type = (action === 'vay') ? 'borrow' : (action === 'cho' ? 'lend' : action);
     var amountStr = args[1];
     var person = args[2];
     var note = args.slice(3).join(" ");
     
     if (!amountStr || !person) {
        sendText(cid, "❌ Thiếu thông tin!\nCú pháp: `/debt " + type + " [số tiền] [người] [ghi chú]`");
        return;
     }
     
     var amt = parseAmount(amountStr);
     if (!amt) {
        sendText(cid, t('invalid_num', telegramId));
        return;
     }
     
     addDebt(cid, sheetId, type, amt, person, note, telegramId);
     return;
  }
  
  sendText(cid, "❌ Lệnh không hợp lệ.\nSử dụng: `/debt [borrow|lend|list|repay]`");
}

function addDebt(cid, sheetId, type, amount, person, note, telegramId) {
  try {
     var sheet = getOrCreateSheetForUser(sheetId, 'Debt');
     // Headers: ID | Date | Type | Person | Amount | Paid | Status | Note
     
     var id = sheet.getLastRow(); 
     if (id === 0) {
        sheet.appendRow(['ID', 'Date', 'Type', 'Person', 'Amount', 'Paid', 'Status', 'Note']);
        id = 1; 
     }
     
     var typeStr = (type === 'borrow') ? 'BORROW' : 'LEND';
     
     sheet.appendRow([id, new Date(), typeStr, person, amount, 0, 'Active', note]);
     
     var msg = (type === 'borrow') ? "📉 **Đã ghi nợ:**" : "📈 **Đã cho vay:**";
     msg += "\n👤 " + person + "\n💰 " + formatMoney(amount) + "\n📝 " + (note || "Không có");
     
     sendText(cid, msg);
     
  } catch (e) {
     Logger.log("Add Debt Error: " + e);
     sendText(cid, "❌ Lỗi: " + e.message);
  }
}

function listDebt(cid, sheetId, telegramId) {
  try {
     var sheet = getOrCreateSheetForUser(sheetId, 'Debt');
     var data = sheet.getDataRange().getValues();
     
     if (data.length <= 1) {
       sendText(cid, "✨ Bạn không có khoản nợ nào!");
       return;
     }
     
     var msg = "📒 **SỔ NỢ (Active)**\n\n";
     var found = false;
     
     for (var i = 1; i < data.length; i++) {
        // Status = Active (Col 7 / Index 6)
        if (data[i][6] === 'Active') {
           found = true;
           var type = data[i][2]; // BORROW / LEND
           var person = data[i][3];
           var total = Number(data[i][4]);
           var paid = Number(data[i][5]);
           var remain = total - paid;
           var note = data[i][7];
           
           var icon = (type === 'BORROW') ? "📉 (Nợ)" : "📈 (Cho vay)";
           
           msg += "#" + data[i][0] + " " + icon + " **" + person + "**\n";
           msg += "   💰 Còn: " + formatMoney(remain) + " / " + formatMoney(total) + "\n";
           if (note) msg += "   📝 " + note + "\n";
           msg += "\n";
        }
     }
     
     if (!found) {
        sendText(cid, "✨ Tuyệt vời! Bạn đã sạch nợ (Hoặc đã thu hết nợ).");
     } else {
        msg += "👉 Trả nợ: `/debt repay [ID] [số tiền]`";
        sendText(cid, msg);
     }
     
  } catch (e) {
     Logger.log("List Debt Error: " + e);
     sendText(cid, "❌ Lỗi: " + e.message);
  }
}

function repayDebt(cid, sheetId, id, amount, telegramId) {
  try {
     var sheet = getOrCreateSheetForUser(sheetId, 'Debt');
     var data = sheet.getDataRange().getValues();
     var rowIndex = -1;
     
     for (var i = 1; i < data.length; i++) {
        if (String(data[i][0]) === String(id)) {
           rowIndex = i + 1; // 1-based index
           break;
        }
     }
     
     if (rowIndex === -1) {
        sendText(cid, "❌ Không tìm thấy Debt ID: " + id);
        return;
     }
     
     var row = data[rowIndex - 1]; // 0-based array
     var total = Number(row[4]);
     var paid = Number(row[5]);
     var currentRemain = total - paid;
     // var type = row[2];
     
     // If amount is null/0/undefined ('full' from parser defaults to null usually, let's fix parser logic or handle here)
     // parseAmount('full') returns null/0 usually. 
     // Logic: if amount is 0 or null, treat as FULL repayment of remainder.
     var payAmt = amount || currentRemain;
     
     if (payAmt > currentRemain) {
        sendText(cid, "⚠️ Số tiền trả (" + formatMoney(payAmt) + ") > nợ còn lại (" + formatMoney(currentRemain) + ")!");
        return;
     }
     
     var newPaid = paid + payAmt;
     var newStatus = (newPaid >= total) ? 'Done' : 'Active';
     
     // Update Sheet
     sheet.getRange(rowIndex, 6).setValue(newPaid); // Paid
     sheet.getRange(rowIndex, 7).setValue(newStatus); // Status
     
     var msg = "✅ **Đã cập nhật khoản nợ #" + id + "**\n";
     msg += "💵 Vừa trả/thu: " + formatMoney(payAmt) + "\n";
     msg += "📉 Còn lại: " + formatMoney(total - newPaid);
     
     if (newStatus === 'Done') {
        msg += "\n🎉 **KHOẢN NỢ ĐÃ TẤT TOÁN!**";
     }
     
     sendText(cid, msg);
     
  } catch (e) {
     Logger.log("Repay Debt Error: " + e);
     sendText(cid, "❌ Lỗi: " + e.message);
  }
}

// =============================================================================
// PHASE 11: ADVANCED EXPORT & BACKUP
// =============================================================================

function handleBackupCommand(cid, sheetId, telegramId) {
  try {
     var ss = SpreadsheetApp.openById(sheetId);
     var name = ss.getName();
     var now = new Date();
     var timeStr = Utilities.formatDate(now, "GMT+7", "yyyy-MM-dd_HH-mm");
     var backupName = name + "_Backup_" + timeStr;
     
     // Copy File
     var file = DriveApp.getFileById(sheetId);
     var backupFile = file.makeCopy(backupName);
     var url = backupFile.getUrl();
     
     sendText(cid, "✅ **Backup thành công!**\n📂 File: [" + backupName + "](" + url + ")");
  } catch (e) {
     Logger.log("Backup Error: " + e);
     logErrorToAdmin(e, "handleBackupCommand");
     sendText(cid, "❌ Lỗi Backup: " + e.message);
  }
}

function exportPdf(cid, sheetId, telegramId) {
  try {
     // Export 'Expense' sheet as PDF via HTML Service
     var ss = SpreadsheetApp.openById(sheetId);
     var expenseSheet = ss.getSheetByName('Expense');
     var data = expenseSheet.getDataRange().getValues();
     
     // HEADER
     var html = "<h1>SaoKeChiTieuBot Report</h1>";
     html += "<h3>Created at: " + new Date().toLocaleString() + "</h3>";
     html += "<table border='1' style='border-collapse: collapse; width: 100%;'>";
     html += "<tr><th>Date</th><th>Amount</th><th>Category</th><th>Note</th></tr>";
     
     // DATA (Limit to last 50 for performance/size)
     var limit = 50;
     var start = Math.max(1, data.length - limit);
     
     for (var i = start; i < data.length; i++) {
        var row = data[i];
        // Col 1=Date, 2=Amount, 3=Category, 4=Note
        html += "<tr>";
        html += "<td>" + row[1] + "</td>";
        html += "<td>" + formatMoney(row[2]) + "</td>";
        html += "<td>" + row[3] + "</td>";
        html += "<td>" + row[4] + "</td>";
        html += "</tr>";
     }
     html += "</table>";
     
     var blob = Utilities.newBlob(html, "text/html", "Report.html");
     var pdf = blob.getAs("application/pdf");
     pdf.setName("Report_" + Utilities.formatDate(new Date(), "GMT+7", "yyyyMMdd") + ".pdf");
     
     sendDocument(cid, pdf);
     
  } catch (e) {
     Logger.log("Export PDF Error: " + e);
     logErrorToAdmin(e, "exportPdf");
     sendText(cid, "❌ Lỗi xuất PDF: " + e.message);
  }
}
     sendText(cid, "❌ Lỗi xuất PDF: " + e.message);
  }
}

// =============================================================================
// PHASE 14: AI INTEGRATION
// =============================================================================

function handleSmartMessage(cid, sheetId, text, telegramId) {
  // Check if API Key is set
  if (!CONFIG.GEMINI_API_KEY) {
     sendText(cid, "⚠️ Bạn nhập sai cú pháp (hoặc API Key AI chưa được cấu hình).\nCú pháp chuẩn: `[số tiền] [nội dung]`\nVD: `50k cafe`");
     return;
  }
  
  sendText(cid, "🤖 Đang phân tích...");
  var transactions = parseTransactionWithAI(text);
  
  if (!transactions || transactions.length === 0) {
     sendText(cid, "❌ AI không hiểu ý bạn. Vui lòng nhập đúng cú pháp: `50k cafe`");
     return;
  }
  
  saveAiTransactions(cid, sheetId, transactions, telegramId);
}

function saveAiTransactions(cid, sheetId, transactions, telegramId) {
  var msg = "🤖 **AI Đã tìm thấy " + transactions.length + " giao dịch:**\n\n";
  
  transactions.forEach(function(tx) {
    var amt = Number(tx.amount);
    var note = tx.note || tx.category;
    var type = tx.type || 'OUT';
    
    // Save to Sheet
    if (type === 'IN') {
       // Handle Income
       if (amt > 0) {
          addIncome(cid, sheetId, amt, note, telegramId); 
          msg += "💰 Thu: " + formatMoney(amt) + " (" + note + ")\n";
       }
    } else {
       // Handle Expense
       if (amt > 0) {
          addExpenseDirect(cid, sheetId, amt, tx.category, note, telegramId);
          msg += "💸 Chi: " + formatMoney(amt) + " - " + tx.category + " (" + note + ")\n";
       }
    }
  });
  
  sendText(cid, msg + "\n✅ Đã lưu tất cả!");
}

function addExpenseDirect(cid, sheetId, amount, category, note, telegramId) {
   // Logic similar to handleSaveExpense but synchronous
   try {
      var sheet = getOrCreateSheetForUser(sheetId, 'Expense');
      var cats = getCategories(sheetId, 'expense');
      
      // Auto-add category if not exists? Or default to 'Khác'? 
      // Let's default to AI's suggestion, effectively auto-adding it to history/list but maybe not to "Configured Categories" list unless requested.
      // Actually, just saving string is fine.
      
      
      // Get Sender Name
      var sender = getSenderName(telegramId);
      
      sheet.appendRow([new Date(), new Date(), amount, category, note, sender]);
      checkBudgetAlert(cid, sheetId, amount, category, telegramId);
   } catch (e) {
      Logger.log("Add Expense Direct Error: " + e);
   }
}

function addIncome(cid, sheetId, amount, note, telegramId) {
   // Logic for Income
   try {
      var sheet = getOrCreateSheetForUser(sheetId, 'Income');
      var sender = getSenderName(telegramId);
      sheet.appendRow([new Date(), new Date(), amount, "Khác", note, sender]); // Default cat Khác for now
   } catch (e) {
      Logger.log("Add Income Error: " + e);
   }
}
