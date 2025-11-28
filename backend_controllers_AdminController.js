/**
 * Admin Controller
 * Handles administrative operations and system management
 */

/**
 * Gets system statistics
 * @returns {Object} Response with system stats
 */
function getSystemStats() {
  try {
    var users = getUsers();
    var products = getProducts();
    var tables = getTables();
    var orders = getSheetData(CONFIG.SHEETS.ORDERS);
    var sessions = getSheetData(CONFIG.SHEETS.CASHIER_SESSIONS);
    
    return {
      success: true,
      stats: {
        totalUsers: users.length,
        totalProducts: products.length,
        totalTables: tables.length,
        totalOrders: orders.length,
        totalSessions: sessions.length,
        activeUsers: users.filter(function(u) { return u.active === true; }).length
      }
    };
  } catch (e) {
    logError('getSystemStats', e);
    return { success: false, error: e.toString() };
  }
}

/**
 * Gets all data for initial load
 * @returns {Object} Response with all necessary data
 */
function getAllData() {
  try {
    return {
      success: true,
      products: getProducts(),
      modifiers: getModifiers(),
      tables: getTables(),
      paymentMethods: getPaymentMethods(),
      activeSession: getActiveCashierSession()
    };
  } catch (e) {
    logError('getAllData', e);
    return { success: false, error: e.toString() };
  }
}
