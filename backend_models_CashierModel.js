/**
 * Cashier Model
 * Handles all cashier session-related data operations
 */

/**
 * Gets the active cashier session
 * @returns {Object|null} Active session or null
 */
function getActiveCashierSession() {
  try {
    var sessions = getSheetData(CONFIG.SHEETS.CASHIER_SESSIONS);
    
    for (var i = 0; i < sessions.length; i++) {
      if (sessions[i].status === CONFIG.CASHIER_STATUS.OPEN) {
        return sessions[i];
      }
    }
    
    return null;
  } catch (e) {
    logError('getActiveCashierSession', e);
    throw e;
  }
}

/**
 * Creates a new cashier session
 * @param {number} initialAmount - Initial cash amount
 * @param {string} userId - ID of user opening session
 * @param {string} userName - Name of user opening session
 * @returns {Object} The new session object
 */
function createCashierSession(initialAmount, userId, userName) {
  try {
    var ss = getSpreadsheet();
    var sheet = ss.getSheetByName(CONFIG.SHEETS.CASHIER_SESSIONS);
    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    
    // Check for existing open session
    if (getActiveCashierSession()) {
      throw new Error('Ya existe una sesión de caja activa.');
    }
    
    var sessionId = Utilities.getUuid();
    var now = new Date();
    
    var newSession = {
      session_id: sessionId,
      opened_by_user_id: userId,
      opened_by_name: userName,
      open_timestamp: now.toLocaleString(),
      initial_amount: initialAmount,
      close_timestamp: '',
      expected_cash: 0,
      counted_cash: 0,
      difference: 0,
      status: CONFIG.CASHIER_STATUS.OPEN,
      notes: ''
    };
    
    var row = objectToSheetRow(headers, newSession);
    sheet.appendRow(row);
    SpreadsheetApp.flush();
    
    logInfo('Created cashier session: ' + sessionId + ' by user: ' + userName);
    return newSession;
  } catch (e) {
    logError('createCashierSession', e);
    throw e;
  }
}

/**
 * Closes the active cashier session
 * @param {number} countedCash - Counted cash amount
 * @param {number} expectedCash - Expected cash amount
 * @param {string} notes - Closing notes
 * @returns {Object} Closed session
 */
function closeCashierSession(countedCash, expectedCash, notes) {
  try {
    var ss = getSpreadsheet();
    var sheet = ss.getSheetByName(CONFIG.SHEETS.CASHIER_SESSIONS);
    var data = sheet.getDataRange().getValues();
    var headers = data[0];
    
    var sessionIdColIndex = headers.indexOf('session_id');
    var statusColIndex = headers.indexOf('status');
    
    for (var i = 1; i < data.length; i++) {
      if (data[i][statusColIndex] === CONFIG.CASHIER_STATUS.OPEN) {
        var difference = countedCash - expectedCash;
        
        sheet.getRange(i + 1, headers.indexOf('close_timestamp') + 1).setValue(new Date().toLocaleString());
        sheet.getRange(i + 1, headers.indexOf('expected_cash') + 1).setValue(expectedCash);
        sheet.getRange(i + 1, headers.indexOf('counted_cash') + 1).setValue(countedCash);
        sheet.getRange(i + 1, headers.indexOf('difference') + 1).setValue(difference);
        sheet.getRange(i + 1, headers.indexOf('status') + 1).setValue(CONFIG.CASHIER_STATUS.CLOSED);
        sheet.getRange(i + 1, headers.indexOf('notes') + 1).setValue(notes);
        
        SpreadsheetApp.flush();
        
        var closedSession = {};
        for (var j = 0; j < headers.length; j++) {
          closedSession[headers[j]] = sheet.getRange(i + 1, j + 1).getValue();
        }
        
        logInfo('Closed cashier session: ' + closedSession.session_id);
        return closedSession;
      }
    }
    
    throw new Error('No active session found to close');
  } catch (e) {
    logError('closeCashierSession', e);
    throw e;
  }
}

/**
 * Adds a cash flow entry
 * @param {Object} entry - Cash flow entry data
 */
function addCashFlowEntry(entry) {
  try {
    var ss = getSpreadsheet();
    var sheet = ss.getSheetByName(CONFIG.SHEETS.CASH_FLOW);
    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    
    entry.flow_id = 'FLOW-' + new Date().getTime();
    entry.timestamp = new Date();
    
    var row = objectToSheetRow(headers, entry);
    sheet.appendRow(row);
    SpreadsheetApp.flush();
    
    logInfo('Added cash flow entry: ' + entry.flow_id);
  } catch (e) {
    logError('addCashFlowEntry', e);
    throw e;
  }
}

/**
 * Gets cash flow entries for a session
 * @param {string} sessionId - ID of the session
 * @returns {Array<Object>} Array of cash flow entries
 */
function getCashFlowBySession(sessionId) {
  try {
    var allEntries = getSheetData(CONFIG.SHEETS.CASH_FLOW);
    var sessionEntries = [];
    
    for (var i = 0; i < allEntries.length; i++) {
      if (allEntries[i].session_id === sessionId) {
        sessionEntries.push(allEntries[i]);
      }
    }
    
    return sessionEntries;
  } catch (e) {
    logError('getCashFlowBySession', e);
    throw e;
  }
}
