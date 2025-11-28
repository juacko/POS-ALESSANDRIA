/**
 * Order Model
 * Handles all order-related data operations
 */

/**
 * Creates a new order
 * @param {string} tableId - ID of the table
 * @returns {string} The new order ID
 */
function createOrder(tableId) {
  try {
    var ss = getSpreadsheet();
    var sheet = ss.getSheetByName(CONFIG.SHEETS.ORDERS);
    var orderId = 'ORD-' + new Date().getTime();
    
    sheet.appendRow([orderId, new Date(), tableId, CONFIG.ORDER_STATUS.OPEN, 0, '']);
    
    // Update table status to occupied
    updateTableStatus(tableId, CONFIG.TABLE_STATUS.OCUPADA);
    
    logInfo('Created order: ' + orderId + ' for table: ' + tableId);
    return orderId;
  } catch (e) {
    logError('createOrder', e);
    throw e;
  }
}

/**
 * Gets an open order by table ID
 * @param {string} tableId - ID of the table
 * @returns {Object|null} Order object or null
 */
function getOpenOrderByTable(tableId) {
  try {
    var orders = getSheetData(CONFIG.SHEETS.ORDERS);
    
    for (var i = 0; i < orders.length; i++) {
      if (orders[i].table_number == tableId && orders[i].status === CONFIG.ORDER_STATUS.OPEN) {
        return orders[i];
      }
    }
    
    return null;
  } catch (e) {
    logError('getOpenOrderByTable', e);
    throw e;
  }
}

/**
 * Updates an order
 * @param {string} orderId - ID of the order
 * @param {Object} updateData - Data to update
 * @returns {Object} Updated order
 */
function updateOrder(orderId, updateData) {
  try {
    var ss = getSpreadsheet();
    var sheet = ss.getSheetByName(CONFIG.SHEETS.ORDERS);
    var data = sheet.getDataRange().getValues();
    var headers = data[0];
    
    var orderIdColIndex = headers.indexOf('order_id');
    
    for (var i = 1; i < data.length; i++) {
      if (data[i][orderIdColIndex] === orderId) {
        // Update each field
        for (var key in updateData) {
          var colIndex = headers.indexOf(key);
          if (colIndex !== -1) {
            sheet.getRange(i + 1, colIndex + 1).setValue(updateData[key]);
          }
        }
        
        SpreadsheetApp.flush();
        logInfo('Updated order: ' + orderId);
        
        // Return updated order
        var updatedRow = {};
        for (var j = 0; j < headers.length; j++) {
          updatedRow[headers[j]] = sheet.getRange(i + 1, j + 1).getValue();
        }
        return updatedRow;
      }
    }
    
    throw new Error('Order not found: ' + orderId);
  } catch (e) {
    logError('updateOrder', e);
    throw e;
  }
}

/**
 * Deletes an order
 * @param {string} orderId - ID of the order to delete
 */
function deleteOrder(orderId) {
  try {
    var ss = getSpreadsheet();
    var sheet = ss.getSheetByName(CONFIG.SHEETS.ORDERS);
    var data = sheet.getDataRange().getValues();
    var orderIdColIndex = data[0].indexOf('order_id');
    
    for (var i = data.length - 1; i >= 1; i--) {
      if (data[i][orderIdColIndex] === orderId) {
        sheet.deleteRow(i + 1);
        SpreadsheetApp.flush();
        logInfo('Deleted order: ' + orderId);
        return;
      }
    }
  } catch (e) {
    logError('deleteOrder', e);
    throw e;
  }
}

/**
 * Deletes all items for an order
 * @param {string} orderId - ID of the order
 */
function deleteOrderItemsByOrderId(orderId) {
  try {
    var ss = getSpreadsheet();
    var sheet = ss.getSheetByName(CONFIG.SHEETS.ORDER_ITEMS);
    var data = sheet.getDataRange().getValues();
    var orderIdColIndex = data[0].indexOf('order_id');
    
    for (var i = data.length - 1; i >= 1; i--) {
      if (data[i][orderIdColIndex] === orderId) {
        sheet.deleteRow(i + 1);
      }
    }
    
    SpreadsheetApp.flush();
    logInfo('Deleted items for order: ' + orderId);
  } catch (e) {
    logError('deleteOrderItemsByOrderId', e);
    throw e;
  }
}

/**
 * Gets items for an order
 * @param {string} orderId - ID of the order
 * @returns {Array<Object>} Array of order items
 */
function getOrderItems(orderId) {
  try {
    var allItems = getSheetData(CONFIG.SHEETS.ORDER_ITEMS);
    var orderItems = [];
    
    for (var i = 0; i < allItems.length; i++) {
      if (allItems[i].order_id === orderId) {
        orderItems.push(allItems[i]);
      }
    }
    
    return orderItems;
  } catch (e) {
    logError('getOrderItems', e);
    throw e;
  }
}

/**
 * Adds an item to an order
 * @param {Object} item - Item data
 */
function addOrderItem(item) {
  try {
    var ss = getSpreadsheet();
    var sheet = ss.getSheetByName(CONFIG.SHEETS.ORDER_ITEMS);
    var headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    
    var row = objectToSheetRow(headers, item);
    sheet.appendRow(row);
    SpreadsheetApp.flush();
    
    logInfo('Added item to order: ' + item.order_id);
  } catch (e) {
    logError('addOrderItem', e);
    throw e;
  }
}
