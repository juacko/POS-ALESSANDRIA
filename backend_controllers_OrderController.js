/**
 * Order Controller
 * Handles order-related API endpoints
 */

/**
 * Gets all orders data
 * @returns {Object} Response with orders and items
 */
function getOrdersData() {
  try {
    var orders = getSheetData(CONFIG.SHEETS.ORDERS);
    var orderItems = getSheetData(CONFIG.SHEETS.ORDER_ITEMS);
    
    return {
      success: true,
      orders: orders,
      orderItems: orderItems
    };
  } catch (e) {
    logError('getOrdersData', e);
    return { success: false, error: e.toString() };
  }
}

/**
 * Adds an item to an order
 * @param {Object} item - Item to add
 * @returns {Object} Response with success status
 */
function addItemToOrder(item) {
  try {
    addOrderItem(item);
    return { success: true };
  } catch (e) {
    logError('addItemToOrder', e);
    return { success: false, error: e.toString() };
  }
}

/**
 * Updates the quantity of an order item
 * @param {string} orderId - Order ID
 * @param {number} itemIndex - Index of item
 * @param {number} newQuantity - New quantity
 * @returns {Object} Response with success status
 */
function updateOrderItemQuantity(orderId, itemIndex, newQuantity) {
  try {
    var ss = getSpreadsheet();
    var sheet = ss.getSheetByName(CONFIG.SHEETS.ORDER_ITEMS);
    var data = sheet.getDataRange().getValues();
    var headers = data[0];
    
    var orderIdColIndex = headers.indexOf('order_id');
    var quantityColIndex = headers.indexOf('quantity');
    
    var currentIndex = 0;
    for (var i = 1; i < data.length; i++) {
      if (data[i][orderIdColIndex] === orderId) {
        if (currentIndex === itemIndex) {
          sheet.getRange(i + 1, quantityColIndex + 1).setValue(newQuantity);
          SpreadsheetApp.flush();
          logInfo('Updated item quantity for order: ' + orderId);
          return { success: true };
        }
        currentIndex++;
      }
    }
    
    throw new Error('Item not found');
  } catch (e) {
    logError('updateOrderItemQuantity', e);
    return { success: false, error: e.toString() };
  }
}

/**
 * Removes an item from an order
 * @param {string} orderId - Order ID
 * @param {number} itemIndex - Index of item to remove
 * @returns {Object} Response with success status
 */
function removeOrderItem(orderId, itemIndex) {
  try {
    var ss = getSpreadsheet();
    var sheet = ss.getSheetByName(CONFIG.SHEETS.ORDER_ITEMS);
    var data = sheet.getDataRange().getValues();
    var orderIdColIndex = data[0].indexOf('order_id');
    
    var currentIndex = 0;
    for (var i = data.length - 1; i >= 1; i--) {
      if (data[i][orderIdColIndex] === orderId) {
        if (currentIndex === itemIndex) {
          sheet.deleteRow(i + 1);
          SpreadsheetApp.flush();
          logInfo('Removed item from order: ' + orderId);
          return { success: true };
        }
        currentIndex++;
      }
    }
    
    throw new Error('Item not found');
  } catch (e) {
    logError('removeOrderItem', e);
    return { success: false, error: e.toString() };
  }
}

/**
 * Finalizes an order and processes payment
 * @param {string} orderId - Order ID
 * @param {Array} payments - Payment details
 * @param {number} totalAmount - Total amount
 * @returns {Object} Response with success status
 */
function finalizeOrderAndPay(orderId, payments, totalAmount) {
  try {
    var activeSession = getActiveCashierSession();
    if (!activeSession) {
      throw new Error('No hay una sesión de caja activa.');
    }
    
    var paymentsToCreate = [];
    for (var i = 0; i < payments.length; i++) {
      paymentsToCreate.push({
        order_id: orderId,
        session_id: activeSession.session_id,
        payment_method: payments[i].payment_method,
        amount: payments[i].amount
      });
    }
    
    createPayments(paymentsToCreate);
    
    var orderUpdateData = {
      status: CONFIG.ORDER_STATUS.PAID,
      total_amount: totalAmount
    };
    var updatedOrder = updateOrder(orderId, orderUpdateData);
    
    if (updatedOrder && updatedOrder.table_number) {
      updateTableStatus(updatedOrder.table_number, CONFIG.TABLE_STATUS.DISPONIBLE);
    } else {
      Logger.log('Advertencia: No se pudo actualizar el estado de la mesa para la orden ' + orderId);
    }
    
    return { success: true };
    
  } catch (e) {
    logError('finalizeOrderAndPay', e);
    return { success: false, error: e.toString() };
  }
}

/**
 * Forces a table to be freed up
 * @param {string} tableId - Table ID
 * @param {string} orderId - Order ID
 * @returns {Object} Response with success status
 */
function forceFreeUpTable(tableId, orderId) {
  try {
    deleteOrderItemsByOrderId(orderId);
    deleteOrder(orderId);
    updateTableStatus(tableId, CONFIG.TABLE_STATUS.DISPONIBLE);
    
    return { success: true };
  } catch (e) {
    logError('forceFreeUpTable', e);
    return { success: false, error: e.toString() };
  }
}
