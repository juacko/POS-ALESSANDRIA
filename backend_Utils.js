/**
 * Shared Utility Functions
 * Common functions used across the application
 */

/**
 * Converts sheet data to array of objects
 * @param {string} sheetName - Name of the sheet
 * @returns {Array<Object>} Array of objects with column headers as keys
 */
function getSheetData(sheetName) {
  var ss = getSpreadsheet();
  var sheet = ss.getSheetByName(sheetName);
  
  if (!sheet) {
    throw new Error('Sheet "' + sheetName + '" not found');
  }
  
  var data = sheet.getDataRange().getValues();
  if (data.length === 0) return [];
  
  var headers = data[0];
  var rows = [];
  
  for (var i = 1; i < data.length; i++) {
    var row = {};
    for (var j = 0; j < headers.length; j++) {
      row[headers[j]] = data[i][j];
    }
    rows.push(row);
  }
  
  return rows;
}

/**
 * Converts object to sheet row based on headers
 * @param {Array<string>} headers - Array of column headers
 * @param {Object} obj - Object to convert
 * @returns {Array} Array of values in header order
 */
function objectToSheetRow(headers, obj) {
  var row = [];
  for (var i = 0; i < headers.length; i++) {
    var value = obj[headers[i]];
    row.push(value !== undefined ? value : '');
  }
  return row;
}

/**
 * Logs info message with timestamp
 * @param {string} message - Message to log
 */
function logInfo(message) {
  Logger.log('[INFO] ' + new Date().toISOString() + ' - ' + message);
}

/**
 * Logs error message with timestamp
 * @param {string} message - Error message
 * @param {Error} error - Error object
 */
function logError(message, error) {
  Logger.log('[ERROR] ' + new Date().toISOString() + ' - ' + message + ': ' + error.toString());
}

/**
 * Include HTML files for modular structure
 * @param {string} filename - Name of the file to include
 * @returns {string} Content of the file
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}
