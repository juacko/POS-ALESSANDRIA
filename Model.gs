/**
 * Model.gs
 * Handles direct interactions with the Google Sheet Database.
 */

// CONFIGURATION
const SPREADSHEET_ID = "1lSkILVWEwEb3yAOptnMFqlm7dBmtsDyw5yGG04_C-Ns";

function getSpreadsheet() {
  if (SPREADSHEET_ID === "YOUR_SPREADSHEET_ID_HERE") {
    // This is a fatal configuration error. We cannot continue.
    // Throw a clear error that can be caught and displayed on the frontend.
    throw new Error(
      'CONFIGURACIÓN REQUERIDA: Por favor, edita el archivo Model.gs y reemplaza "YOUR_SPREADSHEET_ID_HERE" con el ID de tu Google Sheet.',
    );
  }
  return SpreadsheetApp.openById(SPREADSHEET_ID);
}

/**
 * Reads all data from a sheet and returns it as an array of objects.
 */
function getSheetData(sheetName) {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName(sheetName);
  if (!sheet) return [];

  const data = sheet.getDataRange().getValues();
  // If sheet is empty or only has a header, return an empty array to avoid errors.
  if (data.length < 2) {
    return [];
  }

  const headers = data.shift(); // Remove header row

  return data.map((row) => {
    let obj = {};
    headers.forEach((header, index) => {
      // Ensure row has a value at this index to prevent errors
      obj[header] = index < row.length ? row[index] : undefined;
    });
    return obj;
  });
}

/**
 * Gets all active products.
 */
function getProducts() {
  const allProducts = getSheetData("Products");
  return allProducts.filter((p) => p.active === true);
}

/**
 * Gets all modifiers.
 */
function getModifiers() {
  return getSheetData("Modifiers");
}

/**
 * Gets all tables.
 */
function getTables() {
  return getSheetData("Tables");
}

/**
 * Creates a new order header.
 */
function createOrder(tableId) {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName("Orders");
  const orderId = "ORD-" + new Date().getTime();

  sheet.appendRow([orderId, new Date(), tableId, "Open", 0, ""]);

  // Update table status
  updateTableStatus(tableId, "Occupied");

  return orderId;
}

/**
 * Updates table status and flushes changes to the sheet.
 */
function updateTableStatus(tableId, status) {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName("Tables");
  const data = sheet.getDataRange().getValues();
  const headers = data[0];

  const tableIdColIndex = headers.indexOf("table_id");
  const statusColIndex = headers.indexOf("status");

  if (tableIdColIndex === -1 || statusColIndex === -1) {
    throw new Error('Column "table_id" or "status" not found in Tables sheet.');
  }

  for (let i = 1; i < data.length; i++) {
    if (data[i][tableIdColIndex] == tableId) {
      sheet.getRange(i + 1, statusColIndex + 1).setValue(status);
      break;
    }
  }
  // Force the change to be saved immediately to prevent caching issues.
  SpreadsheetApp.flush();
}

/**
 * Deletes all items for a given orderId from the OrderItems sheet.
 */
function deleteOrderItemsByOrderId(orderId) {
  const sheet = getSpreadsheet().getSheetByName('OrderItems');
  const data = sheet.getDataRange().getValues();
  const orderIdColIndex = data[0].indexOf('order_id');

  if (orderIdColIndex === -1) {
    throw new Error('Column "order_id" not found in OrderItems sheet.');
  }

  // Iterate backwards when deleting rows to avoid index shifting issues
  for (let i = data.length - 1; i >= 1; i--) {
    if (data[i][orderIdColIndex] === orderId) {
      sheet.deleteRow(i + 1);
    }
  }
  SpreadsheetApp.flush();
}

/**
 * Overwrites the items for a given order. It first deletes all existing
 * items and then adds the new ones.
 * @param {string} orderId The ID of the order.
 * @param {Array<Object>} items The new array of item objects for the order.
 */
function overwriteOrderItems(orderId, items) {
  // 1. Delete all existing items for this order
  deleteOrderItemsByOrderId(orderId);

  // 2. Add the new items
  const sheet = getSpreadsheet().getSheetByName('OrderItems');
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];

  if (items.length === 0) return; // Nothing to add

  const rowsToAdd = items.map(item => {
    // FIX: Explicitly add the orderId to each item before saving.
    item.order_id = orderId;

    // Ensure a unique item_id if it's missing
    if (!item.item_id) {
      item.item_id = 'ITEM-' + new Date().getTime() + Math.random().toString(36).substr(2, 5);
    }
    return _objectToSheetRow(headers, item);
  });
  
  sheet.getRange(sheet.getLastRow() + 1, 1, rowsToAdd.length, headers.length).setValues(rowsToAdd);
  SpreadsheetApp.flush();
}

// --- INICIO CODIGO FLUJO DE CAJA ---

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

/**
 * Helper to convert a sheet row to an object using headers.
 * @param {Array<string>} headers The header row.
 * @param {Array<any>} rowData The data row.
 * @returns {Object} An object where keys are headers and values are row data.
 */
function _sheetRowToObject(headers, rowData) {
  const obj = {};
  headers.forEach((header, i) => {
    obj[header] = rowData[i];
  });
  return obj;
}

/**
 * Helper to convert an object to a sheet row based on headers.
 * @param {Array<string>} headers The header row.
 * @param {Object} obj The object to convert.
 * @returns {Array<any>} A data row array.
 */
function _objectToSheetRow(headers, obj) {
  const rowData = [];
  headers.forEach((header) => {
    // Ensure all header keys are present in the object, or default to empty string
    rowData.push(obj.hasOwnProperty(header) ? obj[header] : "");
  });
  return rowData;
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
 * @param {string} sessionId The ID of the session.
 * @returns {Array<Object>} An array of payment objects.
 */
function getPaymentsBySessionId(sessionId) {
  const allPayments = getSheetData("Payments");
  return allPayments.filter((p) => p.session_id === sessionId);
}

/**
 * Creates a new cash flow transaction (income or expense).
 * @param {Object} transactionData The transaction details.
 * @returns {Object} The created transaction object.
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
 * @param {string} sessionId The ID of the session.
 * @returns {Array<Object>} An array of transaction objects.
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
 * @param {Array<Object>} payments An array of payment objects to be saved.
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

// --- FIN CODIGO FLUJO DE CAJA ---

// --- INICIO CODIGO GESTION DE ORDENES ABIERTAS ---

/**
 * Finds the 'Open' order for a given table ID.
 * @param {string} tableId The ID of the table.
 * @returns {Object|null} The order object if an open order is found, otherwise null.
 */
function getOpenOrderByTable(tableId) {
  const orders = getSheetData("Orders");
  // Find the last open order for that table, in case of multiple.
  const openOrder = orders
    .reverse()
    .find((order) => order.table_number === tableId && order.status === "Open");
  return openOrder || null;
}

/**
 * Retrieves all items associated with a specific order ID.
 * @param {string} orderId The ID of the order.
 * @returns {Array<Object>} An array of order item objects.
 */
function getOrderItemsByOrderId(orderId) {
  const allItems = getSheetData("OrderItems");
  return allItems.filter((item) => item.order_id === orderId);
}

/**
 * Updates an existing order in the 'Orders' sheet.
 * @param {string} orderId The ID of the order to update.
 * @param {Object} dataToUpdate An object with the key-value pairs to update.
 * @returns {Object} The updated order object.
 */
function updateOrder(orderId, dataToUpdate) {
  const sheet = getSpreadsheet().getSheetByName("Orders");
  if (!sheet) throw new Error('Sheet "Orders" not found.');

  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const orderIdColIndex = headers.indexOf("order_id");
  if (orderIdColIndex === -1)
    throw new Error('Column "order_id" not found in Orders sheet.');

  let rowIndex = -1;
  for (let i = 1; i < data.length; i++) {
    if (data[i][orderIdColIndex] === orderId) {
      rowIndex = i;
      break;
    }
  }

  if (rowIndex === -1)
    throw new Error("Order with ID " + orderId + " not found.");

  // Update specified columns
  headers.forEach((header, index) => {
    if (dataToUpdate.hasOwnProperty(header)) {
      sheet.getRange(rowIndex + 1, index + 1).setValue(dataToUpdate[header]);
    }
  });

  SpreadsheetApp.flush(); // Force update

  const updatedRow = sheet
    .getRange(rowIndex + 1, 1, 1, sheet.getLastColumn())
    .getValues()[0];
  return _sheetRowToObject(headers, updatedRow);
}

/**
 * Deletes an order header from the Orders sheet.
 * @param {string} orderId The ID of the order to delete.
 */
function deleteOrder(orderId) {
  const sheet = getSpreadsheet().getSheetByName('Orders');
  const data = sheet.getDataRange().getValues();
  const orderIdColIndex = data[0].indexOf('order_id');

  if (orderIdColIndex === -1) {
    throw new Error('Column "order_id" not found in Orders sheet.');
  }

  for (let i = data.length - 1; i >= 1; i--) {
    if (data[i][orderIdColIndex] === orderId) {
      sheet.deleteRow(i + 1);
      SpreadsheetApp.flush();
      return; // Assume only one order will match
    }
  }
}

// --- FIN CODIGO GESTION DE ORDENES ABIERTAS ---
