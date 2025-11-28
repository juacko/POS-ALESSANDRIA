/**
 * Global Configuration for POS System
 * Contains all configuration constants and settings
 */

// Main configuration object
var CONFIG = {
  // Spreadsheet ID - REPLACE WITH YOUR ACTUAL SPREADSHEET ID
  SPREADSHEET_ID: '1lSkILVWEwEb3yAOptnMFqlm7dBmtsDyw5yGG04_C-Ns',

  // Sheet names
  SHEETS: {
    PRODUCTS: 'Products',
    MODIFIERS: 'Modifiers',
    TABLES: 'Tables',
    ORDERS: 'Orders',
    ORDER_ITEMS: 'OrderItems',
    PAYMENTS: 'Payments',
    PAYMENT_METHODS: 'PaymentMethods',
    CASHIER_SESSIONS: 'CashierSessions',
    CASH_FLOW: 'CashFlow',
    USERS: 'Users'
  },

  // User roles
  ROLES: {
    ADMIN: 'Administrador',
    ATENCION: 'Atención'
  },

  // Order statuses
  ORDER_STATUS: {
    OPEN: 'Open',
    PAID: 'Paid'
  },

  // Table statuses
  TABLE_STATUS: {
    DISPONIBLE: 'Disponible',
    OCUPADA: 'Ocupada'
  },

  // Cashier session statuses
  CASHIER_STATUS: {
    OPEN: 'OPEN',
    CLOSED: 'CLOSED'
  }
};

/**
 * Get the spreadsheet instance
 * @returns {Spreadsheet} The spreadsheet object
 */
function getSpreadsheet() {
  return SpreadsheetApp.openById(CONFIG.SPREADSHEET_ID);
}
