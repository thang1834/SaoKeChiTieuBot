/**
 * Lib.gs
 * Handles loading of external cryptographic libraries.
 */

var window = this; // JSEncrypt often needs 'window' or 'navigator'
var navigator = { userAgent: 'GoogleAppsScript' }; // Mock navigator

var CryptoJS;
var JSEncrypt;

/**
 * Loads the necessary crypto libraries into the global scope (or mimicked global).
 * Call this at the start of any function needing encryption.
 */
function loadLibraries() {
  // Check if already loaded to avoid multiple fetches per execution
  if (typeof CryptoJS !== 'undefined' && typeof JSEncrypt !== 'undefined') {
    return;
  }

  // 1. Load CryptoJS (AES)
  if (typeof CryptoJS === 'undefined') {
    const aesUrl = 'https://cdnjs.cloudflare.com/ajax/libs/crypto-js/4.1.1/crypto-js.min.js';
    const aesCode = UrlFetchApp.fetch(aesUrl).getContentText();
    eval(aesCode);
  }

  // 2. Load JSEncrypt (RSA)
  if (typeof JSEncrypt === 'undefined') {
    const rsaUrl = 'https://cdnjs.cloudflare.com/ajax/libs/jsencrypt/3.3.2/jsencrypt.min.js';
    const rsaCode = UrlFetchApp.fetch(rsaUrl).getContentText();
    eval(rsaCode);
  }
}
