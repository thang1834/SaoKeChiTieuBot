/**
 * Test function to list available Gemini Models
 */
function listGeminiModels() {
  var apiKey = PropertiesService.getScriptProperties().getProperty('GEMINI_API_KEY');
  if (!apiKey) {
    Logger.log("❌ Missing GEMINI_API_KEY");
    return;
  }
  
  var url = "https://generativelanguage.googleapis.com/v1beta/models?key=" + apiKey;
  
  try {
    var response = UrlFetchApp.fetch(url, {
      method: "get",
      muteHttpExceptions: true
    });
    
    var json = JSON.parse(response.getContentText());
    
    if (json.models) {
      Logger.log("✅ Available Models:");
      json.models.forEach(function(m) {
        if (m.supportedGenerationMethods && m.supportedGenerationMethods.indexOf("generateContent") > -1) {
           Logger.log("- " + m.name + " (" + m.displayName + ")");
        }
      });
    } else {
      Logger.log("❌ Error: " + response.getContentText());
    }
    
  } catch (e) {
    Logger.log("Exception: " + e);
  }
}
