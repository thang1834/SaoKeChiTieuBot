/**
 * AI.gs
 * Tương tác với Google Gemini API để xử lý ngôn ngữ tự nhiên
 */

/**
 * Gọi Gemini API để phân tích văn bản
 * @param {string} text - Tin nhắn của người dùng (VD: "Nay đi chợ mua rau 50k, thịt 100k")
 * @returns {Array} Danh sách các giao dịch đã parse [{amount, category, note, type}]
 */
function parseTransactionWithAI(text) {
  var apiKey = CONFIG.GEMINI_API_KEY;
  if (!apiKey) {
    Logger.log("Missing GEMINI_API_KEY");
    return null;
  }

  var prompt = 
    "You are a finance assistant. Extract transaction data from this text: '" + text + "'. " +
    "Return JSON array ONLY. Format: " +
    "[{ \"amount\": number, \"category\": string, \"note\": string, \"type\": \"OUT\"|\"IN\" }]. " +
    "Rules: " +
    "1. Convert k/m/tr to numbers (50k=50000). " +
    "2. Guess category from Vietnamese context (e.g. food->Ăn uống). " +
    "3. Date is today unless specified. " +
    "4. Type is usually OUT, only IN if receiving money/salary. " +
    "5. Return strictly valid JSON array. No markdown.";

  var url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=" + apiKey;
  
  var payload = {
    "contents": [{
      "parts": [{
        "text": prompt
      }]
    }]
  };

  try {
    var response = UrlFetchApp.fetch(url, {
      method: "post",
      payload: JSON.stringify(payload),
      contentType: "application/json",
      muteHttpExceptions: true
    });
    
    var json = JSON.parse(response.getContentText());
    
    if (json.candidates && json.candidates.length > 0) {
      var rawText = json.candidates[0].content.parts[0].text;
      // Clean up markdown code blocks if present
      rawText = rawText.replace(/```json/g, "").replace(/```/g, "").trim();
      
      var transactions = JSON.parse(rawText);
      return Array.isArray(transactions) ? transactions : [transactions];
    }
  } catch (e) {
    Logger.log("Gemini API Error: " + e);
  }
  return null;
}

/**
 * Xử lý Voice Note bằng Gemini 1.5 Flash
 * @param {string} fileUrl - URL file âm thanh từ Telegram
 * @returns {Array} Danh sách giao dịch parse được
 */
function processVoiceWithGemini(fileId) {
  var apiKey = CONFIG.GEMINI_API_KEY;
  if (!apiKey) return null;

  // 1. Get File Path from Telegram
  var fileInfoUrl = "https://api.telegram.org/bot" + CONFIG.BOT_TOKEN + "/getFile?file_id=" + fileId;
  try {
    var resp = UrlFetchApp.fetch(fileInfoUrl);
    var json = JSON.parse(resp.getContentText());
    if (!json.ok) return null;
    
    var filePath = json.result.file_path;
    var downloadUrl = "https://api.telegram.org/file/bot" + CONFIG.BOT_TOKEN + "/" + filePath;
    
    // 2. Download File Blob
    var blob = UrlFetchApp.fetch(downloadUrl).getBlob();
    var base64 = Utilities.base64Encode(blob.getBytes());
    var mimeType = blob.getContentType(); // usually audio/ogg or audio/mpeg
    
    // 3. Send to Gemini 1.5 Flash
    var url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=" + apiKey;
    
    var prompt = 
      "Listen to this audio. It lists expenses. Extract them into JSON array: " +
      "[{ \"amount\": number, \"category\": string, \"note\": string, \"type\": \"OUT\"|\"IN\" }]. " +
      "Rules: Guess category from context. Convert spoken numbers (50 nghìn -> 50000). Return ONLY JSON.";

    var payload = {
      "contents": [{
        "parts": [
          { "text": prompt },
          {
            "inline_data": {
              "mime_type": mimeType,
              "data": base64
            }
          }
        ]
      }]
    };
    
    var response = UrlFetchApp.fetch(url, {
      method: "post",
      payload: JSON.stringify(payload),
      contentType: "application/json",
      muteHttpExceptions: true
    });
    
    var result = JSON.parse(response.getContentText());
    
    if (result.candidates && result.candidates.length > 0) {
      var rawText = result.candidates[0].content.parts[0].text;
      rawText = rawText.replace(/```json/g, "").replace(/```/g, "").trim();
      var transactions = JSON.parse(rawText);
      return Array.isArray(transactions) ? transactions : [transactions];
    }
    
  } catch (e) {
    Logger.log("Gemini Voice Error: " + e);
    logErrorToAdmin(e, "processVoiceWithGemini");
  }
  return null;
}

/**
 * Analyze unusual spending
 * @returns {string|null} Warning message or null
 */
function checkUnusualSpendingAI(amount, category, note, stats) {
   var apiKey = CONFIG.GEMINI_API_KEY;
   if (!apiKey) return null;
   
   var historyStr = stats.history.map(function(h) { return h.date + ": " + h.amount; }).join(", ");
   
   var prompt = 
      "You are a witty financial assistant. Analyze this expense:\n" +
      "- Amount: " + amount + "\n" +
      "- Category: " + category + " (" + note + ")\n" +
      "- User's Avg for this cat: " + Math.round(stats.avg) + "\n" +
      "- Recent History: " + historyStr + "\n\n" +
      "Is this expense unusually high (significant outlier)? \n" +
      "Strictly reply with JSON: { \"isUnusual\": boolean, \"message\": \"string\" }.\n" +
      "If isUnusual is true, message should be a short, funny, warning in Vietnamese (e.g. 'Tiêu gì mà lắm thế?'). If false, message is empty.";

   var url = "https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=" + apiKey;
   
   var payload = {
     "contents": [{ "parts": [{ "text": prompt }] }]
   };
   
   try {
     var response = UrlFetchApp.fetch(url, {
       method: "post",
       payload: JSON.stringify(payload),
       contentType: "application/json",
       muteHttpExceptions: true
     });
     
     var json = JSON.parse(response.getContentText());
     if (json.candidates && json.candidates.length > 0) {
        var rawText = json.candidates[0].content.parts[0].text;
        // Clean markdown
        rawText = rawText.replace(/```json/g, "").replace(/```/g, "").trim();
        var result = JSON.parse(rawText);
        
        if (result.isUnusual) {
           return "⚠️ **Smart Alert**: " + result.message;
        }
     }
   } catch (e) {
     Logger.log("AI Alert Error: " + e);
   }
   return null;
}
