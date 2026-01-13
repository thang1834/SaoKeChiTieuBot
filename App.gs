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
  
  Logger.log("Probable Last ID: " + lastId);
  
  // Find the index of the last processed ID in the current list
  // VCB List is usually [Newest, ..., Oldest]
  var lastIdIndex = -1;
  for (var k = 0; k < txns.length; k++) {
      var tRef = txns[k].Reference || txns[k].reference;
      if (tRef === lastId) {
          lastIdIndex = k;
          break;
      }
  }
  
  Logger.log("Last ID found at index: " + lastIdIndex + " (List length: " + txns.length + ")");
  
  var newLastId = lastId;
  var count = 0;

  // Iterate from oldest to newest (Reverse order of checking, but valid for processing)
  // Logic: 
  // - If lastIdIndex == -1 (Not found): Assume ALL are new (since we run every 10 mins).
  // - If lastIdIndex > -1: Process only items with index < lastIdIndex (Newer items).
  
  for (var i = txns.length - 1; i >= 0; i--) {
     // Skip if we found the lastId and this item is older or equal to it
     if (lastIdIndex !== -1 && i >= lastIdIndex) {
         continue;
     }

     var t = txns[i];
     
     // Normalize Keys
     var ref = t.Reference || t.reference;
     
     // Update newLastId to the current ref (as we iterate Old -> New, the final value will be the newest)
     newLastId = ref;
     var rawAmount = t.Amount || t.amount || "0";
     var desc = t.Description || t.description || "";
     var dateStr = t.TransactionDate || t.transactionDate || t.tranDate; // "13/01/2026"
     var cd = t.CD || t.dorc; // "+" or "C"
     
     Logger.log("Processing New Txn: " + ref);
     
     if (true) {
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
        
        // --- NEW: Parse Time & Clean Description from VCB 24/7 Prefix ---
        var timeMatch = desc.match(/\d{4}(\d{6})\d{4}/); 
        if (timeMatch) {
            var fullTime = timeMatch[1]; // 052849
            var hh = parseInt(fullTime.substring(0, 2));
            var mm = parseInt(fullTime.substring(2, 4));
            var ss = parseInt(fullTime.substring(4, 6));
            txnDate.setHours(hh, mm, ss);
        }
        
        // Clean Description: Remove technical prefix
        var cleanDesc = desc;
        if (desc.length > 30 && /^\d+/.test(desc)) { 
            var parts = desc.split('.');
            var startIndex = 0;
            for(var k=0; k<parts.length; k++) {
                var p = parts[k];
                if (/^\d+$/.test(p) || (p.length > 15 && !p.includes(' '))) {
                   startIndex++;
                } else {
                   break; // Found content
                }
            }
            if (startIndex > 0 && startIndex < parts.length) {
                cleanDesc = parts.slice(startIndex).join('.').trim();
            }
        }
        desc = cleanDesc; 
        
        // --- ID DETECTION LOGIC ---
        // Priority:
        // 1. "Donate <ID>"
        // 2. "<ID> Donate"
        // 3. Start with <ID> (9-15 digits)
        
        var targetUserId = null;
        var msgContent = desc;
        
        var m1 = desc.match(/Donate\s*(\d{9,15})/i);
        var m2 = desc.match(/(\d{9,15})\s*Donate/i);
        var m3 = desc.match(/^(\d{9,15})\b/); // ID at the start
        
        if (m1) {
            targetUserId = m1[1];
            msgContent = desc.replace(m1[0], "").trim();
        } else if (m2) {
            targetUserId = m2[1];
            msgContent = desc.replace(m2[0], "").trim();
        } else if (m3) {
            targetUserId = m3[1];
            msgContent = desc.replace(m3[0], "").trim();
        }
        
        // Detect generic "Donate" keyword (optional now since valid even without it)
        // var hasDonateKeyword = /donate|ung ho|quyen gop/i.test(desc);
        
        var category = "Donate"; 

        // Clean up message content
        if (!msgContent || msgContent.length < 2) msgContent = "Mời cafe";
        msgContent = msgContent.replace(/^[:\-\.]+\s*/, ""); 
        
        // Resolve Name
        var displayName = "Ẩn danh"; // Default if no ID found
        
        if (targetUserId) {
             var savedName = getSenderName(targetUserId);
             if (savedName && savedName !== "Unknown") {
                 displayName = savedName;
             } else {
                 displayName = "User " + targetUserId;
             }
        }
        
        // Format Note: "Name: Content"
        var sheetNote = displayName + ": " + msgContent;

        // --- SAVE TO SHEET ---
        // VCB: CD = "+" or "C" (Credit/Incoming). "D" or "-" (Debit/Outgoing).
        // Only process Incoming.
        if (cd === '+' || cd === 'C' || (cd === undefined && amt > 0)) {
            try {
              if (masterSheetId) {
                var ss = SpreadsheetApp.openById(masterSheetId);
                var sheet = ss.getSheetByName('Income');
                if (!sheet) {
                  sheet = ss.insertSheet('Income');
                  sheet.appendRow(['STT', 'Thời gian', 'Số tiền', 'Hạng mục', 'Ghi chú', 'Người gửi']);
                }
                
                sheet.appendRow([sheet.getLastRow(), txnDate, amt, category, sheetNote, displayName]);
              }
            } catch(e) {
              Logger.log("Save Donate Error: " + e);
            }
            
            // --- NOTIFICATIONS ---
            var reply = "💖 **CẢM ƠN BẠN ĐÃ DONATE** 💖\n" +
                        "💰 Số tiền: " + formatMoney(amt) + " VNĐ\n" +
                        "👤 Người gửi: " + displayName + "\n" + 
                        "📝 Nội dung: " + msgContent + "\n" +
                        "⏰ Thời gian: " + dateStr;
            
            var userNotified = false;
            
            if (targetUserId) {
               // Send to the User who donated
               sendText(targetUserId, reply + "\n\n🤖 *Bot đã nhận được tấm lòng của bạn!*");
               userNotified = true;
            }
            
            // 2. Notify Admin (ALWAYS)
            if (String(targetUserId) !== String(myChatId)) {
                var adminMsg = "🔔 **Admin Alert: New Donation**\n" +
                               "User: `" + displayName + "` (" + (targetUserId || "Unknown") + ")\n" +
                               "Amount: " + formatMoney(amt) + "\n" +
                               "Note: " + msgContent + "\n" + 
                               "Status: " + (userNotified ? "✅ User Notified" : "⚠️ User NOT Notified");
                               
                sendText(myChatId, adminMsg);
            } else {
                // If Admin donated to themselves
                 sendText(myChatId, reply);
            }
            
            count++;
        }
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
