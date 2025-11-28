/**
 * backend_models_Auth.gs
 * Data access for Users.
 */

/**
 * Gets all active users.
 */
function getUsers() {
  try {
    const allUsers = getSheetData("Users");
    const activeUsers = [];
    for (var i = 0; i < allUsers.length; i++) {
      if (allUsers[i].active === true || allUsers[i].active === 'TRUE') {
        activeUsers.push(allUsers[i]);
      }
    }
    return activeUsers;
  } catch (e) {
    Logger.log('Error en getUsers: ' + e.toString());
    throw e;
  }
}

/**
 * Gets a user by username.
 */
function getUserByUsername(username) {
  try {
    const users = getSheetData("Users");
    for (var i = 0; i < users.length; i++) {
      if (users[i].username === username && (users[i].active === true || users[i].active === 'TRUE')) {
        return users[i];
      }
    }
    return null;
  } catch (e) {
    Logger.log('Error en getUserByUsername: ' + e.toString());
    throw e;
  }
}

/**
 * Updates the last login timestamp for a user.
 */
function updateUserLastLogin(userId) {
  try {
    const ss = getSpreadsheet();
    const sheet = ss.getSheetByName("Users");

    if (!sheet) {
      throw new Error('Hoja "Users" no encontrada');
    }

    const data = sheet.getDataRange().getValues();
    const headers = data[0];

    const userIdColIndex = headers.indexOf("user_id");
    const lastLoginColIndex = headers.indexOf("last_login");

    if (userIdColIndex === -1 || lastLoginColIndex === -1) {
      throw new Error('Column "user_id" or "last_login" not found in Users sheet.');
    }

    for (var i = 1; i < data.length; i++) {
      if (data[i][userIdColIndex] === userId) {
        sheet.getRange(i + 1, lastLoginColIndex + 1).setValue(new Date());
        break;
      }
    }
    SpreadsheetApp.flush();
  } catch (e) {
    Logger.log('Error en updateUserLastLogin: ' + e.toString());
    throw e;
  }
}
