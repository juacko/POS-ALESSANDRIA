/**
 * backend_models_Orders.gs
 * Data access for Orders and Order Items.
 */

/**
 * Creates a new order header.
 */
function createOrder(tableId) {
  const ss = getSpreadsheet();
  const sheet = ss.getSheetByName("Orders");
  const orderId = "ORD-" + new Date().getTime();

  sheet.appendRow([orderId, new Date(), tableId, "Open", 0, ""]);

  // Update table status
  updateTableStatus(tableId, "Ocupada");

  return orderId;
}

/**
 * Deletes an order header from the Orders sheet.
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

/**
 * Finds the 'Open' order for a given table ID.
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
 */
function getOrderItemsByOrderId(orderId) {
  const allItems = getSheetData("OrderItems");
  return allItems.filter((item) => item.order_id === orderId);
}

/**
 * Updates an existing order in the 'Orders' sheet.
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
 * Overwrites the items for a given order.
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

/**
 * Obtiene todas las órdenes activas (Open) con sus items y totales calculados.
 */
function getActiveOrders() {
  const orders = getSheetData("Orders");
  const activeOrders = orders.filter(o => o.status === "Open");

  // Para cada orden, obtener sus items y calcular total
  return activeOrders.map(order => {
    const items = getOrderItemsByOrderId(order.order_id);
    const total = items.reduce((sum, item) =>
      sum + (Number(item.final_price) * Number(item.quantity)), 0);

    // Convert Date to string to avoid serialization issues
    let timestamp = order.timestamp;
    if (timestamp instanceof Date) {
      timestamp = timestamp.toISOString();
    }

    return {
      order_id: order.order_id,
      timestamp: timestamp,
      table_number: order.table_number,
      status: order.status,
      items: items,
      total: total,
      item_count: items.length
    };
  });
}

/**
 * Obtiene el historial de órdenes pagadas con sus pagos asociados.
 */
function getPaidOrders() {
  const orders = getSheetData("Orders");
  const paidOrders = orders.filter(o => o.status === "Paid");

  return paidOrders.map(order => {
    const payments = getSheetData("Payments")
      .filter(p => p.order_id === order.order_id);

    // Convert Date to string to avoid serialization issues
    let timestamp = order.timestamp;
    if (timestamp instanceof Date) {
      timestamp = timestamp.toISOString();
    }

    return {
      order_id: order.order_id,
      timestamp: timestamp,
      table_number: order.table_number,
      status: order.status,
      total_amount: Number(order.total_amount || 0),
      payments: payments.map(p => {
        let paymentTimestamp = p.timestamp;
        if (paymentTimestamp instanceof Date) {
          paymentTimestamp = paymentTimestamp.toISOString();
        }
        return {
          payment_id: p.payment_id,
          payment_method: p.payment_method,
          amount: Number(p.amount || 0),
          timestamp: paymentTimestamp
        };
      })
    };
  }).reverse(); // Más recientes primero
}
