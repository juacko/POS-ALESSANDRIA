/**
 * Table Model
 * Handles all table-related data operations
 */

/**
 * Gets all tables
 * @returns {Array<Object>} Array of table objects
 */
function getTables() {
  try {
    return getSheetData(CONFIG.SHEETS.TABLES);
  } catch (e) {
    logError('getTables', e);
    throw e;
  }
}

/**
 * Updates the status of a table
 * @param {string} tableId - ID of the table
 * @param {string} status - New status ('Disponible' or 'Ocupada')
 */
function updateTableStatus(tableId, status) {
  try {
    var ss = getSpreadsheet();
    var sheet = ss.getSheetByName(CONFIG.SHEETS.TABLES);
    
    if (!sheet) {
      throw new Error('Tables sheet not found');
    }
    
    var data = sheet.getDataRange().getValues();
    var headers = data[0];
    var tableIdColIndex = headers.indexOf('table_id');
    var statusColIndex = headers.indexOf('status');
    
    if (tableIdColIndex === -1 || statusColIndex === -1) {
      throw new Error('Required columns not found in Tables sheet');
    }
    
    for (var i = 1; i < data.length; i++) {
      if (data[i][tableIdColIndex] == tableId) {
        sheet.getRange(i + 1, statusColIndex + 1).setValue(status);
        break;
      }
    }
    
    SpreadsheetApp.flush();
    logInfo('Updated table ' + tableId + ' status to: ' + status);
  } catch (e) {
    logError('updateTableStatus', e);
    throw e;
  }
}
