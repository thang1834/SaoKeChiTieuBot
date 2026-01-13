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
   withLock(function() {
      var props = PropertiesService.getScriptProperties();
      var lastId = props.getProperty('LAST_VCB_TXN_ID') || "0";
      
      Logger.log("Probable Last ID: " + lastId);
      
      // Find index of lastId in current txns
      // txns is [Newest ... Oldest]
      var stopIndex = -1;
      
      for (var i = 0; i < txns.length; i++) {
        // Normalize ID from VCB response
        var currentId = txns[i]['id'] || txns[i]['Reference'] || txns[i]['reference'];
        
        // Use loose equality or compareTxnId logic
        if (compareTxnId(currentId, lastId) === 0 || 
            String(currentId) === String(lastId)) {
            stopIndex = i;
            break;
        }
      }
      
      Logger.log("Stop Index found at: " + stopIndex);
      
      var newTxns = [];
      if (stopIndex === -1) {
          // rare case: lastId not found. Assume all are new.
          newTxns = txns; 
      } else {
          // Take all from 0 to stopIndex - 1
          newTxns = txns.slice(0, stopIndex);
      }
      
      // Process from Oldest to Newest to keep order
      newTxns.reverse();
      
      var count = 0;
      var newLastId = lastId;

      for (var i = 0; i < newTxns.length; i++) {
        var txn = newTxns[i];
        if (!txn) continue;
        
        // Normalize Unknown VCB Keys (Reference/reference, Amount/amount, etc.)
        var id = txn['id'] || txn['Reference'] || txn['reference'];
        var dateStr = txn['date'] || txn['TransactionDate'] || txn['transactionDate'] || txn['tranDate']; 
        var desc = txn['description'] || txn['Description'] || "";
        var rawAmount = txn['amount'] || txn['Amount'] || "0";
        var cd = txn['cd'] || txn['CD'] || txn['dorc']; 

        // Ensure Amount is parsed safely
        var amt = 0;
        if (typeof rawAmount === 'string') {
             amt = parseFloat(rawAmount.replace(/,/g, ''));
        } else {
             amt = parseFloat(rawAmount);
        }

        newLastId = id; // Update lastId pointer
        
        // --- PARSE TIME FROM DESC (VCB 24/7) ---
        // Look for pattern like ...2026 123045 1234... -> 12:30:45
        var extractedTime = null;
        var timeMatch = desc.match(/\d{4}(\d{6})\d{4}/); 
        if (timeMatch) {
            extractedTime = timeMatch[1]; // HHmmss
        }

        // Clean Description: Remove technical prefix (VCB 24/7 often adds long numeric string)
        var cleanDesc = desc;
        if (desc.length > 30 && /^\d+/.test(desc)) { 
            var parts = desc.split('.');
            var startIndex = 0;
            for(var k=0; k<parts.length; k++) {
                var p = parts[k];
                // Skip part if it's purely number OR looks like ID/Trace number (long, no space)
                if (/^\d+$/.test(p) || (p.length > 15 && !p.includes(' '))) {
                   startIndex++;
                } else {
                   break; // Found actual content
                }
            }
            if (startIndex > 0 && startIndex < parts.length) {
                cleanDesc = parts.slice(startIndex).join('.').trim();
            }
        }
        
        // Use cleaned description for logic
        desc = cleanDesc; 

        // --- ID DETECTION LOGIC ---

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
                
                // Get transaction Date Object for Sheet
                var parts = dateStr.split(" ");
                var dParts = parts[0].split("/");
                var txnDate = new Date(dParts[2], dParts[1]-1, dParts[0]);
                
                // Set Time: Priority (Extracted from Desc > DateStr Time > 00:00:00)
                if (extractedTime) {
                    var hh = parseInt(extractedTime.substring(0, 2));
                    var mm = parseInt(extractedTime.substring(2, 4));
                    var ss = parseInt(extractedTime.substring(4, 6));
                    txnDate.setHours(hh, mm, ss);
                } else if (parts[1]) {
                    var tParts = parts[1].split(":");
                    txnDate.setHours(tParts[0], tParts[1], tParts[2]);
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
      } // end for

      if (count > 0) {
        props.setProperty('LAST_VCB_TXN_ID', newLastId);
        Logger.log("✅ Processed " + count + " new donations.");
      }
   }); // End withLock
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
