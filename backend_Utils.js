/**
 * backend_Utils.gs
 * Helper functions for Google Sheets interaction.
 */

function getSpreadsheet() {
  if (typeof SPREADSHEET_ID === 'undefined' || SPREADSHEET_ID === "YOUR_SPREADSHEET_ID_HERE") {
    throw new Error(
      'CONFIGURACIÓN REQUERIDA: Por favor, verifica el archivo backend_Config.gs.',
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
 * Helper to convert a sheet row to an object using headers.
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
 */
function _objectToSheetRow(headers, obj) {
  const rowData = [];
  headers.forEach((header) => {
    // Ensure all header keys are present in the object, or default to empty string
    rowData.push(obj.hasOwnProperty(header) ? obj[header] : "");
  });
  return rowData;
}
