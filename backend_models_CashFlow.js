/**
 * backend_models_CashFlow.gs
 * Data access for Cashier Sessions, Cash Flow and Payments.
 */

/**
 * Helper to get the CashierSessions sheet.
 */
function getCashierSessionsSheet() {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName("CashierSessions");
  if (!sheet) {
    throw new Error(
      'La hoja "CashierSessions" no fue encontrada. Asegúrate de que el nombre es correcto.',
    );
  }
  return sheet;
}

function getActiveCashierSession() {
  const sheet = getCashierSessionsSheet();
  const data = sheet.getDataRange().getValues();

  if (data.length < 2) {
    return null;
  }

  const headers = data[0];
  const statusColIndex = headers.indexOf("status");

  if (statusColIndex === -1) {
    throw new Error(
      'La columna "status" no se encontró en la hoja CashierSessions.',
    );
  }

  // Iterate backwards to find the MOST RECENT open session
  for (let i = data.length - 1; i >= 1; i--) {
    const row = data[i];
    const status = row[statusColIndex];
    if (typeof status === "string" && status.trim().toUpperCase() === "OPEN") {
      const sessionObj = _sheetRowToObject(headers, row);

      // FIX: Convert Date objects to strings before returning to avoid serialization errors.
      if (sessionObj.open_timestamp instanceof Date) {
        sessionObj.open_timestamp = sessionObj.open_timestamp.toLocaleString();
      }
      if (sessionObj.close_timestamp instanceof Date) {
        sessionObj.close_timestamp =
          sessionObj.close_timestamp.toLocaleString();
      }

      return sessionObj;
    }
  }

  return null; // No active session found
}

/**
 * Creates and opens a new cashier session.
 */
function createCashierSession(initialAmount) {
  const sheet = getCashierSessionsSheet();

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

  // Ensure no other session is open
  if (getActiveCashierSession()) {
    throw new Error(
      "Ya existe una sesión de caja activa. Cierre la sesión actual antes de abrir una nueva.",
    );
  }

  const sessionId = Utilities.getUuid();
  const now = new Date();

  const newSession = {
    session_id: sessionId,
    open_timestamp: now.toLocaleString(),
    initial_amount: initialAmount,
    close_timestamp: "",
    expected_cash: 0,
    counted_cash: 0,
    difference: 0,
    status: "OPEN",
    notes: "",
  };

  const newRow = _objectToSheetRow(headers, newSession);
  sheet.appendRow(newRow);
  SpreadsheetApp.flush();
  return newSession;
}

/**
 * Updates an existing cashier session (typically for closing it).
 */
function updateCashierSession(sessionData) {
  const sheet = getCashierSessionsSheet();
  const data = sheet.getDataRange().getValues();
  if (data.length <= 1) {
    throw new Error("No se encontraron sesiones de caja para actualizar.");
  }

  const headers = data[0];
  const sessionIdColIndex = headers.indexOf("session_id");

  if (sessionIdColIndex === -1) {
    throw new Error(
      'Columna "session_id" no encontrada en la hoja CashierSessions.',
    );
  }

  let rowIndex = -1;
  for (let i = 1; i < data.length; i++) {
    if (data[i][sessionIdColIndex] === sessionData.session_id) {
      rowIndex = i;
      break;
    }
  }

  if (rowIndex === -1) {
    throw new Error(
      "Sesión de caja con ID " + sessionData.session_id + " no encontrada.",
    );
  }

  let currentRowObj = _sheetRowToObject(headers, data[rowIndex]);
  const updatedRowObj = { ...currentRowObj, ...sessionData };
  const updatedRowData = _objectToSheetRow(headers, updatedRowObj);

  sheet
    .getRange(rowIndex + 1, 1, 1, sheet.getLastColumn())
    .setValues([updatedRowData]);
  SpreadsheetApp.flush();

  // FIX: Convert Date objects to strings before returning to avoid serialization errors.
  if (updatedRowObj.open_timestamp instanceof Date) {
    updatedRowObj.open_timestamp = updatedRowObj.open_timestamp.toLocaleString();
  }
  if (updatedRowObj.close_timestamp instanceof Date) {
    updatedRowObj.close_timestamp = updatedRowObj.close_timestamp.toLocaleString();
  }

  return updatedRowObj;
}

/**
 * Retrieves all payments for a given session ID.
 */
function getPaymentsBySessionId(sessionId) {
  const allPayments = getSheetData("Payments");
  return allPayments.filter((p) => p.session_id === sessionId);
}

/**
 * Creates a new cash flow transaction (income or expense).
 */
function createCashFlowTransaction(transactionData) {
  const sheet = getSpreadsheet().getSheetByName("CashFlow");

  const newId = "CF-" + new Date().getTime();
  transactionData.transaction_id = newId;
  transactionData.timestamp = new Date();

  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const newRow = _objectToSheetRow(headers, transactionData);

  sheet.appendRow(newRow);
  SpreadsheetApp.flush();

  return transactionData;
}

/**
 * Retrieves all cash flow transactions for a given session ID.
 */
function getCashFlowBySessionId(sessionId) {
  const allTransactions = getSheetData("CashFlow");
  return allTransactions.filter((t) => t.session_id === sessionId);
}

/**
 * Gets all active payment methods.
 */
function getPaymentMethods() {
  const allMethods = getSheetData("PaymentMethods");
  return allMethods.filter((p) => p.active === true);
}

/**
 * Saves multiple payment records for an order.
 */
function createPayments(payments) {
  const sheet = getSpreadsheet().getSheetByName("Payments");
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

  const rowsToAdd = payments.map((payment) => {
    payment.payment_id =
      "PAY-" + new Date().getTime() + Math.random().toString(36).substr(2, 5);
    payment.timestamp = new Date();
    return _objectToSheetRow(headers, payment);
  });

  if (rowsToAdd.length > 0) {
    sheet
      .getRange(sheet.getLastRow() + 1, 1, rowsToAdd.length, headers.length)
      .setValues(rowsToAdd);
    SpreadsheetApp.flush();
  }
}
