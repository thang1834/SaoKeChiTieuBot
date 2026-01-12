/**
 * VCB.gs
 * Logic to communicate with Vietcombank Mobile API.
 */

var VCB_CONFIG = {
  BASE_URL: "https://digiapp.vietcombank.com.vn",
  PUBLIC_KEY: "-----BEGIN PUBLIC KEY-----\nMIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAikqQrIzZJkUvHisjfu5ZCN+TLy//43CIc5hJE709TIK3HbcC9vuc2+PPEtI6peSUGqOnFoYOwl3i8rRdSaK17G2RZN01MIqRIJ/6ac9H4L11dtfQtR7KHqF7KD0fj6vU4kb5+0cwR3RumBvDeMlBOaYEpKwuEY9EGqy9bcb5EhNGbxxNfbUaogutVwG5C1eKYItzaYd6tao3gq7swNH7p6UdltrCpxSwFEvc7douE2sKrPDp807ZG2dFslKxxmR4WHDHWfH0OpzrB5KKWQNyzXxTBXelqrWZECLRypNq7P+1CyfgTSdQ35fdO7M1MniSBT1V33LdhXo73/9qD5e5VQIDAQAB\n-----END PUBLIC KEY-----",
  NeedEncrypt: true
};

function getVcbCaptcha() {
  // Use VCB Mobile API endpoint for Captcha
  var guid = generateGuid();
  var url = VCB_CONFIG.BASE_URL + "/utility-service/v2/captcha/MASS/" + guid;
  var headers = {
    'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
    'X-Channel': 'Web'
  };
  
  // Fetch image directly
  var res = UrlFetchApp.fetch(url, { method: 'get', headers: headers, muteHttpExceptions: true });
  
  // VCB returns raw image (JFIF/JPEG), not JSON.
  var blob = res.getBlob();
  var base64 = Utilities.base64Encode(blob.getBytes());
  
  return {
    base64: base64,
    guid: guid,
    challenge: "" 
  };
}

function loginVCB(captchaText, captchaObj) {
  loadLibraries(); // Ensure Crypto loaded
  
  var user = CONFIG.VCB_USER;
  var pwd = CONFIG.VCB_PASS;
  
  Logger.log("VCB User: '" + user + "'"); // Debug undefined user
  
  // 1. Generate CLIENT RSA Keypair (1024-bit) 
  // The Python repo sends clientPubKey in the payload.
  // Server encrypts response `k` with this clientPubKey.
  // We must use clientPrivateKey to decrypt.
  var clientKeys = generateClientRsaKeypair();
  
  var rawPayload = {
    "user": user,
    "password": pwd,
    "captchaToken": captchaObj.guid,
    "captchaValue": captchaText,
    "mid": 6,
    "browserId": getBrowserId(),
    "lang": "vi",
    "clientPubKey": clientKeys.publicKeyBase64 // Include client public key!
  };
  
  var state = encryptRequest(rawPayload);
  
  var headers = getCommonHeaders();
  headers['X-Lim-Id'] = hashLimId(user);
  headers['X-Request-Id'] = generateRequestId();
  
  var options = {
    method: 'post',
    headers: headers,
    payload: JSON.stringify(state.payload),
    muteHttpExceptions: true
  };
  
  var res = UrlFetchApp.fetch(VCB_CONFIG.BASE_URL + "/authen-service/v1/login", options);
  var txt = res.getContentText();
  Logger.log("Login Res: " + txt);
  
  try {
    var json = JSON.parse(txt);
    // If json has sessionId directly (rare)
    if (json.sessionId) {
        return { sessionId: json.sessionId, userInfo: json.userInfo || {} };
    }
    
    // Decrypt Response using CLIENT PRIVATE KEY
    if (json.d && json.k) {
       var decrypted = decryptResponseWithClientKey(json, clientKeys.privateKeyPem);
       Logger.log("Decrypted Login: " + JSON.stringify(decrypted));
       
       if (decrypted.code == "00" && decrypted.sessionId) {
           return decrypted; // Return full decrypted object containing sessionId and userInfo
       }
       
       if (decrypted.des) Logger.log("Login Msg: " + decrypted.des);
    }
    
  } catch (e) {
    Logger.log("Login Parse Error: " + e);
  }
  return null;
}

/**
 * Get list of accounts via CIF - REQUIRED before querying transaction history!
 */
function getListAccountViaCif(sessionId, userInfo) {
  loadLibraries();
  
  var user = CONFIG.VCB_USER;
  var clientKeys = generateClientRsaKeypair();
  
  var rawPayload = {
    "mid": 8,
    "user": user,
    "sessionId": sessionId,
    "browserId": getBrowserId(),
    "clientPubKey": clientKeys.publicKeyBase64,
    "lang": "vi"
    // Note: getListAccountViaCif might not strictly need clientId/cif in payload based on usage,
    // but sending them if available is safer. For now sticking to what worked + userInfo if needed.
  };
   if (userInfo) {
       rawPayload.cif = userInfo.cif;
       rawPayload.clientId = userInfo.clientId;
       rawPayload.mobileId = userInfo.mobileId;
   }
  
  var state = encryptRequest(rawPayload);
  
  var headers = getCommonHeaders();
  headers['X-Lim-Id'] = hashLimId(user);
  headers['X-Request-Id'] = generateRequestId(user);
  headers['SessionId'] = sessionId;
  
  var options = {
    method: 'post',
    headers: headers,
    payload: JSON.stringify(state.payload),
    muteHttpExceptions: true
  };
  
  var res = UrlFetchApp.fetch(VCB_CONFIG.BASE_URL + "/bank-service/v2/get-list-account-via-cif", options);
  var txt = res.getContentText();
  Logger.log("Get Account List: " + txt.substring(0, 200) + "...");
  
  try {
    var json = JSON.parse(txt);
    if (json.d && json.k) {
      var decrypted = decryptResponseWithClientKey(json, clientKeys.privateKeyPem);
      // Log FULL structure to debug
      Logger.log("Account List Keys: " + Object.keys(decrypted).join(", "));
      if (decrypted.DDAccounts) {
         Logger.log("Found " + decrypted.DDAccounts.length + " DDAccounts.");
         Logger.log("First DDAccount: " + JSON.stringify(decrypted.DDAccounts[0]));
         return decrypted.DDAccounts;
      }
      if (decrypted.accountList) {
         Logger.log("Found " + decrypted.accountList.length + " accounts.");
         Logger.log("First Account: " + JSON.stringify(decrypted.accountList[0]));
         return decrypted.accountList;
      }
      return decrypted; 
    }
  } catch(e) {
    Logger.log("Get Account List Error: " + e);
  }
  return null;
}

function getVcbHistory(sessionId, accountNo, userInfo) {
  loadLibraries();
  
  var user = CONFIG.VCB_USER;
  var account = accountNo || CONFIG.VCB_ACC; // Use passed accountNo if available
  
  // Use date range like browser (7 days back to today)
  var today = new Date();
  var weekAgo = new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000);
  var fromDate = Utilities.formatDate(weekAgo, "GMT+7", "dd/MM/yyyy");
  var toDate = Utilities.formatDate(today, "GMT+7", "dd/MM/yyyy");
  
  // Generate CLIENT RSA Keypair for this request too
  var clientKeys = generateClientRsaKeypair();
  
  // FULL Payload based on Reference Implementation
  var rawPayload = {
    "mid": 14,
    "lengthInPage": 20,
    "pageIndex": 0,
    "fromDate": fromDate,
    "toDate": toDate,
    "accountNo": account, // Reference uses accountNo
    "accountNumber": account, // Redundant but safe
    
    // Default Identity Fields
    "browserId": getBrowserId(),
    "lang": "vi",
    "user": user,
    "sessionId": sessionId,
    "clientPubKey": clientKeys.publicKeyBase64,
    
    // Extra Fields from Login UserInfo
    "cif": userInfo ? userInfo.cif : undefined,
    "clientId": userInfo ? userInfo.clientId : undefined,
    "mobileId": userInfo ? userInfo.mobileId : undefined,
    
    // Device Fingerprint Mock (from reference)
    "DT": "Windows",
    "OV": "10",
    "PM": "Chrome 136.0.0.0", // Mimic reference or use our UA
    "accountType": "D"
  };
  
  Logger.log("History Request Payload: " + JSON.stringify(rawPayload));
  
  var state = encryptRequest(rawPayload);
  
  var headers = getCommonHeaders();
  headers['X-Lim-Id'] = hashLimId(user);
  headers['Authorization'] = "Bearer " + getStaticToken();
  headers['X-Request-Id'] = generateRequestId(user); // Use CRC16 version
  headers['SessionId'] = sessionId;
  
  var options = {
    method: 'post',
    headers: headers,
    payload: JSON.stringify(state.payload),
    muteHttpExceptions: true
  };
  
  // Use v1 endpoint (v2 returns System busy)
  var res = UrlFetchApp.fetch(VCB_CONFIG.BASE_URL + "/bank-service/v1/transaction-history", options);
  var txt = res.getContentText();
  Logger.log("History Raw Response: " + txt.substring(0, 200) + "...");
  
  try {
     var json = JSON.parse(txt);
     
     if (json.transactions) {
       Logger.log("Found " + json.transactions.length + " transactions directly");
       return json.transactions;
     }
     
     if (json.d && json.k) {
       var decrypted = decryptResponseWithClientKey(json, clientKeys.privateKeyPem);
       Logger.log("Decrypted History: " + JSON.stringify(decrypted).substring(0, 300));
       
       if (decrypted.transactions) {
         Logger.log("Found " + decrypted.transactions.length + " transactions after decrypt");
         return decrypted.transactions;
       }
       
       // Check for ctMon (another field name VCB uses)
       if (decrypted.ctMon) {
         Logger.log("Found " + decrypted.ctMon.length + " transactions in ctMon");
         return decrypted.ctMon;
       }
     }
     
     Logger.log("No transactions field found in response");
     return [];
  } catch (e) {
     Logger.log("History Err: " + e);
     return [];
  }
}

// --- CORE ENCRYPTION ---

function encryptRequest(dataObj) {
  patchCryptoRandom(); 
  var dataStr = JSON.stringify(dataObj);
  
  var keyWords = CryptoJS.lib.WordArray.random(32);

  // HACK: Mask Key to 7-bit bytes (0x7F) to ensure 'wordArrayToBinString' produces ASCII-only string.
  // This prevents JSEncrypt/JSE libraries from mangling the key due to UTF-8 encoding of high-bit bytes.
  for(var i=0; i<keyWords.words.length; i++) {
     keyWords.words[i] = keyWords.words[i] & 0x7F7F7F7F; 
  }
  
  var ivWords = CryptoJS.lib.WordArray.random(16);
  
  var keyHex = CryptoJS.enc.Hex.stringify(keyWords);
  
  // Encrypt Data (AES-256-CTR)
  var encrypted = CryptoJS.AES.encrypt(dataStr, keyWords, {
    iv: ivWords,
    mode: CryptoJS.mode.CTR,
    padding: CryptoJS.pad.NoPadding
  });
  
  var combined = ivWords.clone().concat(encrypted.ciphertext);
  var d_value = CryptoJS.enc.Base64.stringify(combined);
  
  // Encrypt AES Key with RSA
  // ** CRITICAL: Python repo uses base64.b64encode(m) before RSA encryption **
  // NOT raw binary bytes. JSEncrypt encrypts a string, so Base64 is ideal.
  var jsEncrypt = new JSEncrypt();
  jsEncrypt.setPublicKey(VCB_CONFIG.PUBLIC_KEY);
  
  // Encode the AES Key as Base64 string before RSA encryption
  var keyBase64 = CryptoJS.enc.Base64.stringify(keyWords);
  var k_value_encrypted = jsEncrypt.encrypt(keyBase64);
  
  return {
    payload: {
        d: d_value,
        k: k_value_encrypted,
        t: String(new Date().getTime())
    },
    aesKey: keyWords // Return Key for Decryption
  };
}

function decryptResponse(d_base64, keyWords) {
  try {
    // d = Base64 ( IV (16) + Ciphertext )
    var rawParams = CryptoJS.enc.Base64.parse(d_base64);
    
    // Extract IV (First 16 bytes = 4 words)
    var iv = CryptoJS.lib.WordArray.create(rawParams.words.slice(0, 4), 16);
    
    // Extract Ciphertext (Remaining)
    // Note: slice on Typed Arrays vs Keyed Arrays in CryptoJS
    // slice(4) creates a new array starting from index 4
    var ciphertext = CryptoJS.lib.WordArray.create(rawParams.words.slice(4), rawParams.sigBytes - 16);
    
    var decryptedParams = CryptoJS.AES.decrypt(
       { ciphertext: ciphertext },
       keyWords, 
       { iv: iv, mode: CryptoJS.mode.CTR, padding: CryptoJS.pad.NoPadding }
    );
    
    // Try converting to String
    try {
      var str = decryptedParams.toString(CryptoJS.enc.Utf8);
      return JSON.parse(str);
    } catch (errString) {
      Logger.log("Decryption UTF-8/Parse Error: " + errString);
      Logger.log("Decrypted Hex: " + decryptedParams.toString(CryptoJS.enc.Hex));
      return { des: "Decryption Failed (Raw Hex in Log)" };
    }
    
  } catch(e) {
    Logger.log("Decrypt Critical Error: " + e);
    return {};
  }
}

// --- CLIENT RSA KEYPAIR & NEW DECRYPTION ---

function generateClientRsaKeypair() {
  // JSEncrypt can generate RSA keypairs
  var crypt = new JSEncrypt({ default_key_size: 1024 });
  crypt.getKey(); // Generate keypair
  
  var privateKeyPem = crypt.getPrivateKeyB64(); // Base64 of Private Key (for storage/use)
  var publicKeyPem = crypt.getPublicKeyB64();   // Base64 of Public Key (send to server)
  
  // VCB expects publicKey without BEGIN/END markers, just raw Base64
  // JSEncrypt getPublicKeyB64() returns just the Base64 string (no PEM headers).
  
  return {
    privateKeyPem: crypt.getPrivateKey(), // PEM format for JSEncrypt.decrypt
    publicKeyBase64: publicKeyPem
  };
}

function decryptResponseWithClientKey(jsonResp, privateKeyPem) {
  try {
    // 1. RSA Decrypt `k` (server's AES key encrypted with our clientPubKey)
    var jsDecrypt = new JSEncrypt();
    jsDecrypt.setPrivateKey(privateKeyPem);
    
    // Server sends k as Base64 string. RSA decrypt it.
    var aesKeyMaterial = jsDecrypt.decrypt(jsonResp.k);
    
    if (!aesKeyMaterial) {
      Logger.log("RSA Decrypt Failed for 'k'");
      return { des: "RSA Decrypt Failed" };
    }
    
    Logger.log("RSA Decrypted Key Material: " + aesKeyMaterial.substring(0, 20) + "...");
    
    // 2. The decrypted aesKeyMaterial is likely Base64(aes_key) based on Python repo
    // Decode it to get actual AES key bytes
    var aesKey = CryptoJS.enc.Base64.parse(aesKeyMaterial);
    
    // 3. AES Decrypt `d` using aesKey
    return decryptResponse(jsonResp.d, aesKey);
    
  } catch(e) {
    Logger.log("decryptResponseWithClientKey Error: " + e);
    return {};
  }
}

function wordArrayToBinString(wordArray) {
    // Helper to convert CryptoJS WordArray to binary string
    var words = wordArray.words;
    var sigBytes = wordArray.sigBytes;
    var str = "";
    for (var i = 0; i < sigBytes; i++) {
        var byte = (words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff;
        str += String.fromCharCode(byte);
    }
    return str;
}

// --- UTILS ---

function getCommonHeaders() {
  // Ensure Libraries Loaded and Patched
  loadLibraries();
  patchCryptoRandom(); 
  
  return {
    'Accept': 'application/json, text/plain, */*',
    'Content-Type': 'application/json',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36',
    'X-Channel': 'Web',
    'Authorization': 'Bearer ' + getStaticToken()
  };
}

function patchCryptoRandom() {
  // Fix for GAS: "Native crypto module could not be used..."
  if (CryptoJS && !CryptoJS._patched) {
      CryptoJS.lib.WordArray.random = function (nBytes) {
        var words = [];
        for (var i = 0; i < nBytes; i += 4) {
            words.push((Math.random() * 0x100000000) | 0);
        }
        return new CryptoJS.lib.WordArray.init(words, nBytes);
      };
      CryptoJS._patched = true;
  }
}


function getStaticToken() {
  // From Repo: dmNiOjI3YWNkNDM1YmRiMjU5NTRhY2Q2NDliNmE1MTNmYmI5
  return "dmNiOjI3YWNkNDM1YmRiMjU5NTRhY2Q2NDliNmE1MTNmYmI5"; // Decodes to "vcb:..."
}

// --- HEADER ALGORITHMS ---

function hashLimId(user) {
  loadLibraries();
  var u = user || ""; // Safety
  var salt = "6q93-@u9";
  return CryptoJS.SHA256(u + salt).toString(CryptoJS.enc.Hex);
}

function generateRequestId(user) {
  var u = user || ""; // Safety
  var millis = new Date().getTime().toString();
  var rand = Math.floor(Math.random() * 100).toString();
  var crcVal = crc16(u).toString(16);
  
  return millis + rand + crcVal;
}

function crc16(s) {
  if (!s) return 0; // Safety return
  // CRC-16 (Polygon 0x8005) implementation
  var crc = 0x0000;
  var j, i;
  for (i = 0; i < s.length; i++) {
      var c = s.charCodeAt(i);
      if (c > 255) {
          // throw new RangeError(); // Ignore error for stability
          c = 0x3F; // Use '?'
      }
      j = (c ^ (crc >> 8)) & 0xFF;
      crc = crcTable[j] ^ (crc << 8);
  }
  return ((crc ^ 0) & 0xFFFF);
}

// Precomputed CRC16 Table (Poly 0x8005)
var crcTable = [
    0x0000, 0xC0C1, 0xC181, 0x0140, 0xC301, 0x03C0, 0x0280, 0xC241,
    0xC601, 0x06C0, 0x0780, 0xC741, 0x0500, 0xC5C1, 0xC481, 0x0440,
    0xCC01, 0x0CC0, 0x0D80, 0xCD41, 0x0F00, 0xCFC1, 0xCE81, 0x0E40,
    0x0A00, 0xCAC1, 0xCB81, 0x0B40, 0xC901, 0x09C0, 0x0880, 0xC841,
    0xD801, 0x18C0, 0x1980, 0xD941, 0x1B00, 0xDBC1, 0xDA81, 0x1A40,
    0x1E00, 0xDEC1, 0xDF81, 0x1F40, 0xDD01, 0x1DC0, 0x1C80, 0xDC41,
    0x1400, 0xD4C1, 0xD581, 0x1540, 0xD701, 0x17C0, 0x1680, 0xD641,
    0xD201, 0x12C0, 0x1380, 0xD341, 0x1100, 0xD1C1, 0xD081, 0x1040,
    0xF001, 0x30C0, 0x3180, 0xF141, 0x3300, 0xF3C1, 0xF281, 0x3240,
    0x3600, 0xF6C1, 0xF781, 0x3740, 0xF501, 0x35C0, 0x3480, 0xF441,
    0x3C00, 0xFCC1, 0xFD81, 0x3D40, 0xFF01, 0x3FC0, 0x3E80, 0xFE41,
    0xFA01, 0x3AC0, 0x3B80, 0xFB41, 0x3900, 0xF9C1, 0xF881, 0x3840,
    0x2800, 0xE8C1, 0xE981, 0x2940, 0xEB01, 0x2BC0, 0x2A80, 0xEA41,
    0xEE01, 0x2EC0, 0x2F81, 0xEF40, 0x2D00, 0xEDC1, 0xEC81, 0x2C40,
    0xE401, 0x24C0, 0x2580, 0xE541, 0x2700, 0xE7C1, 0xE681, 0x2640,
    0x2200, 0xE2C1, 0xE381, 0x2340, 0xE101, 0x21C0, 0x2080, 0xE041,
    0xA001, 0x60C0, 0x6180, 0xA141, 0x6300, 0xA3C1, 0xA281, 0x6240,
    0x6600, 0xA6C1, 0xA781, 0x6740, 0xA501, 0x65C0, 0x6480, 0xA441,
    0x6C00, 0xACC1, 0xAD81, 0x6D40, 0xAF01, 0x6FC0, 0x6E80, 0xAE41,
    0xAA01, 0x6AC0, 0x6B80, 0xAB40, 0x6900, 0xA9C1, 0xA881, 0x6840,
    0x7800, 0xB8C1, 0xB981, 0x7940, 0xBB01, 0x7BC0, 0x7A80, 0xBA41,
    0xBE01, 0x7EC0, 0x7F81, 0xBF40, 0x7D00, 0xBDC1, 0xBC81, 0x7C40,
    0xB401, 0x74C0, 0x7580, 0xB541, 0x7700, 0xB7C1, 0xB681, 0x7640,
    0x7200, 0xB2C1, 0xB381, 0x7340, 0xB101, 0x71C0, 0x7080, 0xB041,
    0x5000, 0x90C1, 0x9181, 0x5140, 0x9301, 0x53C0, 0x5280, 0x9241,
    0x9601, 0x56C0, 0x5780, 0x9741, 0x5500, 0x95C1, 0x9481, 0x5440,
    0x9C01, 0x5CC0, 0x5D80, 0x9D41, 0x5F00, 0x9FC1, 0x9E81, 0x5E40,
    0x5A00, 0x9AC1, 0x9B81, 0x5B40, 0x9901, 0x59C0, 0x5880, 0x9841,
    0x8801, 0x48C0, 0x4980, 0x8941, 0x4B00, 0x8BC1, 0x8A81, 0x4A40,
    0x4E00, 0x8EC1, 0x8F81, 0x4F40, 0x8D01, 0x4DC0, 0x4C80, 0x8C41,
    0x4400, 0x84C1, 0x8581, 0x4540, 0x8701, 0x47C0, 0x4680, 0x8641,
    0x8201, 0x42C0, 0x4380, 0x8341, 0x4100, 0x81C1, 0x8081, 0x4040
];

function generateGuid() {
  // Simple GUID
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

function getBrowserId() {
  // FingerprintJS visitorId từ trình duyệt đã xác thực VCB
  // Lấy từ: https://netrotion.github.io/VCB-BrowserID/
  // Hoặc lưu trong Script Properties: VCB_BROWSER_ID
  var browserId = PropertiesService.getScriptProperties().getProperty('VCB_BROWSER_ID');
  return browserId || "YOUR_BROWSER_ID";
}
