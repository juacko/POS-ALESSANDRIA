/**
 * Authentication Controller
 * Handles user authentication and session management
 */

/**
 * Authenticates a user
 * @param {string} username - Username
 * @param {string} password - Password
 * @returns {Object} Response with success status and user data
 */
function loginUser(username, password) {
  try {
    logInfo('loginUser called with username: ' + username);
    
    var user = getUserByUsername(username);
    
    if (!user) {
      logInfo('User not found: ' + username);
      return { success: false, error: 'Usuario no encontrado' };
    }
    
    logInfo('User found: ' + user.username);

    if (user.password !== password) {
      logInfo('Incorrect password for user: ' + username);
      return { success: false, error: 'Contraseña incorrecta' };
    }

    // Update last login
    try {
      updateUserLastLogin(user.user_id);
      logInfo('Last login updated for user: ' + user.user_id);
    } catch (e) {
      logError('Error updating last login', e);
    }

    // Create simple object to return
    var result = {
      success: true,
      user: {
        user_id: String(user.user_id),
        username: String(user.username),
        full_name: String(user.full_name),
        role: String(user.role),
        active: Boolean(user.active)
      }
    };
    
    logInfo('Login successful for user: ' + username);
    return result;

  } catch (e) {
    logError('loginUser', e);
    return { success: false, error: e.toString() };
  }
}

/**
 * Gets list of users (admin only)
 * @returns {Object} Response with success status and users array
 */
function getUsersList() {
  try {
    var users = getUsers();
    var usersWithoutPasswords = [];
    
    for (var i = 0; i < users.length; i++) {
      usersWithoutPasswords.push({
        user_id: users[i].user_id,
        username: users[i].username,
        full_name: users[i].full_name,
        role: users[i].role,
        active: users[i].active
      });
    }
    
    return { success: true, users: usersWithoutPasswords };
  } catch (e) {
    logError('getUsersList', e);
    return { success: false, error: e.toString() };
  }
}

/**
 * Test function to verify Users sheet exists
 * @returns {Object} Test results
 */
function testUsersSheet() {
  try {
    var ss = getSpreadsheet();
    var sheet = ss.getSheetByName(CONFIG.SHEETS.USERS);
    
    if (!sheet) {
      return { success: false, error: 'Hoja "Users" no encontrada. Por favor créala primero.' };
    }
    
    var data = sheet.getDataRange().getValues();
    var headers = data[0];
    var userCount = data.length - 1;
    
    return {
      success: true,
      message: 'Hoja Users encontrada',
      headers: headers,
      userCount: userCount,
      sampleData: data.length > 1 ? data[1] : null
    };
  } catch (e) {
    logError('testUsersSheet', e);
    return { success: false, error: e.toString() };
  }
}
