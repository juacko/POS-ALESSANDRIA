/**
 * backend_controllers_CashFlow.gs
 * Logic for Cashier Sessions and Cash Flow.
 */

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
