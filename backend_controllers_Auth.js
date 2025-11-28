/**
 * backend_controllers_Auth.gs
 * Logic for User Authentication.
 */

/**
 * Authenticates a user with username and password.
 */
function loginUser(username, password) {
  try {
    Logger.log('loginUser called with username: ' + username);

    const user = getUserByUsername(username);

    if (!user) {
      Logger.log('User not found: ' + username);
      return { success: false, error: 'Usuario no encontrado' };
    }

    Logger.log('User found: ' + user.username);

    if (user.password !== password) {
      Logger.log('Incorrect password for user: ' + username);
      return { success: false, error: 'Contraseña incorrecta' };
    }

    // Update last login
    try {
      updateUserLastLogin(user.user_id);
      Logger.log('Last login updated for user: ' + user.user_id);
    } catch (e) {
      Logger.log('Error updating last login: ' + e.toString());
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

    Logger.log('Returning success for user: ' + user.username);
    return result;

  } catch (e) {
    Logger.log('Error en loginUser: ' + e.toString());
    return { success: false, error: e.toString() };
  }
}

/**
 * Gets the list of users (admin only).
 */
function getUsersList() {
  try {
    const users = getUsers();
    // Don't send passwords - create new objects without password
    const usersWithoutPasswords = users.map(function (u) {
      return {
        user_id: u.user_id,
        username: u.username,
        full_name: u.full_name,
        role: u.role,
        active: u.active,
        created_at: u.created_at,
        last_login: u.last_login
      };
    });
    return { success: true, users: usersWithoutPasswords };
  } catch (e) {
    Logger.log('Error en getUsersList: ' + e.toString());
    return { success: false, error: e.toString() };
  }
}

/**
 * Test function to verify Users sheet exists and has data.
 */
function testUsersSheet() {
  try {
    const ss = getSpreadsheet();
    const sheet = ss.getSheetByName("Users");

    if (!sheet) {
      return { success: false, error: 'Hoja "Users" no encontrada. Por favor créala primero.' };
    }

    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const userCount = data.length - 1;

    return {
      success: true,
      message: 'Hoja Users encontrada',
      headers: headers,
      userCount: userCount,
      sampleData: data.length > 1 ? data[1] : null
    };
  } catch (e) {
    Logger.log('Error en testUsersSheet: ' + e.toString());
    return { success: false, error: e.toString() };
  }
}
