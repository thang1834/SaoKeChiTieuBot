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
      // 3. Login
      var loginResult = loginVCB(captchaText, captchaObj);
      var sessionId = null;
      var userInfo = null;
      
      if (loginResult && loginResult.sessionId) {
          sessionId = loginResult.sessionId;
          // Extract userInfo (it might be nested or flat depending on VCB response)
          userInfo = loginResult.userInfo || loginResult;
      }
      
      if (sessionId) {
        Logger.log("✅ Login Success, SessionID: " + sessionId.substring(0, 10) + "...");
        
        // 4. Get Account List (REQUIRED to activate account in session)
        var accounts = getListAccountViaCif(sessionId, userInfo);
        var useAccount = null;
        
        if (accounts && accounts.length > 0) {
           // Try to extract account number from first account
           var acc = accounts[0];
           // Priority: accountNo > accountNumber > number > id
           useAccount = acc.accountNo || acc.accountNumber || acc.number || acc.id;
           Logger.log("Using Account Number from List: " + useAccount);
        }
        
        // 5. Get History
        var txns = getVcbHistory(sessionId, useAccount, userInfo);
        
        // 6. Process
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
  
  // Iterate from oldest to newest (if VCB returns sorted by date DESC, we need to process reverse? 
  // Usually VCB returns newest first. So looping i = length-1 to 0 processes OLDEST first, which is correct for updating lastId.)
  for (var i = txns.length - 1; i >= 0; i--) {
     var t = txns[i];
     
     // Normalize Keys (VCB returns capitalized keys: Reference, Amount, Description, CD, TransactionDate)
     var ref = t.Reference || t.reference;
     var rawAmount = t.Amount || t.amount || "0";
     var desc = t.Description || t.description || "";
     var dateStr = t.TransactionDate || t.transactionDate || t.tranDate; // "13/01/2026"
     var cd = t.CD || t.dorc; // "+" or "C"
     
     if (compareTxnId(ref, lastId) > 0) {
        // Parse Amount
        var amt = 0;
        if (typeof rawAmount === 'string') {
            amt = parseFloat(rawAmount.replace(/,/g, ''));
        } else {
            amt = parseFloat(rawAmount);
        }
        
        // Parse Date "dd/MM/yyyy"
        var txnDate = new Date();
        if (dateStr && dateStr.includes('/')) {
            var parts = dateStr.split('/');
            // yyyy, mm-1, dd
            txnDate = new Date(parts[2], parts[1] - 1, parts[0]);
        }
        
        // Check if Income (Credit)
        // CD="+" implies Credit (Incoming money)
        if (cd === '+' || cd === 'C' || (cd === undefined && amt > 0)) {
            
            // Save to Income sheet (Admin)
            try {
              if (masterSheetId) {
                var ss = SpreadsheetApp.openById(masterSheetId);
                var sheet = ss.getSheetByName('Income');
                if (!sheet) {
                  sheet = ss.insertSheet('Income');
                  sheet.appendRow(['STT', 'Thời gian', 'Số tiền', 'Hạng mục', 'Ghi chú']);
                }
                
                // Check if Donate contains UserID to resolve Name
                var matchUser = (desc || "").match(/Donate\s*(\d+)/i);
                var saveNote = desc || "Bank Transfer";
                if (matchUser) {
                   var uName = getSenderName(matchUser[1]);
                   if (uName && uName !== "Unknown") {
                      saveNote = desc.replace(/Donate\s*\d+/i, uName);
                   }
                }
                
                sheet.appendRow([sheet.getLastRow(), txnDate, amt, "Donate", saveNote]);
              }
            } catch(e) {
              Logger.log("Save Donate Error: " + e);
            }
            
            // Send Thank You
            var reply = "💖 **CẢM ƠN BẠN ĐÃ DONATE** 💖\n" +
                        "💰 Số tiền: " + formatMoney(amt) + " VNĐ\n" +
                        "📝 Nội dung: " + desc + "\n" +
                        "⏰ Thời gian: " + dateStr;
            
            // Check for UserID in Description (Format: "Donate <UserID>")
            var match = (desc || "").match(/Donate\s*(\d+)/i);
            var targetUserId = match ? match[1] : null;
            
            // Resolve Display Name & Note
            var displayNote = desc;
            var displayName = "Mạnh Thường Quân";
            
            if (targetUserId) {
               // Try to get Name from System
               var name = getSenderName(targetUserId); 
               if (name && name !== "Unknown") {
                  displayName = name;
                  // Replace "Donate <ID>" with Name in note
                  displayNote = desc.replace(/Donate\s*\d+/i, displayName);
               }
            }

            // Update row with resolved Name only if we found the user
            if (targetUserId && displayName !== "Mạnh Thường Quân") {
               try {
                   // Re-update the last row (we just appended it above at line 184)
                   // Actually, efficient way is to modify line 184. But let's overwrite it for clarity or modify logic above.
                   // Since we have 'sheet' in scope? No, 'sheet' is inside try block above.
                   // Let's modify the append logic at line 184 instead of updating later.
               } catch(e) {}
            }
            
            // Wait, let's restructure slightly to do lookup BEFORE saving.
            
            // Send Thank You
            var reply = "💖 **CẢM ƠN BẠN ĐÃ DONATE** 💖\n" +
                        "💰 Số tiền: " + formatMoney(amt) + " VNĐ\n" +
                        "👤 Người gửi: " + displayName + "\n" + 
                        "📝 Nội dung: " + displayNote + "\n" +
                        "⏰ Thời gian: " + dateStr;
            
            if (targetUserId) {
               // Send to the User who donated
               sendTelegramNotice(targetUserId, reply + "\n\n🤖 *Bot đã nhận được tấm lòng của bạn!*");
               
               // Send notification to Admin (Owner)
               if (String(targetUserId) !== String(myChatId)) {
                   sendTelegramNotice(myChatId, "🔔 **Admin Alert: New Donation**\nUser: `" + displayName + "` (" + targetUserId + ")\nAmount: " + formatMoney(amt) + "\nNote: " + displayNote);
               }
            } else {
               // Fallback
               sendTelegramNotice(myChatId, reply);
            }
            
            count++;
        }
        
        // Update newLastId
        if (compareTxnId(ref, newLastId) > 0) newLastId = ref;
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
