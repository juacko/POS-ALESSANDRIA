/**
 * Cashier Controller
 * Handles cashier session and cash flow API endpoints
 */

/**
 * Starts a new cashier session
 * @param {number} initialAmount - Initial cash amount
 * @param {string} userId - User ID
 * @param {string} userName - User name
 * @returns {Object} Response with session data
 */
function startNewCashierSession(initialAmount, userId, userName) {
  try {
    if (typeof initialAmount !== 'number' || initialAmount < 0) {
      throw new Error('El monto inicial debe ser un número válido.');
    }
    
    var newSession = createCashierSession(initialAmount, userId, userName);
    return { success: true, session: newSession };
  } catch (e) {
    logError('startNewCashierSession', e);
    return { success: false, error: e.toString() };
  }
}

/**
 * Closes the current cashier session
 * @param {number} countedCash - Counted cash amount
 * @param {string} notes - Closing notes
 * @param {string} userId - User ID
 * @param {string} userRole - User role
 * @returns {Object} Response with closed session data
 */
function closeCurrentCashierSession(countedCash, notes, userId, userRole) {
  try {
    var activeSession = getActiveCashierSession();
    if (!activeSession) {
      throw new Error('No hay una sesión de caja activa para cerrar.');
    }
    
    // Check for open tables
    var tables = getTables();
    var openTables = [];
    for (var i = 0; i < tables.length; i++) {
      if (tables[i].status === CONFIG.TABLE_STATUS.OCUPADA) {
        openTables.push(tables[i].name);
      }
    }
    
    if (openTables.length > 0) {
      throw new Error('No puedes cerrar la caja con mesas ocupadas: ' + openTables.join(', '));
    }
    
    var expectedCash = calculateExpectedCash(activeSession.session_id);
    var closedSession = closeCashierSession(countedCash, expectedCash, notes);
    
    return {
      success: true,
      session: closedSession,
      summary: {
        expectedCash: expectedCash,
        countedCash: countedCash,
        difference: countedCash - expectedCash
      }
    };
  } catch (e) {
    logError('closeCurrentCashierSession', e);
    return { success: false, error: e.toString() };
  }
}

/**
 * Calculates expected cash for a session
 * @param {string} sessionId - Session ID
 * @returns {number} Expected cash amount
 */
function calculateExpectedCash(sessionId) {
  try {
    var ss = getSpreadsheet();
    var session = getActiveCashierSession();
    
    if (!session || session.session_id !== sessionId) {
      throw new Error('Sesión no encontrada o no está activa');
    }
    
    var initialAmount = Number(session.initial_amount) || 0;
    
    // Get cash payments
    var paymentsSheet = ss.getSheetByName(CONFIG.SHEETS.PAYMENTS);
    var paymentsData = paymentsSheet.getDataRange().getValues();
    var paymentsHeaders = paymentsData[0];
    
    var sessionIdCol = paymentsHeaders.indexOf('session_id');
    var methodCol = paymentsHeaders.indexOf('payment_method');
    var amountCol = paymentsHeaders.indexOf('amount');
    
    var cashPayments = 0;
    for (var i = 1; i < paymentsData.length; i++) {
      if (paymentsData[i][sessionIdCol] === sessionId && 
          paymentsData[i][methodCol] === 'Efectivo') {
        cashPayments += Number(paymentsData[i][amountCol]) || 0;
      }
    }
    
    // Get cash flow
    var flowSheet = ss.getSheetByName(CONFIG.SHEETS.CASH_FLOW);
    var flowData = flowSheet.getDataRange().getValues();
    var flowHeaders = flowData[0];
    
    var flowSessionCol = flowHeaders.indexOf('session_id');
    var flowTypeCol = flowHeaders.indexOf('flow_type');
    var flowAmountCol = flowHeaders.indexOf('amount');
    
    var cashFlowTotal = 0;
    for (var j = 1; j < flowData.length; j++) {
      if (flowData[j][flowSessionCol] === sessionId) {
        var amount = Number(flowData[j][flowAmountCol]) || 0;
        if (flowData[j][flowTypeCol] === 'Ingreso') {
          cashFlowTotal += amount;
        } else if (flowData[j][flowTypeCol] === 'Gasto') {
          cashFlowTotal -= amount;
        }
      }
    }
    
    return initialAmount + cashPayments + cashFlowTotal;
  } catch (e) {
    logError('calculateExpectedCash', e);
    throw e;
  }
}

/**
 * Gets cash flow data for a session
 * @param {string} sessionId - Session ID
 * @returns {Object} Response with cash flow entries
 */
function getCashFlowData(sessionId) {
  try {
    var entries = getCashFlowBySession(sessionId);
    return {
      success: true,
      cashFlow: entries
    };
  } catch (e) {
    logError('getCashFlowData', e);
    return { success: false, error: e.toString() };
  }
}

/**
 * Adds a cash flow entry
 * @param {Object} entry - Cash flow entry data
 * @returns {Object} Response with success status
 */
function addCashFlowEntry(entry) {
  try {
    var activeSession = getActiveCashierSession();
    if (!activeSession) {
      throw new Error('No hay una sesión de caja activa.');
    }
    
    entry.session_id = activeSession.session_id;
    addCashFlowEntry(entry);
    
    return { success: true };
  } catch (e) {
    logError('addCashFlowEntry', e);
    return { success: false, error: e.toString() };
  }
}
