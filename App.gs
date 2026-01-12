/**
 * App.gs
 * VCB Automation & Donate Tracking
 * 
 * Các tính năng chính đã được chuyển sang:
 * - Config.gs: Cấu hình, localization
 * - Utils.gs: Helpers, Telegram API
 * - Features.gs: Report, Budget, Categories, Recurring
 * - Handlers.gs: Message/Callback handlers
 */

// Legacy variables for VCB functions
var PROPS = PropertiesService.getScriptProperties().getProperties();
var token = PROPS['BOT_TOKEN'];
var masterSheetId = PROPS['SHEET_ID'];
var myChatId = PROPS['MY_CHAT_ID'];

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
        Utilities.sleep(1000);
      }
    } catch (e) {
      Logger.log("🔥 System Error: " + e);
    }
  }
  
  Logger.log("❌ All " + MAX_RETRIES + " attempts failed.");
}

function solveCaptchaOnHF(base64Image) {
  try {
    var HF_API = 'https://thangnd163063-captcha.hf.space/predict';
    
    var payload = {
      "data": "data:image/jpeg;base64," + base64Image
    };
    
    var options = {
      'method': 'post',
      'contentType': 'application/json',
      'payload': JSON.stringify(payload),
      'muteHttpExceptions': true
    };
    
    var res = UrlFetchApp.fetch(HF_API, options);
    var txt = res.getContentText();
    Logger.log("HF Response: " + txt);
    
    try {
      var json = JSON.parse(txt);
    } catch(e) {
      Logger.log("HF Response is not JSON");
      return null;
    }
    
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
  
  var newLastId = lastId;
  var count = 0;
  
  for (var i = txns.length - 1; i >= 0; i--) {
     var t = txns[i];
     if (compareTxnId(t.reference, lastId) > 0) {
        if (t.dorc === 'C' || t.amount > 0) {
            var amt = Number(String(t.amount).replace(/,/g, ''));
            
            // Save to Income sheet (Admin)
            try {
              if (masterSheetId) {
                var ss = SpreadsheetApp.openById(masterSheetId);
                var sheet = ss.getSheetByName('Income');
                if (!sheet) {
                  sheet = ss.insertSheet('Income');
                  sheet.appendRow(['STT', 'Thời gian', 'Số tiền', 'Hạng mục', 'Ghi chú']);
                }
                sheet.appendRow([sheet.getLastRow(), new Date(t.transactionDate), amt, "Donate", t.description || "Bank Transfer"]);
              }
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
        
        if (compareTxnId(t.reference, newLastId) > 0) newLastId = t.reference;
     }
  }
  
  if (count > 0) {
    props.setProperty('LAST_VCB_TXN_ID', newLastId);
    Logger.log("✅ Processed " + count + " new donations.");
  }
}

function compareTxnId(a, b) {
    if (!b) return 1;
    if (!a) return -1;
    try {
        var na = parseFloat(a);
        var nb = parseFloat(b);
        if (!isNaN(na) && !isNaN(nb)) return na - nb;
    } catch(e){}
    return String(a).localeCompare(String(b));
}

function sendTelegramNotice(text) {
   if (!myChatId || !token) return;
   UrlFetchApp.fetch("https://api.telegram.org/bot" + token + "/sendMessage", { 
       method: "post", 
       payload: { chat_id: String(myChatId), text: text, parse_mode: "Markdown" } 
   });
}

// --- SETUP VCB TRIGGER ---
function setupVCBTrigger() {
  // Delete existing triggers
  var triggers = ScriptApp.getProjectTriggers();
  for (var i = 0; i < triggers.length; i++) {
    if (triggers[i].getHandlerFunction() === 'runCheckBalance') {
      ScriptApp.deleteTrigger(triggers[i]);
    }
  }
  
  // Create trigger every 10 minutes
  ScriptApp.newTrigger('runCheckBalance')
    .timeBased()
    .everyMinutes(10)
    .create();
  
  Logger.log("VCB Trigger created (every 10 minutes)");
}

// --- LEGACY AUTH FUNCTION ---
function sys_auth_trigger() {
  // Dùng để kích hoạt permission popup
  SpreadsheetApp.openById(masterSheetId || 'dummy');
  DriveApp.getRootFolder();
}
