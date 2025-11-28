/**
 * Payment Model
 * Handles all payment-related data operations
 */

/**
 * Gets all payment methods
 * @returns {Array<Object>} Array of payment method objects
 */
function getPaymentMethods() {
  try {
    return getSheetData(CONFIG.SHEETS.PAYMENT_METHODS);
  } catch (e) {
    logError('getPaymentMethods', e);
    throw e;
  }
}

/**
 * Creates multiple payments
 * @param {Array<Object>} payments - Array of payment objects
 */
function createPayments(payments) {
  try {
    var ss = getSpreadsheet();
    var sheet = ss.getSheetByName(CONFIG.SHEETS.PAYMENTS);
    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    
    for (var i = 0; i < payments.length; i++) {
      var payment = payments[i];
      payment.payment_id = 'PAY-' + new Date().getTime() + '-' + i;
      payment.payment_timestamp = new Date();
      
      var row = objectToSheetRow(headers, payment);
      sheet.appendRow(row);
    }
    
    SpreadsheetApp.flush();
    logInfo('Created ' + payments.length + ' payment(s)');
  } catch (e) {
    logError('createPayments', e);
    throw e;
  }
}
