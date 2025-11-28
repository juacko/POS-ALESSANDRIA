/**
 * backend_models_Tables.gs
 * Data access for Tables.
 */

/**
 * Gets all tables.
 */
function getTables() {
  return getSheetData("Tables");
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
