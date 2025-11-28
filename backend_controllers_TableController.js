/**
 * Table Controller
 * Handles table-related API endpoints
 */

/**
 * Gets all tables data
 * @returns {Object} Response with tables array
 */
function getTablesData() {
  try {
    var tables = getTables();
    return {
      success: true,
      tables: tables
    };
  } catch (e) {
    logError('getTablesData', e);
    return { success: false, error: e.toString() };
  }
}

/**
 * Selects a table and creates/gets order
 * @param {string} tableId - Table ID
 * @returns {Object} Response with order ID and table info
 */
function selectTable(tableId) {
  try {
    var existingOrder = getOpenOrderByTable(tableId);
    var orderId;
    
    if (existingOrder) {
      orderId = existingOrder.order_id;
      logInfo('Found existing order for table: ' + tableId);
    } else {
      orderId = createOrder(tableId);
      logInfo('Created new order for table: ' + tableId);
    }
    
    return {
      success: true,
      orderId: orderId
    };
  } catch (e) {
    logError('selectTable', e);
    return { success: false, error: e.toString() };
  }
}
