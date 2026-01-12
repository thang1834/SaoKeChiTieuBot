/**
 * Features.gs
 * Core feature functions for SaoKeChiTieuBot
 */

// --- REPORT FEATURE ---
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
      data.push(catTotals[cat]);
    }
    
    var chartConfig = {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          data: data,
          backgroundColor: CONFIG.CHART_COLORS.slice(0, labels.length),
          borderWidth: 2,
          borderColor: '#fff'
        }]
      },
      options: {
        plugins: {
          title: {
            display: true,
            text: 'Chi tiêu tháng ' + month + '/' + year,
            font: { size: 20, weight: 'bold' },
            padding: 20
          },
          legend: {
            position: 'right',
            labels: { 
              font: { size: 13 },
              padding: 15,
              usePointStyle: true
            }
          },
          datalabels: {
            display: true,
            color: '#fff',
            font: { weight: 'bold', size: 12 },
            formatter: 'percent'
          }
        },
        layout: { padding: 20 }
      }
    };
    
    return "https://quickchart.io/chart?c=" + encodeURIComponent(JSON.stringify(chartConfig)) + "&w=600&h=400&bkg=white";
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
      sendText(cid, "📭 Chưa có ngân sách nào. Gõ `/budget 5m` để đặt."); 
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
  sheet.appendRow([sheet.getLastRow(), new Date(), amt, cat, note]);
  
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
  sheet.appendRow([sheet.getLastRow(), new Date(), amt, cat, note]);
  
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
  var qrUrl = "https://img.vietqr.io/image/VCB-" + CONFIG.VCB_ACC + "-compact.png";
  sendPhoto(cid, qrUrl, t('donate_msg', telegramId));
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
        sendText(cid, "⚠️ Hạng mục **" + name + "** đã tồn tại!");
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
    for (var i = 1; i < data.length; i++) {
      if (data[i][0].toLowerCase() === name.toLowerCase() && data[i][1] === type) {
        sheet.deleteRow(i + 1);
        sendText(cid, "🗑 Đã xóa hạng mục: **" + name + "**");
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
  var action = parts[0].toLowerCase();
  var name = parts.slice(1).join(" ");
  
  if (action === "add") {
    addCategory(cid, sheetId, name, 'expense', telegramId);
  } else if (action === "del" || action === "delete" || action === "remove") {
    removeCategory(cid, sheetId, name, 'expense', telegramId);
  } else if (action === "income") {
    // /category income add [name]
    var subAction = parts[1] ? parts[1].toLowerCase() : '';
    var subName = parts.slice(2).join(" ");
    if (subAction === "add") {
      addCategory(cid, sheetId, subName, 'income', telegramId);
    } else if (subAction === "del") {
      removeCategory(cid, sheetId, subName, 'income', telegramId);
    }
  } else {
    listCategories(cid, sheetId, telegramId);
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
