/**
 * User Model
 * Handles all user-related data operations
 */

/**
 * Gets all active users
 * @returns {Array<Object>} Array of active user objects
 */
function getUsers() {
  try {
    var allUsers = getSheetData(CONFIG.SHEETS.USERS);
    var activeUsers = [];
    
    for (var i = 0; i < allUsers.length; i++) {
      if (allUsers[i].active === true || allUsers[i].active === 'TRUE') {
        activeUsers.push(allUsers[i]);
      }
    }
    
    return activeUsers;
  } catch (e) {
    logError('getUsers', e);
    throw e;
  }
}

/**
 * Gets a user by username
 * @param {string} username - Username to search for
 * @returns {Object|null} User object or null if not found
 */
function getUserByUsername(username) {
  try {
    var users = getSheetData(CONFIG.SHEETS.USERS);
    
    for (var i = 0; i < users.length; i++) {
      if (users[i].username === username && 
          (users[i].active === true || users[i].active === 'TRUE')) {
        return users[i];
      }
    }
    
    return null;
  } catch (e) {
    logError('getUserByUsername', e);
    throw e;
  }
}

/**
 * Updates the last login timestamp for a user
 * @param {string} userId - ID of the user
 */
function updateUserLastLogin(userId) {
  try {
    var ss = getSpreadsheet();
    var sheet = ss.getSheetByName(CONFIG.SHEETS.USERS);
    
    if (!sheet) {
      throw new Error('Users sheet not found');
    }
    
    var data = sheet.getDataRange().getValues();
    var headers = data[0];
    var userIdColIndex = headers.indexOf('user_id');
    var lastLoginColIndex = headers.indexOf('last_login');
    
    if (userIdColIndex === -1 || lastLoginColIndex === -1) {
      throw new Error('Required columns not found in Users sheet');
    }
    
    for (var i = 1; i < data.length; i++) {
      if (data[i][userIdColIndex] === userId) {
        sheet.getRange(i + 1, lastLoginColIndex + 1).setValue(new Date());
        break;
      }
    }
    
    SpreadsheetApp.flush();
    logInfo('Updated last login for user: ' + userId);
  } catch (e) {
    logError('updateUserLastLogin', e);
    throw e;
  }
}
