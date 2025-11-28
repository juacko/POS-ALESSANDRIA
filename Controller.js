/**
 * Controller.gs
 * API endpoints called by the frontend.
 * Contiene la lógica de negocio y conecta el Modelo con la Vista.
 */

// --- USER AUTHENTICATION ENDPOINTS ---

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

// --- FUNCIONES DE FLUJO DE CAJA ---

/**
 * Calcula el monto de efectivo esperado en la sesión de caja activa.
 * @returns {Object} Con el éxito y el monto esperado, o un error.
 */
function getExpectedCash() {
  try {
    const activeSession = getActiveCashierSession();
    if (!activeSession) {
      throw new Error('No hay una sesión de caja activa.');
    }

    // 1. Get all payments and group them by method
    const sessionPayments = getPaymentsBySessionId(activeSession.session_id);
    const paymentMethodTotals = {};
    sessionPayments.forEach(p => {
      const method = p.payment_method;
      const amount = Number(p.amount || 0);
      if (!paymentMethodTotals[method]) {
        paymentMethodTotals[method] = 0;
      }
      paymentMethodTotals[method] += amount;
    });

    // 2. Get and calculate income and expenses
    let cashFlowTransactions = getCashFlowBySessionId(activeSession.session_id);

    // SANITIZE: Convert Date objects to strings to avoid serialization errors
    cashFlowTransactions = cashFlowTransactions.map(t => {
      const sanitized = { ...t };
      if (sanitized.timestamp instanceof Date) {
        sanitized.timestamp = sanitized.timestamp.toLocaleString();
      }
      return sanitized;
    });

    const totalIncome = cashFlowTransactions
      .filter(t => t.type === 'Ingreso')
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);
    const totalExpenses = cashFlowTransactions
      .filter(t => t.type === 'Salida')
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);

    // 3. Calculate expected cash
    const initialAmount = Number(activeSession.initial_amount);
    const totalCashSales = paymentMethodTotals['Efectivo'] || 0;
    const expectedCash = initialAmount + totalCashSales + totalIncome - totalExpenses;

    // 4. Return the detailed summary object
    return {
      success: true,
      summary: {
        initialAmount: initialAmount,
        paymentMethodTotals: paymentMethodTotals,
        totalIncome: totalIncome,
        totalExpenses: totalExpenses,
        expectedCash: expectedCash,
        cashFlowTransactions: cashFlowTransactions
      }
    };

  } catch (e) {
    Logger.log('Error en getExpectedCash: ' + e.toString());
    return { success: false, error: e.toString() };
  }
}

/**
 * Inicia una nueva sesión de caja con un monto inicial.
 */
function startNewCashierSession(initialAmount) {
  try {
    if (typeof initialAmount !== 'number' || initialAmount < 0) {
      throw new Error('El monto inicial debe ser un número válido.');
    }
    const newSession = createCashierSession(initialAmount);
    return { success: true, session: newSession };
  } catch (e) {
    Logger.log('Error en startNewCashierSession: ' + e.toString());
    return { success: false, error: e.toString() };
  }
}

/**
 * Registra una nueva transacción de flujo de caja (ingreso o salida).
 */
function addCashFlowTransaction(type, amount, description) {
  try {
    const activeSession = getActiveCashierSession();
    if (!activeSession) {
      throw new Error('No hay una sesión de caja activa para registrar un movimiento.');
    }
    if (typeof amount !== 'number' || amount <= 0) {
      throw new Error('El monto debe ser un número positivo.');
    }
    if (!description || description.trim() === '') {
      throw new Error('La descripción es obligatoria.');
    }

    const transactionData = {
      session_id: activeSession.session_id,
      type: type,
      amount: amount,
      description: description
    };

    const result = createCashFlowTransaction(transactionData);
    return { success: true, transaction: result };

  } catch (e) {
    Logger.log('Error en addCashFlowTransaction: ' + e.toString());
    return { success: false, error: e.toString() };
  }
}



/**
 * Cierra la sesión de caja activa, incluyendo los movimientos de caja en el cálculo.
 */
function closeCurrentCashierSession(countedCash, notes) {
  try {
    const activeSession = getActiveCashierSession();
    if (!activeSession) {
      throw new Error('No hay una sesión de caja activa para cerrar.');
    }

    // VALIDATION: Check for open tables
    const tables = getTables();
    const openTables = tables.filter(t => t.status === 'Ocupada');
    if (openTables.length > 0) {
      const tableNames = openTables.map(t => t.name).join(', ');
      throw new Error('No se puede cerrar la caja. Las siguientes mesas siguen abiertas: ' + tableNames);
    }

    // 1. Get all payments for the session to calculate cash sales
    const sessionPayments = getPaymentsBySessionId(activeSession.session_id);
    const totalCashSales = sessionPayments
      .filter(p => p.payment_method && p.payment_method.trim().toUpperCase() === 'EFECTIVO')
      .reduce((sum, p) => sum + Number(p.amount || 0), 0);

    // 2. Obtener y calcular ingresos y salidas
    const cashFlowTransactions = getCashFlowBySessionId(activeSession.session_id);
    const totalIncome = cashFlowTransactions
      .filter(t => t.type === 'Ingreso')
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);
    const totalExpenses = cashFlowTransactions
      .filter(t => t.type === 'Salida')
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);

    // 3. Calcular el efectivo esperado con la nueva fórmula
    const initialAmount = Number(activeSession.initial_amount);
    const expectedCash = initialAmount + totalCashSales + totalIncome - totalExpenses;
    const difference = countedCash - expectedCash;

    // 4. Preparar datos y cerrar la sesión
    const closingData = {
      session_id: activeSession.session_id,
      close_timestamp: new Date().toLocaleString(),
      expected_cash: expectedCash,
      counted_cash: countedCash,
      difference: difference,
      status: 'CLOSED',
      notes: notes || '',
    };

    const updatedSession = updateCashierSession(closingData);

    return { success: true, closingReport: updatedSession };

  } catch (e) {
    Logger.log('Error en closeCurrentCashierSession: ' + e.toString());
    return { success: false, error: e.toString() };
  }
}


// --- FUNCIONES PRINCIPALES ---

/**
 * Obtiene todos los datos iniciales que necesita la aplicación para arrancar.
 */
function getInitialData() {
  try {
    return {
      success: true,
      products: getProducts(),
      modifiers: getModifiers(),
      tables: getTables(),
      activeSession: getActiveCashierSession(),
      paymentMethods: getPaymentMethods()
    };
  } catch (e) {
    Logger.log('Error in getInitialData: ' + e.toString());
    return { success: false, error: e.toString() };
  }
}

/**
 * Finalizes an order by recording payments and updating statuses.
 */
function finalizeOrderAndPay(orderId, payments, totalAmount) {
  try {
    const activeSession = getActiveCashierSession();
    if (!activeSession) {
      throw new Error('No hay una sesión de caja activa.');
    }

    const paymentsToCreate = payments.map(p => ({
      ...p,
      order_id: orderId,
      session_id: activeSession.session_id
    }));

    createPayments(paymentsToCreate);

    const orderUpdateData = {
      status: 'Paid',
      total_amount: totalAmount
    };
    const updatedOrder = updateOrder(orderId, orderUpdateData);

    if (updatedOrder && updatedOrder.table_number) {
      updateTableStatus(updatedOrder.table_number, 'Disponible');
    } else {
      Logger.log('Advertencia: No se pudo actualizar el estado de la mesa para la orden ' + orderId);
    }

    return { success: true };

  } catch (e) {
    Logger.log('Error in finalizeOrderAndPay: ' + e.toString());
    return { success: false, error: e.toString() };
  }
}

/**
 * Checks for an open order on a table or creates a new one.
 */
function getOrCreateTableOrder(tableId) {
  try {
    const activeSession = getActiveCashierSession();
    if (!activeSession) {
      throw new Error('Caja cerrada. Por favor, abra una sesión para poder iniciar un nuevo pedido.');
    }

    let order;
    let items = [];
    const openOrder = getOpenOrderByTable(tableId);

    if (openOrder) {
      order = openOrder;
      items = getOrderItemsByOrderId(order.order_id);
    } else {
      const newOrderId = createOrder(tableId);
      order = { order_id: newOrderId, table_number: tableId, status: 'Open' };
    }

    return { success: true, orderId: order.order_id, items: items };

  } catch (e) {
    Logger.log('Error in getOrCreateTableOrder: ' + e.toString());
    return { success: false, error: e.toString() };
  }
}

/**
 * Guarda los artículos de un pedido.
 */
function saveOrderItems(orderId, items) {
  try {
    overwriteOrderItems(orderId, items);
    const updatedItems = getOrderItemsByOrderId(orderId);
    return { success: true, items: updatedItems };
  } catch (e) {
    Logger.log('Error in saveOrderItems: ' + e.toString());
    return { success: false, error: e.toString() };
  }
}

/**
 * Frees up a table by deleting the associated empty order and updating the table status.
 */
function forceFreeUpTable(tableId, orderId) {
  try {
    deleteOrderItemsByOrderId(orderId);
    deleteOrder(orderId);
    updateTableStatus(tableId, 'Disponible');

    return { success: true };
  } catch (e) {
    Logger.log('Error in forceFreeUpTable: ' + e.toString());
    return { success: false, error: e.toString() };
  }
}

// --- FUNCIONES PARA VISTA DE ORDENES ---

/**
 * Obtiene las órdenes activas para mostrar en la vista.
 * @returns {Object} Resultado con las órdenes activas o error.
 */
function getActiveOrdersData() {
  try {
    Logger.log('getActiveOrdersData: Iniciando...');
    const activeOrders = getActiveOrders();
    Logger.log('getActiveOrdersData: Órdenes encontradas: ' + activeOrders.length);
    return { success: true, orders: activeOrders };
  } catch (e) {
    Logger.log('Error en getActiveOrdersData: ' + e.toString());
    Logger.log('Stack trace: ' + e.stack);
    return { success: false, error: e.toString() };
  }
}

/**
 * Obtiene el historial de órdenes pagadas.
 * @returns {Object} Resultado con el historial de órdenes o error.
 */
function getPaidOrdersHistory() {
  try {
    Logger.log('getPaidOrdersHistory: Iniciando...');
    const paidOrders = getPaidOrders();
    Logger.log('getPaidOrdersHistory: Órdenes pagadas encontradas: ' + paidOrders.length);
    return { success: true, orders: paidOrders };
  } catch (e) {
    Logger.log('Error en getPaidOrdersHistory: ' + e.toString());
    Logger.log('Stack trace: ' + e.stack);
    return { success: false, error: e.toString() };
  }
}