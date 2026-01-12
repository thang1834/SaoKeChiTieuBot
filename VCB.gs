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
  
  var user = CONFIG.USER;
  var pwd = CONFIG.PASS;
  
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
    if (json.sessionId) return json.sessionId;
    
    // Decrypt Response using CLIENT PRIVATE KEY
    if (json.d && json.k) {
       var decrypted = decryptResponseWithClientKey(json, clientKeys.privateKeyPem);
       Logger.log("Decrypted Login: " + JSON.stringify(decrypted));
       
       if (decrypted.sessionId) return decrypted.sessionId;
       if (decrypted.code == "00" && decrypted.sessionId) return decrypted.sessionId;
       
       if (decrypted.des) Logger.log("Login Msg: " + decrypted.des);
    }
    
  } catch (e) {
    Logger.log("Login Parse Error: " + e);
  }
  return null;
}

function getVcbHistory(sessionId) {
  loadLibraries();
  
  var user = CONFIG.USER;
  var account = CONFIG.STK;
  var today = Utilities.formatDate(new Date(), "GMT+7", "dd/MM/yyyy");
  
  // Generate CLIENT RSA Keypair for this request too
  var clientKeys = generateClientRsaKeypair();
  
  var rawPayload = {
    "accountNo": account,
    "fromDate": today,
    "toDate": today,
    "pageIndex": 0,
    "lengthInPage": 20,
    "mid": 14,
    "user": user,
    "sessionId": sessionId,
    "browserId": getBrowserId(),
    "clientPubKey": clientKeys.publicKeyBase64
  };
  
  var state = encryptRequest(rawPayload);
  
  var headers = getCommonHeaders();
  headers['X-Lim-Id'] = hashLimId(user);
  headers['Authorization'] = "Bearer " + getStaticToken();
  headers['X-Request-Id'] = generateRequestId();
  headers['SessionId'] = sessionId;
  
  var options = {
    method: 'post',
    headers: headers,
    payload: JSON.stringify(state.payload),
    muteHttpExceptions: true
  };
  
  var res = UrlFetchApp.fetch(VCB_CONFIG.BASE_URL + "/bank-service/v1/transaction-history", options);
  var txt = res.getContentText();
  
  try {
     var json = JSON.parse(txt);
     if (json.transactions) return json.transactions;
     
     if (json.d && json.k) {
       var decrypted = decryptResponseWithClientKey(json, clientKeys.privateKeyPem);
       if (decrypted.transactions) return decrypted.transactions;
     }
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

function hashLimId(user) {
  // SHA256 hash of user
  loadLibraries();
  return CryptoJS.SHA256(user).toString(CryptoJS.enc.Hex);
}

function generateRequestId() {
  return String(new Date().getTime()) + String(Math.floor(Math.random() * 999));
}

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
  // Thay "YOUR_BROWSER_ID" bằng visitorId của bạn
  return "YOUR_BROWSER_ID";
}
