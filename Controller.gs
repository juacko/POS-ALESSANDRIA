/**
 * Controller.gs
 * API endpoints called by the frontend.
 * Contiene la lógica de negocio y conecta el Modelo con la Vista.
 */

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
    const cashFlowTransactions = getCashFlowBySessionId(activeSession.session_id);
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
        expectedCash: expectedCash
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
    const openTables = tables.filter(t => t.status === 'Occupied');
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
      updateTableStatus(updatedOrder.table_number, 'Available');
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
    updateTableStatus(tableId, 'Available');
    
    return { success: true };
  } catch (e) {
    Logger.log('Error in forceFreeUpTable: ' + e.toString());
    return { success: false, error: e.toString() };
  }
}